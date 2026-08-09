import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type TipoRecebedorTela = "pendente" | "escritorio" | "motoboy";

type Body = {
  id?: string;
  recebimento?: TipoRecebedorTela;
  valor?: number | string;
  motoboy?: string | null;
};

function converterValor(valor: unknown) {
  const numero = Number(String(valor ?? "0").replace(",", "."));
  return Number.isFinite(numero) ? numero : 0;
}

function respostaErro(mensagem: string, status: number) {
  return NextResponse.json({ erro: mensagem }, { status });
}

function recebimentoParaBanco(tipo: TipoRecebedorTela) {
  if (tipo === "motoboy") return "MOTOBOY";
  if (tipo === "escritorio") return "ESCRITORIO";
  return "PENDENTE";
}

async function reconstruirMovimentosMotoboy(tx: any, teleId: string, solicitante: string) {
  const teleReferencia = await tx.tele.findUnique({
    where: {
      id: teleId,
    },
    select: {
      dataTele: true,
    },
  });

  await tx.movimentoFinanceiroMotoboy.deleteMany({
    where: {
      teleId,
      tipo: "CLIENTE",
    },
  });

  const recebimentosMotoboy = await tx.recebimentoTele.findMany({
    where: {
      teleId,
      recebedor: "MOTOBOY",
      motoboyId: {
        not: null,
      },
      valor: {
        gt: 0.009,
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  for (const recebimento of recebimentosMotoboy) {
    await tx.movimentoFinanceiroMotoboy.create({
      data: {
        motoboyId: recebimento.motoboyId!,
        tipo: "CLIENTE",
        clienteNome: solicitante || null,
        valor: recebimento.valor,
        descricao: `Recebimento da tele de ${solicitante}`,
        teleId,
        fechamentoId: recebimento.fechamentoId || null,
        dataReferenciaInicio: teleReferencia?.dataTele || recebimento.dataRecebimento,
        dataReferenciaFim: teleReferencia?.dataTele || recebimento.dataRecebimento,
      },
    });
  }
}

async function semearHistoricoLegado(tx: any, tele: any) {
  const quantidade = await tx.recebimentoTele.count({
    where: {
      teleId: tele.id,
    },
  });

  const valorLegado = Math.max(0, Number(tele.valorRecebido || 0));

  if (quantidade > 0 || valorLegado <= 0.009) {
    return;
  }

  let motoboyId: string | null = null;
  let motoboyNome: string | null = null;

  if (tele.recebimento === "MOTOBOY" && tele.motoboyRecebedor) {
    const motoboy = await tx.motoboy.findFirst({
      where: {
        nome: tele.motoboyRecebedor,
      },
      select: {
        id: true,
        nome: true,
      },
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

async function reduzirHistorico(tx: any, teleId: string, valorAReduzir: number) {
  let restante = valorAReduzir;

  const itens = await tx.recebimentoTele.findMany({
    where: {
      teleId,
    },
    orderBy: [
      {
        dataRecebimento: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
  });

  for (const item of itens) {
    if (restante <= 0.009) break;

    const valorItem = Number(item.valor || 0);

    if (valorItem <= restante + 0.009) {
      await tx.recebimentoTele.delete({
        where: {
          id: item.id,
        },
      });

      restante -= valorItem;
      continue;
    }

    await tx.recebimentoTele.update({
      where: {
        id: item.id,
      },
      data: {
        valor: Math.max(0, valorItem - restante),
      },
    });

    restante = 0;
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const teleId = String(body.id || "").trim();

    if (!teleId) {
      return respostaErro("Tele não informada.", 400);
    }

    const tipoTela = body.recebimento || "pendente";

    if (!["pendente", "escritorio", "motoboy"].includes(tipoTela)) {
      return respostaErro("Tipo de recebimento inválido.", 400);
    }

    const resultado = await prisma.$transaction(async (tx) => {
      const tele = await tx.tele.findUnique({
        where: {
          id: teleId,
        },
        include: {
          paradas: {
            orderBy: {
              ordem: "asc",
            },
          },
          motoboy: true,
          cliente: true,
        },
      });

      if (!tele) {
        throw new Error("Tele não encontrada.");
      }

      if (tele.orcamento) {
        throw new Error("Orçamentos não podem registrar recebimentos.");
      }

      await semearHistoricoLegado(tx, tele);

      const totalTele = Math.max(0, Number(tele.total || 0));
      const valorDesejado =
        tipoTela === "pendente"
          ? 0
          : Math.max(0, Math.min(converterValor(body.valor), totalTele));

      const agregadoAtual = await tx.recebimentoTele.aggregate({
        where: {
          teleId,
        },
        _sum: {
          valor: true,
        },
      });

      const valorAtual = Math.max(0, Number(agregadoAtual._sum.valor || 0));
      const diferenca = valorDesejado - valorAtual;

      if (diferenca > 0.009) {
        let motoboyId: string | null = null;
        let motoboyNome: string | null = null;

        if (tipoTela === "motoboy") {
          const nomeInformado = String(body.motoboy || "").trim();

          if (!nomeInformado) {
            throw new Error("Selecione o motoboy que recebeu.");
          }

          const motoboy = await tx.motoboy.findFirst({
            where: {
              nome: nomeInformado,
            },
            select: {
              id: true,
              nome: true,
            },
          });

          if (!motoboy) {
            throw new Error("Motoboy recebedor não encontrado.");
          }

          motoboyId = motoboy.id;
          motoboyNome = motoboy.nome;
        }

        await tx.recebimentoTele.create({
          data: {
            teleId,
            valor: diferenca,
            recebedor: recebimentoParaBanco(tipoTela),
            motoboyId,
            motoboyNome,
            dataRecebimento: new Date(),
            origem: "REGISTRO_MANUAL",
            fechamentoId: tele.fechamentoId || null,
          },
        });
      } else if (diferenca < -0.009) {
        await reduzirHistorico(tx, teleId, Math.abs(diferenca));
      }

      const historico = await tx.recebimentoTele.findMany({
        where: {
          teleId,
        },
        orderBy: [
          {
            dataRecebimento: "asc",
          },
          {
            createdAt: "asc",
          },
        ],
      });

      const valorRecebido = historico.reduce(
        (soma: number, item: any) => soma + Number(item.valor || 0),
        0
      );

      const ultimo = historico[historico.length - 1] || null;

      const teleAtualizada = await tx.tele.update({
        where: {
          id: teleId,
        },
        data: {
          valorRecebido,
          recebimento: ultimo?.recebedor || "PENDENTE",
          dataRecebimento: ultimo?.dataRecebimento || null,
          motoboyRecebedor:
            ultimo?.recebedor === "MOTOBOY" ? ultimo.motoboyNome || null : null,
        },
        include: {
          paradas: {
            orderBy: {
              ordem: "asc",
            },
          },
          motoboy: true,
          cliente: true,
        },
      });

      await reconstruirMovimentosMotoboy(tx, teleId, tele.solicitante);

      return {
        ...teleAtualizada,
        recebimentosHistorico: historico,
      };
    });

    return NextResponse.json(resultado);
  } catch (erro) {
    console.error("Erro ao registrar histórico de recebimento:", erro);

    return respostaErro(
      erro instanceof Error ? erro.message : "Não foi possível atualizar o recebimento.",
      500
    );
  }
}
