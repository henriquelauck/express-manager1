import { prisma } from "@/lib/prisma";
import { obterCoordenadasPersistentes } from "@/lib/google-maps/geocodificacaoPersistente";
import { registrarUsoGoogle } from "@/lib/google-maps/usoApi";
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
  return obterCoordenadasPersistentes(endereco, chave, "ROTA_ATUAL_MOTOBOY");
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

  await registrarUsoGoogle({
    servico: "Routes API",
    sku: "Compute Routes",
    origem: "ROTA_ATUAL_MOTOBOY",
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
      },
    });

    if (!motoboy) {
      return respostaErro("Motoboy não encontrado.", 404);
    }

    if (!motoboy.online || !coordenadasValidas(motoboy.latitude, motoboy.longitude)) {
      return respostaErro("O motoboy não está online ou não possui localização válida.", 404);
    }

    /*
     * A rota principal do gestor deve seguir a mesma fila
     * operacional organizada manualmente.
     */
    const selecaoItemFila = {
      id: true,
      ordem: true,
      status: true,
      teleId: true,
      paradaId: true,
      parada: {
        select: {
          id: true,
          ordem: true,
          tipo: true,
          cliente: true,
          endereco: true,
        },
      },
      tele: {
        select: {
          id: true,
          solicitante: true,
          etapaMotoboy: true,
        },
      },
    } as const;

    /*
     * O mapa deve seguir primeiro a etapa realmente iniciada pelo motoboy.
     * A ordem PENDENTE continua sendo apenas a sugestão do gestor.
     */
    const itemEmAndamento = await prisma.itemFilaOperacionalMotoboy.findFirst({
      where: {
        motoboyId,
        status: "EM_ANDAMENTO",
      },
      orderBy: [
        {
          iniciadaEm: "desc",
        },
        {
          updatedAt: "desc",
        },
      ],
      select: selecaoItemFila,
    });

    const itemPendenteSugerido = itemEmAndamento
      ? null
      : await prisma.itemFilaOperacionalMotoboy.findFirst({
          where: {
            motoboyId,
            status: "PENDENTE",
          },
          orderBy: [
            {
              ordem: "asc",
            },
            {
              createdAt: "asc",
            },
          ],
          select: selecaoItemFila,
        });

    const itemFilaAtual = itemEmAndamento || itemPendenteSugerido;

    let teleId: string | null = null;
    let solicitante: string | null = null;
    let etapaMotoboy: string | null = null;
    let enderecoDestino: string | null = null;
    let itemFilaId: string | null = null;
    let itemFilaOrdem: number | null = null;
    let tipoParada: string | null = null;
    let clienteParada: string | null = null;

    if (itemFilaAtual) {
      teleId = itemFilaAtual.teleId;
      solicitante = itemFilaAtual.tele.solicitante;
      etapaMotoboy = itemFilaAtual.tele.etapaMotoboy;
      enderecoDestino = String(itemFilaAtual.parada.endereco || "").trim();
      itemFilaId = itemFilaAtual.id;
      itemFilaOrdem = itemFilaAtual.ordem;
      tipoParada = itemFilaAtual.parada.tipo;
      clienteParada = itemFilaAtual.parada.cliente;
    } else {
      /*
       * Compatibilidade com teles antigas que ainda não possuem
       * itens na fila operacional.
       */
      const teleAntiga = await prisma.tele.findFirst({
        where: {
          motoboyId,
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
      });

      if (teleAntiga) {
        teleId = teleAntiga.id;
        solicitante = teleAntiga.solicitante;
        etapaMotoboy = teleAntiga.etapaMotoboy;
        enderecoDestino = destinoDaEtapa(teleAntiga.etapaMotoboy, teleAntiga.paradas);
      }
    }

    if (!teleId || !enderecoDestino) {
      return NextResponse.json(
        {
          motoboyId: motoboy.id,
          motoboyNome: motoboy.nome,
          possuiRota: false,
          motivo: "Nenhuma etapa operacional pendente encontrada.",
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
        teleId,
        solicitante,
        etapaMotoboy,
        possuiRota: true,

        filaOperacional: itemFilaAtual
          ? {
              itemId: itemFilaId,
              ordem: itemFilaOrdem,
              status: itemFilaAtual.status,
              paradaId: itemFilaAtual.paradaId,
              tipoParada,
              cliente: clienteParada,
            }
          : null,

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