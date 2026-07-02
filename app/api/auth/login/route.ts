import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  const body = await request.json();

  const usuario = await prisma.user.findUnique({
    where: {
      email: body.email,
    },
    include: {
      motoboy: true,
    },
  });

  if (!usuario || !usuario.senhaHash) {
    return NextResponse.json(
      { erro: "E-mail ou senha inválidos." },
      { status: 401 }
    );
  }

  const senhaValida = await bcrypt.compare(body.senha, usuario.senhaHash);

  if (!senhaValida) {
    return NextResponse.json(
      { erro: "E-mail ou senha inválidos." },
      { status: 401 }
    );
  }

  const resposta = NextResponse.json({
    ok: true,
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      role: usuario.role,
      motoboyId: usuario.motoboy?.id || null,
    },
  });

  resposta.cookies.set("express_user_id", usuario.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  resposta.cookies.set("express_user_role", usuario.role, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return resposta;
}