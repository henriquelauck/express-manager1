import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function respostaErro(mensagem: string, status: number) {
  return NextResponse.json({ erro: mensagem }, { status });
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
      },
      include: {
        paradas: {
          orderBy: {
            ordem: "asc",
          },
        },
      },
      orderBy: [
        {
          dataTele: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
    });

    return NextResponse.json(teles);
  } catch (erro) {
    console.error("Erro ao carregar teles do motoboy:", erro);

    return respostaErro("Não foi possível carregar suas teles.", 500);
  }
}
