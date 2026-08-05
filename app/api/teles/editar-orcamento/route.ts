import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type ParadaEntrada = {
  tipo?: unknown;
  cliente?: unknown;
  nomeCliente?: unknown;
  endereco?: unknown;
  contato?: unknown;
  observacao?: unknown;
};

function texto(valor: unknown) {
  return typeof valor === "string" ? valor.trim() : "";
}

function numero(valor: unknown, padrao = 0) {
  const convertido = Number(String(valor ?? "").replace(",", "."));
  return Number.isFinite(convertido) ? convertido : padrao;
}

function tipoParadaParaBanco(tipo: unknown) {
  const mapa: Record<string, string> = {
    Entrega: "ENTREGA",
    Coleta: "COLETA",
    Trocar: "TROCAR",
    "Entrega e coleta": "ENTREGA_E_COLETA",
    Retorno: "RETORNO",
    ENTREGA: "ENTREGA",
    COLETA: "COLETA",
    TROCAR: "TROCAR",
    ENTREGA_E_COLETA: "ENTREGA_E_COLETA",
    RETORNO: "RETORNO",
  };

  return mapa[texto(tipo)] || "ENTREGA";
}

function formaCobrancaParaBanco(forma: unknown) {
  const mapa: Record<string, string> = {
    na_hora: "NA_HORA",
    semanal: "SEMANAL",
    quinzenal: "QUINZENAL",
    mensal: "MENSAL",
    NA_HORA: "NA_HORA",
    SEMANAL: "SEMANAL",
    QUINZENAL: "QUINZENAL",
    MENSAL: "MENSAL",
  };

  return mapa[texto(forma)] || "SEMANAL";
}

function erro(mensagem: string, status: number) {
  return NextResponse.json({ erro: mensagem }, { status });
}

export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("express_user_id")?.value;

    if (!userId) {
      return erro("Nao autenticado.", 401);
    }

    const usuario = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!usuario || usuario.role !== "ADMIN") {
      return erro("Acesso permitido somente ao gestor.", 403);
    }

    const body = await request.json();
    const id = texto(body?.id);
    const solicitante = texto(body?.solicitante);
    const paradasRecebidas: ParadaEntrada[] = Array.isArray(body?.paradas)
      ? body.paradas
      : [];

    if (!id) {
      return erro("Orcamento nao informado.", 400);
    }

    if (!solicitante) {
      return erro("Informe o cliente solicitante.", 400);
    }

    const paradas = paradasRecebidas
      .filter((parada) => texto(parada?.tipo) !== "Retorno" && texto(parada?.tipo) !== "RETORNO")
      .map((parada, ordem) => ({
        ordem,
        tipo: tipoParadaParaBanco(parada.tipo) as any,
        cliente: texto(parada.cliente) || texto(parada.nomeCliente),
        endereco: texto(parada.endereco),
        contato: texto(parada.contato) || null,
        observacao: texto(parada.observacao) || null,
      }));

    if (paradas.length === 0 || paradas.some((parada) => !parada.endereco)) {
      return erro("Informe ao menos uma parada com endereco.", 400);
    }

    const atual = await prisma.tele.findUnique({
      where: { id },
      select: { id: true, orcamento: true },
    });

    if (!atual) {
      return erro("Orcamento nao encontrado.", 404);
    }

    if (!atual.orcamento) {
      return erro("Este registro ja foi confirmado como tele.", 409);
    }

    const cliente = await prisma.cliente.findFirst({
      where: { nome: solicitante },
      select: { id: true },
    });

    const total = numero(body.total, numero(body.valor));
    const valorBase = numero(body.valorBase, total);

    await prisma.$transaction(async (tx) => {
      await tx.teleParada.deleteMany({
        where: { teleId: id },
      });

      await tx.tele.update({
        where: { id },
        data: {
          orcamento: true,
          clienteId: cliente?.id || null,
          solicitante,
          dataTele: body.dataTele
            ? new Date(`${String(body.dataTele).slice(0, 10)}T12:00:00`)
            : undefined,
          motoboyId: null,
          motoboyNome: "",
          status: "AGUARDANDO_CLIENTE",
          statusAceite: "NAO_ENVIADA",
          ordemMotoboy: null,
          atribuidaAoMotoboyEm: null,
          aceitaPeloMotoboyEm: null,
          recusadaPeloMotoboyEm: null,
          motivoRecusaMotoboy: null,
          tipoRota: texto(body.tipoRota) || "Entrega",
          valorBase,
          retorno: numero(body.retorno),
          espera: 0,
          total,
          distanciaKm:
            body.distanciaKm === null || body.distanciaKm === undefined
              ? null
              : numero(body.distanciaKm),
          tempoMinutos:
            body.tempoMinutos === null || body.tempoMinutos === undefined
              ? null
              : Math.round(numero(body.tempoMinutos)),
          recebimento: "PENDENTE",
          formaCobranca: formaCobrancaParaBanco(body.formaCobranca) as any,
          valorRecebido: 0,
          dataRecebimento: null,
          motoboyRecebedor: null,
          fechamentoId: null,
          observacaoGeral: texto(body.observacaoGeral) || null,
          paradas: {
            create: paradas,
          },
        },
      });
    });

    return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error("Erro ao editar orcamento:", error);
    return erro(
      error instanceof Error ? error.message : "Nao foi possivel editar o orcamento.",
      500
    );
  }
}
