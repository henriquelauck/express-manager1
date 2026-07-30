import { prisma } from "@/lib/prisma";
import webpush from "web-push";

type DadosPushGestor = {
  titulo: string;
  mensagem: string;
  teleId?: string | null;
  tag?: string;
};

let vapidConfigurado = false;

function configurarVapid() {
  if (vapidConfigurado) {
    return true;
  }

  const chavePublica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const chavePrivada = process.env.VAPID_PRIVATE_KEY;
  const assunto = process.env.VAPID_SUBJECT;

  if (!chavePublica || !chavePrivada || !assunto) {
    console.error("Variáveis VAPID não configuradas.");
    return false;
  }

  webpush.setVapidDetails(assunto, chavePublica, chavePrivada);
  vapidConfigurado = true;

  return true;
}

function inscricaoExpirada(erro: unknown) {
  if (!erro || typeof erro !== "object") {
    return false;
  }

  const statusCode = "statusCode" in erro ? Number(erro.statusCode) : 0;

  return statusCode === 404 || statusCode === 410;
}

export async function enviarPushGestor({
  titulo,
  mensagem,
  teleId,
  tag,
}: DadosPushGestor) {
  if (!configurarVapid()) {
    return {
      enviados: 0,
      falhas: 0,
      desativadas: 0,
    };
  }

  const inscricoes = await prisma.inscricaoPushGestor.findMany({
    where: {
      ativa: true,
      user: {
        role: "ADMIN",
      },
    },
    select: {
      id: true,
      endpoint: true,
      p256dh: true,
      auth: true,
    },
  });

  if (inscricoes.length === 0) {
    return {
      enviados: 0,
      falhas: 0,
      desativadas: 0,
    };
  }

  const payload = JSON.stringify({
    titulo,
    mensagem,
    url: teleId ? `/teles/${teleId}` : "/",
    tag: tag || (teleId ? `tele-${teleId}` : "express-manager"),
  });

  let enviados = 0;
  let falhas = 0;
  let desativadas = 0;

  await Promise.allSettled(
    inscricoes.map(async (inscricao) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: inscricao.endpoint,
            keys: {
              p256dh: inscricao.p256dh,
              auth: inscricao.auth,
            },
          },
          payload
        );

        enviados += 1;

        await prisma.inscricaoPushGestor.update({
          where: {
            id: inscricao.id,
          },
          data: {
            ultimoUsoEm: new Date(),
          },
        });
      } catch (erro) {
        falhas += 1;

        if (inscricaoExpirada(erro)) {
          desativadas += 1;

          await prisma.inscricaoPushGestor.update({
            where: {
              id: inscricao.id,
            },
            data: {
              ativa: false,
              ultimoUsoEm: new Date(),
            },
          });

          return;
        }

        console.error("Erro ao enviar push do gestor:", erro);
      }
    })
  );

  return {
    enviados,
    falhas,
    desativadas,
  };
}

export async function enviarPushGestorSemBloquear(dados: DadosPushGestor) {
  try {
    return await enviarPushGestor(dados);
  } catch (erro) {
    console.error("Falha geral ao enviar push do gestor:", erro);

    return {
      enviados: 0,
      falhas: 1,
      desativadas: 0,
    };
  }
}
