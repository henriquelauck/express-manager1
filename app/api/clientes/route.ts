import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const clientes = await prisma.cliente.findMany({
    orderBy: {
      nome: "asc",
    },
  });

  return NextResponse.json(clientes);
}

export async function POST(request: Request) {
  const body = await request.json();

  const cliente = await prisma.cliente.create({
    data: {
      nome: body.nome,
      telefone: body.telefone,
      endereco1: body.endereco1,
      endereco2: body.endereco2,
      formaCobranca: body.formaCobranca || "SEMANAL",
    },
  });

  return NextResponse.json(cliente);
}

export async function PUT(request: Request) {
  const body = await request.json();

  const cliente = await prisma.cliente.update({
    where: {
      id: body.id,
    },
    data: {
      nome: body.nome,
      telefone: body.telefone,
      endereco1: body.endereco1,
      endereco2: body.endereco2,
      formaCobranca: body.formaCobranca || "SEMANAL",
    },
  });

  return NextResponse.json(cliente);
}