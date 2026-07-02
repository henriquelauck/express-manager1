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
    include: { motoboy: true },
  });

  if (!usuario || usuario.role !== "MOTOBOY" || !usuario.motoboy) {
    return NextResponse.json({ erro: "Acesso negado." }, { status: 403 });
  }

  const teles = await prisma.tele.findMany({
    where: {
      motoboyId: usuario.motoboy.id,
    },
    include: {
      paradas: {
        orderBy: { ordem: "asc" },
      },
      cliente: true,
      motoboy: true,
    },
    orderBy: {
      dataTele: "desc",
    },
  });

  return NextResponse.json(teles);
}