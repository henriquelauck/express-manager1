import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type ConfirmarOrcamentoBody = {
  teleId?: unknown;
};

function texto(valor: unknown) {
  return typeof valor === "string" ? valor.trim() : "";
}

function erro(mensagem: string, status: number) {
  return NextResponse.json({ erro: mensagem }, { status });
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("express_user_id")?.value;

    if (!userId) {
      return erro("Nao autenticado.", 401);
    }

    const usuario = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!usuario || usuario.role !== "ADMIN") {
      return erro("Acesso permitido somente ao gestor.", 403);
    }

    const body = (await request.json()) as ConfirmarOrcamentoBody;
    const teleId = texto(body.teleId);

    if (!teleId) {
      return erro("Orcamento nao informado.", 400);
    }

    const tele = await prisma.tele.findUnique({
      where: { id: teleId },
      select: {
        id: true,
        orcamento: true,
        status: true,
      },
    });

    if (!tele) {
      return erro("Orcamento nao encontrado.", 404);
    }

    if (!tele.orcamento) {
      return erro("Este registro ja foi confirmado como tele.", 409);
    }

    const atualizada = await prisma.tele.update({
      where: { id: teleId },
      data: {
        orcamento: false,
        status: "AGUARDANDO_MOTOBOY",
        motoboyId: null,
        motoboyNome: null,
        statusAceite: "NAO_ENVIADA",
        atribuidaAoMotoboyEm: null,
        aceitaPeloMotoboyEm: null,
        recusadaPeloMotoboyEm: null,
        motivoRecusaMotoboy: null,
      },
      select: {
        id: true,
        solicitante: true,
        orcamento: true,
        status: true,
      },
    });

    return NextResponse.json({
      id: atualizada.id,
      solicitante: atualizada.solicitante,
      orcamento: atualizada.orcamento,
      status: atualizada.status,
    });
  } catch (error) {
    console.error("Erro ao confirmar orcamento:", error);

    return erro(
      error instanceof Error ? error.message : "Nao foi possivel confirmar o orcamento.",
      500
    );
  }
}
