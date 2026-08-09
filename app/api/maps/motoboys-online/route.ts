import { registrarUsoGoogle } from "@/lib/google-maps/usoApi";
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

  const resposta = await fetch(url.toString(), {
    cache: "no-store",
  });

  if (!resposta.ok) {
    return null;
  }

  const dados = await resposta.json();
  const localizacao = dados?.results?.[0]?.geometry?.location;

  if (typeof localizacao?.lat !== "number" || typeof localizacao?.lng !== "number") {
    console.error("Não foi possível geocodificar o destino:", dados?.status, dados?.error_message);

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
      "X-Goog-FieldMask": "routes.polyline.encodedPolyline",
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

  return dados?.routes?.[0]?.polyline?.encodedPolyline || null;
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
    const motoboySelecionadoId = searchParams.get("motoboyId");
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
        id: true,
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

    let exibiuMotoboySelecionado = false;

    if (motoboySelecionadoId) {
      const motoboySelecionado = await prisma.motoboy.findUnique({
        where: {
          id: motoboySelecionadoId,
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

      if (
        motoboySelecionado &&
        motoboySelecionado.online &&
        coordenadasValidas(motoboySelecionado.latitude, motoboySelecionado.longitude)
      ) {
        const origemLatitude = motoboySelecionado.latitude as number;
        const origemLongitude = motoboySelecionado.longitude as number;

        const itemEmAndamento = await prisma.itemFilaOperacionalMotoboy.findFirst({
          where: {
            motoboyId: motoboySelecionado.id,
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
          select: {
            parada: {
              select: {
                endereco: true,
              },
            },
          },
        });

        const itemPendenteSugerido = itemEmAndamento
          ? null
          : await prisma.itemFilaOperacionalMotoboy.findFirst({
              where: {
                motoboyId: motoboySelecionado.id,
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
              select: {
                parada: {
                  select: {
                    endereco: true,
                  },
                },
              },
            });

        const destinoEndereco = String(
          itemEmAndamento?.parada.endereco || itemPendenteSugerido?.parada.endereco || ""
        ).trim() || null;

        parametros.append("markers", `color:blue|label:M|${origemLatitude},${origemLongitude}`);

        exibiuMotoboySelecionado = true;

        if (destinoEndereco) {
          const destinoCoordenadas = await geocodificarDestino(destinoEndereco, chave);

          if (destinoCoordenadas) {
            const polyline = await buscarPolylineRota({
              chave,
              origemLatitude,
              origemLongitude,
              destinoLatitude: destinoCoordenadas.latitude,
              destinoLongitude: destinoCoordenadas.longitude,
            });

            if (polyline) {
              parametros.append("path", `weight:6|color:0x2563ebff|enc:${polyline}`);

              parametros.append(
                "markers",
                `color:red|label:D|${destinoCoordenadas.latitude},${destinoCoordenadas.longitude}`
              );
            }
          }
        }
      }
    }

    if (!exibiuMotoboySelecionado) {
      motoboys.forEach((motoboy, indice) => {
        if (!coordenadasValidas(motoboy.latitude, motoboy.longitude)) {
          return;
        }

        const rotulo = motoboys.length <= 9 ? String(indice + 1) : inicialDoNome(motoboy.nome);

        parametros.append(
          "markers",
          `color:green|label:${rotulo}|${motoboy.latitude},${motoboy.longitude}`
        );
      });
    }

    const respostaMapa = await fetch(
      `https://maps.googleapis.com/maps/api/staticmap?${parametros.toString()}`,
      {
        cache: "no-store",
      }
    );

    await registrarUsoGoogle({
      servico: "Maps Static API",
      sku: "Static Maps",
      origem: "MOTOBOYS_ONLINE_MAPA",
    });

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
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (erro) {
    console.error("Erro ao gerar mapa dos motoboys:", erro);

    return respostaErro("Não foi possível gerar o mapa dos motoboys.", 500);
  }
}