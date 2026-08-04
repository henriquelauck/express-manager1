import { prisma } from "@/lib/prisma";
import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function gerarHashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST() {
  try {
    const cookieStore = await cookies();
    const usuarioId = cookieStore.get("express_user_id")?.value;
    const role = cookieStore.get("express_user_role")?.value;

    if (!usuarioId || role !== "MOTOBOY") {
      return NextResponse.json({ erro: "Acesso negado." }, { status: 403 });
    }

    const usuario = await prisma.user.findUnique({
      where: { id: usuarioId },
      include: { motoboy: true },
    });

    if (!usuario || usuario.role !== "MOTOBOY" || !usuario.motoboy) {
      return NextResponse.json({ erro: "Motoboy não encontrado." }, { status: 404 });
    }

    const appToken = randomBytes(32).toString("hex");

    await prisma.motoboy.update({
      where: { id: usuario.motoboy.id },
      data: {
        appTokenHash: gerarHashToken(appToken),
        appTokenCriadoEm: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,
      appToken,
    });
  } catch (erro) {
    console.error("Erro ao preparar token do aplicativo:", erro);
    return NextResponse.json(
      { erro: "Não foi possível preparar a autenticação do aplicativo." },
      { status: 500 }
    );
  }
}
