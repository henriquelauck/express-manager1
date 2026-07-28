import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function respostaErro(mensagem: string, status: number) {
  return NextResponse.json({ erro: mensagem }, { status });
}

function inicialDoNome(nome: string) {
  const inicial = String(nome || "M")
    .trim()
    .charAt(0)
    .toUpperCase();

  return /^[A-Z0-9]$/.test(inicial) ? inicial : "M";
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
        role: true,
      },
    });

    if (!usuario || usuario.role !== "ADMIN") {
      return respostaErro("Acesso permitido somente ao gestor.", 403);
    }

    const chave = process.env.GOOGLE_MAPS_API_KEY;

    if (!chave) {
      return respostaErro("Chave do Google Maps não configurada.", 500);
    }

    const limiteAtualizacao = new Date(Date.now() - 2 * 60 * 1000);

    const motoboys = await prisma.motoboy.findMany({
      where: {
        online: true,
        latitude: {
          not: null,
        },
        longitude: {
          not: null,
        },
        localizacaoAtualizadaEm: {
          gte: limiteAtualizacao,
        },
      },
      select: {
        nome: true,
        latitude: true,
        longitude: true,
      },
      orderBy: {
        nome: "asc",
      },
    });

    if (motoboys.length === 0) {
      return respostaErro("Nenhum motoboy online com localização recente.", 404);
    }

    const parametros = new URLSearchParams({
      size: "640x420",
      scale: "2",
      format: "png",
      maptype: "roadmap",
      language: "pt-BR",
      region: "BR",
      key: chave,
    });

    motoboys.forEach((motoboy, indice) => {
      const latitude = Number(motoboy.latitude);
      const longitude = Number(motoboy.longitude);

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return;
      }

      const rotulo = motoboys.length <= 9 ? String(indice + 1) : inicialDoNome(motoboy.nome);

      parametros.append("markers", `color:green|label:${rotulo}|${latitude},${longitude}`);
    });

    const respostaMapa = await fetch(
      `https://maps.googleapis.com/maps/api/staticmap?${parametros.toString()}`,
      {
        cache: "no-store",
      }
    );

    if (!respostaMapa.ok) {
      console.error(
        "Google Maps não gerou o mapa dos motoboys:",
        respostaMapa.status,
        await respostaMapa.text()
      );

      return respostaErro("Não foi possível gerar o mapa.", 502);
    }

    const tipoConteudo = respostaMapa.headers.get("content-type") || "";

    if (!tipoConteudo.startsWith("image/")) {
      return respostaErro("O Google Maps não retornou uma imagem.", 502);
    }

    const imagem = await respostaMapa.arrayBuffer();

    return new NextResponse(imagem, {
      status: 200,
      headers: {
        "Content-Type": tipoConteudo,
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (erro) {
    console.error("Erro ao gerar mapa dos motoboys:", erro);

    return respostaErro("Não foi possível gerar o mapa dos motoboys.", 500);
  }
}
