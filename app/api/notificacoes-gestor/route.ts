import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

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

async function validarAdministrador() {
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
    },
  });

  if (!usuario || usuario.role !== "ADMIN") {
    return null;
  }

  return usuario;
}

export async function GET(request: Request) {
  try {
    const usuario = await validarAdministrador();

    if (!usuario) {
      return respostaErro("Acesso negado.", 403);
    }

    const { searchParams } = new URL(request.url);

    const somenteNaoLidas = searchParams.get("somenteNaoLidas") === "true";
    const limiteInformado = Number(searchParams.get("limite") || 50);
    const limite = Math.min(Math.max(limiteInformado, 1), 100);

    const [notificacoes, quantidadeNaoLidas] = await prisma.$transaction([
      prisma.notificacaoGestor.findMany({
        where: somenteNaoLidas
          ? {
              lida: false,
            }
          : undefined,
        orderBy: {
          createdAt: "desc",
        },
        take: limite,
        include: {
          tele: {
            select: {
              id: true,
              solicitante: true,
              status: true,
              etapaMotoboy: true,
              dataTele: true,
            },
          },
          motoboy: {
            select: {
              id: true,
              nome: true,
            },
          },
        },
      }),
      prisma.notificacaoGestor.count({
        where: {
          lida: false,
        },
      }),
    ]);

    return NextResponse.json({
      notificacoes,
      quantidadeNaoLidas,
    });
  } catch (erro) {
    console.error("Erro ao carregar notificações do gestor:", erro);

    return respostaErro("Não foi possível carregar as notificações.", 500);
  }
}

export async function PATCH(request: Request) {
  try {
    const usuario = await validarAdministrador();

    if (!usuario) {
      return respostaErro("Acesso negado.", 403);
    }

    const body = await request.json();

    const notificacaoId = String(body?.notificacaoId || "").trim();
    const marcarTodas = body?.marcarTodas === true;

    if (!notificacaoId && !marcarTodas) {
      return respostaErro("Informe a notificação ou solicite marcar todas como lidas.", 400);
    }

    const agora = new Date();

    if (marcarTodas) {
      const resultado = await prisma.notificacaoGestor.updateMany({
        where: {
          lida: false,
        },
        data: {
          lida: true,
          lidaEm: agora,
        },
      });

      return NextResponse.json({
        ok: true,
        quantidadeAtualizada: resultado.count,
      });
    }

    const notificacao = await prisma.notificacaoGestor.findUnique({
      where: {
        id: notificacaoId,
      },
      select: {
        id: true,
        lida: true,
      },
    });

    if (!notificacao) {
      return respostaErro("Notificação não encontrada.", 404);
    }

    if (notificacao.lida) {
      return NextResponse.json({
        ok: true,
        notificacao,
      });
    }

    const notificacaoAtualizada = await prisma.notificacaoGestor.update({
      where: {
        id: notificacao.id,
      },
      data: {
        lida: true,
        lidaEm: agora,
      },
    });

    return NextResponse.json({
      ok: true,
      notificacao: notificacaoAtualizada,
    });
  } catch (erro) {
    console.error("Erro ao atualizar notificação do gestor:", erro);

    return respostaErro("Não foi possível atualizar a notificação.", 500);
  }
}
