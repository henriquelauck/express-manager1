import { prisma } from "@/lib/prisma";
import { enviarPushGestorSemBloquear } from "@/lib/notificacoesPush";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const PRAZO_ACEITE_MS = 5 * 60_000;

type AcaoAceite = "ACEITAR" | "RECUSAR";

type AceiteBody = {
  teleId?: string;
  acao?: AcaoAceite;
  motivo?: string;
};

function respostaErro(mensagem: string, status: number) {
  return NextResponse.json({ erro: mensagem }, { status });
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

    const body = (await request.json()) as AceiteBody;
    const teleId = String(body.teleId || "").trim();
    const acao = body.acao;
    const motivo = String(body.motivo || "").trim();

    if (!teleId) {
      return respostaErro("Tele não informada.", 400);
    }

    if (acao !== "ACEITAR" && acao !== "RECUSAR") {
      return respostaErro("Ação de aceite inválida.", 400);
    }

    if (acao === "RECUSAR" && motivo.length > 300) {
      return respostaErro("O motivo da recusa deve ter no máximo 300 caracteres.", 400);
    }

    const teleAtual = await prisma.tele.findUnique({
      where: {
        id: teleId,
      },
      select: {
        id: true,
        solicitante: true,
        motoboyId: true,
        motoboyNome: true,
        status: true,
        statusAceite: true,
        ordemMotoboy: true,
        atribuidaAoMotoboyEm: true,
      },
    });

    if (!teleAtual) {
      return respostaErro("Tele não encontrada.", 404);
    }

    if (teleAtual.motoboyId !== usuario.motoboy.id) {
      return respostaErro("Esta tele não está atribuída ao seu usuário.", 403);
    }

    if (teleAtual.status === "ENTREGUE") {
      return respostaErro("Uma tele concluída não pode ser aceita ou recusada.", 409);
    }

    if (
      teleAtual.statusAceite !== "AGUARDANDO_ACEITE" &&
      teleAtual.statusAceite !== "NAO_ENVIADA"
    ) {
      return respostaErro(
        teleAtual.statusAceite === "ACEITA"
          ? "Esta tele já foi aceita."
          : "Esta tele já foi recusada.",
        409
      );
    }

    const atribuidaEm = teleAtual.atribuidaAoMotoboyEm?.getTime() ?? 0;
    const prazoExpirado =
      teleAtual.statusAceite === "AGUARDANDO_ACEITE" &&
      atribuidaEm > 0 &&
      Date.now() - atribuidaEm >= PRAZO_ACEITE_MS;

    if (prazoExpirado) {
      const expiracaoAtualizada = await prisma.tele.updateMany({
        where: {
          id: teleId,
          motoboyId: usuario.motoboy.id,
          statusAceite: "AGUARDANDO_ACEITE",
          atribuidaAoMotoboyEm: teleAtual.atribuidaAoMotoboyEm,
        },
        data: {
          statusAceite: "RECUSADA",
          etapaMotoboy: null,
          ordemMotoboy: null,
          aceitaPeloMotoboyEm: null,
          recusadaPeloMotoboyEm: new Date(),
          motivoRecusaMotoboy: "Prazo de aceite expirado",
          motoboyId: null,
          motoboyNome: "",
          status: "AGUARDANDO_MOTOBOY",
        },
      });

      if (expiracaoAtualizada.count > 0) {
        const existente = await prisma.motoboyPontuacao.findFirst({
          where: {
            motoboyId: usuario.motoboy.id,
            teleId,
            tipo: "EXPIRACAO_ACEITE",
          },
          select: {
            id: true,
          },
        });

        if (!existente) {
          await prisma.motoboyPontuacao.create({
            data: {
              motoboyId: usuario.motoboy.id,
              teleId,
              tipo: "EXPIRACAO_ACEITE",
              titulo: "Prazo de aceite expirado",
              descricao: `NÃ£o respondeu a tele de ${teleAtual.solicitante} dentro do prazo de 5 minutos.`,
              pontos: -8,
              origem: "AUTOMATICA",
              ocorridoEm: new Date(),
            },
          });
        }
      }

      return respostaErro(
        "O prazo de 5 minutos para aceitar esta tele expirou. Ela voltou para a Central.",
        409
      );
    }

    if (acao === "ACEITAR") {
      const teleAceita = await prisma.$transaction(async (tx) => {
        const ultimaTeleDaFila = await tx.tele.aggregate({
          where: {
            motoboyId: usuario.motoboy!.id,
            statusAceite: "ACEITA",
            status: {
              not: "ENTREGUE",
            },
          },
          _max: {
            ordemMotoboy: true,
          },
        });

        const proximaOrdemTele = Number(ultimaTeleDaFila._max.ordemMotoboy || 0) + 1;

        const teleAtualizada = await tx.tele.update({
          where: {
            id: teleId,
          },
          data: {
            statusAceite: "ACEITA",
            etapaMotoboy: "AGUARDANDO_INICIO_COLETA",
            ordemMotoboy: proximaOrdemTele,
            aceitaPeloMotoboyEm: new Date(),
            recusadaPeloMotoboyEm: null,
            motivoRecusaMotoboy: null,
            status:
              teleAtual.status === "AGUARDANDO_MOTOBOY" ? "AGUARDANDO_COLETA" : teleAtual.status,
          },
          include: {
            paradas: {
              orderBy: {
                ordem: "asc",
              },
            },
          },
        });

        const ultimoItemDaFila = await tx.itemFilaOperacionalMotoboy.aggregate({
          where: {
            motoboyId: usuario.motoboy!.id,
            status: {
              in: ["PENDENTE", "EM_ANDAMENTO"],
            },
          },
          _max: {
            ordem: true,
          },
        });

        const primeiraOrdemItem = Number(ultimoItemDaFila._max.ordem || 0) + 1;

        if (teleAtualizada.paradas.length > 0) {
          await tx.itemFilaOperacionalMotoboy.createMany({
            data: teleAtualizada.paradas.map((parada, indice) => ({
              motoboyId: usuario.motoboy!.id,
              teleId: teleAtualizada.id,
              paradaId: parada.id,
              ordem: primeiraOrdemItem + indice,
              status: "PENDENTE",
            })),
            skipDuplicates: true,
          });
        }

        const notificacao = {
          tipo: "TELE_ACEITA",
          titulo: "Tele aceita",
          mensagem: `${usuario.motoboy!.nome} aceitou a tele de ${teleAtual.solicitante}.`,
          teleId: teleAtualizada.id,
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
        titulo: teleAceita.notificacao.titulo,
        mensagem: teleAceita.notificacao.mensagem,
        teleId: teleAceita.notificacao.teleId,
        tag: `tele-aceita-${teleAceita.notificacao.teleId}`,
      });

      return NextResponse.json({
        ok: true,
        acao: "ACEITAR",
        tele: teleAceita.teleAtualizada,
      });
    }

    const teleRecusada = await prisma.$transaction(async (tx) => {
      const teleAtualizada = await tx.tele.update({
        where: {
          id: teleId,
        },
        data: {
          statusAceite: "RECUSADA",
          etapaMotoboy: null,
          ordemMotoboy: null,
          aceitaPeloMotoboyEm: null,
          recusadaPeloMotoboyEm: new Date(),
          motivoRecusaMotoboy: motivo || null,
          motoboyId: null,
          motoboyNome: "",
          status: "AGUARDANDO_MOTOBOY",
        },
        include: {
          paradas: {
            orderBy: {
              ordem: "asc",
            },
          },
        },
      });

      const ocorrenciaExistente = await tx.motoboyPontuacao.findFirst({
        where: {
          motoboyId: usuario.motoboy!.id,
          teleId,
          tipo: "RECUSA_TELE",
        },
        select: {
          id: true,
        },
      });

      if (!ocorrenciaExistente) {
        await tx.motoboyPontuacao.create({
          data: {
            motoboyId: usuario.motoboy!.id,
            teleId,
            tipo: "RECUSA_TELE",
            titulo: "Recusa de tele",
            descricao: motivo
              ? `Recusou a tele de ${teleAtual.solicitante}. Motivo informado: ${motivo}`
              : `Recusou a tele de ${teleAtual.solicitante} sem informar motivo.`,
            pontos: -8,
            origem: "AUTOMATICA",
            ocorridoEm: new Date(),
          },
        });
      }

      const notificacao = {
        tipo: "TELE_RECUSADA",
        titulo: "Tele recusada",
        mensagem: `${usuario.motoboy!.nome} recusou a tele de ${teleAtual.solicitante}${
          motivo ? `: ${motivo}` : "."
        }`,
        teleId: teleAtualizada.id,
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
      titulo: teleRecusada.notificacao.titulo,
      mensagem: teleRecusada.notificacao.mensagem,
      teleId: teleRecusada.notificacao.teleId,
      tag: `tele-recusada-${teleRecusada.notificacao.teleId}`,
    });

    return NextResponse.json({
      ok: true,
      acao: "RECUSAR",
      tele: teleRecusada.teleAtualizada,
    });
  } catch (erro) {
    console.error("Erro ao aceitar ou recusar tele:", erro);

    return respostaErro("Não foi possível registrar sua resposta para a tele.", 500);
  }
}
