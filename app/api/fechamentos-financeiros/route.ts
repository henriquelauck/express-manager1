import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function dataInicioFim(dataInicio: string, dataFim: string) {
  return {
    inicio: new Date(`${dataInicio}T00:00:00`),
    fim: new Date(`${dataFim}T23:59:59`),
  };
}

function converterValor(valor: any) {
  return Number(String(valor || "0").replace(",", "."));
}

export async function GET() {
  const fechamentos = await prisma.fechamentoFinanceiro.findMany({
    include: {
      cliente: true,
      teles: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json(fechamentos);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { clienteNome, dataInicio, dataFim, distribuicoes } = body;

    if (!clienteNome || !dataInicio || !dataFim || !distribuicoes) {
      return NextResponse.json(
        { erro: "Dados obrigatórios faltando." },
        { status: 400 }
      );
    }

    const { inicio, fim } = dataInicioFim(dataInicio, dataFim);

    const cliente = await prisma.cliente.findFirst({
      where: { nome: clienteNome },
    });

    const teles = await prisma.tele.findMany({
      where: {
        solicitante: clienteNome,
        dataTele: {
          gte: inicio,
          lte: fim,
        },
        fechamentoId: null,
      },
    });

    const totalBruto = teles.reduce((total, tele) => total + tele.total, 0);

    const fechamento = await prisma.fechamentoFinanceiro.create({
      data: {
        clienteId: cliente?.id || null,
        clienteNome,
        dataInicio: inicio,
        dataFim: fim,
        totalBruto,
        recebedorTipo: "ESCRITORIO",
        status: "FECHADO",
      },
    });

    for (const distribuicao of distribuicoes) {
      const telesDoMotoboy = teles.filter(
  (tele) => (tele.motoboyNome || "") === distribuicao.motoboyNome
);

      const ids = telesDoMotoboy.map((tele) => tele.id);

      const valorRecebido = converterValor(distribuicao.valorRecebido);

      await prisma.tele.updateMany({
        where: {
          id: {
            in: ids,
          },
        },
        data: {
          fechamentoId: fechamento.id,
          recebimento:
            valorRecebido > 0
              ? distribuicao.recebedorTipo === "MOTOBOY"
                ? "MOTOBOY"
                : "ESCRITORIO"
              : "PENDENTE",
          valorRecebido,
          dataRecebimento: valorRecebido > 0 ? new Date() : null,
          motoboyRecebedor:
            valorRecebido > 0 && distribuicao.recebedorTipo === "MOTOBOY"
              ? distribuicao.motoboyNome
              : null,
        },
      });

      

      
    }

    return NextResponse.json({
      ok: true,
      fechamento,
    });
  } catch (error: any) {
    console.error("ERRO FECHAMENTO:", error);

    return NextResponse.json(
      {
        erro: error.message || "Erro ao fechar cliente.",
      },
      { status: 500 }
    );
  }
}