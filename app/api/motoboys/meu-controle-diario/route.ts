import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type ControleDiarioBody = {
  dataReferencia?: string;
  valorPorFora?: number;
  gasolina?: number;
  manutencao?: number;
  alimentacao?: number;
  outrasDespesas?: number;
  descricaoManutencao?: string | null;
  descricaoOutrasDespesas?: string | null;
  observacoes?: string | null;
  kmInicial?: number | null;
  kmFinal?: number | null;
};

function respostaErro(mensagem: string, status: number) {
  return NextResponse.json({ erro: mensagem }, { status });
}

function dataReferenciaBrasil(valor?: string | Date) {
  const data = valor ? new Date(valor) : new Date();

  if (Number.isNaN(data.getTime())) {
    return null;
  }

  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(data);

  const ano = partes.find((parte) => parte.type === "year")?.value;
  const mes = partes.find((parte) => parte.type === "month")?.value;
  const dia = partes.find((parte) => parte.type === "day")?.value;

  if (!ano || !mes || !dia) {
    return null;
  }

  return new Date(`${ano}-${mes}-${dia}T00:00:00-03:00`);
}

function inicioFimDiaBrasil(dataReferencia: Date) {
  const inicio = new Date(dataReferencia);
  const fim = new Date(inicio);
  fim.setUTCDate(fim.getUTCDate() + 1);

  return {
    inicio,
    fim,
  };
}

function numeroNaoNegativo(valor: unknown, nomeCampo: string) {
  const numero = Number(valor ?? 0);

  if (!Number.isFinite(numero) || numero < 0) {
    throw new Error(`${nomeCampo} deve ser um valor válido e não negativo.`);
  }

  return numero;
}

