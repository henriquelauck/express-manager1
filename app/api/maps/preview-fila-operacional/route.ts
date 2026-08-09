import { prisma } from "@/lib/prisma";
import { obterCoordenadasPersistentes } from "@/lib/google-maps/geocodificacaoPersistente";
import { registrarUsoGoogle } from "@/lib/google-maps/usoApi";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type CorpoPreviaFila = {
  motoboyId?: unknown;
  itemIds?: unknown;
};

type PontoGeocodificado = {
  itemId: string;
  ordem: number;
  latitude: number;
  longitude: number;
  endereco: string;
  tipo: string;
  cliente: string;
  solicitante: string;
  teleId: string;
};

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

function converterDuracaoParaSegundos(duracao: unknown) {
  const texto = String(duracao || "").trim();
  const correspondencia = texto.match(/^(\d+(?:\.\d+)?)s$/);

  if (!correspondencia) {
    return 0;
  }

  return Math.round(Number(correspondencia[1]));
}

async function exigirAdministrador() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("express_user_id")?.value;

  if (!userId) {
    return {
      autorizado: false as const,
      resposta: respostaErro("Não autenticado.", 401),
    };
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
    return {
      autorizado: false as const,
      resposta: respostaErro("Acesso permitido somente ao gestor.", 403),
    };
  }

  return {
    autorizado: true as const,
  };
}

async function geocodificarEndereco(endereco: string, chave: string) {
  return obterCoordenadasPersistentes(endereco, chave, "PREVIEW_FILA_OPERACIONAL");
}

async function calcularRotaComParadas({
  chave,
  origemLatitude,
  origemLongitude,
  pontos,
}: {
  chave: string;
  origemLatitude: number;
  origemLongitude: number;
  pontos: PontoGeocodificado[];
}) {
  const destino = pontos[pontos.length - 1];
  const intermediarios = pontos.slice(0, -1);

  const resposta = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": chave,
      "X-Goog-FieldMask":
        "routes.polyline.encodedPolyline,routes.distanceMeters,routes.duration,routes.legs.distanceMeters,routes.legs.duration",
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
            latitude: destino.latitude,
            longitude: destino.longitude,
          },
        },
      },
      intermediates: intermediarios.map((ponto) => ({
        location: {
          latLng: {
            latitude: ponto.latitude,
            longitude: ponto.longitude,
          },
        },
        vehicleStopover: true,
      })),
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE",
      optimizeWaypointOrder: false,
      languageCode: "pt-BR",
      units: "METRIC",
    }),
    cache: "no-store",
  });

  await registrarUsoGoogle({
    servico: "Routes API",
    sku: "Compute Routes",
    origem: "PREVIEW_FILA_OPERACIONAL",
  });

  const dados = await resposta.json();

  if (!resposta.ok) {
    console.error(
      "Routes API não calculou a prévia da fila:",
      dados?.error?.message || resposta.status
    );

    return null;
  }

  const rota = dados?.routes?.[0];

  if (!rota?.polyline?.encodedPolyline) {
    return null;
  }

  return {
    polyline: String(rota.polyline.encodedPolyline),
    distanciaMetros: Number(rota.distanceMeters || 0),
    duracaoSegundos: converterDuracaoParaSegundos(rota.duration),
    trechos: Array.isArray(rota.legs)
      ? rota.legs.map((trecho: any, indice: number) => ({
          ordem: indice + 1,
          distanciaMetros: Number(trecho?.distanceMeters || 0),
          duracaoSegundos: converterDuracaoParaSegundos(trecho?.duration),
        }))
      : [],
  };
}

