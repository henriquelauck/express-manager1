import { prisma } from "@/lib/prisma";
import type { EtapaMotoboyTele, StatusTele } from "@prisma/client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type BodyStatus = {
  teleId?: string;
  status?: string;
  etapaMotoboy?: string;
};

const STATUS_PERMITIDOS: StatusTele[] = ["AGUARDANDO_COLETA", "EM_ROTA", "ENTREGUE"];

const PROXIMO_STATUS: Partial<Record<StatusTele, StatusTele[]>> = {
  AGUARDANDO_CLIENTE: ["AGUARDANDO_COLETA"],
  AGUARDANDO_MOTOBOY: ["AGUARDANDO_COLETA"],
  AGUARDANDO_COLETA: ["EM_ROTA"],
  EM_ROTA: ["ENTREGUE"],
  ENTREGUE: [],
};

const ETAPAS_PERMITIDAS: EtapaMotoboyTele[] = [
  "AGUARDANDO_INICIO_COLETA",
  "EM_ROTA_COLETA",
  "CHEGOU_NA_COLETA",
  "EM_ROTA_ENTREGA",
  "CHEGOU_NA_ENTREGA",
  "CONCLUIDA",
];

function respostaErro(mensagem: string, status: number) {
  return NextResponse.json(
    {
      erro: mensagem,
    },
    {
      status,
    }
  );
}

function statusValido(status: string): status is StatusTele {
  return STATUS_PERMITIDOS.includes(status as StatusTele);
}

function etapaValida(etapa: string): etapa is EtapaMotoboyTele {
  return ETAPAS_PERMITIDAS.includes(etapa as EtapaMotoboyTele);
}

function dadosDaEtapa(etapa: EtapaMotoboyTele): {
  status?: StatusTele;
  rotaColetaIniciadaEm?: Date;
  chegouNaColetaEm?: Date;
  entregaIniciadaEm?: Date;
  chegouNaEntregaEm?: Date;
  concluidaPeloMotoboyEm?: Date;
} {
  const agora = new Date();

  if (etapa === "EM_ROTA_COLETA") {
    return {
      status: "AGUARDANDO_COLETA",
      rotaColetaIniciadaEm: agora,
    };
  }

  if (etapa === "CHEGOU_NA_COLETA") {
    return {
      status: "AGUARDANDO_COLETA",
      chegouNaColetaEm: agora,
    };
  }

  if (etapa === "EM_ROTA_ENTREGA") {
    return {
      status: "EM_ROTA",
      entregaIniciadaEm: agora,
    };
  }

  if (etapa === "CHEGOU_NA_ENTREGA") {
    return {
      status: "EM_ROTA",
      chegouNaEntregaEm: agora,
    };
  }

  if (etapa === "CONCLUIDA") {
    return {
      status: "ENTREGUE",
      concluidaPeloMotoboyEm: agora,
    };
  }

  return {
    status: "AGUARDANDO_COLETA",
  };
}

