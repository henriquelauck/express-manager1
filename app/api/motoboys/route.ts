import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const motoboys = await prisma.motoboy.findMany({
    orderBy: {
      nome: "asc",
    },
  });

  return NextResponse.json(motoboys);
}

export async function POST(request: Request) {
  const body = await request.json();

  const motoboy = await prisma.motoboy.create({
    data: {
      nome: body.nome,
      telefone: body.telefone,
      moto: body.moto,
      placa: body.placa,
    },
  });

  return NextResponse.json(motoboy);
}

export async function PUT(request: Request) {
  const body = await request.json();

  const motoboy = await prisma.motoboy.update({
    where: {
      id: body.id,
    },
    data: {
      nome: body.nome,
      telefone: body.telefone,
      moto: body.moto,
      placa: body.placa,
    },
  });

  return NextResponse.json(motoboy);
}