export async function POST(request: Request) {
  try {
    const autenticacao = await exigirAdministrador();

    if (!autenticacao.autorizado) {
      return autenticacao.resposta;
    }

    const chave = process.env.GOOGLE_MAPS_API_KEY;

    if (!chave) {
      return respostaErro("Chave do Google Maps não configurada.", 500);
    }

    const body = (await request.json()) as CorpoPreviaFila;
    const motoboyId = typeof body.motoboyId === "string" ? body.motoboyId.trim() : "";

    const itemIds = Array.isArray(body.itemIds)
      ? body.itemIds
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter(Boolean)
      : [];

    if (!motoboyId) {
      return respostaErro("Motoboy não informado.", 400);
    }

    if (itemIds.length === 0) {
      return respostaErro("Nenhuma etapa foi informada para a prévia.", 400);
    }

    if (itemIds.length > 26) {
      return respostaErro("A prévia permite no máximo 26 etapas operacionais por rota.", 400);
    }

    if (new Set(itemIds).size !== itemIds.length) {
      return respostaErro("A sequência contém etapas duplicadas.", 400);
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
      },
    });

    if (!motoboy) {
      return respostaErro("Motoboy não encontrado.", 404);
    }

    if (!coordenadasValidas(motoboy.latitude, motoboy.longitude)) {
      return respostaErro(
        "O motoboy ainda não possui uma localização válida para iniciar a rota.",
        422
      );
    }

    const itens = await prisma.itemFilaOperacionalMotoboy.findMany({
      where: {
        id: {
          in: itemIds,
        },
        motoboyId,
        status: {
          in: ["PENDENTE", "EM_ANDAMENTO"],
        },
      },
      select: {
        id: true,
        status: true,
        tele: {
          select: {
            id: true,
            solicitante: true,
          },
        },
        parada: {
          select: {
            id: true,
            tipo: true,
            cliente: true,
            endereco: true,
          },
        },
      },
    });

    if (itens.length !== itemIds.length) {
      return respostaErro(
        "Uma ou mais etapas não pertencem ao motoboy ou não estão mais pendentes.",
        409
      );
    }

    const itensPorId = new Map(itens.map((item) => [item.id, item]));
    const itensOrdenados = itemIds.map((id) => itensPorId.get(id)!);

    const enderecosInvalidos = itensOrdenados.filter(
      (item) => !String(item.parada.endereco || "").trim()
    );

    if (enderecosInvalidos.length > 0) {
      return respostaErro("Uma ou mais etapas da fila não possuem endereço válido.", 422);
    }

    const pontosGeocodificados = await Promise.all(
      itensOrdenados.map(async (item, indice) => {
        const endereco = String(item.parada.endereco || "").trim();
        const coordenadas = await geocodificarEndereco(endereco, chave);

        if (!coordenadas) {
          return null;
        }

        return {
          itemId: item.id,
          ordem: indice + 1,
          latitude: coordenadas.latitude,
          longitude: coordenadas.longitude,
          endereco,
          tipo: String(item.parada.tipo || ""),
          cliente: String(item.parada.cliente || ""),
          solicitante: String(item.tele.solicitante || ""),
          teleId: item.tele.id,
        } satisfies PontoGeocodificado;
      })
    );

    const primeiroPontoInvalido = pontosGeocodificados.findIndex((ponto) => ponto === null);

    if (primeiroPontoInvalido >= 0) {
      return respostaErro(
        `Não foi possível localizar o endereço da etapa ${primeiroPontoInvalido + 1}.`,
        422
      );
    }

    const pontos = pontosGeocodificados as PontoGeocodificado[];

    const rota = await calcularRotaComParadas({
      chave,
      origemLatitude: motoboy.latitude as number,
      origemLongitude: motoboy.longitude as number,
      pontos,
    });

    if (!rota) {
      return respostaErro("Não foi possível calcular a prévia da fila operacional.", 502);
    }

    return NextResponse.json(
      {
        possuiRota: true,
        motoboy: {
          id: motoboy.id,
          nome: motoboy.nome,
          online: motoboy.online,
          localizacaoAtualizadaEm: motoboy.localizacaoAtualizadaEm,
        },
        origem: {
          latitude: motoboy.latitude,
          longitude: motoboy.longitude,
          descricao: `Posição atual de ${motoboy.nome}`,
        },
        pontos,
        polyline: rota.polyline,
        distanciaMetros: rota.distanciaMetros,
        duracaoSegundos: rota.duracaoSegundos,
        trechos: rota.trechos,
      },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      }
    );
  } catch (erro) {
    console.error("Erro ao calcular prévia da fila operacional:", erro);

    return respostaErro("Não foi possível calcular a prévia da fila operacional.", 500);
  }
}