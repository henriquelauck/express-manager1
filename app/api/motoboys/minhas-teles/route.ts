import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function respostaErro(mensagem: string, status: number) {
  return NextResponse.json({ erro: mensagem }, { status });
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

export async function GET() {
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

    const teles = await prisma.tele.findMany({
      where: {
        motoboyId: usuario.motoboy.id,
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
        aguardandoAceite: tele.statusAceite === "AGUARDANDO_ACEITE",
        aceitaPeloMotoboy: tele.statusAceite === "ACEITA",
        posicaoNaFila: tele.statusAceite === "ACEITA" ? tele.ordemMotoboy : null,
      }))
    );
  } catch (erro) {
    console.error("Erro ao carregar teles do motoboy:", erro);

    return respostaErro("Não foi possível carregar suas teles.", 500);
  }
}
