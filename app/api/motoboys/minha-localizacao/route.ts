import { prisma } from "@/lib/prisma";
import { createHash, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type LocalizacaoBody = {
  acao?: "ONLINE" | "ATUALIZAR" | "OFFLINE";
  latitude?: number;
  longitude?: number;
  precisao?: number | null;
};

const PRECISAO_MAXIMA_METROS = 120;
const DISTANCIA_MINIMA_METROS = 8;
const DISTANCIA_MAXIMA_TRECHO_METROS = 5000;
const VELOCIDADE_MAXIMA_KMH = 160;
const INTERVALO_MAXIMO_SEGUNDOS = 10 * 60;

function respostaErro(mensagem: string, status: number) {
  return NextResponse.json({ erro: mensagem }, { status });
}

function coordenadasValidas(latitude: number, longitude: number) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function gerarHashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function hashesIguais(hashA: string, hashB: string) {
  try {
    const bufferA = Buffer.from(hashA, "hex");
    const bufferB = Buffer.from(hashB, "hex");

    if (bufferA.length !== bufferB.length) {
      return false;
    }

    return timingSafeEqual(bufferA, bufferB);
  } catch {
    return false;
  }
}

function horaBrasil(data = new Date()) {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    hourCycle: "h23",
  }).formatToParts(data);

  const hora = Number(partes.find((parte) => parte.type === "hour")?.value || 0);

  return Number.isFinite(hora) ? hora : 0;
}

function dataReferenciaBrasil(data = new Date()) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(data);

  const ano = partes.find((parte) => parte.type === "year")?.value;
  const mes = partes.find((parte) => parte.type === "month")?.value;
  const dia = partes.find((parte) => parte.type === "day")?.value;

  return new Date(`${ano}-${mes}-${dia}T00:00:00-03:00`);
}

function distanciaEmMetros(
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number
) {
  const raioTerra = 6371000;
  const paraRadianos = (valor: number) => (valor * Math.PI) / 180;

  const deltaLatitude = paraRadianos(latitude2 - latitude1);
  const deltaLongitude = paraRadianos(longitude2 - longitude1);

  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(paraRadianos(latitude1)) *
      Math.cos(paraRadianos(latitude2)) *
      Math.sin(deltaLongitude / 2) ** 2;

  return 2 * raioTerra * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function trechoGpsValido({
  distanciaMetros,
  segundos,
  precisaoAtual,
  precisaoAnterior,
}: {
  distanciaMetros: number;
  segundos: number;
  precisaoAtual: number | null;
  precisaoAnterior: number | null;
}) {
  if (segundos <= 0 || segundos > INTERVALO_MAXIMO_SEGUNDOS) {
    return false;
  }

  if (
    precisaoAtual !== null &&
    precisaoAtual > PRECISAO_MAXIMA_METROS
  ) {
    return false;
  }

  if (
    precisaoAnterior !== null &&
    precisaoAnterior > PRECISAO_MAXIMA_METROS
  ) {
    return false;
  }

  if (distanciaMetros < DISTANCIA_MINIMA_METROS) {
    return false;
  }

  if (distanciaMetros > DISTANCIA_MAXIMA_TRECHO_METROS) {
    return false;
  }

  const velocidadeKmh = (distanciaMetros / segundos) * 3.6;

  return velocidadeKmh <= VELOCIDADE_MAXIMA_KMH;
}

async function obterMotoboyPorToken(request: Request) {
  const autorizacao = request.headers.get("authorization") || "";
  const [tipo, token] = autorizacao.trim().split(/\s+/, 2);

  if (tipo?.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  const hashRecebido = gerarHashToken(token);

  const motoboy = await prisma.motoboy.findFirst({
    where: {
      appTokenHash: hashRecebido,
    },
    select: {
      id: true,
      nome: true,
      online: true,
      latitude: true,
      longitude: true,
      precisaoLocalizacao: true,
      onlineDesde: true,
      localizacaoAtualizadaEm: true,
      appTokenHash: true,
    },
  });

  if (!motoboy || !motoboy.appTokenHash || !hashesIguais(hashRecebido, motoboy.appTokenHash)) {
    return null;
  }

  const { appTokenHash: _appTokenHash, ...motoboySeguro } = motoboy;

  return motoboySeguro;
}

async function obterMotoboyPorCookie() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("express_user_id")?.value;

  if (!userId) {
    return null;
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
          online: true,
          latitude: true,
          longitude: true,
          precisaoLocalizacao: true,
          onlineDesde: true,
          localizacaoAtualizadaEm: true,
        },
      },
    },
  });

  if (!usuario || usuario.role !== "MOTOBOY" || !usuario.motoboy) {
    return null;
  }

  return usuario.motoboy;
}

