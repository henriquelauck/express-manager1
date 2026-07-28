import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function respostaErro(mensagem: string, status: number) {
  return NextResponse.json({ erro: mensagem }, { status });
}

function coordenadasValidas(latitude: unknown, longitude: unknown) {
  return (
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude)
  );
}

function destinoDaEtapa(etapa: string | null, paradas: Array<{ endereco: string }>) {
  const enderecos = paradas.map((parada) => String(parada.endereco || "").trim()).filter(Boolean);

  if (enderecos.length === 0) {
    return null;
  }

  if (
    etapa === "AGUARDANDO_INICIO_COLETA" ||
    etapa === "EM_ROTA_COLETA" ||
    etapa === "CHEGOU_NA_COLETA"
  ) {
    return enderecos[0];
  }

  return enderecos[enderecos.length - 1];
}

async function geocodificarDestino(endereco: string, chave: string) {
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");

  url.searchParams.set("address", endereco);
  url.searchParams.set("language", "pt-BR");
  url.searchParams.set("region", "BR");
  url.searchParams.set("key", chave);

  const resposta = await fetch(url, {
    cache: "no-store",
  });

  const dados = await resposta.json();

  if (!resposta.ok || dados?.status !== "OK") {
    console.error("Não foi possível geocodificar o destino:", dados?.status, dados?.error_message);

    return null;
  }

  const localizacao = dados?.results?.[0]?.geometry?.location;

  if (!coordenadasValidas(localizacao?.lat, localizacao?.lng)) {
    return null;
  }

  return {
    latitude: localizacao.lat as number,
    longitude: localizacao.lng as number,
  };
}

async function buscarPolylineRota({
  chave,
  origemLatitude,
  origemLongitude,
  destinoLatitude,
  destinoLongitude,
}: {
  chave: string;
  origemLatitude: number;
  origemLongitude: number;
  destinoLatitude: number;
  destinoLongitude: number;
}) {
  const resposta = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": chave,
      "X-Goog-FieldMask": "routes.polyline.encodedPolyline,routes.distanceMeters,routes.duration",
    },
    body: JSON.stringify({
      origin: {
        location: {
          latLng: {
            latitude: origemLatitude,
            longitude: origemLongitude,
          },
        },
      },
      destination: {
        location: {
          latLng: {
            latitude: destinoLatitude,
            longitude: destinoLongitude,
          },
        },
      },
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE",
      languageCode: "pt-BR",
      units: "METRIC",
    }),
    cache: "no-store",
  });

  const dados = await resposta.json();

  if (!resposta.ok) {
    console.error("Routes API não retornou a rota:", dados?.error?.message || resposta.status);

    return null;
  }

  const rota = dados?.routes?.[0];

  if (!rota?.polyline?.encodedPolyline) {
    return null;
  }

  return {
    polyline: rota.polyline.encodedPolyline as string,
    distanciaMetros: Number(rota.distanceMeters || 0),
    duracao: String(rota.duration || ""),
  };
}

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const motoboyId = searchParams.get("motoboyId");

    if (!motoboyId) {
      return respostaErro("Motoboy não informado.", 400);
    }

    const motoboy = await prisma.motoboy.findUnique({
      where: {
        id: motoboyId,
      },
      select: {
        id: true,
        nome: true,
        online: true,
        latitude: true,
        longitude: true,
        localizacaoAtualizadaEm: true,
        teles: {
          where: {
            statusAceite: "ACEITA",
            status: {
              not: "ENTREGUE",
            },
          },
          orderBy: [
            {
              ordemMotoboy: "asc",
            },
            {
              aceitaPeloMotoboyEm: "asc",
            },
          ],
          take: 1,
          select: {
            id: true,
            solicitante: true,
            etapaMotoboy: true,
            paradas: {
              orderBy: {
                ordem: "asc",
              },
              select: {
                endereco: true,
              },
            },
          },
        },
      },
    });

    if (!motoboy) {
      return respostaErro("Motoboy não encontrado.", 404);
    }

    if (!motoboy.online || !coordenadasValidas(motoboy.latitude, motoboy.longitude)) {
      return respostaErro("O motoboy não está online ou não possui localização válida.", 404);
    }

    const teleAtual = motoboy.teles[0] || null;

    if (!teleAtual) {
      return NextResponse.json(
        {
          motoboyId: motoboy.id,
          motoboyNome: motoboy.nome,
          possuiRota: false,
          motivo: "Nenhuma tele aceita em andamento.",
        },
        {
          headers: {
            "Cache-Control": "private, no-store, max-age=0",
          },
        }
      );
    }

    const enderecoDestino = destinoDaEtapa(teleAtual.etapaMotoboy, teleAtual.paradas);

    if (!enderecoDestino) {
      return NextResponse.json(
        {
          motoboyId: motoboy.id,
          motoboyNome: motoboy.nome,
          teleId: teleAtual.id,
          possuiRota: false,
          motivo: "A tele não possui endereço de destino válido.",
        },
        {
          headers: {
            "Cache-Control": "private, no-store, max-age=0",
          },
        }
      );
    }

    const destino = await geocodificarDestino(enderecoDestino, chave);

    if (!destino) {
      return respostaErro("Não foi possível localizar o endereço de destino.", 422);
    }

    const rota = await buscarPolylineRota({
      chave,
      origemLatitude: motoboy.latitude as number,
      origemLongitude: motoboy.longitude as number,
      destinoLatitude: destino.latitude,
      destinoLongitude: destino.longitude,
    });

    if (!rota) {
      return respostaErro("Não foi possível calcular a rota atual.", 502);
    }

    return NextResponse.json(
      {
        motoboyId: motoboy.id,
        motoboyNome: motoboy.nome,
        teleId: teleAtual.id,
        solicitante: teleAtual.solicitante,
        etapaMotoboy: teleAtual.etapaMotoboy,
        possuiRota: true,
        origem: {
          latitude: motoboy.latitude,
          longitude: motoboy.longitude,
        },
        destino: {
          latitude: destino.latitude,
          longitude: destino.longitude,
          endereco: enderecoDestino,
        },
        polyline: rota.polyline,
        distanciaMetros: rota.distanciaMetros,
        duracao: rota.duracao,
      },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      }
    );
  } catch (erro) {
    console.error("Erro ao carregar rota atual do motoboy:", erro);

    return respostaErro("Não foi possível carregar a rota atual do motoboy.", 500);
  }
}
