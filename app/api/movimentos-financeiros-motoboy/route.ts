import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function dataOuNull(data: any) {
  if (!data) return null;
  return new Date(`${data}T12:00:00`);
}

export async function GET() {
  const movimentos = await prisma.movimentoFinanceiroMotoboy.findMany({
    include: {
      motoboy: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json(
    movimentos.map((movimento) => ({
      id: movimento.id,
      clienteNome: movimento.clienteNome,
      motoboyId: movimento.motoboyId,
      motoboy: movimento.motoboy.nome,
      tipo: movimento.tipo,
      valor: movimento.valor,
      descricao: movimento.descricao,
      teleId: movimento.teleId,
      fechamentoId: movimento.fechamentoId,
      dataReferenciaInicio: movimento.dataReferenciaInicio,
      dataReferenciaFim: movimento.dataReferenciaFim,
      criadoEm: movimento.createdAt,
    }))
  );
}

export async function POST(request: Request) {
  const body = await request.json();

  if (!body.motoboyId || !body.valor || !body.tipo) {
    return NextResponse.json(
      { erro: "Motoboy, valor e tipo são obrigatórios." },
      { status: 400 }
    );
  }

  const movimento = await prisma.movimentoFinanceiroMotoboy.create({
    data: {
      motoboyId: body.motoboyId,
      tipo: body.tipo,
      clienteNome: body.clienteNome || null,
      valor: Number(body.valor),
      descricao: body.descricao || "",
      teleId: body.teleId || null,
      fechamentoId: body.fechamentoId || null,
      dataReferenciaInicio: dataOuNull(body.dataReferenciaInicio),
      dataReferenciaFim: dataOuNull(body.dataReferenciaFim),
    },
    include: {
      motoboy: true,
    },
  });

  return NextResponse.json({
    id: movimento.id,
    motoboyId: movimento.motoboyId,
    motoboy: movimento.motoboy.nome,
    tipo: movimento.tipo,
    clienteNome: movimento.clienteNome,
    valor: movimento.valor,
    descricao: movimento.descricao,
    teleId: movimento.teleId,
    fechamentoId: movimento.fechamentoId,
    dataReferenciaInicio: movimento.dataReferenciaInicio,
    dataReferenciaFim: movimento.dataReferenciaFim,
    criadoEm: movimento.createdAt,
  });
}