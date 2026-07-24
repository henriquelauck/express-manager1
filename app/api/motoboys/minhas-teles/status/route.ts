import { prisma } from "@/lib/prisma";
import type { StatusTele } from "@prisma/client";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type BodyStatus = {
  teleId?: string;
  status?: string;
};

const STATUS_PERMITIDOS: StatusTele[] = ["AGUARDANDO_COLETA", "EM_ROTA", "ENTREGUE"];

const PROXIMO_STATUS: Partial<Record<StatusTele, StatusTele[]>> = {
  AGUARDANDO_CLIENTE: ["AGUARDANDO_COLETA"],
  AGUARDANDO_MOTOBOY: ["AGUARDANDO_COLETA"],
  AGUARDANDO_COLETA: ["EM_ROTA"],
  EM_ROTA: ["ENTREGUE"],
  ENTREGUE: [],
};

function respostaErro(mensagem: string, status: number) {
  return NextResponse.json({ erro: mensagem }, { status });
}

function statusValido(status: string): status is StatusTele {
  return STATUS_PERMITIDOS.includes(status as StatusTele);
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

    if (!teleId || !novoStatus) {
      return respostaErro("Informe a tele e o novo status.", 400);
    }

    if (!statusValido(novoStatus)) {
      return respostaErro("Status não permitido para o motoboy.", 400);
    }

    const tele = await prisma.tele.findFirst({
      where: {
        id: teleId,
        motoboyId: usuario.motoboy.id,
      },
      select: {
        id: true,
        status: true,
        motoboyId: true,
      },
    });

    if (!tele) {
      return respostaErro("Tele não encontrada ou não vinculada ao seu usuário.", 404);
    }

    if (tele.status === novoStatus) {
      return NextResponse.json({
        ok: true,
        tele: {
          id: tele.id,
          status: tele.status,
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
        dataTele: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      tele: teleAtualizada,
    });
  } catch (erro) {
    console.error("Erro ao atualizar status pelo motoboy:", erro);

    return respostaErro("Não foi possível atualizar o status da tele.", 500);
  }
}
