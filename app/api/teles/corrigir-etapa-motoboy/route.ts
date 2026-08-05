import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const ETAPAS = [
  "AGUARDANDO_INICIO_COLETA",
  "EM_ROTA_COLETA",
  "CHEGOU_NA_COLETA",
  "EM_ROTA_ENTREGA",
  "CHEGOU_NA_ENTREGA",
] as const;

type Etapa = (typeof ETAPAS)[number];

function erro(mensagem: string, status: number) {
  return NextResponse.json({ erro: mensagem }, { status });
}

function etapaValida(valor: unknown): valor is Etapa {
  return typeof valor === "string" && ETAPAS.includes(valor as Etapa);
}

function etapaDeColeta(etapa: Etapa) {
  return (
    etapa === "AGUARDANDO_INICIO_COLETA" ||
    etapa === "EM_ROTA_COLETA" ||
    etapa === "CHEGOU_NA_COLETA"
  );
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
    const teleId = typeof body?.teleId === "string" ? body.teleId.trim() : "";
    const etapa = body?.etapaMotoboy;

    if (!teleId) {
      return erro("Tele nao informada.", 400);
    }

    if (!etapaValida(etapa)) {
      return erro("Etapa operacional invalida.", 400);
    }

    const tele = await prisma.tele.findUnique({
      where: { id: teleId },
      select: {
        id: true,
        orcamento: true,
        motoboyId: true,
        statusAceite: true,
        paradaAtualMotoboy: true,
        rotaColetaIniciadaEm: true,
        chegouNaColetaEm: true,
        entregaIniciadaEm: true,
        chegouNaEntregaEm: true,
        esperaAtualIniciadaEm: true,
        paradas: {
          orderBy: { ordem: "asc" },
          select: {
            id: true,
            ordem: true,
          },
        },
        itensFilaOperacional: {
          orderBy: [
            { ordem: "asc" },
            { createdAt: "asc" },
          ],
          select: {
            id: true,
            paradaId: true,
            ordem: true,
          },
        },
      },
    });

    if (!tele) {
      return erro("Tele nao encontrada.", 404);
    }

    if (tele.orcamento) {
      return erro("Orcamentos nao possuem etapa operacional.", 409);
    }

    if (!tele.motoboyId || tele.statusAceite !== "ACEITA") {
      return erro(
        "A tele precisa estar aceita pelo motoboy antes de corrigir a etapa.",
        409
      );
    }

    if (tele.paradas.length === 0) {
      return erro("Esta tele nao possui paradas cadastradas.", 409);
    }

    if (tele.itensFilaOperacional.length === 0) {
      return erro(
        "Esta tele nao possui fila operacional. Reatribua a tele ao motoboy.",
        409
      );
    }

    const ultimoIndice = tele.paradas.length - 1;

    /*
     * Etapas de coleta sempre pertencem a primeira parada.
     * Etapas de entrega preservam a parada atual, mas nunca usam indice zero.
     */
    const indiceAtual = etapaDeColeta(etapa)
      ? 0
      : Math.max(
          1,
          Math.min(Number(tele.paradaAtualMotoboy || 0), ultimoIndice)
        );

    if (!etapaDeColeta(etapa) && ultimoIndice < 1) {
      return erro(
        "Esta tele nao possui uma segunda parada para etapa de entrega.",
        409
      );
    }

    const agora = new Date();

    const dadosPorEtapa: Record<Etapa, any> = {
      AGUARDANDO_INICIO_COLETA: {
        etapaMotoboy: "AGUARDANDO_INICIO_COLETA",
        status: "AGUARDANDO_COLETA",
        paradaAtualMotoboy: 0,
        rotaColetaIniciadaEm: null,
        chegouNaColetaEm: null,
        entregaIniciadaEm: null,
        chegouNaEntregaEm: null,
        concluidaPeloMotoboyEm: null,
        esperaAtualIniciadaEm: null,
        blocosEsperaAtual: 0,
      },
      EM_ROTA_COLETA: {
        etapaMotoboy: "EM_ROTA_COLETA",
        status: "AGUARDANDO_COLETA",
        paradaAtualMotoboy: 0,
        rotaColetaIniciadaEm: tele.rotaColetaIniciadaEm || agora,
        chegouNaColetaEm: null,
        entregaIniciadaEm: null,
        chegouNaEntregaEm: null,
        concluidaPeloMotoboyEm: null,
        esperaAtualIniciadaEm: null,
        blocosEsperaAtual: 0,
      },
      CHEGOU_NA_COLETA: {
        etapaMotoboy: "CHEGOU_NA_COLETA",
        status: "AGUARDANDO_COLETA",
        paradaAtualMotoboy: 0,
        rotaColetaIniciadaEm: tele.rotaColetaIniciadaEm || agora,
        chegouNaColetaEm: tele.chegouNaColetaEm || agora,
        entregaIniciadaEm: null,
        chegouNaEntregaEm: null,
        concluidaPeloMotoboyEm: null,
        esperaAtualIniciadaEm: tele.esperaAtualIniciadaEm || agora,
        blocosEsperaAtual: 0,
      },
      EM_ROTA_ENTREGA: {
        etapaMotoboy: "EM_ROTA_ENTREGA",
        status: "EM_ROTA",
        paradaAtualMotoboy: indiceAtual,
        rotaColetaIniciadaEm: tele.rotaColetaIniciadaEm || agora,
        chegouNaColetaEm: tele.chegouNaColetaEm || agora,
        entregaIniciadaEm: tele.entregaIniciadaEm || agora,
        chegouNaEntregaEm: null,
        concluidaPeloMotoboyEm: null,
        esperaAtualIniciadaEm: null,
        blocosEsperaAtual: 0,
      },
      CHEGOU_NA_ENTREGA: {
        etapaMotoboy: "CHEGOU_NA_ENTREGA",
        status: "EM_ROTA",
        paradaAtualMotoboy: indiceAtual,
        rotaColetaIniciadaEm: tele.rotaColetaIniciadaEm || agora,
        chegouNaColetaEm: tele.chegouNaColetaEm || agora,
        entregaIniciadaEm: tele.entregaIniciadaEm || agora,
        chegouNaEntregaEm: tele.chegouNaEntregaEm || agora,
        concluidaPeloMotoboyEm: null,
        esperaAtualIniciadaEm: tele.esperaAtualIniciadaEm || agora,
        blocosEsperaAtual: 0,
      },
    };

    const teleAtualizada = await prisma.$transaction(async (tx) => {
      /*
       * Reconstroi o estado da fila conforme a etapa corrigida.
       *
       * Anteriores: CONCLUIDO
       * Atual:
       * - aguardando inicio: PENDENTE
       * - em rota: EM_ANDAMENTO
       * - chegou: CONCLUIDO
       * Posteriores: PENDENTE
       */
      for (const item of tele.itensFilaOperacional) {
        const indiceItem = tele.paradas.findIndex(
          (parada) => parada.id === item.paradaId
        );

        if (indiceItem < 0) {
          continue;
        }

        let status: "PENDENTE" | "EM_ANDAMENTO" | "CONCLUIDO";
        let iniciadaEm: Date | null = null;
        let concluidaEm: Date | null = null;

        if (indiceItem < indiceAtual) {
          status = "CONCLUIDO";
          iniciadaEm = agora;
          concluidaEm = agora;
        } else if (indiceItem > indiceAtual) {
          status = "PENDENTE";
        } else if (
          etapa === "EM_ROTA_COLETA" ||
          etapa === "EM_ROTA_ENTREGA"
        ) {
          status = "EM_ANDAMENTO";
          iniciadaEm = agora;
        } else if (
          etapa === "CHEGOU_NA_COLETA" ||
          etapa === "CHEGOU_NA_ENTREGA"
        ) {
          status = "CONCLUIDO";
          iniciadaEm = agora;
          concluidaEm = agora;
        } else {
          status = "PENDENTE";
        }

        await tx.itemFilaOperacionalMotoboy.update({
          where: { id: item.id },
          data: {
            status,
            iniciadaEm,
            concluidaEm,
            canceladaEm: null,
          },
        });
      }

      return tx.tele.update({
        where: { id: teleId },
        data: dadosPorEtapa[etapa],
        include: {
          paradas: {
            orderBy: { ordem: "asc" },
          },
          motoboy: true,
          cliente: true,
          itensFilaOperacional: {
            orderBy: [
              { ordem: "asc" },
              { createdAt: "asc" },
            ],
          },
        },
      });
    });

    return NextResponse.json({
      ok: true,
      tele: teleAtualizada,
    });
  } catch (error) {
    console.error("Erro ao corrigir etapa do motoboy:", error);

    return erro(
      error instanceof Error
        ? error.message
        : "Nao foi possivel corrigir a etapa.",
      500
    );
  }
}
