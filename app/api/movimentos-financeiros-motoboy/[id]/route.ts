import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  await prisma.movimentoFinanceiroMotoboy.delete({
    where: { id },
  });

  return NextResponse.json({ ok: true });
}