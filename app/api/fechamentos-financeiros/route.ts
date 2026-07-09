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
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(fechamentos);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { clienteNome, dataInicio, dataFim, distribuicoes, recebimentos } =
      body;

    if (!clienteNome || !dataInicio || !dataFim || !distribuicoes || !recebimentos) {
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
        dataTele: { gte: inicio, lte: fim },
      },
      orderBy: { dataTele: "asc" },
    });

    const teles = todasTeles.filter((tele) => {
      const saldo = Number(tele.total || 0) - Number(tele.valorRecebido || 0);
      return saldo > 0.009;
    });

    const totalBruto = teles.reduce((total, tele) => {
      return total + (Number(tele.total || 0) - Number(tele.valorRecebido || 0));
    }, 0);

    const totalRecebidoAgora = recebimentos.reduce((total: number, item: any) => {
      return total + converterValor(item.valorRecebido);
    }, 0);

    if (totalRecebidoAgora > totalBruto + 0.009) {
      return NextResponse.json(
        { erro: "O valor recebido não pode ser maior que o total em aberto." },
        { status: 400 }
      );
    }

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

    let valorRestanteGlobal = totalRecebidoAgora;

    const primeiroRecebedor = recebimentos.find(
      (item: any) => converterValor(item.valorRecebido) > 0
    );

    for (const tele of teles) {
      const totalTele = Number(tele.total || 0);
      const recebidoAnterior = Number(tele.valorRecebido || 0);
      const saldoTele = Math.max(totalTele - recebidoAnterior, 0);

      const recebidoAgora = Math.min(valorRestanteGlobal, saldoTele);
      valorRestanteGlobal -= recebidoAgora;

      const novoRecebido = recebidoAnterior + recebidoAgora;
      const quitouTele = novoRecebido >= totalTele - 0.009;

      await prisma.tele.update({
        where: { id: tele.id },
        data: {
          fechamentoId: quitouTele ? fechamento.id : null,
          recebimento:
            novoRecebido > 0
              ? primeiroRecebedor?.recebedorTipo === "MOTOBOY"
                ? "MOTOBOY"
                : "ESCRITORIO"
              : "PENDENTE",
          valorRecebido: novoRecebido,
          dataRecebimento: novoRecebido > 0 ? new Date() : null,
          motoboyRecebedor:
            novoRecebido > 0 && primeiroRecebedor?.recebedorTipo === "MOTOBOY"
              ? primeiroRecebedor.motoboyNome
              : null,
        },
      });
    }

    for (const distribuicao of distribuicoes) {
      await prisma.fechamentoFinanceiroItem.create({
        data: {
          fechamentoId: fechamento.id,
          motoboyId: distribuicao.motoboyId || null,
          motoboyNome: distribuicao.motoboyNome,
          totalBruto: Number(distribuicao.total || 0),
          valorRecebido: 0,
          saldo: 0,
          recebedorTipo: "ESCRITORIO",
        },
      });
    }

    for (const recebimento of recebimentos) {
      const valorRecebidoInformado = converterValor(recebimento.valorRecebido);

      if (
        valorRecebidoInformado > 0 &&
        recebimento.recebedorTipo === "MOTOBOY" &&
        recebimento.motoboyId
      ) {
        await prisma.movimentoFinanceiroMotoboy.create({
          data: {
            motoboyId: recebimento.motoboyId,
            tipo: "CLIENTE",
            valor: valorRecebidoInformado,
            clienteNome,
            descricao: "Pagamento direto do cliente",
            fechamentoId: fechamento.id,
            dataReferenciaInicio: inicio,
            dataReferenciaFim: fim,
          },
        });
      }
    }

    const fechamentoQuitado = totalRecebidoAgora >= totalBruto - 0.009;

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