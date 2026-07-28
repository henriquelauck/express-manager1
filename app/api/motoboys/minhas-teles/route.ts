import { prisma } from "@/lib/prisma";
import { createHash, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const PRAZO_ACEITE_MS = 5 * 60_000;

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

    const teles = await prisma.tele.findMany({
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
      },
    });

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
      telesOrdenadas.map((tele) => ({
        ...tele,
        aguardandoAceite: tele.status !== "ENTREGUE" && tele.statusAceite === "AGUARDANDO_ACEITE",
        aceitaPeloMotoboy: tele.statusAceite === "ACEITA",
        posicaoNaFila:
          tele.statusAceite === "ACEITA" && tele.status !== "ENTREGUE" ? tele.ordemMotoboy : null,
      }))
    );
  } catch (erro) {
    console.error("Erro ao carregar teles do motoboy:", erro);

    return respostaErro("Não foi possível carregar suas teles.", 500);
  }
}
