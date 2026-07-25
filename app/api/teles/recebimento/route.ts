import { prisma } from "@/lib/prisma";
import type { TipoMovimentoFinanceiro } from "@prisma/client";
import { NextResponse } from "next/server";

type RecebimentoBody = {
  id?: string;
  recebimento?: string;
  valor?: number | string;
  motoboy?: string | null;
};

function converterValor(valor: unknown) {
  const numero = Number(String(valor ?? "0").replace(",", "."));
  return Number.isFinite(numero) ? numero : 0;
}

function normalizarRecebimento(valor: unknown) {
  const recebimento = String(valor || "")
    .trim()
    .toLowerCase();

  if (recebimento === "pendente" || recebimento === "escritorio" || recebimento === "motoboy") {
    return recebimento;
  }

  return null;
}

function recebimentoParaBanco(recebimento: string) {
  const mapa = {
    pendente: "PENDENTE",
    escritorio: "ESCRITORIO",
    motoboy: "MOTOBOY",
  } as const;

  return mapa[recebimento as keyof typeof mapa] || "PENDENTE";
}

function respostaErro(mensagem: string, status: number) {
  return NextResponse.json({ erro: mensagem }, { status });
}

async function sincronizarMovimentoMotoboy({
  tx,
  teleId,
  solicitante,
  recebimento,
  valorRecebido,
  motoboyRecebedor,
}: {
  tx: any;
  teleId: string;
  solicitante: string;
  recebimento: string;
  valorRecebido: number;
  motoboyRecebedor: string | null;
}) {
  const tipoMovimento: TipoMovimentoFinanceiro = "CLIENTE";

  const movimentosExistentes = await tx.movimentoFinanceiroMotoboy.findMany({
    where: {
      teleId,
      tipo: tipoMovimento,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const deveTerMovimento =
    recebimento === "motoboy" && valorRecebido > 0.009 && Boolean(motoboyRecebedor);

  if (!deveTerMovimento) {
    if (movimentosExistentes.length > 0) {
      await tx.movimentoFinanceiroMotoboy.deleteMany({
        where: {
          teleId,
          tipo: tipoMovimento,
        },
      });
    }

    return;
  }

  const motoboy = await tx.motoboy.findFirst({
    where: {
      nome: motoboyRecebedor!,
    },
    select: {
      id: true,
      nome: true,
    },
  });

  if (!motoboy) {
    throw new Error("O motoboy selecionado não foi encontrado.");
  }

  const dadosMovimento = {
    motoboyId: motoboy.id,
    tipo: tipoMovimento,
    clienteNome: solicitante || null,
    valor: valorRecebido,
    descricao: `Recebimento da tele de ${solicitante}`,
    teleId,
    fechamentoId: null,
  };

  if (movimentosExistentes.length === 0) {
    await tx.movimentoFinanceiroMotoboy.create({
      data: dadosMovimento,
    });

    return;
  }

  const movimentoPrincipal = movimentosExistentes[0];

  await tx.movimentoFinanceiroMotoboy.update({
    where: {
      id: movimentoPrincipal.id,
    },
    data: dadosMovimento,
  });

  if (movimentosExistentes.length > 1) {
    await tx.movimentoFinanceiroMotoboy.deleteMany({
      where: {
        teleId,
        tipo: tipoMovimento,
        id: {
          not: movimentoPrincipal.id,
        },
      },
    });
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as RecebimentoBody;

    const teleId = String(body.id || "").trim();
    const recebimentoInformado = normalizarRecebimento(body.recebimento);

    if (!teleId) {
      return respostaErro("Tele não informada.", 400);
    }

    if (!recebimentoInformado) {
      return respostaErro("Situação do recebimento inválida.", 400);
    }

    const teleAtual = await prisma.tele.findUnique({
      where: {
        id: teleId,
      },
      select: {
        id: true,
        solicitante: true,
        total: true,
      },
    });

    if (!teleAtual) {
      return respostaErro("Tele não encontrada.", 404);
    }

    const total = Number(teleAtual.total || 0);
    const valorInformado = recebimentoInformado === "pendente" ? 0 : converterValor(body.valor);

    if (valorInformado < 0) {
      return respostaErro("O valor recebido não pode ser negativo.", 400);
    }

    if (valorInformado > total + 0.009) {
      return respostaErro("O valor recebido não pode ser maior que o total da tele.", 400);
    }

    const possuiRecebimento = valorInformado > 0.009;

    const recebimento = possuiRecebimento ? recebimentoInformado : "pendente";

    const motoboyRecebedor =
      recebimento === "motoboy" ? String(body.motoboy || "").trim() || null : null;

    if (recebimento === "motoboy" && !motoboyRecebedor) {
      return respostaErro("Selecione o motoboy que recebeu.", 400);
    }

    const teleAtualizada = await prisma.$transaction(async (tx) => {
      const tele = await tx.tele.update({
        where: {
          id: teleId,
        },
        data: {
          recebimento: recebimentoParaBanco(recebimento),
          valorRecebido: valorInformado,
          dataRecebimento: possuiRecebimento ? new Date() : null,
          motoboyRecebedor,
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

      await sincronizarMovimentoMotoboy({
        tx,
        teleId: tele.id,
        solicitante: tele.solicitante,
        recebimento,
        valorRecebido: valorInformado,
        motoboyRecebedor,
      });

      return tele;
    });

    return NextResponse.json({
      ok: true,
      tele: {
        id: teleAtualizada.id,
        recebimento: recebimento,
        valorRecebido: Number(teleAtualizada.valorRecebido || 0),
        dataRecebimento: teleAtualizada.dataRecebimento,
        motoboyRecebedor: teleAtualizada.motoboyRecebedor,
        recebido:
          Number(teleAtualizada.valorRecebido || 0) >= Number(teleAtualizada.total || 0) - 0.009,
      },
    });
  } catch (erro) {
    console.error("Erro ao atualizar recebimento da tele:", erro);

    return respostaErro(
      erro instanceof Error ? erro.message : "Não foi possível atualizar o recebimento.",
      500
    );
  }
}
