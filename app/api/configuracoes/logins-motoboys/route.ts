import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  const motoboys = await prisma.motoboy.findMany({
    include: {
      user: true,
    },
    orderBy: {
      nome: "asc",
    },
  });

  return NextResponse.json(motoboys);
}

export async function POST(request: Request) {
  const body = await request.json();

  if (!body.motoboyId || !body.email || !body.senha) {
    return NextResponse.json(
      { erro: "Preencha motoboy, e-mail e senha." },
      { status: 400 }
    );
  }

  const motoboy = await prisma.motoboy.findUnique({
    where: {
      id: body.motoboyId,
    },
  });

  if (!motoboy) {
    return NextResponse.json(
      { erro: "Motoboy não encontrado." },
      { status: 404 }
    );
  }

  const senhaHash = await bcrypt.hash(body.senha, 10);

  const usuario = await prisma.user.upsert({
    where: {
      email: body.email,
    },
    update: {
      nome: motoboy.nome,
      senhaHash,
      role: "MOTOBOY",
    },
    create: {
      nome: motoboy.nome,
      email: body.email,
      senhaHash,
      role: "MOTOBOY",
    },
  });

  await prisma.motoboy.update({
    where: {
      id: motoboy.id,
    },
    data: {
      userId: usuario.id,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function PUT(request: Request) {
  const body = await request.json();

  const dados: any = {};

  if (body.email) {
    dados.email = body.email;
  }

  if (body.senha) {
    dados.senhaHash = await bcrypt.hash(body.senha, 10);
  }

  await prisma.user.update({
    where: {
      id: body.userId,
    },
    data: dados,
  });

  return NextResponse.json({ ok: true });
}