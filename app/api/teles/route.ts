import { prisma } from "@/lib/prisma";
import type { StatusTele as StatusTeleBanco } from "@prisma/client";
import { NextResponse } from "next/server";

function statusParaBanco(status: string): StatusTeleBanco {
  const mapa: Record<string, StatusTeleBanco> = {
    "Aguardando cliente": "AGUARDANDO_CLIENTE",
    "Aguardando motoboy disponível": "AGUARDANDO_MOTOBOY",
    "Aguardando coleta": "AGUARDANDO_COLETA",
    "Em rota": "EM_ROTA",
    Entregue: "ENTREGUE",
  };

  return mapa[status] ?? "AGUARDANDO_CLIENTE";
}
function statusParaTela(status: string) {
  const mapa: Record<string, string> = {
    AGUARDANDO_CLIENTE: "Aguardando cliente",
    AGUARDANDO_MOTOBOY: "Aguardando motoboy disponível",
    AGUARDANDO_COLETA: "Aguardando coleta",
    EM_ROTA: "Em rota",
    ENTREGUE: "Entregue",
  };

  return mapa[status] || "Aguardando cliente";
}

function tipoParadaParaBanco(tipo: string) {
  const mapa: any = {
    Entrega: "ENTREGA",
    Coleta: "COLETA",
    Trocar: "TROCAR",
    "Entrega e coleta": "ENTREGA_E_COLETA",
  };

  return mapa[tipo] || "ENTREGA";
}

function tipoParadaParaTela(tipo: string) {
  const mapa: any = {
    ENTREGA: "Entrega",
    COLETA: "Coleta",
    TROCAR: "Trocar",
    ENTREGA_E_COLETA: "Entrega e coleta",
  };

  return mapa[tipo] || "Entrega";
}

function recebimentoParaBanco(recebimento: string) {
  const mapa: any = {
    pendente: "PENDENTE",
    escritorio: "ESCRITORIO",
    motoboy: "MOTOBOY",
  };

  return mapa[recebimento] || "PENDENTE";
}

function recebimentoParaTela(recebimento: string) {
  const mapa: any = {
    PENDENTE: "pendente",
    ESCRITORIO: "escritorio",
    MOTOBOY: "motoboy",
  };

  return mapa[recebimento] || "pendente";
}

function formaCobrancaParaBanco(forma: string) {
  const mapa: any = {
    na_hora: "NA_HORA",
    semanal: "SEMANAL",
    quinzenal: "QUINZENAL",
    mensal: "MENSAL",
  };

  return mapa[forma] || "SEMANAL";
}

function formatarData(data: Date) {
  return data.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });
}

function formatarTeleParaTela(tele: any) {
  const primeiraParada = tele.paradas?.[0];

  return {
    id: tele.id,
    solicitante: tele.solicitante,
    motoboyId: tele.motoboyId,
    motoboy: tele.motoboyNome || tele.motoboy?.nome || "",
    status: statusParaTela(tele.status),
    criadoEm: formatarData(tele.createdAt),
    dataOperacao: formatarData(tele.dataTele),
    dataTele: tele.dataTele,
    distanciaKm: tele.distanciaKm,
    tempoMinutos: tele.tempoMinutos,

    valorBase: tele.valorBase,
    retorno: tele.retorno,
    espera: tele.espera,
    total: tele.total,

    recebido: Number(tele.valorRecebido || 0) >= Number(tele.total || 0) - 0.009,
    recebimento: recebimentoParaTela(tele.recebimento),
    formaCobranca: tele.formaCobranca?.toLowerCase() || "semanal",
    valorRecebido: tele.valorRecebido,
    dataRecebimento: tele.dataRecebimento,
    motoboyRecebedor: tele.motoboyRecebedor,
    fechamentoId: tele.fechamentoId,

    observacaoGeral: tele.observacaoGeral || "",

    paradas: tele.paradas.map((parada: any) => ({
      id: parada.id,
      tipo: tipoParadaParaTela(parada.tipo),
      cliente: parada.cliente,
      endereco: parada.endereco,
      contato: parada.contato || "",
      observacao: parada.observacao || "",
    })),

    tipoRota: tele.tipoRota,
    nomeCliente: primeiraParada?.cliente || "",
    endereco: primeiraParada?.endereco || "",
    contato: primeiraParada?.contato || "",
    observacao: primeiraParada?.observacao || "",
    valor: tele.total.toFixed(2).replace(".", ","),
    esperaMinutos: 0,
  };
}

