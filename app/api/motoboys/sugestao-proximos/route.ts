import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type BodySugestao = {
  enderecoColeta?: unknown;
};

type ElementoMatriz = {
  originIndex?: number;
  condition?: string;
  distanceMeters?: number;
  duration?: string;
};

const LIMITE_LOCALIZACAO_RECENTE_MS = 5 * 60_000;

function respostaErro(mensagem: string, status: number) {
  return NextResponse.json({ erro: mensagem }, { status });
}

function texto(valor: unknown) {
  return typeof valor === "string" ? valor.trim() : "";
}

function coordenadaValida(valor: unknown) {
  return typeof valor === "number" && Number.isFinite(valor);
}

function segundosDaDuracao(duracao: string | undefined) {
  const correspondencia = duracao?.match(/^([\d.]+)s$/);

  if (!correspondencia) {
    return null;
  }

  const segundos = Number(correspondencia[1]);

  return Number.isFinite(segundos) ? segundos : null;
}

async function geocodificarEndereco(endereco: string, chave: string) {
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");

  url.searchParams.set("address", endereco);
  url.searchParams.set("language", "pt-BR");
  url.searchParams.set("region", "BR");
  url.searchParams.set("key", chave);

  const resposta = await fetch(url, { cache: "no-store" });
  const dados = await resposta.json();

  if (!resposta.ok || dados?.status !== "OK") {
    console.error("Falha ao geocodificar a coleta:", dados);
    return null;
  }

  const resultado = dados?.results?.[0];
  const localizacao = resultado?.geometry?.location;

  if (!coordenadaValida(localizacao?.lat) || !coordenadaValida(localizacao?.lng)) {
    return null;
  }

  return {
    latitude: localizacao.lat as number,
    longitude: localizacao.lng as number,
    enderecoFormatado: texto(resultado?.formatted_address) || endereco,
  };
}