function numeroOpcionalNaoNegativo(valor: unknown, nomeCampo: string) {
  if (valor === null || valor === undefined || valor === "") {
    return null;
  }

  const numero = Number(valor);

  if (!Number.isFinite(numero) || numero < 0) {
    throw new Error(`${nomeCampo} deve ser um valor válido e não negativo.`);
  }

  return numero;
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

async function calcularValorExpressManager(
  motoboyId: string,
  dataReferencia: Date
) {
  const { inicio, fim } = inicioFimDiaBrasil(dataReferencia);

  const resultado = await prisma.tele.aggregate({
    where: {
      motoboyId,
      statusAceite: "ACEITA",
      orcamento: false,
      dataTele: {
        gte: inicio,
        lt: fim,
      },
    },
    _sum: {
      total: true,
    },
  });

  return Number(resultado._sum.total || 0);
}

function montarResumo(controle: {
  valorExpressManager: number;
  valorPorFora: number;
  gasolina: number;
  manutencao: number;
  alimentacao: number;
  outrasDespesas: number;
  kmInicial: number | null;
  kmFinal: number | null;
  kmOnlineTotal: number;
  tempoOnlineSegundos: number;
}) {
  const faturamentoTotal =
    Number(controle.valorExpressManager || 0) +
    Number(controle.valorPorFora || 0);

  const despesasTotais =
    Number(controle.gasolina || 0) +
    Number(controle.manutencao || 0) +
    Number(controle.alimentacao || 0) +
    Number(controle.outrasDespesas || 0);

  const lucroLiquido = faturamentoTotal - despesasTotais;

  const kmTotalRodado =
    controle.kmInicial !== null &&
    controle.kmFinal !== null &&
    controle.kmFinal >= controle.kmInicial
      ? controle.kmFinal - controle.kmInicial
      : null;

  const faturamentoPorKmOnline =
    controle.kmOnlineTotal > 0
      ? faturamentoTotal / controle.kmOnlineTotal
      : null;

  const lucroPorKmOnline =
    controle.kmOnlineTotal > 0
      ? lucroLiquido / controle.kmOnlineTotal
      : null;

  return {
    faturamentoTotal,
    despesasTotais,
    lucroLiquido,
    kmTotalRodado,
    faturamentoPorKmOnline,
    lucroPorKmOnline,
    kmForaDoApp:
      kmTotalRodado !== null
        ? Math.max(kmTotalRodado - controle.kmOnlineTotal, 0)
        : null,
    tempoOnlineSegundos: controle.tempoOnlineSegundos,
  };
}

export async function GET(request: Request) {
  try {
    const motoboy = await obterMotoboyAutenticado();

    if (!motoboy) {
      return respostaErro("Acesso negado.", 403);
    }

    const url = new URL(request.url);
    const dataParametro = url.searchParams.get("data");

    const dataReferencia = dataReferenciaBrasil(
      dataParametro ? `${dataParametro}T12:00:00-03:00` : undefined
    );

    if (!dataReferencia) {
      return respostaErro("Data de referência inválida.", 400);
    }

    const valorExpressManager = await calcularValorExpressManager(
      motoboy.id,
      dataReferencia
    );

    const controle = await prisma.controleDiarioMotoboy.upsert({
      where: {
        motoboyId_dataReferencia: {
          motoboyId: motoboy.id,
          dataReferencia,
        },
      },
      update: {
        valorExpressManager,
      },
      create: {
        motoboyId: motoboy.id,
        dataReferencia,
        valorExpressManager,
      },
      include: {
        sessoesOnline: {
          orderBy: {
            iniciadaEm: "asc",
          },
          select: {
            id: true,
            iniciadaEm: true,
            encerradaEm: true,
            kmOnline: true,
            tempoSegundos: true,
            pontosAceitos: true,
            pontosDescartados: true,
          },
        },
      },
    });

    return NextResponse.json({
      controle,
      resumo: montarResumo(controle),
    });
  } catch (erro) {
    console.error("Erro ao consultar controle diário do motoboy:", erro);

    return respostaErro(
      erro instanceof Error
        ? erro.message
        : "Não foi possível consultar o controle diário.",
      500
    );
  }
}

export async function PUT(request: Request) {
  try {
    const motoboy = await obterMotoboyAutenticado();

    if (!motoboy) {
      return respostaErro("Acesso negado.", 403);
    }

    const body = (await request.json()) as ControleDiarioBody;

    const dataReferencia = dataReferenciaBrasil(
      body.dataReferencia
        ? `${body.dataReferencia}T12:00:00-03:00`
        : undefined
    );

    if (!dataReferencia) {
      return respostaErro("Data de referência inválida.", 400);
    }

    const valorPorFora = numeroNaoNegativo(
      body.valorPorFora,
      "Valor por fora"
    );

    const gasolina = numeroNaoNegativo(body.gasolina, "Gasolina");
    const manutencao = numeroNaoNegativo(body.manutencao, "Manutenção");
    const alimentacao = numeroNaoNegativo(body.alimentacao, "Alimentação");
    const outrasDespesas = numeroNaoNegativo(
      body.outrasDespesas,
      "Outras despesas"
    );

    const kmInicial = numeroOpcionalNaoNegativo(
      body.kmInicial,
      "Quilometragem inicial"
    );

    const kmFinal = numeroOpcionalNaoNegativo(
      body.kmFinal,
      "Quilometragem final"
    );

    if (
      kmInicial !== null &&
      kmFinal !== null &&
      kmFinal < kmInicial
    ) {
      return respostaErro(
        "A quilometragem final não pode ser menor que a inicial.",
        400
      );
    }

    const valorExpressManager = await calcularValorExpressManager(
      motoboy.id,
      dataReferencia
    );

    const controle = await prisma.controleDiarioMotoboy.upsert({
      where: {
        motoboyId_dataReferencia: {
          motoboyId: motoboy.id,
          dataReferencia,
        },
      },
      update: {
        valorExpressManager,
        valorPorFora,
        gasolina,
        manutencao,
        alimentacao,
        outrasDespesas,
        descricaoManutencao:
          body.descricaoManutencao?.trim() || null,
        descricaoOutrasDespesas:
          body.descricaoOutrasDespesas?.trim() || null,
        observacoes: body.observacoes?.trim() || null,
        kmInicial,
        kmFinal,
      },
      create: {
        motoboyId: motoboy.id,
        dataReferencia,
        valorExpressManager,
        valorPorFora,
        gasolina,
        manutencao,
        alimentacao,
        outrasDespesas,
        descricaoManutencao:
          body.descricaoManutencao?.trim() || null,
        descricaoOutrasDespesas:
          body.descricaoOutrasDespesas?.trim() || null,
        observacoes: body.observacoes?.trim() || null,
        kmInicial,
        kmFinal,
      },
      include: {
        sessoesOnline: {
          orderBy: {
            iniciadaEm: "asc",
          },
          select: {
            id: true,
            iniciadaEm: true,
            encerradaEm: true,
            kmOnline: true,
            tempoSegundos: true,
            pontosAceitos: true,
            pontosDescartados: true,
          },
        },
      },
    });

    return NextResponse.json({
      ok: true,
      controle,
      resumo: montarResumo(controle),
    });
  } catch (erro) {
    console.error("Erro ao salvar controle diário do motoboy:", erro);

    return respostaErro(
      erro instanceof Error
        ? erro.message
        : "Não foi possível salvar o controle diário.",
      500
    );
  }
}
