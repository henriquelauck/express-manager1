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
      itens: true,
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

    const todasTeles = await prisma.tele.findMany({
      where: {
        solicitante: clienteNome,
        dataTele: {
          gte: inicio,
          lte: fim,
        },
      },
    });

    const teles = todasTeles.filter((tele) => {
      const saldo = Number(tele.total || 0) - Number(tele.valorRecebido || 0);
      return saldo > 0.009;
    });

    const totalBruto = teles.reduce(
      (total, tele) => total + (Number(tele.total || 0) - Number(tele.valorRecebido || 0)),
      0
    );

    const fechamento = await prisma.fechamentoFinanceiro.create({
      data: {
        clienteId: cliente?.id || null,
        clienteNome,
        dataInicio: inicio,
        dataFim: fim,
        totalBruto,
        recebedorTipo: "ESCRITORIO",
        status: "ABERTO",
      },
    });

    let fechamentoQuitado = true;

    for (const distribuicao of distribuicoes) {
      const telesDoMotoboy = teles.filter(
        (tele) => (tele.motoboyNome || "") === distribuicao.motoboyNome
      );

      let valorRestanteParaAplicar = converterValor(distribuicao.valorRecebido);
      const valorRecebidoInformado = converterValor(distribuicao.valorRecebido);

      for (const tele of telesDoMotoboy) {
        const totalTele = Number(tele.total || 0);
        const recebidoAnterior = Number(tele.valorRecebido || 0);
        const saldoTele = Math.max(totalTele - recebidoAnterior, 0);

        const recebidoAgora = Math.min(valorRestanteParaAplicar, saldoTele);
        valorRestanteParaAplicar -= recebidoAgora;

        const novoRecebido = recebidoAnterior + recebidoAgora;
        const quitouTele = novoRecebido >= totalTele - 0.009;

        if (!quitouTele) fechamentoQuitado = false;

        await prisma.tele.update({
          where: { id: tele.id },
          data: {
            fechamentoId: quitouTele ? fechamento.id : null,
            recebimento:
              novoRecebido > 0
                ? distribuicao.recebedorTipo === "MOTOBOY"
                  ? "MOTOBOY"
                  : "ESCRITORIO"
                : "PENDENTE",
            valorRecebido: novoRecebido,
            dataRecebimento: novoRecebido > 0 ? new Date() : null,
            motoboyRecebedor:
              novoRecebido > 0 && distribuicao.recebedorTipo === "MOTOBOY"
                ? distribuicao.motoboyNome
                : null,
          },
        });
      }

      const saldo = Math.max(Number(distribuicao.total || 0) - valorRecebidoInformado, 0);

      if (saldo > 0.009) fechamentoQuitado = false;

      await prisma.fechamentoFinanceiroItem.create({
        data: {
          fechamentoId: fechamento.id,
          motoboyId: distribuicao.motoboyId || null,
          motoboyNome: distribuicao.motoboyNome,
          totalBruto: Number(distribuicao.total || 0),
          valorRecebido: valorRecebidoInformado,
          saldo,
          recebedorTipo: distribuicao.recebedorTipo,
        },
      });

      if (
        valorRecebidoInformado > 0 &&
        distribuicao.recebedorTipo === "MOTOBOY" &&
        distribuicao.motoboyId
      ) {
        await prisma.movimentoFinanceiroMotoboy.create({
          data: {
            motoboyId: distribuicao.motoboyId,
            tipo: "CLIENTE",
            valor: valorRecebidoInformado,
            clienteNome,
            descricao: "Pagamento direto do cliente",
            fechamentoId: fechamento.id,
          },
        });
      }
    }

    await prisma.fechamentoFinanceiro.update({
      where: { id: fechamento.id },
      data: {
        status: fechamentoQuitado ? "FECHADO" : "ABERTO",
      },
    });

    return NextResponse.json({
      ok: true,
      fechamentoId: fechamento.id,
    });
  } catch (error: any) {
    console.error("ERRO FECHAMENTO:", error);

    return NextResponse.json(
      { erro: error.message || "Erro ao fechar cliente." },
      { status: 500 }
    );
  }
}