export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("express_user_id")?.value;

    if (!userId) {
      return respostaErro("Não autenticado.", 401);
    }

    const usuario = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        role: true,
        motoboy: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!usuario || usuario.role !== "MOTOBOY" || !usuario.motoboy) {
      return respostaErro("Acesso negado.", 403);
    }

    const body = (await request.json()) as BodyStatus;
    const teleId = String(body.teleId || "").trim();
    const novoStatus = String(body.status || "").trim();
    const novaEtapa = String(body.etapaMotoboy || "").trim();

    if (!teleId) {
      return respostaErro("Informe a tele.", 400);
    }

    if (!novoStatus && !novaEtapa) {
      return respostaErro("Informe o novo status ou a nova etapa.", 400);
    }

    const tele = await prisma.tele.findFirst({
      where: {
        id: teleId,
        motoboyId: usuario.motoboy.id,
      },
      select: {
        id: true,
        status: true,
        statusAceite: true,
        etapaMotoboy: true,
        paradaAtualMotoboy: true,
        motoboyId: true,
        paradas: {
          orderBy: {
            ordem: "asc",
          },
          select: {
            id: true,
            ordem: true,
            tipo: true,
          },
        },
      },
    });

    if (!tele) {
      return respostaErro("Tele não encontrada ou não vinculada ao seu usuário.", 404);
    }

    if (tele.statusAceite !== "ACEITA") {
      return respostaErro("Aceite a tele antes de atualizar o andamento.", 409);
    }

    const itemFilaAtual = await prisma.itemFilaOperacionalMotoboy.findFirst({
      where: {
        motoboyId: usuario.motoboy.id,
        teleId: tele.id,
        status: {
          in: ["PENDENTE", "EM_ANDAMENTO"],
        },
      },
      orderBy: [
        {
          ordem: "asc",
        },
        {
          createdAt: "asc",
        },
      ],
      select: {
        id: true,
        teleId: true,
        paradaId: true,
        status: true,
        ordem: true,
      },
    });

    if (novaEtapa) {
      if (!etapaValida(novaEtapa)) {
        return respostaErro("Etapa não permitida para o motoboy.", 400);
      }

      const finalizandoTele = novaEtapa === "CONCLUIDA";

      if (!finalizandoTele) {
        if (!itemFilaAtual) {
          return respostaErro("Nenhuma etapa operacional foi liberada pelo gestor.", 409);
        }

        if (itemFilaAtual.teleId !== tele.id) {
          return respostaErro(
            "Esta tele está bloqueada. Conclua primeiro a etapa definida pelo gestor.",
            409
          );
        }
      }

      const etapaAtual = tele.etapaMotoboy || "AGUARDANDO_INICIO_COLETA";

      const totalParadas = tele.paradas.length;
      const indiceAtual = Math.max(
        0,
        Math.min(tele.paradaAtualMotoboy, Math.max(totalParadas - 1, 0))
      );

      if (totalParadas === 0) {
        return respostaErro("Esta tele não possui paradas cadastradas.", 409);
      }

      if (!finalizandoTele && itemFilaAtual) {
        const indiceItemFila = tele.paradas.findIndex(
          (parada) => parada.id === itemFilaAtual.paradaId
        );

        if (indiceItemFila < 0) {
          return respostaErro(
            "A etapa liberada não corresponde a uma parada válida desta tele.",
            409
          );
        }

        const indiceEsperado = novaEtapa === "EM_ROTA_ENTREGA" ? indiceAtual + 1 : indiceAtual;

        if (indiceItemFila !== indiceEsperado) {
          return respostaErro(
            "A parada solicitada não é a próxima etapa definida pelo gestor.",
            409
          );
        }
      }

      let proximaParada = indiceAtual;

      if (novaEtapa === etapaAtual) {
        return NextResponse.json({
          ok: true,
          tele: {
            id: tele.id,
            status: tele.status,
            etapaMotoboy: etapaAtual,
            paradaAtualMotoboy: indiceAtual,
          },
        });
      }

      if (etapaAtual === "AGUARDANDO_INICIO_COLETA" && novaEtapa !== "EM_ROTA_COLETA") {
        return respostaErro("Inicie primeiro a rota até a primeira parada.", 409);
      }

      if (etapaAtual === "EM_ROTA_COLETA" && novaEtapa !== "CHEGOU_NA_COLETA") {
        return respostaErro("Confirme primeiro a chegada na primeira parada.", 409);
      }

      if (etapaAtual === "CHEGOU_NA_COLETA" && novaEtapa !== "EM_ROTA_ENTREGA") {
        return respostaErro("Inicie a rota até a próxima parada.", 409);
      }

      if (etapaAtual === "EM_ROTA_ENTREGA" && novaEtapa !== "CHEGOU_NA_ENTREGA") {
        return respostaErro("Confirme primeiro a chegada na parada atual.", 409);
      }

      if (etapaAtual === "CHEGOU_NA_ENTREGA") {
        const temProximaParada = indiceAtual < totalParadas - 1;

        if (temProximaParada && novaEtapa !== "EM_ROTA_ENTREGA") {
          return respostaErro("Ainda existem paradas pendentes nesta tele.", 409);
        }

        if (!temProximaParada && novaEtapa !== "CONCLUIDA") {
          return respostaErro("Esta é a última parada. Finalize a tele.", 409);
        }
      }

      if (etapaAtual === "CONCLUIDA") {
        return respostaErro("Esta tele já foi concluída.", 409);
      }

      if (novaEtapa === "EM_ROTA_ENTREGA") {
        if (indiceAtual >= totalParadas - 1) {
          return respostaErro("Não existe outra parada para iniciar.", 409);
        }

        proximaParada = indiceAtual + 1;
      }

      if (novaEtapa === "CONCLUIDA" && indiceAtual < totalParadas - 1) {
        return respostaErro("Ainda existem paradas pendentes nesta tele.", 409);
      }

      if (finalizandoTele) {
        const itensPendentesDaTele = await prisma.itemFilaOperacionalMotoboy.count({
          where: {
            motoboyId: usuario.motoboy.id,
            teleId: tele.id,
            status: {
              in: ["PENDENTE", "EM_ANDAMENTO"],
            },
          },
        });

        if (itensPendentesDaTele > 0) {
          return respostaErro(
            "Ainda existem etapas desta tele pendentes na fila definida pelo gestor.",
            409
          );
        }
      }

      const dadosEtapa = dadosDaEtapa(novaEtapa);
      const iniciouDeslocamento = novaEtapa === "EM_ROTA_COLETA" || novaEtapa === "EM_ROTA_ENTREGA";
      const confirmouChegada =
        novaEtapa === "CHEGOU_NA_COLETA" || novaEtapa === "CHEGOU_NA_ENTREGA";

      const teleAtualizada = await prisma.$transaction(async (tx) => {
        if (!finalizandoTele && itemFilaAtual) {
          if (iniciouDeslocamento && itemFilaAtual.status === "PENDENTE") {
            await tx.itemFilaOperacionalMotoboy.update({
              where: {
                id: itemFilaAtual.id,
              },
              data: {
                status: "EM_ANDAMENTO",
                iniciadaEm: new Date(),
              },
            });
          }

          if (confirmouChegada) {
            await tx.itemFilaOperacionalMotoboy.update({
              where: {
                id: itemFilaAtual.id,
              },
              data: {
                status: "CONCLUIDO",
                concluidaEm: new Date(),
              },
            });
          }
        }

        return tx.tele.update({
          where: {
            id: tele.id,
          },
          data: {
            etapaMotoboy: novaEtapa,
            paradaAtualMotoboy: proximaParada,
            ...dadosEtapa,
          },
          select: {
            id: true,
            status: true,
            etapaMotoboy: true,
            paradaAtualMotoboy: true,
            rotaColetaIniciadaEm: true,
            chegouNaColetaEm: true,
            entregaIniciadaEm: true,
            chegouNaEntregaEm: true,
            concluidaPeloMotoboyEm: true,
            dataTele: true,
            updatedAt: true,
          },
        });
      });

      return NextResponse.json({
        ok: true,
        tele: teleAtualizada,
      });
    }

    if (!statusValido(novoStatus)) {
      return respostaErro("Status não permitido para o motoboy.", 400);
    }

    if (tele.status === novoStatus) {
      return NextResponse.json({
        ok: true,
        tele: {
          id: tele.id,
          status: tele.status,
          etapaMotoboy: tele.etapaMotoboy,
          paradaAtualMotoboy: tele.paradaAtualMotoboy,
        },
      });
    }

    const permitidos = PROXIMO_STATUS[tele.status] || [];

    if (!permitidos.includes(novoStatus)) {
      return respostaErro("Essa alteração de status não é permitida.", 409);
    }

    const teleAtualizada = await prisma.tele.update({
      where: {
        id: tele.id,
      },
      data: {
        status: novoStatus,
      },
      select: {
        id: true,
        status: true,
        etapaMotoboy: true,
        paradaAtualMotoboy: true,
        dataTele: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      tele: teleAtualizada,
    });
  } catch (erro) {
    console.error("Erro ao atualizar andamento pelo motoboy:", erro);

    return respostaErro("Não foi possível atualizar o andamento da tele.", 500);
  }
}
