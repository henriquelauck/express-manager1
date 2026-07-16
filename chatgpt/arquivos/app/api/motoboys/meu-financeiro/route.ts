import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("express_user_id")?.value;

  if (!userId) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const usuario = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      motoboy: true,
    },
  });

  if (!usuario?.motoboy) {
    return NextResponse.json({ erro: "Motoboy não encontrado." }, { status: 404 });
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
}