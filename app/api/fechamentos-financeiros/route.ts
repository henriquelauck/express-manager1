import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type RecebedorTipo = "ESCRITORIO" | "MOTOBOY";

type DistribuicaoBody = {
  motoboyId?: string | null;
  motoboyNome?: string;
  total?: number | string;
  quantidade?: number;
};

type RecebimentoBody = {
  recebedorTipo?: string;
  motoboyId?: string | null;
  motoboyNome?: string;
  valorRecebido?: number | string;
};

type FechamentoBody = {
  clienteNome?: string;
  dataInicio?: string;
  dataFim?: string;
  distribuicoes?: DistribuicaoBody[];
  recebimentos?: RecebimentoBody[];
};

function converterValor(valor: unknown) {
  const numero = Number(String(valor ?? "0").replace(",", "."));
  return Number.isFinite(numero) ? numero : 0;
}

function normalizarRecebedor(valor: unknown): RecebedorTipo | null {
  const tipo = String(valor || "")
    .trim()
    .toUpperCase();

  if (tipo === "ESCRITORIO" || tipo === "MOTOBOY") {
    return tipo;
  }

  return null;
}

function dataInicioFim(dataInicio: string, dataFim: string) {
  return {
    inicio: new Date(`${dataInicio}T00:00:00-03:00`),
    fim: new Date(`${dataFim}T23:59:59.999-03:00`),
  };
}


async function semearHistoricoLegado(tx: any, tele: any) {
  const quantidade = await tx.recebimentoTele.count({
    where: { teleId: tele.id },
  });

  const valorLegado = Math.max(0, converterValor(tele.valorRecebido));

  if (quantidade > 0 || valorLegado <= 0.009) {
    return;
  }

  let motoboyId: string | null = null;
  let motoboyNome: string | null = null;

  if (tele.recebimento === "MOTOBOY" && tele.motoboyRecebedor) {
    const motoboy = await tx.motoboy.findFirst({
      where: { nome: tele.motoboyRecebedor },
      select: { id: true, nome: true },
    });

    motoboyId = motoboy?.id || null;
    motoboyNome = motoboy?.nome || tele.motoboyRecebedor;
  }

  await tx.recebimentoTele.create({
    data: {
      teleId: tele.id,
      valor: valorLegado,
      recebedor: tele.recebimento === "MOTOBOY" ? "MOTOBOY" : "ESCRITORIO",
      motoboyId,
      motoboyNome,
      dataRecebimento: tele.dataRecebimento || tele.updatedAt || new Date(),
      origem: "MIGRACAO_LEGADO",
      fechamentoId: tele.fechamentoId || null,
    },
  });
}

function respostaErro(mensagem: string, status: number) {
  return NextResponse.json({ erro: mensagem }, { status });
}

