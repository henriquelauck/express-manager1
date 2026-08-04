import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

function texto(valor: unknown) {
  return typeof valor === "string" ? valor.trim() : "";
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const solicitante = texto(searchParams.get("solicitante"));

    if (!solicitante) {
      return NextResponse.json([]);
    }

    const locais = await prisma.localSolicitante.findMany({
      where: { solicitante },
      orderBy: { cliente: "asc" },
    });

    return NextResponse.json(locais);
  } catch (error) {
    console.error("Erro ao carregar locais do solicitante:", error);
    return NextResponse.json({ erro: "Não foi possível carregar os locais salvos." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const solicitante = texto(body.solicitante);
    const cliente = texto(body.cliente);
    const endereco = texto(body.endereco);
    const contato = texto(body.contato);
    const observacaoFixa = texto(body.observacaoFixa);

    if (!solicitante || !cliente || !endereco) {
      return NextResponse.json(
        { erro: "Solicitante, cliente e endereço são obrigatórios." },
        { status: 400 }
      );
    }

    const local = await prisma.localSolicitante.upsert({
      where: {
        solicitante_cliente: {
          solicitante,
          cliente,
        },
      },
      update: {
        endereco,
        contato: contato || null,
        observacaoFixa: observacaoFixa || null,
      },
      create: {
        solicitante,
        cliente,
        endereco,
        contato: contato || null,
        observacaoFixa: observacaoFixa || null,
      },
    });

    return NextResponse.json(local);
  } catch (error) {
    console.error("Erro ao salvar local do solicitante:", error);
    return NextResponse.json({ erro: "Não foi possível salvar o local." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = texto(searchParams.get("id"));

    if (!id) {
      return NextResponse.json({ erro: "Local não informado." }, { status: 400 });
    }

    await prisma.localSolicitante.delete({ where: { id } });
    return NextResponse.json({ sucesso: true });
  } catch (error) {
    console.error("Erro ao excluir local do solicitante:", error);
    return NextResponse.json({ erro: "Não foi possível excluir o local." }, { status: 500 });
  }
}
