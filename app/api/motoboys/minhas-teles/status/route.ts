import { prisma } from "@/lib/prisma";
import { enviarPushGestorSemBloquear } from "@/lib/notificacoesPush";
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

const MINUTOS_POR_BLOCO_ESPERA = 15;
const VALOR_POR_BLOCO_ESPERA = 5;

function calcularEsperaEncerrada({
  inicio,
  blocosJaCobrados,
  agora,
}: {
  inicio: Date;
  blocosJaCobrados: number;
  agora: Date;
}) {
  const milissegundos = Math.max(0, agora.getTime() - inicio.getTime());
  const minutosDecorridos = Math.floor(milissegundos / 60_000);
  const blocosCompletos = Math.floor(minutosDecorridos / MINUTOS_POR_BLOCO_ESPERA);
  const novosBlocos = Math.max(0, blocosCompletos - blocosJaCobrados);

  return {
    minutosDecorridos,
    valorAcrescentar: novosBlocos * VALOR_POR_BLOCO_ESPERA,
  };
}

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

function dadosNotificacaoEtapa({
  etapa,
  motoboyNome,
  solicitante,
}: {
  etapa: EtapaMotoboyTele;
  motoboyNome: string;
  solicitante: string;
}) {
  const dados: Record<
    EtapaMotoboyTele,
    {
      tipo: string;
      titulo: string;
      mensagem: string;
    }
  > = {
    AGUARDANDO_INICIO_COLETA: {
      tipo: "AGUARDANDO_INICIO_COLETA",
      titulo: "Tele pronta para iniciar",
      mensagem: `${motoboyNome} está com a tele de ${solicitante} pronta para iniciar.`,
    },
    EM_ROTA_COLETA: {
      tipo: "ROTA_COLETA_INICIADA",
      titulo: "Rota até a coleta iniciada",
      mensagem: `${motoboyNome} iniciou a rota até a coleta da tele de ${solicitante}.`,
    },
    CHEGOU_NA_COLETA: {
      tipo: "CHEGOU_NA_COLETA",
      titulo: "Motoboy chegou na coleta",
      mensagem: `${motoboyNome} chegou na coleta da tele de ${solicitante}.`,
    },
    EM_ROTA_ENTREGA: {
      tipo: "ROTA_ENTREGA_INICIADA",
      titulo: "Rota até a entrega iniciada",
      mensagem: `${motoboyNome} iniciou a rota até a próxima entrega da tele de ${solicitante}.`,
    },
    CHEGOU_NA_ENTREGA: {
      tipo: "CHEGOU_NA_ENTREGA",
      titulo: "Motoboy chegou na entrega",
      mensagem: `${motoboyNome} chegou na entrega da tele de ${solicitante}.`,
    },
    CONCLUIDA: {
      tipo: "TELE_CONCLUIDA",
      titulo: "Tele concluída",
      mensagem: `${motoboyNome} concluiu a tele de ${solicitante}.`,
    },
  };

  return dados[etapa];
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
            nome: true,
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
        solicitante: true,
        status: true,
        statusAceite: true,
        etapaMotoboy: true,
        paradaAtualMotoboy: true,
        motoboyId: true,
        espera: true,
        total: true,
        esperaAtualIniciadaEm: true,
        blocosEsperaAtual: true,
        esperaMinutosAcumulados: true,
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

        const retomandoEtapaAtual =
          novaEtapa === etapaAtual &&
          (etapaAtual === "EM_ROTA_COLETA" || etapaAtual === "EM_ROTA_ENTREGA") &&
          itemFilaAtual.status === "PENDENTE";

        const indiceEsperado = retomandoEtapaAtual
          ? indiceAtual
          : novaEtapa === "EM_ROTA_ENTREGA"
            ? indiceAtual + 1
            : indiceAtual;

        if (indiceItemFila !== indiceEsperado) {
          return respostaErro(
            "A parada solicitada não é a próxima etapa definida pelo gestor.",
            409
          );
        }
      }

      let proximaParada = indiceAtual;

      if (novaEtapa === etapaAtual) {
        const retomandoRota =
          (etapaAtual === "EM_ROTA_COLETA" || etapaAtual === "EM_ROTA_ENTREGA") &&
          itemFilaAtual?.status === "PENDENTE";

        if (!retomandoRota) {
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

        const retomada = await prisma.$transaction(async (tx) => {
          await tx.itemFilaOperacionalMotoboy.updateMany({
            where: {
              motoboyId: usuario.motoboy!.id,
              status: "EM_ANDAMENTO",
              id: {
                not: itemFilaAtual.id,
              },
            },
            data: {
              status: "PENDENTE",
              iniciadaEm: null,
            },
          });

          await tx.itemFilaOperacionalMotoboy.update({
            where: {
              id: itemFilaAtual.id,
            },
            data: {
              status: "EM_ANDAMENTO",
              iniciadaEm: new Date(),
            },
          });

          const teleAtualizada = await tx.tele.findUniqueOrThrow({
            where: {
              id: tele.id,
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
              espera: true,
              total: true,
              esperaAtualIniciadaEm: true,
              blocosEsperaAtual: true,
              esperaMinutosAcumulados: true,
              dataTele: true,
              updatedAt: true,
            },
          });

          const notificacao = {
            tipo: "ROTA_RETOMADA",
            titulo: "Rota retomada",
            mensagem: `${usuario.motoboy!.nome} retomou a rota da tele de ${tele.solicitante}.`,
            teleId: tele.id,
            motoboyId: usuario.motoboy!.id,
          };

          await tx.notificacaoGestor.create({
            data: notificacao,
          });

          return {
            teleAtualizada,
            notificacao,
          };
        });

        await enviarPushGestorSemBloquear({
          titulo: retomada.notificacao.titulo,
          mensagem: retomada.notificacao.mensagem,
          teleId: retomada.notificacao.teleId,
          tag: `rota-retomada-${retomada.notificacao.teleId}`,
        });

        return NextResponse.json({
          ok: true,
          tele: retomada.teleAtualizada,
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

      const agora = new Date();
      const dadosEtapa = dadosDaEtapa(novaEtapa);
      const iniciouDeslocamento = novaEtapa === "EM_ROTA_COLETA" || novaEtapa === "EM_ROTA_ENTREGA";
      const confirmouChegada =
        novaEtapa === "CHEGOU_NA_COLETA" || novaEtapa === "CHEGOU_NA_ENTREGA";

      const iniciandoEspera = novaEtapa === "CHEGOU_NA_COLETA" || novaEtapa === "CHEGOU_NA_ENTREGA";

      const encerrandoEspera =
        (etapaAtual === "CHEGOU_NA_COLETA" && novaEtapa === "EM_ROTA_ENTREGA") ||
        (etapaAtual === "CHEGOU_NA_ENTREGA" &&
          (novaEtapa === "EM_ROTA_ENTREGA" || novaEtapa === "CONCLUIDA"));

      let esperaAtualizada = tele.espera;
      let totalAtualizado = tele.total;
      let minutosAcumuladosAtualizados = tele.esperaMinutosAcumulados;
      let esperaAtualIniciadaEm: Date | null | undefined;
      let blocosEsperaAtual: number | undefined;

      if (iniciandoEspera) {
        esperaAtualIniciadaEm = agora;
        blocosEsperaAtual = 0;
      } else if (encerrandoEspera && tele.esperaAtualIniciadaEm) {
        const fechamentoEspera = calcularEsperaEncerrada({
          inicio: tele.esperaAtualIniciadaEm,
          blocosJaCobrados: tele.blocosEsperaAtual,
          agora,
        });

        esperaAtualizada += fechamentoEspera.valorAcrescentar;
        totalAtualizado += fechamentoEspera.valorAcrescentar;
        minutosAcumuladosAtualizados += fechamentoEspera.minutosDecorridos;
        esperaAtualIniciadaEm = null;
        blocosEsperaAtual = 0;
      }

      const teleAtualizada = await prisma.$transaction(async (tx) => {
        if (!finalizandoTele && itemFilaAtual) {
          if (iniciouDeslocamento) {
            /*
             * Mantém somente uma rota ativa por motoboy.
             * Ao iniciar outra etapa, qualquer item anterior em andamento
             * volta para pendente e poderá ser retomado depois.
             */
            await tx.itemFilaOperacionalMotoboy.updateMany({
              where: {
                motoboyId: usuario.motoboy!.id,
                status: "EM_ANDAMENTO",
                id: {
                  not: itemFilaAtual.id,
                },
              },
              data: {
                status: "PENDENTE",
                iniciadaEm: null,
              },
            });

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

        const teleAtualizada = await tx.tele.update({
          where: {
            id: tele.id,
          },
          data: {
            etapaMotoboy: novaEtapa,
            paradaAtualMotoboy: proximaParada,
            ...dadosEtapa,
            ...(esperaAtualIniciadaEm !== undefined ? { esperaAtualIniciadaEm } : {}),
            ...(blocosEsperaAtual !== undefined ? { blocosEsperaAtual } : {}),
            ...(encerrandoEspera
              ? {
                  espera: esperaAtualizada,
                  total: totalAtualizado,
                  esperaMinutosAcumulados: minutosAcumuladosAtualizados,
                }
              : {}),
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
            espera: true,
            total: true,
            esperaAtualIniciadaEm: true,
            blocosEsperaAtual: true,
            esperaMinutosAcumulados: true,
            dataTele: true,
            updatedAt: true,
          },
        });

        const notificacao = {
          ...dadosNotificacaoEtapa({
            etapa: novaEtapa,
            motoboyNome: usuario.motoboy!.nome,
            solicitante: tele.solicitante,
          }),
          teleId: tele.id,
          motoboyId: usuario.motoboy!.id,
        };

        await tx.notificacaoGestor.create({
          data: notificacao,
        });

        return {
          teleAtualizada,
          notificacao,
        };
      });

      await enviarPushGestorSemBloquear({
        titulo: teleAtualizada.notificacao.titulo,
        mensagem: teleAtualizada.notificacao.mensagem,
        teleId: teleAtualizada.notificacao.teleId,
        tag: `${teleAtualizada.notificacao.tipo.toLowerCase()}-${teleAtualizada.notificacao.teleId}`,
      });

      return NextResponse.json({
        ok: true,
        tele: teleAtualizada.teleAtualizada,
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

    const teleAtualizada = await prisma.$transaction(async (tx) => {
      const atualizada = await tx.tele.update({
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

      const notificacao = {
        tipo: "STATUS_TELE_ATUALIZADO",
        titulo: "Status da tele atualizado",
        mensagem: `${usuario.motoboy!.nome} atualizou a tele de ${tele.solicitante} para ${novoStatus}.`,
        teleId: tele.id,
        motoboyId: usuario.motoboy!.id,
      };

      await tx.notificacaoGestor.create({
        data: notificacao,
      });

      return {
        atualizada,
        notificacao,
      };
    });

    await enviarPushGestorSemBloquear({
      titulo: teleAtualizada.notificacao.titulo,
      mensagem: teleAtualizada.notificacao.mensagem,
      teleId: teleAtualizada.notificacao.teleId,
      tag: `status-tele-${teleAtualizada.notificacao.teleId}`,
    });

    return NextResponse.json({
      ok: true,
      tele: teleAtualizada.atualizada,
    });
  } catch (erro) {
    console.error("Erro ao atualizar andamento pelo motoboy:", erro);

    return respostaErro("Não foi possível atualizar o andamento da tele.", 500);
  }
}
