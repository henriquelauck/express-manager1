import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type LoginBody = {
  motoboyId?: string;
  userId?: string;
  email?: string;
  senha?: string;
};

function respostaErro(mensagem: string, status: number) {
  return NextResponse.json({ erro: mensagem }, { status });
}

function normalizarEmail(valor: unknown) {
  return String(valor || "")
    .trim()
    .toLowerCase();
}

function emailValido(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function exigirAdmin() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("express_user_id")?.value;

  if (!userId) return null;

  const usuario = await prisma.user.findUnique({
    where: { id: userId },
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

export async function GET() {
  try {
    const admin = await exigirAdmin();

    if (!admin) {
      return respostaErro("Acesso não autorizado.", 403);
    }

    const motoboys = await prisma.motoboy.findMany({
      include: {
        user: {
          select: {
            id: true,
            nome: true,
            email: true,
            role: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: {
        nome: "asc",
      },
    });

    return NextResponse.json(motoboys);
  } catch (erro) {
    console.error("Erro ao carregar logins dos motoboys:", erro);

    return respostaErro("Não foi possível carregar os logins dos motoboys.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const admin = await exigirAdmin();

    if (!admin) {
      return respostaErro("Acesso não autorizado.", 403);
    }

    const body = (await request.json()) as LoginBody;

    const motoboyId = String(body.motoboyId || "").trim();
    const email = normalizarEmail(body.email);
    const senha = String(body.senha || "");

    if (!motoboyId || !email || !senha) {
      return respostaErro("Preencha motoboy, e-mail e senha.", 400);
    }

    if (!emailValido(email)) {
      return respostaErro("Informe um e-mail válido.", 400);
    }

    if (senha.length < 6) {
      return respostaErro("A senha deve ter pelo menos 6 caracteres.", 400);
    }

    const motoboy = await prisma.motoboy.findUnique({
      where: {
        id: motoboyId,
      },
      select: {
        id: true,
        nome: true,
        userId: true,
      },
    });

    if (!motoboy) {
      return respostaErro("Motoboy não encontrado.", 404);
    }

    if (motoboy.userId) {
      return respostaErro("Este motoboy já possui um login vinculado.", 409);
    }

    const emailEmUso = await prisma.user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
      },
    });

    if (emailEmUso) {
      return respostaErro("Este e-mail já está sendo usado por outro usuário.", 409);
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const usuario = await prisma.$transaction(async (tx) => {
      const novoUsuario = await tx.user.create({
        data: {
          nome: motoboy.nome,
          email,
          senhaHash,
          role: "MOTOBOY",
        },
      });

      await tx.motoboy.update({
        where: {
          id: motoboy.id,
        },
        data: {
          userId: novoUsuario.id,
        },
      });

      return novoUsuario;
    });

    return NextResponse.json(
      {
        ok: true,
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          role: usuario.role,
        },
      },
      { status: 201 }
    );
  } catch (erro) {
    console.error("Erro ao criar login do motoboy:", erro);

    return respostaErro("Não foi possível criar o login do motoboy.", 500);
  }
}

export async function PUT(request: Request) {
  try {
    const admin = await exigirAdmin();

    if (!admin) {
      return respostaErro("Acesso não autorizado.", 403);
    }

    const body = (await request.json()) as LoginBody;

    const userId = String(body.userId || "").trim();
    const email = body.email ? normalizarEmail(body.email) : "";
    const senha = body.senha ? String(body.senha) : "";

    if (!userId) {
      return respostaErro("O identificador do usuário é obrigatório.", 400);
    }

    if (!email && !senha) {
      return respostaErro("Informe um novo e-mail ou uma nova senha.", 400);
    }

    const usuario = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        role: true,
        email: true,
        motoboy: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
    });

    if (!usuario) {
      return respostaErro("Usuário não encontrado.", 404);
    }

    if (usuario.role !== "MOTOBOY" || !usuario.motoboy) {
      return respostaErro("Somente logins de motoboys podem ser alterados por esta tela.", 403);
    }

    if (email) {
      if (!emailValido(email)) {
        return respostaErro("Informe um e-mail válido.", 400);
      }

      const emailEmUso = await prisma.user.findFirst({
        where: {
          email,
          id: {
            not: userId,
          },
        },
        select: {
          id: true,
        },
      });

      if (emailEmUso) {
        return respostaErro("Este e-mail já está sendo usado por outro usuário.", 409);
      }
    }

    if (senha && senha.length < 6) {
      return respostaErro("A senha deve ter pelo menos 6 caracteres.", 400);
    }

    const dados: {
      email?: string;
      senhaHash?: string;
    } = {};

    if (email) {
      dados.email = email;
    }

    if (senha) {
      dados.senhaHash = await bcrypt.hash(senha, 10);
    }

    const usuarioAtualizado = await prisma.user.update({
      where: {
        id: userId,
      },
      data: dados,
      select: {
        id: true,
        nome: true,
        email: true,
        role: true,
      },
    });

    return NextResponse.json({
      ok: true,
      usuario: usuarioAtualizado,
    });
  } catch (erro) {
    console.error("Erro ao alterar login do motoboy:", erro);

    return respostaErro("Não foi possível alterar o login do motoboy.", 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const admin = await exigirAdmin();

    if (!admin) {
      return respostaErro("Acesso não autorizado.", 403);
    }

    const body = (await request.json()) as LoginBody;
    const userId = String(body.userId || "").trim();

    if (!userId) {
      return respostaErro("O identificador do usuário é obrigatório.", 400);
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

    if (!usuario) {
      return respostaErro("Usuário não encontrado.", 404);
    }

    if (usuario.role !== "MOTOBOY" || !usuario.motoboy) {
      return respostaErro("Somente logins de motoboys podem ser excluídos por esta tela.", 403);
    }

    await prisma.$transaction(async (tx) => {
      await tx.motoboy.update({
        where: {
          id: usuario.motoboy!.id,
        },
        data: {
          userId: null,
        },
      });

      await tx.user.delete({
        where: {
          id: usuario.id,
        },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error("Erro ao excluir login do motoboy:", erro);

    return respostaErro("Não foi possível excluir o login do motoboy.", 500);
  }
}
