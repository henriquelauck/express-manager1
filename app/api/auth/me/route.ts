import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("express_user_id")?.value;

  if (!userId) {
    return NextResponse.json({ usuario: null }, { status: 401 });
  }

  const usuario = await prisma.user.findUnique({
    where: { id: userId },
    include: { motoboy: true },
  });

  if (!usuario) {
    return NextResponse.json({ usuario: null }, { status: 401 });
  }

  return NextResponse.json({
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      role: usuario.role,
      motoboyId: usuario.motoboy?.id || null,
    },
  });
}