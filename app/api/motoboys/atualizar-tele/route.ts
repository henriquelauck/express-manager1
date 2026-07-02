import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

function statusParaBanco(status: string) {
  const mapa: any = {
    "Em rota": "EM_ROTA",
    Entregue: "ENTREGUE",
  };

  return mapa[status] || "AGUARDANDO_CLIENTE";
}

export async function PUT(request: Request) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("express_user_id")?.value;

  if (!userId) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  const usuario = await prisma.user.findUnique({
    where: { id: userId },
    include: { motoboy: true },
  });

  if (!usuario?.motoboy) {
    return NextResponse.json({ erro: "Acesso negado." }, { status: 403 });
  }

  const body = await request.json();

  const tele = await prisma.tele.updateMany({
    where: {
      id: body.id,
      motoboyId: usuario.motoboy.id,
    },
    data: {
      status: statusParaBanco(body.status),
    },
  });

  return NextResponse.json({ ok: true, tele });
}