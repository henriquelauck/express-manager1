import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";

function gerarTokenApp() {
  return randomBytes(32).toString("hex");
}

function gerarHashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const senha = typeof body?.senha === "string" ? body.senha : "";

    if (!email || !senha) {
      return NextResponse.json({ erro: "Informe o e-mail e a senha." }, { status: 400 });
    }

    const usuario = await prisma.user.findUnique({
      where: {
        email,
      },
      include: {
        motoboy: true,
      },
    });

    if (!usuario || !usuario.senhaHash) {
      return NextResponse.json({ erro: "E-mail ou senha inválidos." }, { status: 401 });
    }

    const senhaValida = await bcrypt.compare(senha, usuario.senhaHash);

    if (!senhaValida) {
      return NextResponse.json({ erro: "E-mail ou senha inválidos." }, { status: 401 });
    }

    const acessoAndroid = request.headers.get("x-express-app")?.toLowerCase() === "android";

    let appToken: string | null = null;

    if (acessoAndroid && usuario.role === "MOTOBOY" && usuario.motoboy) {
      appToken = gerarTokenApp();

      await prisma.motoboy.update({
        where: {
          id: usuario.motoboy.id,
        },
        data: {
          appTokenHash: gerarHashToken(appToken),
          appTokenCriadoEm: new Date(),
        },
      });
    }

    const resposta = NextResponse.json({
      ok: true,
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        role: usuario.role,
        motoboyId: usuario.motoboy?.id || null,
      },
      appToken,
    });

    resposta.cookies.set("express_user_id", usuario.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    resposta.cookies.set("express_user_role", usuario.role, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return resposta;
  } catch (erro) {
    console.error("Erro ao realizar login:", erro);

    return NextResponse.json({ erro: "Não foi possível realizar o login." }, { status: 500 });
  }
}
