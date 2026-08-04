import { prisma } from "@/lib/prisma";
import { createHash, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const PRAZO_ACEITE_MS = 5 * 60_000;
const MINUTOS_POR_BLOCO_ESPERA = 15;
const VALOR_POR_BLOCO_ESPERA = 5;

async function atualizarEsperasAtivas(motoboyId: string) {
  const agora = new Date();

  /*
   * Correção de segurança:
   * se a tele já está parada na coleta ou na entrega, mas o horário
   * de início não foi gravado por alguma inconsistência anterior,
   * inicia a espera automaticamente nesta consulta.
   */
  await prisma.tele.updateMany({
    where: {
      motoboyId,
      statusAceite: "ACEITA",
      status: {
        not: "ENTREGUE",
      },
      etapaMotoboy: {
        in: ["CHEGOU_NA_COLETA", "CHEGOU_NA_ENTREGA"],
      },
      esperaAtualIniciadaEm: null,
    },
    data: {
      esperaAtualIniciadaEm: agora,
      blocosEsperaAtual: 0,
    },
  });

  const telesComEsperaAtiva = await prisma.tele.findMany({
    where: {
      motoboyId,
      statusAceite: "ACEITA",
      status: {
        not: "ENTREGUE",
      },
      esperaAtualIniciadaEm: {
        not: null,
      },
    },
    select: {
      id: true,
      esperaAtualIniciadaEm: true,
      blocosEsperaAtual: true,
    },
  });

  await Promise.all(
    telesComEsperaAtiva.map(async (tele) => {
      if (!tele.esperaAtualIniciadaEm) {
        return;
      }

      const minutosDecorridos = Math.floor(
        Math.max(0, agora.getTime() - tele.esperaAtualIniciadaEm.getTime()) / 60_000
      );

      const blocosCompletos = Math.floor(minutosDecorridos / MINUTOS_POR_BLOCO_ESPERA);
      const novosBlocos = Math.max(0, blocosCompletos - tele.blocosEsperaAtual);

      if (novosBlocos === 0) {
        return;
      }

      const valorAcrescentar = novosBlocos * VALOR_POR_BLOCO_ESPERA;

      await prisma.tele.updateMany({
        where: {
          id: tele.id,
          blocosEsperaAtual: tele.blocosEsperaAtual,
        },
        data: {
          blocosEsperaAtual: blocosCompletos,
          espera: {
            increment: valorAcrescentar,
          },
          total: {
            increment: valorAcrescentar,
          },
        },
      });
    })
  );
}

function respostaErro(mensagem: string, status: number) {
  return NextResponse.json({ erro: mensagem }, { status });
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
      appTokenHash: true,
    },
  });

  if (!motoboy || !motoboy.appTokenHash || !hashesIguais(hashRecebido, motoboy.appTokenHash)) {
    return null;
  }

  return {
    id: motoboy.id,
  };
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
      role: true,
      motoboy: {
        select: {
          id: true,
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

function prioridadeStatusAceite(statusAceite: string) {
  const prioridades: Record<string, number> = {
    AGUARDANDO_ACEITE: 0,
    ACEITA: 1,
    NAO_ENVIADA: 2,
    RECUSADA: 3,
  };

  return prioridades[statusAceite] ?? 4;
}

export async function GET(request: Request) {
  try {
    const motoboy = await obterMotoboyAutenticado(request);

    if (!motoboy) {
      return respostaErro("Acesso negado.", 403);
    }

    /*
     * Atualiza os blocos completos das esperas que continuam ativas.
     * Como o painel consulta esta rota periodicamente, o acréscimo fica
     * persistido logo após completar 15, 30, 45 minutos e assim por diante.
     */
    await atualizarEsperasAtivas(motoboy.id);

    /*
     * Compatibilidade com teles antigas:
     * antes da implantação do aceite, algumas entregas foram concluídas,
     * mas permaneceram com AGUARDANDO_ACEITE.
     */
    await prisma.tele.updateMany({
      where: {
        motoboyId: motoboy.id,
        status: "ENTREGUE",
        statusAceite: "AGUARDANDO_ACEITE",
      },
      data: {
        statusAceite: "ACEITA",
        etapaMotoboy: "CONCLUIDA",
        ordemMotoboy: null,
        motivoRecusaMotoboy: null,
        recusadaPeloMotoboyEm: null,
      },
    });

    const limiteExpiracao = new Date(Date.now() - PRAZO_ACEITE_MS);

    /*
     * Expira somente teles ainda não concluídas.
     * Uma entrega já marcada como ENTREGUE nunca pode voltar para a Central.
     */
    await prisma.tele.updateMany({
      where: {
        motoboyId: motoboy.id,
        statusAceite: "AGUARDANDO_ACEITE",
        status: {
          not: "ENTREGUE",
        },
        atribuidaAoMotoboyEm: {
          lte: limiteExpiracao,
        },
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

    const [teles, itensFilaOperacional] = await Promise.all([
      prisma.tele.findMany({
        where: {
          motoboyId: motoboy.id,
          statusAceite: {
            not: "RECUSADA",
          },
        },
        include: {
          paradas: {
            orderBy: {
              ordem: "asc",
            },
          },
          recebimentosHistorico: {
            orderBy: {
              dataRecebimento: "asc",
            },
          },
        },
      }),
      prisma.itemFilaOperacionalMotoboy.findMany({
        where: {
          motoboyId: motoboy.id,
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
          ordem: true,
          status: true,
          teleId: true,
          paradaId: true,
          iniciadaEm: true,
          parada: {
            select: {
              id: true,
              ordem: true,
              tipo: true,
              cliente: true,
              endereco: true,
              contato: true,
              observacao: true,
            },
          },
          tele: {
            select: {
              id: true,
              solicitante: true,
            },
          },
        },
      }),
    ]);

    const itemFilaAtual = itensFilaOperacional[0] || null;
    const posicaoItemPorId = new Map(
      itensFilaOperacional.map((item, indice) => [item.id, indice + 1])
    );
    const itensPorTele = new Map<string, typeof itensFilaOperacional>();

    for (const item of itensFilaOperacional) {
      const listaAtual = itensPorTele.get(item.teleId) || [];
      listaAtual.push(item);
      itensPorTele.set(item.teleId, listaAtual);
    }

    const telesOrdenadas = [...teles].sort((teleA, teleB) => {
      const prioridadeA = prioridadeStatusAceite(teleA.statusAceite);
      const prioridadeB = prioridadeStatusAceite(teleB.statusAceite);

      if (prioridadeA !== prioridadeB) {
        return prioridadeA - prioridadeB;
      }

      if (teleA.statusAceite === "ACEITA" && teleB.statusAceite === "ACEITA") {
        const ordemA = teleA.ordemMotoboy ?? Number.MAX_SAFE_INTEGER;
        const ordemB = teleB.ordemMotoboy ?? Number.MAX_SAFE_INTEGER;

        if (ordemA !== ordemB) {
          return ordemA - ordemB;
        }
      }

      if (
        teleA.statusAceite === "AGUARDANDO_ACEITE" &&
        teleB.statusAceite === "AGUARDANDO_ACEITE"
      ) {
        const atribuicaoA = teleA.atribuidaAoMotoboyEm?.getTime() ?? teleA.createdAt.getTime();
        const atribuicaoB = teleB.atribuidaAoMotoboyEm?.getTime() ?? teleB.createdAt.getTime();

        return atribuicaoA - atribuicaoB;
      }

      const dataA = teleA.dataTele?.getTime() ?? teleA.createdAt.getTime();
      const dataB = teleB.dataTele?.getTime() ?? teleB.createdAt.getTime();

      return dataB - dataA;
    });

    return NextResponse.json(
      telesOrdenadas.map((tele) => {
        const itensDaTele = itensPorTele.get(tele.id) || [];

        /*
         * Cada tele controla sua própria sequência de paradas.
         * Uma tele anterior não bloqueia o início de outra tele.
         *
         * Quando existe item EM_ANDAMENTO, ele representa a rota realmente
         * ativa. Caso contrário, o primeiro PENDENTE continua sendo apenas
         * a próxima sugestão para essa tele.
         */
        const itemEmAndamentoDaTele =
          itensDaTele.find((item) => item.status === "EM_ANDAMENTO") || null;

        const itemAtualDaTele = itemEmAndamentoDaTele || itensDaTele[0] || null;

        const filaOperacionalAtiva = itensDaTele.length > 0;
        const teleAceitaPendente = tele.statusAceite === "ACEITA" && tele.status !== "ENTREGUE";

        const etapaEmDeslocamento =
          tele.etapaMotoboy === "EM_ROTA_COLETA" ||
          tele.etapaMotoboy === "EM_ROTA_ENTREGA";

        const rotaAtiva = Boolean(itemEmAndamentoDaTele);
        const aguardandoRetomada =
          teleAceitaPendente &&
          etapaEmDeslocamento &&
          !rotaAtiva &&
          Boolean(itemAtualDaTele);

        /*
         * Depois que a última entrega da tele foi confirmada, o item da fila
         * já está CONCLUIDO. Mesmo que a próxima etapa global pertença a outra
         * tele, esta tele precisa continuar liberada somente para finalizar.
         */
        const finalizacaoLiberadaPelaFila =
          teleAceitaPendente &&
          tele.etapaMotoboy === "CHEGOU_NA_ENTREGA" &&
          itensDaTele.length === 0;

        return {
          ...tele,
          aguardandoAceite: tele.status !== "ENTREGUE" && tele.statusAceite === "AGUARDANDO_ACEITE",
          aceitaPeloMotoboy: tele.statusAceite === "ACEITA",
          posicaoNaFila:
            tele.statusAceite === "ACEITA" && tele.status !== "ENTREGUE" ? tele.ordemMotoboy : null,

          filaOperacionalAtiva,
          rotaAtiva,
          aguardandoRetomada,
          finalizacaoLiberadaPelaFila,
          etapaLiberadaPelaFila:
            !filaOperacionalAtiva || Boolean(itemAtualDaTele) || finalizacaoLiberadaPelaFila,
          bloqueadaPelaFila:
            filaOperacionalAtiva &&
            teleAceitaPendente &&
            !itemAtualDaTele &&
            !finalizacaoLiberadaPelaFila,
          totalEtapasPendentesFila: itensDaTele.length,

          itemFilaAtual: itemAtualDaTele
            ? {
                id: itemAtualDaTele.id,
                ordem: itemAtualDaTele.ordem,
                posicao: posicaoItemPorId.get(itemAtualDaTele.id) || 1,
                status: itemAtualDaTele.status,
                teleId: itemAtualDaTele.teleId,
                paradaId: itemAtualDaTele.paradaId,
                iniciadaEm: itemAtualDaTele.iniciadaEm,
                parada: itemAtualDaTele.parada,
              }
            : null,

          proximaEtapaDaTele:
            itensDaTele.length > 0
              ? {
                  id: itensDaTele[0].id,
                  ordem: itensDaTele[0].ordem,
                  posicao: posicaoItemPorId.get(itensDaTele[0].id) || null,
                  status: itensDaTele[0].status,
                  teleId: itensDaTele[0].teleId,
                  paradaId: itensDaTele[0].paradaId,
                  parada: itensDaTele[0].parada,
                }
              : null,
        };
      })
    );
  } catch (erro) {
    console.error("Erro ao carregar teles do motoboy:", erro);

    return respostaErro("Não foi possível carregar suas teles.", 500);
  }
}