export async function GET() {
  const teles = await prisma.tele.findMany({
    include: {
      paradas: {
        orderBy: {
          ordem: "asc",
        },
      },
      motoboy: true,
      cliente: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json(teles.map(formatarTeleParaTela));
}

export async function POST(request: Request) {
  const body = await request.json();

  const cliente = await prisma.cliente.findFirst({
    where: {
      nome: body.solicitante,
    },
  });

  const motoboy = body.motoboy
    ? await prisma.motoboy.findFirst({
        where: {
          nome: body.motoboy,
        },
      })
    : null;

  const tele = await prisma.tele.create({
    data: {
      clienteId: cliente?.id,
      solicitante: body.solicitante,
      dataTele: body.dataTele ? new Date(`${body.dataTele}T12:00:00`) : new Date(),
      motoboyId: motoboy?.id,
      motoboyNome: body.motoboy || "",
      status: statusParaBanco(body.status || "Aguardando cliente"),
      tipoRota: body.tipoRota || "Entrega",

      valorBase: body.valorBase || 0,
      retorno: body.retorno || 0,
      espera: body.espera || 0,
      total: body.total || Number(String(body.valor || "0").replace(",", ".")),

      distanciaKm: body.distanciaKm || null,
      tempoMinutos: body.tempoMinutos || null,

      recebimento: recebimentoParaBanco(body.recebimento || "pendente"),
      formaCobranca: formaCobrancaParaBanco(body.formaCobranca || "semanal"),
      valorRecebido: body.valorRecebido || 0,
      motoboyRecebedor: body.motoboyRecebedor || null,
      fechamentoId: body.fechamentoId || null,

      observacaoGeral: body.observacaoGeral || "",

      paradas: {
        create: body.paradas.map((parada: any, index: number) => ({
          tipo: tipoParadaParaBanco(parada.tipo),
          cliente: parada.cliente || parada.nomeCliente || "",
          endereco: parada.endereco || "",
          contato: parada.contato || "",
          observacao: parada.observacao || "",
          ordem: index + 1,
        })),
      },
    },
    include: {
      paradas: {
        orderBy: {
          ordem: "asc",
        },
      },
      motoboy: true,
      cliente: true,
    },
  });

  return NextResponse.json(formatarTeleParaTela(tele));
}
export async function PUT(request: Request) {
  try {
    const body = await request.json();

    const totalInformado = Number(
      body.total ?? Number(String(body.valor || "0").replace(",", "."))
    );
    const valorRecebidoInformado = Math.max(
      0,
      Math.min(Number(body.valorRecebido || 0), totalInformado)
    );
    const possuiRecebimento = valorRecebidoInformado > 0.009;

    const motoboy = body.motoboy
      ? await prisma.motoboy.findFirst({
          where: { nome: body.motoboy },
        })
      : null;

    await prisma.teleParada.deleteMany({
      where: { teleId: body.id },
    });

    const tele = await prisma.tele.update({
      where: { id: body.id },
      data: {
        solicitante: body.solicitante,
        dataTele: body.dataTele ? new Date(`${body.dataTele.slice(0, 10)}T12:00:00`) : undefined,

        motoboyId: motoboy?.id || null,
        motoboyNome: body.motoboy || "",
        status: statusParaBanco(body.status),
        tipoRota: body.tipoRota || "Entrega",

        valorBase: body.valorBase || Number(String(body.valor || "0").replace(",", ".")),
        retorno: body.retorno || 0,
        espera: body.espera || 0,
        total: totalInformado,

        recebimento: possuiRecebimento
          ? recebimentoParaBanco(body.recebimento || "escritorio")
          : "PENDENTE",
        formaCobranca: formaCobrancaParaBanco(body.formaCobranca || "semanal"),
        valorRecebido: valorRecebidoInformado,
        dataRecebimento: possuiRecebimento
          ? body.dataRecebimento
            ? new Date(body.dataRecebimento)
            : new Date()
          : null,
        motoboyRecebedor:
          possuiRecebimento && body.recebimento === "motoboy"
            ? body.motoboyRecebedor || null
            : null,
        fechamentoId: body.fechamentoId || null,
        observacaoGeral: body.observacaoGeral || "",

        paradas: {
          create: body.paradas.map((parada: any, index: number) => ({
            tipo: tipoParadaParaBanco(parada.tipo),
            cliente: parada.cliente || parada.nomeCliente || "",
            endereco: parada.endereco || "",
            contato: parada.contato || "",
            observacao: parada.observacao || "",
            ordem: index + 1,
          })),
        },
      },
      include: {
        paradas: {
          orderBy: { ordem: "asc" },
        },
        motoboy: true,
        cliente: true,
      },
    });

    return NextResponse.json(formatarTeleParaTela(tele));
  } catch (error: any) {
    return NextResponse.json(
      {
        erro: error.message || "Erro desconhecido ao atualizar tele",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const body = await request.json();

  await prisma.tele.delete({
    where: {
      id: body.id,
    },
  });

  return NextResponse.json({ ok: true });
}
