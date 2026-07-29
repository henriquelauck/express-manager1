import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type AtribuirMotoboyBody = {
  teleId?: unknown;
  motoboyId?: unknown;
};

function normalizarTexto(valor: unknown) {
  return typeof valor === "string" ? valor.trim() : "";
}

function respostaErro(mensagem: string, status: number) {
  return NextResponse.json({ erro: mensagem }, { status });
}

export async function POST(request: Request) {
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
      },
    });

    if (!usuario || usuario.role !== "ADMIN") {
      return respostaErro("Acesso permitido somente ao gestor.", 403);
    }

    const body = (await request.json()) as AtribuirMotoboyBody;
    const teleId = normalizarTexto(body.teleId);
    const motoboyId = normalizarTexto(body.motoboyId);

    if (!teleId) {
      return respostaErro("Tele não informada.", 400);
    }

    if (!motoboyId) {
      return respostaErro("Motoboy não informado.", 400);
    }

    const [teleAtual, motoboy] = await Promise.all([
      prisma.tele.findUnique({
        where: {
          id: teleId,
        },
        select: {
          id: true,
          solicitante: true,
          status: true,
          statusAceite: true,
          motoboyId: true,
        },
      }),
      prisma.motoboy.findUnique({
        where: {
          id: motoboyId,
        },
        select: {
          id: true,
          nome: true,
          online: true,
          latitude: true,
          longitude: true,
          localizacaoAtualizadaEm: true,
        },
      }),
    ]);

    if (!teleAtual) {
      return respostaErro("Tele não encontrada.", 404);
    }

    if (!motoboy) {
      return respostaErro("Motoboy não encontrado.", 404);
    }

    if (teleAtual.status === "ENTREGUE") {
      return respostaErro("Uma tele entregue não pode ser atribuída novamente.", 409);
    }

    if (teleAtual.statusAceite === "ACEITA") {
      return respostaErro(
        "Esta tele já foi aceita. Altere o motoboy pela Central de Operações.",
        409
      );
    }

    if (!motoboy.online) {
      return respostaErro(`${motoboy.nome} não está online no momento.`, 409);
    }

    if (
      motoboy.latitude === null ||
      motoboy.longitude === null ||
      !motoboy.localizacaoAtualizadaEm
    ) {
      return respostaErro(`${motoboy.nome} está sem localização válida.`, 409);
    }

    const limiteLocalizacaoRecente = Date.now() - 5 * 60_000;

    if (motoboy.localizacaoAtualizadaEm.getTime() < limiteLocalizacaoRecente) {
      return respostaErro(`A localização de ${motoboy.nome} está desatualizada.`, 409);
    }

    const agora = new Date();

    const teleAtualizada = await prisma.$transaction(async (tx) => {
      /*
       * Remove qualquer item antigo desta tele que possa ter restado
       * de uma atribuição anterior ainda não aceita.
       */
      await tx.itemFilaOperacionalMotoboy.deleteMany({
        where: {
          teleId,
          status: {
            in: ["PENDENTE", "EM_ANDAMENTO"],
          },
        },
      });

      return tx.tele.update({
        where: {
          id: teleId,
        },
        data: {
          motoboyId: motoboy.id,
          motoboyNome: motoboy.nome,

          status: "AGUARDANDO_MOTOBOY",
          statusAceite: "AGUARDANDO_ACEITE",
          atribuidaAoMotoboyEm: agora,

          ordemMotoboy: null,
          etapaMotoboy: null,
          paradaAtualMotoboy: 0,

          aceitaPeloMotoboyEm: null,
          recusadaPeloMotoboyEm: null,
          motivoRecusaMotoboy: null,

          rotaColetaIniciadaEm: null,
          chegouNaColetaEm: null,
          entregaIniciadaEm: null,
          chegouNaEntregaEm: null,
          concluidaPeloMotoboyEm: null,
        },
        include: {
          paradas: {
            orderBy: {
              ordem: "asc",
            },
          },
          motoboy: true,
          cliente: true,
        },
      });
    });

    return NextResponse.json({
      ok: true,
      mensagem: `Tele enviada para ${motoboy.nome}.`,
      tele: teleAtualizada,
    });
  } catch (erro) {
    console.error("Erro ao atribuir motoboy à tele:", erro);

    return respostaErro("Não foi possível atribuir o motoboy à tele.", 500);
  }
}