async function obterMotoboyAutenticado(request: Request) {
  const porToken = await obterMotoboyPorToken(request);

  if (porToken) {
    return porToken;
  }

  return obterMotoboyPorCookie();
}

async function criarOuObterControleDiario(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  motoboyId: string,
  agora: Date
) {
  const dataReferencia = dataReferenciaBrasil(agora);

  return tx.controleDiarioMotoboy.upsert({
    where: {
      motoboyId_dataReferencia: {
        motoboyId,
        dataReferencia,
      },
    },
    update: {},
    create: {
      motoboyId,
      dataReferencia,
    },
  });
}

async function encerrarSessoesAbertas(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  motoboyId: string,
  encerradaEm: Date
) {
  const sessoes = await tx.sessaoOnlineMotoboy.findMany({
    where: {
      motoboyId,
      encerradaEm: null,
    },
  });

  for (const sessao of sessoes) {
    const fimSeguro =
      sessao.ultimaLocalizacaoEm &&
      sessao.ultimaLocalizacaoEm.getTime() < encerradaEm.getTime()
        ? sessao.ultimaLocalizacaoEm
        : encerradaEm;

    const tempoSegundos = Math.max(
      0,
      Math.floor((fimSeguro.getTime() - sessao.iniciadaEm.getTime()) / 1000)
    );

    await tx.sessaoOnlineMotoboy.update({
      where: {
        id: sessao.id,
      },
      data: {
        encerradaEm: fimSeguro,
        tempoSegundos,
      },
    });

    await tx.controleDiarioMotoboy.update({
      where: {
        id: sessao.controleDiarioId,
      },
      data: {
        tempoOnlineSegundos: {
          increment: tempoSegundos,
        },
      },
    });
  }
}

export async function GET(request: Request) {
  try {
    const motoboy = await obterMotoboyAutenticado(request);

    if (!motoboy) {
      return respostaErro("Acesso negado.", 403);
    }

    const sessaoOnline = motoboy.online
      ? await prisma.sessaoOnlineMotoboy.findFirst({
          where: {
            motoboyId: motoboy.id,
            encerradaEm: null,
          },
          orderBy: {
            iniciadaEm: "desc",
          },
          select: {
            id: true,
            iniciadaEm: true,
            kmOnline: true,
            pontosAceitos: true,
            pontosDescartados: true,
          },
        })
      : null;

    return NextResponse.json({
      motoboy: {
        id: motoboy.id,
        nome: motoboy.nome,
        online: motoboy.online,
        latitude: motoboy.latitude,
        longitude: motoboy.longitude,
        precisao: motoboy.precisaoLocalizacao,
        onlineDesde: motoboy.onlineDesde,
        localizacaoAtualizadaEm: motoboy.localizacaoAtualizadaEm,
        sessaoOnline,
      },
    });
  } catch (erro) {
    console.error("Erro ao consultar localização do motoboy:", erro);

    return respostaErro("Não foi possível consultar sua localização.", 500);
  }
}

