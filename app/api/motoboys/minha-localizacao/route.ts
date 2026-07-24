import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type LocalizacaoBody = {
  acao?: "ONLINE" | "ATUALIZAR" | "OFFLINE";
  latitude?: number;
  longitude?: number;
  precisao?: number | null;
};

function respostaErro(mensagem: string, status: number) {
  return NextResponse.json({ erro: mensagem }, { status });
}

function coordenadasValidas(latitude: number, longitude: number) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

async function obterMotoboyLogado() {
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
      motoboy: {
        select: {
          id: true,
          nome: true,
          online: true,
          latitude: true,
          longitude: true,
          precisaoLocalizacao: true,
          onlineDesde: true,
          localizacaoAtualizadaEm: true,
        },
      },
    },
  });

  if (!usuario || usuario.role !== "MOTOBOY" || !usuario.motoboy) {
    return null;
  }

  return usuario.motoboy;
}

export async function GET() {
  try {
    const motoboy = await obterMotoboyLogado();

    if (!motoboy) {
      return respostaErro("Acesso negado.", 403);
    }

    return NextResponse.json({
      motoboy: {
        id: motoboy.id,
        nome: motoboy.nome,
        online: motoboy.online,
        latitude: motoboy.latitude,
        longitude: motoboy.longitude,
        precisao: motoboy.precisaoLocalizacao,
        onlineDesde: motoboy.onlineDesde,
        localizacaoAtualizadaEm: motoboy.localizacaoAtualizadaEm,
      },
    });
  } catch (erro) {
    console.error("Erro ao consultar localização do motoboy:", erro);

    return respostaErro("Não foi possível consultar sua localização.", 500);
  }
}

export async function PUT(request: Request) {
  try {
    const motoboy = await obterMotoboyLogado();

    if (!motoboy) {
      return respostaErro("Acesso negado.", 403);
    }

    const body = (await request.json()) as LocalizacaoBody;
    const acao = body.acao;

    if (!acao) {
      return respostaErro("Informe a ação desejada.", 400);
    }

    if (acao === "OFFLINE") {
      const atualizado = await prisma.motoboy.update({
        where: {
          id: motoboy.id,
        },
        data: {
          online: false,
          onlineDesde: null,
        },
        select: {
          id: true,
          nome: true,
          online: true,
          latitude: true,
          longitude: true,
          precisaoLocalizacao: true,
          onlineDesde: true,
          localizacaoAtualizadaEm: true,
        },
      });

      return NextResponse.json({
        ok: true,
        motoboy: atualizado,
      });
    }

    if (acao !== "ONLINE" && acao !== "ATUALIZAR") {
      return respostaErro("Ação inválida.", 400);
    }

    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);
    const precisao =
      body.precisao === null || body.precisao === undefined ? null : Number(body.precisao);

    if (!coordenadasValidas(latitude, longitude)) {
      return respostaErro("A localização enviada é inválida.", 400);
    }

    if (precisao !== null && (!Number.isFinite(precisao) || precisao < 0)) {
      return respostaErro("A precisão da localização é inválida.", 400);
    }

    if (acao === "ATUALIZAR" && !motoboy.online) {
      return respostaErro("Fique online antes de atualizar a localização.", 409);
    }

    const agora = new Date();

    const atualizado = await prisma.motoboy.update({
      where: {
        id: motoboy.id,
      },
      data: {
        online: true,
        latitude,
        longitude,
        precisaoLocalizacao: precisao,
        localizacaoAtualizadaEm: agora,
        onlineDesde: acao === "ONLINE" && !motoboy.online ? agora : motoboy.onlineDesde || agora,
      },
      select: {
        id: true,
        nome: true,
        online: true,
        latitude: true,
        longitude: true,
        precisaoLocalizacao: true,
        onlineDesde: true,
        localizacaoAtualizadaEm: true,
      },
    });

    return NextResponse.json({
      ok: true,
      motoboy: atualizado,
    });
  } catch (erro) {
    console.error("Erro ao atualizar localização do motoboy:", erro);

    return respostaErro("Não foi possível atualizar sua localização.", 500);
  }
}
