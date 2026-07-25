import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const userId = cookieStore.get("express_user_id")?.value;
  const acessoAndroid = request.headers.get("x-express-app")?.toLowerCase() === "android";

  if (acessoAndroid && userId) {
    try {
      const usuario = await prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          role: true,
          motoboy: {
            select: {
              id: true,
            },
          },
        },
      });

      if (usuario?.role === "MOTOBOY" && usuario.motoboy) {
        await prisma.motoboy.update({
          where: {
            id: usuario.motoboy.id,
          },
          data: {
            appTokenHash: null,
            appTokenCriadoEm: null,
            online: false,
            onlineDesde: null,
          },
        });
      }
    } catch (erro) {
      console.error("Erro ao revogar o token do aplicativo no logout:", erro);
    }
  }

  const resposta = NextResponse.json({ ok: true });

  resposta.cookies.delete("express_user_id");
  resposta.cookies.delete("express_user_role");

  return resposta;
}
