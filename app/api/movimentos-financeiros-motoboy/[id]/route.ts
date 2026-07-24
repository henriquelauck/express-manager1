import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function respostaErro(mensagem: string, status: number) {
  return NextResponse.json({ erro: mensagem }, { status });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    if (!id) {
      return respostaErro("O identificador do movimento é obrigatório.", 400);
    }

    const movimento = await prisma.movimentoFinanceiroMotoboy.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        tipo: true,
        teleId: true,
        fechamentoId: true,
      },
    });

    if (!movimento) {
      return respostaErro("Movimento financeiro não encontrado.", 404);
    }

    if (movimento.tipo === "CLIENTE" || movimento.teleId || movimento.fechamentoId) {
      return respostaErro(
        "Este movimento foi gerado automaticamente por uma tele ou fechamento e não pode ser excluído por aqui.",
        409
      );
    }

    await prisma.movimentoFinanceiroMotoboy.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error("Erro ao excluir movimento:", erro);

    return respostaErro("Não foi possível excluir o movimento financeiro.", 500);
  }
}