function regraPontuacaoPresenca(data: Date) {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(data);

  const weekday = partes.find((p) => p.type === "weekday")?.value || "";
  const hora = Number(partes.find((p) => p.type === "hour")?.value || 0);
  const minuto = Number(partes.find((p) => p.type === "minute")?.value || 0);
  const minutos = hora * 60 + minuto;

  const mapaDia: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const dia = mapaDia[weekday] ?? 0;

  const inicioPrevisto = dia === 6 ? 9 * 60 : 8 * 60 + 30;
  const emExpediente =
    dia >= 1 && dia <= 5
      ? (minutos >= 8 * 60 + 30 && minutos < 12 * 60) ||
        (minutos >= 13 * 60 + 30 && minutos < 19 * 60)
      : dia === 6
        ? minutos >= 9 * 60 && minutos < 16 * 60
        : false;

  const deveTrabalhar = dia >= 1 && dia <= 6;

  return {
    dia,
    minutos,
    inicioPrevisto,
    atrasadoPrimeiroOnline: deveTrabalhar && minutos > inicioPrevisto + 15,
    emExpediente,
  };
}

function intervaloDiaPontuacao(data: Date) {
  const dataISO = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(data);

  return {
    inicio: new Date(`${dataISO}T00:00:00-03:00`),
    fim: new Date(`${dataISO}T23:59:59.999-03:00`),
  };
}
export async function PUT(request: Request) {
  try {
    const motoboy = await obterMotoboyAutenticado(request);

    if (!motoboy) {
      return respostaErro("Acesso negado.", 403);
    }

    const body = (await request.json()) as LocalizacaoBody;
    const acao = body.acao;

    if (!acao) {
      return respostaErro("Informe a ação desejada.", 400);
    }

    const agora = new Date();
    const regraPresenca = regraPontuacaoPresenca(agora);
    const intervaloHojePontuacao = intervaloDiaPontuacao(agora);

    /*
     * Offline automatico apos 19h (America/Sao_Paulo).
     *
     * Uma rota e considerada ativa somente quando a tele foi aceita
     * pelo motoboy e ainda nao foi entregue. Assim:
     * - sem rota ativa apos 19h => encerra a sessao e fica offline;
     * - com rota ativa => continua online normalmente;
     * - ao concluir a ultima rota, a proxima atualizacao de localizacao
     *   encerra a presenca automaticamente.
     *
     * A regra usa a propria atualizacao de localizacao que ja existe,
     * sem Cron e sem API externa.
     */
    const offlineAutomatico19h =
      (acao === "ONLINE" || acao === "ATUALIZAR") && horaBrasil(agora) >= 19;

    if (offlineAutomatico19h) {
      const rotasAtivas = await prisma.tele.count({
        where: {
          motoboyId: motoboy.id,
          statusAceite: "ACEITA",
          status: {
            not: "ENTREGUE",
          },
        },
      });

      if (rotasAtivas === 0) {
        const atualizado = await prisma.$transaction(async (tx) => {
          await encerrarSessoesAbertas(tx, motoboy.id, agora);

          return tx.motoboy.update({
            where: {
              id: motoboy.id,
            },
            data: {
              online: false,
              onlineDesde: null,
            },
            select: {
              id: true,
              nome: true,
              online: true,
              latitude: true,
              longitude: true,
              precisaoLocalizacao: true,
              onlineDesde: true,
              localizacaoAtualizadaEm: true,
            },
          });
        });

        return NextResponse.json({
          ok: true,
          offlineAutomatico: true,
          motivoOfflineAutomatico: "Encerramento automatico apos 19h sem rota ativa.",
          motoboy: atualizado,
        });
      }
    }

    if (acao === "OFFLINE") {
      const atualizado = await prisma.$transaction(async (tx) => {
        if (regraPresenca.emExpediente) {
          const doisMinutosAtras = new Date(agora.getTime() - 2 * 60_000);
          const duplicada = await tx.motoboyPontuacao.findFirst({
            where: {
              motoboyId: motoboy.id,
              tipo: "OFFLINE_EXPEDIENTE",
              ocorridoEm: { gte: doisMinutosAtras },
            },
            select: { id: true },
          });

          if (!duplicada) {
            await tx.motoboyPontuacao.create({
              data: {
                motoboyId: motoboy.id,
                tipo: "OFFLINE_EXPEDIENTE",
                titulo: "Offline durante o expediente",
                descricao: "Ficou offline manualmente durante o horÃ¡rio operacional.",
                descricaoOriginal: "Ficou offline manualmente durante o horÃ¡rio operacional.",
                pontos: -5,
                pontosOriginais: -5,
                origem: "AUTOMATICA",
                status: "ATIVA",
                ocorridoEm: agora,
              },
            });
          }
        }

        await encerrarSessoesAbertas(tx, motoboy.id, agora);

        return tx.motoboy.update({
          where: {
            id: motoboy.id,
          },
          data: {
            online: false,
            onlineDesde: null,
          },
          select: {
            id: true,
            nome: true,
            online: true,
            latitude: true,
            longitude: true,
            precisaoLocalizacao: true,
            onlineDesde: true,
            localizacaoAtualizadaEm: true,
          },
        });
      });

      return NextResponse.json({
        ok: true,
        motoboy: atualizado,
      });
    }

    if (acao !== "ONLINE" && acao !== "ATUALIZAR") {
      return respostaErro("Ação inválida.", 400);
    }

    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);
    const precisao =
      body.precisao === null || body.precisao === undefined ? null : Number(body.precisao);

    if (!coordenadasValidas(latitude, longitude)) {
      return respostaErro("A localização enviada é inválida.", 400);
    }

    if (precisao !== null && (!Number.isFinite(precisao) || precisao < 0)) {
      return respostaErro("A precisão da localização é inválida.", 400);
    }

    if (acao === "ATUALIZAR" && !motoboy.online) {
      return respostaErro("Fique online antes de atualizar a localização.", 409);
    }

    const resultado = await prisma.$transaction(async (tx) => {
      const controleDiario = await criarOuObterControleDiario(
        tx,
        motoboy.id,
        agora
      );

      let sessao = await tx.sessaoOnlineMotoboy.findFirst({
        where: {
          motoboyId: motoboy.id,
          encerradaEm: null,
        },
        orderBy: {
          iniciadaEm: "desc",
        },
      });

      if (acao === "ONLINE" && !motoboy.online) {
        if (regraPresenca.atrasadoPrimeiroOnline) {
          const primeiraSessaoHoje = await tx.sessaoOnlineMotoboy.findFirst({
            where: {
              motoboyId: motoboy.id,
              iniciadaEm: {
                gte: intervaloHojePontuacao.inicio,
                lte: intervaloHojePontuacao.fim,
              },
            },
            select: { id: true },
          });

          const ocorrenciaHoje = await tx.motoboyPontuacao.findFirst({
            where: {
              motoboyId: motoboy.id,
              tipo: "ATRASO_ONLINE",
              ocorridoEm: {
                gte: intervaloHojePontuacao.inicio,
                lte: intervaloHojePontuacao.fim,
              },
            },
            select: { id: true },
          });

          if (!primeiraSessaoHoje && !ocorrenciaHoje) {
            const horaPrevista = regraPresenca.dia === 6 ? "09:00" : "08:30";
            const horaReal = `${String(Math.floor(regraPresenca.minutos / 60)).padStart(2, "0")}:${String(
              regraPresenca.minutos % 60
            ).padStart(2, "0")}`;

            await tx.motoboyPontuacao.create({
              data: {
                motoboyId: motoboy.id,
                tipo: "ATRASO_ONLINE",
                titulo: "Atraso para ficar online",
                descricao: `Primeiro online do dia Ã s ${horaReal}. Previsto ${horaPrevista}, com tolerÃ¢ncia de 15 minutos.`,
                descricaoOriginal: `Primeiro online do dia Ã s ${horaReal}. Previsto ${horaPrevista}, com tolerÃ¢ncia de 15 minutos.`,
                pontos: -5,
                pontosOriginais: -5,
                origem: "AUTOMATICA",
                status: "ATIVA",
                ocorridoEm: agora,
              },
            });
          }
        }

        if (sessao) {
          await encerrarSessoesAbertas(tx, motoboy.id, agora);
          sessao = null;
        }

        sessao = await tx.sessaoOnlineMotoboy.create({
          data: {
            motoboyId: motoboy.id,
            controleDiarioId: controleDiario.id,
            iniciadaEm: agora,
            ultimaLatitude: latitude,
            ultimaLongitude: longitude,
            ultimaPrecisao: precisao,
            ultimaLocalizacaoEm: agora,
            pontosAceitos: 1,
          },
        });
      }

      if (!sessao) {
        sessao = await tx.sessaoOnlineMotoboy.create({
          data: {
            motoboyId: motoboy.id,
            controleDiarioId: controleDiario.id,
            iniciadaEm: motoboy.onlineDesde || agora,
            ultimaLatitude: latitude,
            ultimaLongitude: longitude,
            ultimaPrecisao: precisao,
            ultimaLocalizacaoEm: agora,
            pontosAceitos: 1,
          },
        });
      } else if (acao === "ATUALIZAR") {
        const possuiPontoAnterior =
          typeof sessao.ultimaLatitude === "number" &&
          typeof sessao.ultimaLongitude === "number" &&
          sessao.ultimaLocalizacaoEm !== null;

        if (possuiPontoAnterior) {
          const distanciaMetros = distanciaEmMetros(
            sessao.ultimaLatitude as number,
            sessao.ultimaLongitude as number,
            latitude,
            longitude
          );

          const segundos = Math.max(
            0,
            Math.floor(
              (agora.getTime() - sessao.ultimaLocalizacaoEm!.getTime()) / 1000
            )
          );

          const valido = trechoGpsValido({
            distanciaMetros,
            segundos,
            precisaoAtual: precisao,
            precisaoAnterior: sessao.ultimaPrecisao,
          });

          if (valido) {
            const distanciaKm = distanciaMetros / 1000;

            sessao = await tx.sessaoOnlineMotoboy.update({
              where: {
                id: sessao.id,
              },
              data: {
                kmOnline: {
                  increment: distanciaKm,
                },
                ultimaLatitude: latitude,
                ultimaLongitude: longitude,
                ultimaPrecisao: precisao,
                ultimaLocalizacaoEm: agora,
                pontosAceitos: {
                  increment: 1,
                },
              },
            });

            await tx.controleDiarioMotoboy.update({
              where: {
                id: sessao.controleDiarioId,
              },
              data: {
                kmOnlineTotal: {
                  increment: distanciaKm,
                },
              },
            });
          } else {
            await tx.sessaoOnlineMotoboy.update({
              where: {
                id: sessao.id,
              },
              data: {
                pontosDescartados: {
                  increment: 1,
                },
              },
            });
          }
        } else {
          sessao = await tx.sessaoOnlineMotoboy.update({
            where: {
              id: sessao.id,
            },
            data: {
              ultimaLatitude: latitude,
              ultimaLongitude: longitude,
              ultimaPrecisao: precisao,
              ultimaLocalizacaoEm: agora,
              pontosAceitos: {
                increment: 1,
              },
            },
          });
        }
      }

      const atualizado = await tx.motoboy.update({
        where: {
          id: motoboy.id,
        },
        data: {
          online: true,
          latitude,
          longitude,
          precisaoLocalizacao: precisao,
          localizacaoAtualizadaEm: agora,
          onlineDesde:
            acao === "ONLINE" && !motoboy.online
              ? agora
              : motoboy.onlineDesde || agora,
        },
        select: {
          id: true,
          nome: true,
          online: true,
          latitude: true,
          longitude: true,
          precisaoLocalizacao: true,
          onlineDesde: true,
          localizacaoAtualizadaEm: true,
        },
      });

      return {
        atualizado,
        sessao,
      };
    });

    return NextResponse.json({
      ok: true,
      motoboy: resultado.atualizado,
      sessaoOnline: {
        id: resultado.sessao.id,
        iniciadaEm: resultado.sessao.iniciadaEm,
        kmOnline: resultado.sessao.kmOnline,
        pontosAceitos: resultado.sessao.pontosAceitos,
        pontosDescartados: resultado.sessao.pontosDescartados,
      },
    });
  } catch (erro) {
    console.error("Erro ao atualizar localização do motoboy:", erro);

    return respostaErro("Não foi possível atualizar sua localização.", 500);
  }
}
