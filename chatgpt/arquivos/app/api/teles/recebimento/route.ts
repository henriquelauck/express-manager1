import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function recebimentoParaBanco(recebimento: string) {
  const mapa: any = {
    pendente: "PENDENTE",
    escritorio: "ESCRITORIO",
    motoboy: "MOTOBOY",
  };

  return mapa[recebimento] || "PENDENTE";
}

export async function PUT(request: Request) {
  const body = await request.json();

  const valor = Number(String(body.valor || "0").replace(",", "."));

  const tele = await prisma.tele.update({
    where: { id: body.id },
    data: {
      recebimento: recebimentoParaBanco(body.recebimento),
      valorRecebido: body.recebimento === "pendente" ? 0 : valor,
      dataRecebimento:
        body.recebimento === "pendente" ? null : new Date(),
      motoboyRecebedor:
        body.recebimento === "motoboy" ? body.motoboy || null : null,
    },
  });

  return NextResponse.json({ ok: true, tele });
}