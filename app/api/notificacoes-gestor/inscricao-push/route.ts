import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type InscricaoRecebida = {
  endpoint?: unknown;
  keys?: {
    p256dh?: unknown;
    auth?: unknown;
  };
};

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

function normalizarInscricao(inscricao: InscricaoRecebida) {
  const endpoint = String(inscricao?.endpoint || "").trim();
  const p256dh = String(inscricao?.keys?.p256dh || "").trim();
  const auth = String(inscricao?.keys?.auth || "").trim();

  if (!endpoint || !p256dh || !auth) {
    return null;
  }

  return {
    endpoint,
    p256dh,
    auth,
  };
}

export async function GET() {
  try {
    const usuario = await validarAdministrador();

    if (!usuario) {
      return respostaErro("Acesso negado.", 403);
    }

    const quantidadeAtivas = await prisma.inscricaoPushGestor.count({
      where: {
        userId: usuario.id,
        ativa: true,
      },
    });

    return NextResponse.json({
      ativa: quantidadeAtivas > 0,
      quantidadeAtivas,
      chavePublica: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null,
    });
  } catch (erro) {
    console.error("Erro ao consultar inscrição push:", erro);

    return respostaErro(
      "Não foi possível consultar as notificações do aparelho.",
      500
    );
  }
}

export async function POST(request: Request) {
  try {
    const usuario = await validarAdministrador();

    if (!usuario) {
      return respostaErro("Acesso negado.", 403);
    }

    const body = await request.json();
    const inscricao = normalizarInscricao(body?.inscricao || body);

    if (!inscricao) {
      return respostaErro("Inscrição push inválida.", 400);
    }

    const userAgent = request.headers.get("user-agent")?.slice(0, 500) || null;
    const agora = new Date();

    const inscricaoSalva = await prisma.inscricaoPushGestor.upsert({
      where: {
        endpoint: inscricao.endpoint,
      },
      create: {
        userId: usuario.id,
        endpoint: inscricao.endpoint,
        p256dh: inscricao.p256dh,
        auth: inscricao.auth,
        userAgent,
        ativa: true,
        ultimoUsoEm: agora,
      },
      update: {
        userId: usuario.id,
        p256dh: inscricao.p256dh,
        auth: inscricao.auth,
        userAgent,
        ativa: true,
        ultimoUsoEm: agora,
      },
      select: {
        id: true,
        ativa: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      ok: true,
      inscricao: inscricaoSalva,
    });
  } catch (erro) {
    console.error("Erro ao salvar inscrição push:", erro);

    return respostaErro(
      "Não foi possível ativar as notificações neste aparelho.",
      500
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const usuario = await validarAdministrador();

    if (!usuario) {
      return respostaErro("Acesso negado.", 403);
    }

    const body = await request.json();
    const endpoint = String(body?.endpoint || "").trim();

    if (!endpoint) {
      return respostaErro("Endpoint da inscrição não informado.", 400);
    }

    const resultado = await prisma.inscricaoPushGestor.updateMany({
      where: {
        userId: usuario.id,
        endpoint,
        ativa: true,
      },
      data: {
        ativa: false,
        ultimoUsoEm: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      quantidadeAtualizada: resultado.count,
    });
  } catch (erro) {
    console.error("Erro ao desativar inscrição push:", erro);

    return respostaErro(
      "Não foi possível desativar as notificações neste aparelho.",
      500
    );
  }
}