export async function GET() {
  try {
    const fechamentos = await prisma.fechamentoFinanceiro.findMany({
      include: {
        cliente: true,
        teles: true,
        itens: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(fechamentos);
  } catch (erro) {
    console.error("Erro ao buscar fechamentos:", erro);

    return respostaErro("Não foi possível carregar os fechamentos.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as FechamentoBody;

    const clienteNome = String(body.clienteNome || "").trim();
    const dataInicio = String(body.dataInicio || "").trim();
    const dataFim = String(body.dataFim || "").trim();
    const distribuicoes = Array.isArray(body.distribuicoes) ? body.distribuicoes : [];
    const recebimentos = Array.isArray(body.recebimentos) ? body.recebimentos : [];

    if (
      !clienteNome ||
      !dataInicio ||
      !dataFim ||
      distribuicoes.length === 0 ||
      recebimentos.length === 0
    ) {
      return respostaErro("Preencha todos os dados obrigatórios do fechamento.", 400);
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataInicio) || !/^\d{4}-\d{2}-\d{2}$/.test(dataFim)) {
      return respostaErro("O período informado é inválido.", 400);
    }

    if (dataInicio > dataFim) {
      return respostaErro("A data inicial não pode ser posterior à data final.", 400);
    }

    const recebimentosValidos = recebimentos
      .map((item) => ({
        recebedorTipo: normalizarRecebedor(item.recebedorTipo),
        motoboyId: String(item.motoboyId || "").trim() || null,
        motoboyNome: String(item.motoboyNome || "").trim(),
        valorRecebido: converterValor(item.valorRecebido),
      }))
      .filter((item) => item.valorRecebido > 0.009);

    if (recebimentosValidos.length === 0) {
      return respostaErro("Informe ao menos um valor recebido.", 400);
    }

    const recebimentoInvalido = recebimentosValidos.some(
      (item) => !item.recebedorTipo || (item.recebedorTipo === "MOTOBOY" && !item.motoboyId)
    );

    if (recebimentoInvalido) {
      return respostaErro("Revise os recebedores informados.", 400);
    }

    const { inicio, fim } = dataInicioFim(dataInicio, dataFim);

    const resultado = await prisma.$transaction(async (tx) => {
      const cliente = await tx.cliente.findFirst({
        where: {
          nome: clienteNome,
        },
      });

      if (!cliente) {
        throw new Error("CLIENTE_NAO_ENCONTRADO");
      }

      const todasTeles = await tx.tele.findMany({
        where: {
          solicitante: clienteNome,
          dataTele: {
            gte: inicio,
            lte: fim,
          },
        },
        orderBy: {
          dataTele: "asc",
        },
      });

      const telesEmAberto = todasTeles
        .map((tele) => {
          const total = converterValor(tele.total);
          const recebidoAnterior = converterValor(tele.valorRecebido);

          return {
            tele,
            total,
            recebidoAnterior,
            saldo: Math.max(total - recebidoAnterior, 0),
            recebidoAgora: 0,
            ultimoRecebedor: null as RecebedorTipo | null,
            ultimoMotoboyNome: null as string | null,
          };
        })
        .filter((item) => item.saldo > 0.009);

      if (telesEmAberto.length === 0) {
        throw new Error("SEM_TELES_ABERTAS");
      }

      for (const estado of telesEmAberto) {
        await semearHistoricoLegado(tx, estado.tele);
      }

      const totalBruto = telesEmAberto.reduce((soma, item) => soma + item.saldo, 0);

      const totalRecebidoAgora = recebimentosValidos.reduce(
        (soma, item) => soma + item.valorRecebido,
        0
      );

      if (totalRecebidoAgora > totalBruto + 0.009) {
        throw new Error("VALOR_MAIOR_QUE_SALDO");
      }

      const idsMotoboys = [
        ...new Set(
          recebimentosValidos
            .filter((item) => item.recebedorTipo === "MOTOBOY" && item.motoboyId)
            .map((item) => item.motoboyId as string)
        ),
      ];

      const motoboysRecebedores =
        idsMotoboys.length > 0
          ? await tx.motoboy.findMany({
              where: {
                id: {
                  in: idsMotoboys,
                },
              },
              select: {
                id: true,
                nome: true,
              },
            })
          : [];

      if (motoboysRecebedores.length !== idsMotoboys.length) {
        throw new Error("MOTOBOY_NAO_ENCONTRADO");
      }

      const mapaMotoboys = new Map(motoboysRecebedores.map((motoboy) => [motoboy.id, motoboy]));

      const fechamento = await tx.fechamentoFinanceiro.create({
        data: {
          clienteId: cliente.id,
          clienteNome,
          dataInicio: inicio,
          dataFim: fim,
          totalBruto,
          recebedorTipo: "ESCRITORIO",
          status: "ABERTO",
        },
      });

      let indiceTele = 0;

      for (const recebimento of recebimentosValidos) {
        const recebedorTipo = recebimento.recebedorTipo as RecebedorTipo;
        let restante = recebimento.valorRecebido;

        while (restante > 0.009 && indiceTele < telesEmAberto.length) {
          const estado = telesEmAberto[indiceTele];
          const saldoAtual = estado.saldo - estado.recebidoAgora;

          if (saldoAtual <= 0.009) {
            indiceTele += 1;
            continue;
          }

          const valorAlocado = Math.min(restante, saldoAtual);

          estado.recebidoAgora += valorAlocado;
          estado.ultimoRecebedor = recebedorTipo;
          estado.ultimoMotoboyNome =
            recebedorTipo === "MOTOBOY"
              ? mapaMotoboys.get(recebimento.motoboyId as string)?.nome || null
              : null;

          const motoboyRecebedor =
            recebedorTipo === "MOTOBOY" && recebimento.motoboyId
              ? mapaMotoboys.get(recebimento.motoboyId)?.nome || recebimento.motoboyNome || null
              : null;

          await tx.recebimentoTele.create({
            data: {
              teleId: estado.tele.id,
              valor: valorAlocado,
              recebedor: recebedorTipo,
              motoboyId:
                recebedorTipo === "MOTOBOY" ? recebimento.motoboyId : null,
              motoboyNome: motoboyRecebedor,
              dataRecebimento: new Date(),
              origem: "FECHAMENTO_CLIENTE",
              fechamentoId: fechamento.id,
            },
          });

          if (recebedorTipo === "MOTOBOY" && recebimento.motoboyId) {
            await tx.movimentoFinanceiroMotoboy.create({
              data: {
                motoboyId: recebimento.motoboyId,
                tipo: "CLIENTE",
                valor: valorAlocado,
                clienteNome,
                descricao: "Pagamento direto do cliente",
                teleId: estado.tele.id,
                fechamentoId: fechamento.id,
                dataReferenciaInicio: estado.tele.dataTele,
                dataReferenciaFim: estado.tele.dataTele,
              },
            });
          }

          restante -= valorAlocado;

          if (estado.recebidoAgora >= estado.saldo - 0.009) {
            indiceTele += 1;
          }
        }
      }

      for (const estado of telesEmAberto) {
        if (estado.recebidoAgora <= 0.009) continue;

        const novoRecebido = estado.recebidoAnterior + estado.recebidoAgora;
        const quitou = novoRecebido >= estado.total - 0.009;

        await tx.tele.update({
          where: {
            id: estado.tele.id,
          },
          data: {
            fechamentoId: quitou ? fechamento.id : null,
            recebimento: estado.ultimoRecebedor || "ESCRITORIO",
            valorRecebido: novoRecebido,
            dataRecebimento: new Date(),
            motoboyRecebedor:
              estado.ultimoRecebedor === "MOTOBOY" ? estado.ultimoMotoboyNome : null,
          },
        });
      }

      for (const distribuicao of distribuicoes) {
        await tx.fechamentoFinanceiroItem.create({
          data: {
            fechamentoId: fechamento.id,
            motoboyId: String(distribuicao.motoboyId || "").trim() || null,
            motoboyNome: String(distribuicao.motoboyNome || "Sem motoboy").trim() || "Sem motoboy",
            totalBruto: converterValor(distribuicao.total),
            valorRecebido: 0,
            saldo: 0,
            recebedorTipo: "ESCRITORIO",
          },
        });
      }

      const fechamentoQuitado = totalRecebidoAgora >= totalBruto - 0.009;

      await tx.fechamentoFinanceiro.update({
        where: {
          id: fechamento.id,
        },
        data: {
          status: fechamentoQuitado ? "FECHADO" : "ABERTO",
        },
      });

      return {
        fechamentoId: fechamento.id,
        totalBruto,
        totalRecebidoAgora,
        saldoRestante: Math.max(totalBruto - totalRecebidoAgora, 0),
      };
    });

    return NextResponse.json({
      ok: true,
      ...resultado,
    });
  } catch (erro) {
    console.error("Erro no fechamento financeiro:", erro);

    if (erro instanceof Error && erro.message === "CLIENTE_NAO_ENCONTRADO") {
      return respostaErro("Cliente não encontrado.", 404);
    }

    if (erro instanceof Error && erro.message === "SEM_TELES_ABERTAS") {
      return respostaErro("Não existem teles em aberto nesse período.", 409);
    }

    if (erro instanceof Error && erro.message === "VALOR_MAIOR_QUE_SALDO") {
      return respostaErro("O valor recebido não pode ser maior que o saldo em aberto.", 400);
    }

    if (erro instanceof Error && erro.message === "MOTOBOY_NAO_ENCONTRADO") {
      return respostaErro("Um dos motoboys informados não foi encontrado.", 404);
    }

    return respostaErro("Não foi possível concluir o fechamento.", 500);
  }
}
