import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function respostaErro(mensagem: string, status: number) {
  return NextResponse.json({ erro: mensagem }, { status });
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("express_user_id")?.value;

    if (!userId) {
      return respostaErro("Não autenticado.", 401);
    }

    const usuario = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        role: true,
        motoboy: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!usuario || usuario.role !== "MOTOBOY" || !usuario.motoboy) {
      return respostaErro("Acesso negado.", 403);
    }

    const movimentos = await prisma.movimentoFinanceiroMotoboy.findMany({
      where: {
        motoboyId: usuario.motoboy.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(
      movimentos.map((movimento) => ({
        id: movimento.id,
        motoboyId: movimento.motoboyId,
        tipo: movimento.tipo,
        valor: movimento.valor,
        clienteNome: movimento.clienteNome,
        descricao: movimento.descricao,
        teleId: movimento.teleId,
        fechamentoId: movimento.fechamentoId,
        dataReferenciaInicio: movimento.dataReferenciaInicio,
        dataReferenciaFim: movimento.dataReferenciaFim,
        criadoEm: movimento.createdAt,
      }))
    );
  } catch (erro) {
    console.error("Erro ao carregar financeiro do motoboy:", erro);

    return respostaErro("Não foi possível carregar seu financeiro.", 500);
  }
}
