import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type RegistroImportacao = {
  ano: number;
  mes: number;
  faturamentoTrabalho: number;
  feitoPorFora: number;
  gasolina: number;
  manutencao: number;
  diasTrabalhados?: number | null;
  observacoes?: string | null;
};

type ConfirmarImportacaoBody = {
  nomeArquivo?: string;
  hashArquivo?: string;
  substituirExistentes?: boolean;
  registros?: RegistroImportacao[];
};

function respostaErro(mensagem: string, status: number, detalhes?: unknown) {
  return NextResponse.json(
    {
      erro: mensagem,
      ...(detalhes ? { detalhes } : {}),
    },
    { status }
  );
}

async function obterMotoboyAutenticado() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("express_user_id")?.value;

  if (!userId) {
    return null;
  }

  const usuario = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      role: true,
      motoboy: {
        select: {
          id: true,
          nome: true,
        },
      },
    },
  });

  if (!usuario || usuario.role !== "MOTOBOY" || !usuario.motoboy) {
    return null;
  }

  return usuario.motoboy;
}

function numeroNaoNegativo(valor: unknown, campo: string) {
  const numero = Number(valor);

  if (!Number.isFinite(numero) || numero < 0) {
    throw new Error(`${campo} possui um valor inválido.`);
  }

  return Number(numero.toFixed(2));
}

function inteiroOpcionalNaoNegativo(valor: unknown, campo: string) {
  if (valor === null || valor === undefined || valor === "") {
    return null;
  }

  const numero = Number(valor);

  if (!Number.isInteger(numero) || numero < 0) {
    throw new Error(`${campo} possui um valor inválido.`);
  }

  return numero;
}

function validarRegistro(
  registro: RegistroImportacao,
  indice: number
): RegistroImportacao {
  const numeroLinha = indice + 1;
  const ano = Number(registro.ano);
  const mes = Number(registro.mes);

  if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) {
    throw new Error(`Registro ${numeroLinha}: ano inválido.`);
  }

  if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
    throw new Error(`Registro ${numeroLinha}: mês inválido.`);
  }

  return {
    ano,
    mes,
    faturamentoTrabalho: numeroNaoNegativo(
      registro.faturamentoTrabalho,
      `Registro ${numeroLinha}: faturamento do trabalho`
    ),
    feitoPorFora: numeroNaoNegativo(
      registro.feitoPorFora,
      `Registro ${numeroLinha}: feito por fora`
    ),
    gasolina: numeroNaoNegativo(
      registro.gasolina,
      `Registro ${numeroLinha}: gasolina`
    ),
    manutencao: numeroNaoNegativo(
      registro.manutencao,
      `Registro ${numeroLinha}: manutenção`
    ),
    diasTrabalhados: inteiroOpcionalNaoNegativo(
      registro.diasTrabalhados,
      `Registro ${numeroLinha}: dias trabalhados`
    ),
    observacoes: String(registro.observacoes || "").trim() || null,
  };
}