async function calcularMatrizRotas({
  origens,
  destino,
  chave,
}: {
  origens: Array<{ latitude: number; longitude: number }>;
  destino: { latitude: number; longitude: number };
  chave: string;
}) {
  const resposta = await fetch(
    "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": chave,
        "X-Goog-FieldMask": "originIndex,condition,distanceMeters,duration",
      },
      body: JSON.stringify({
        origins: origens.map((origem) => ({
          waypoint: {
            location: {
              latLng: {
                latitude: origem.latitude,
                longitude: origem.longitude,
              },
            },
          },
        })),
        destinations: [
          {
            waypoint: {
              location: {
                latLng: {
                  latitude: destino.latitude,
                  longitude: destino.longitude,
                },
              },
            },
          },
        ],
        travelMode: "DRIVE",
        routingPreference: "TRAFFIC_AWARE",
        languageCode: "pt-BR",
        units: "METRIC",
      }),
      cache: "no-store",
    }
  );

  const dados = await resposta.json();

  if (!resposta.ok || !Array.isArray(dados)) {
    console.error("Falha ao calcular matriz de rotas:", dados);
    return null;
  }

  return dados as ElementoMatriz[];
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("express_user_id")?.value;

    if (!userId) {
      return respostaErro("Não autenticado.", 401);
    }

    const usuario = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!usuario || usuario.role !== "ADMIN") {
      return respostaErro("Acesso permitido somente ao gestor.", 403);
    }

    const body = (await request.json()) as BodySugestao;
    const enderecoColeta = texto(body.enderecoColeta);

    if (!enderecoColeta) {
      return respostaErro("Informe o endereço da primeira coleta.", 400);
    }

    const chave = process.env.GOOGLE_MAPS_API_KEY;

    if (!chave) {
      return respostaErro("Chave do Google Maps não configurada.", 500);
    }

    const coleta = await geocodificarEndereco(enderecoColeta, chave);

    if (!coleta) {
      return respostaErro("Não foi possível localizar o endereço da coleta.", 422);
    }

    const limiteRecente = new Date(Date.now() - LIMITE_LOCALIZACAO_RECENTE_MS);

    const [elegiveis, ignorados] = await Promise.all([
      prisma.motoboy.findMany({
        where: {
          online: true,
          latitude: { not: null },
          longitude: { not: null },
          localizacaoAtualizadaEm: { gte: limiteRecente },
        },
        select: {
          id: true,
          nome: true,
          moto: true,
          placa: true,
          latitude: true,
          longitude: true,
          precisaoLocalizacao: true,
          localizacaoAtualizadaEm: true,
          _count: {
            select: {
              teles: {
                where: {
                  statusAceite: "ACEITA",
                  status: { not: "ENTREGUE" },
                },
              },
            },
          },
        },
        orderBy: { nome: "asc" },
      }),
      prisma.motoboy.findMany({
        where: {
          online: true,
          OR: [
            { latitude: null },
            { longitude: null },
            { localizacaoAtualizadaEm: null },
            { localizacaoAtualizadaEm: { lt: limiteRecente } },
          ],
        },
        select: {
          id: true,
          nome: true,
          localizacaoAtualizadaEm: true,
        },
        orderBy: { nome: "asc" },
      }),
    ]);

    const motoboys = elegiveis.filter(
      (
        motoboy
      ): motoboy is typeof motoboy & {
        latitude: number;
        longitude: number;
      } => coordenadaValida(motoboy.latitude) && coordenadaValida(motoboy.longitude)
    );

    if (motoboys.length === 0) {
      return NextResponse.json({
        coleta,
        sugestao: null,
        motoboys: [],
        ignorados: ignorados.map((motoboy) => ({
          ...motoboy,
          motivo: "Localização ausente ou desatualizada há mais de 5 minutos.",
        })),
      });
    }

    const matriz = await calcularMatrizRotas({
      origens: motoboys.map((motoboy) => ({
        latitude: motoboy.latitude,
        longitude: motoboy.longitude,
      })),
      destino: {
        latitude: coleta.latitude,
        longitude: coleta.longitude,
      },
      chave,
    });

    if (!matriz) {
      return respostaErro("Não foi possível calcular a distância dos motoboys até a coleta.", 502);
    }

    const rotaPorOrigem = new Map<number, { distanciaMetros: number; duracaoSegundos: number }>();

    for (const elemento of matriz) {
      const origem = Number(elemento.originIndex);
      const distanciaMetros = Number(elemento.distanceMeters);
      const duracaoSegundos = segundosDaDuracao(elemento.duration);

      if (
        elemento.condition !== "ROUTE_EXISTS" ||
        !Number.isInteger(origem) ||
        !Number.isFinite(distanciaMetros) ||
        duracaoSegundos === null
      ) {
        continue;
      }

      rotaPorOrigem.set(origem, {
        distanciaMetros,
        duracaoSegundos,
      });
    }

    const ordenados = motoboys
      .map((motoboy, indice) => {
        const rota = rotaPorOrigem.get(indice);

        if (!rota) {
          return null;
        }

        return {
          id: motoboy.id,
          nome: motoboy.nome,
          moto: motoboy.moto,
          placa: motoboy.placa,
          localizacaoAtualizadaEm: motoboy.localizacaoAtualizadaEm,
          precisaoLocalizacao: motoboy.precisaoLocalizacao,
          entregasEmAndamento: motoboy._count.teles,
          distanciaMetros: rota.distanciaMetros,
          distanciaKm: Math.round((rota.distanciaMetros / 1000) * 10) / 10,
          duracaoMinutos: Math.max(1, Math.round(rota.duracaoSegundos / 60)),
        };
      })
      .filter((motoboy): motoboy is NonNullable<typeof motoboy> => motoboy !== null)
      .sort((a, b) => {
        if (a.distanciaMetros !== b.distanciaMetros) {
          return a.distanciaMetros - b.distanciaMetros;
        }

        if (a.entregasEmAndamento !== b.entregasEmAndamento) {
          return a.entregasEmAndamento - b.entregasEmAndamento;
        }

        return a.nome.localeCompare(b.nome, "pt-BR");
      });

    return NextResponse.json(
      {
        coleta,
        sugestao: ordenados[0] || null,
        motoboys: ordenados,
        ignorados: ignorados.map((motoboy) => ({
          ...motoboy,
          motivo: "Localização ausente ou desatualizada há mais de 5 minutos.",
        })),
        criterio:
          "Menor distância real de carro até a primeira coleta. Em caso de empate, menor quantidade de entregas em andamento.",
      },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0",
        },
      }
    );
  } catch (erro) {
    console.error("Erro ao sugerir motoboy mais próximo:", erro);

    return respostaErro("Não foi possível sugerir o motoboy mais próximo.", 500);
  }
}