export async function POST(request: Request) {
  try {
    const motoboy = await obterMotoboyAutenticado();

    if (!motoboy) {
      return respostaErro("Acesso negado.", 403);
    }

    const body = (await request.json()) as ConfirmarImportacaoBody;

    const nomeArquivo = String(body.nomeArquivo || "").trim();
    const hashArquivo = String(body.hashArquivo || "").trim().toLowerCase();
    const substituirExistentes = body.substituirExistentes === true;

    if (!nomeArquivo) {
      return respostaErro("Nome do arquivo não informado.", 400);
    }

    if (!/^[a-f0-9]{64}$/.test(hashArquivo)) {
      return respostaErro("Identificação do arquivo inválida.", 400);
    }

    if (!Array.isArray(body.registros) || body.registros.length === 0) {
      return respostaErro(
        "Nenhum registro foi enviado para importação.",
        400
      );
    }

    if (body.registros.length > 1200) {
      return respostaErro(
        "A importação possui registros demais. O limite é de 1.200 meses.",
        400
      );
    }

    const registros = body.registros.map(validarRegistro);
    const chavesRecebidas = new Set<string>();

    for (const registro of registros) {
      const chave = `${registro.ano}-${registro.mes}`;

      if (chavesRecebidas.has(chave)) {
        return respostaErro(
          `Existem registros duplicados para ${String(registro.mes).padStart(
            2,
            "0"
          )}/${registro.ano}.`,
          400
        );
      }

      chavesRecebidas.add(chave);
    }

    const importacaoDuplicada =
      await prisma.importacaoHistoricoMotoboy.findUnique({
        where: {
          motoboyId_hashArquivo: {
            motoboyId: motoboy.id,
            hashArquivo,
          },
        },
        select: {
          id: true,
          nomeArquivo: true,
          createdAt: true,
        },
      });

    if (importacaoDuplicada) {
      return respostaErro(
        "Este mesmo arquivo já foi importado anteriormente.",
        409,
        {
          importacaoId: importacaoDuplicada.id,
          nomeArquivo: importacaoDuplicada.nomeArquivo,
          importadaEm: importacaoDuplicada.createdAt,
        }
      );
    }

    const mesesExistentes = await prisma.historicoMensalMotoboy.findMany({
      where: {
        motoboyId: motoboy.id,
        OR: registros.map((registro) => ({
          ano: registro.ano,
          mes: registro.mes,
        })),
      },
      select: {
        id: true,
        ano: true,
        mes: true,
      },
    });

    if (mesesExistentes.length > 0 && !substituirExistentes) {
      return respostaErro(
        "Alguns meses já possuem histórico. Confirme a substituição para continuar.",
        409,
        {
          mesesExistentes: mesesExistentes.map((item) => ({
            ano: item.ano,
            mes: item.mes,
          })),
        }
      );
    }

    const resultado = await prisma.$transaction(
      async (tx) => {
        const importacao = await tx.importacaoHistoricoMotoboy.create({
          data: {
            motoboyId: motoboy.id,
            nomeArquivo,
            hashArquivo,
            quantidade: registros.length,
          },
          select: {
            id: true,
          },
        });

        let criados = 0;
        let substituidos = 0;

        for (const registro of registros) {
          const existente = await tx.historicoMensalMotoboy.findUnique({
            where: {
              motoboyId_ano_mes: {
                motoboyId: motoboy.id,
                ano: registro.ano,
                mes: registro.mes,
              },
            },
            select: {
              id: true,
            },
          });

          if (existente) {
            await tx.historicoMensalMotoboy.update({
              where: {
                id: existente.id,
              },
              data: {
                importacaoId: importacao.id,
                faturamentoTrabalho: registro.faturamentoTrabalho,
                feitoPorFora: registro.feitoPorFora,
                gasolina: registro.gasolina,
                manutencao: registro.manutencao,
                diasTrabalhados: registro.diasTrabalhados,
                observacoes: registro.observacoes,
              },
            });

            substituidos += 1;
          } else {
            await tx.historicoMensalMotoboy.create({
              data: {
                motoboyId: motoboy.id,
                importacaoId: importacao.id,
                ano: registro.ano,
                mes: registro.mes,
                faturamentoTrabalho: registro.faturamentoTrabalho,
                feitoPorFora: registro.feitoPorFora,
                gasolina: registro.gasolina,
                manutencao: registro.manutencao,
                diasTrabalhados: registro.diasTrabalhados,
                observacoes: registro.observacoes,
              },
            });

            criados += 1;
          }
        }

        return {
          importacaoId: importacao.id,
          criados,
          substituidos,
        };
      },
      {
        maxWait: 10_000,
        timeout: 30_000,
      }
    );

    const totais = registros.reduce(
      (acumulado, registro) => {
        acumulado.faturamentoTrabalho += registro.faturamentoTrabalho;
        acumulado.feitoPorFora += registro.feitoPorFora;
        acumulado.gasolina += registro.gasolina;
        acumulado.manutencao += registro.manutencao;

        return acumulado;
      },
      {
        faturamentoTrabalho: 0,
        feitoPorFora: 0,
        gasolina: 0,
        manutencao: 0,
      }
    );

    const faturamentoTotal =
      totais.faturamentoTrabalho + totais.feitoPorFora;

    const despesasTotais = totais.gasolina + totais.manutencao;

    return NextResponse.json({
      ok: true,
      mensagem: "Histórico mensal importado com sucesso.",
      motoboy: {
        id: motoboy.id,
        nome: motoboy.nome,
      },
      nomeArquivo,
      quantidadeRegistros: registros.length,
      ...resultado,
      totais: {
        faturamentoTrabalho: Number(
          totais.faturamentoTrabalho.toFixed(2)
        ),
        feitoPorFora: Number(totais.feitoPorFora.toFixed(2)),
        gasolina: Number(totais.gasolina.toFixed(2)),
        manutencao: Number(totais.manutencao.toFixed(2)),
        faturamentoTotal: Number(faturamentoTotal.toFixed(2)),
        despesasTotais: Number(despesasTotais.toFixed(2)),
        resultadoLiquido: Number(
          (faturamentoTotal - despesasTotais).toFixed(2)
        ),
      },
    });
  } catch (erro) {
    console.error("Erro ao confirmar histórico do motoboy:", erro);

    return respostaErro(
      erro instanceof Error
        ? erro.message
        : "Não foi possível importar o histórico.",
      500
    );
  }
}
