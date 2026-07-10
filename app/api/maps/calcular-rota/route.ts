import { NextResponse } from "next/server";

function arredondarPara5(valor: number) {
  return Math.ceil(valor / 5) * 5;
}

function calcularValor(
  distanciaKm: number,
  temRetorno: boolean,
  cidadeOrigem: string,
  cidadeDestino: string
) {
  let valor = 14;

  const normalizarCidade = (cidade: string) =>
    String(cidade || "").trim().toLowerCase();

  const foraNH =
    normalizarCidade(cidadeOrigem) !== "novo hamburgo" ||
    normalizarCidade(cidadeDestino) !== "novo hamburgo";

  const minimo = foraNH ? 15 : 14;

  if (distanciaKm > 7) {
    valor = arredondarPara5(distanciaKm * 2);
  }

  if (valor < minimo) {
    valor = minimo;
  }

  if (temRetorno) {
    valor += 5;
  }

  return valor;
}

type Coordenada = {
  lat: number;
  lng: number;
  cidade: string;
  enderecoEncontrado: string;
};

async function geocodificar(endereco: string): Promise<Coordenada | null> {
  const chave = process.env.GOOGLE_MAPS_API_KEY;

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", endereco);
  url.searchParams.set("region", "br");
  url.searchParams.set("key", chave || "");

  const resposta = await fetch(url);
  const dados = await resposta.json();

  const resultado = dados.results?.[0];

  if (!resultado) return null;

  const componenteCidade = resultado.address_components?.find((c: any) =>
    c.types.includes("administrative_area_level_2")
  );

  return {
    lat: resultado.geometry.location.lat,
    lng: resultado.geometry.location.lng,
    cidade: componenteCidade?.long_name || "",
    enderecoEncontrado: resultado.formatted_address,
  };
}

export async function POST(request: Request) {
  try {
    const { paradas, temRetorno } = await request.json();

    if (!process.env.GOOGLE_MAPS_API_KEY) {
      return NextResponse.json(
        { erro: "GOOGLE_MAPS_API_KEY não configurada." },
        { status: 500 }
      );
    }

    if (!paradas || paradas.length < 2) {
      return NextResponse.json(
        { erro: "Informe pelo menos duas paradas." },
        { status: 400 }
      );
    }

    const coordenadas: Coordenada[] = [];

    for (const parada of paradas) {
      const coord = await geocodificar(parada.endereco);

      if (!coord) {
        return NextResponse.json(
          { erro: `Não foi possível encontrar: ${parada.endereco}` },
          { status: 404 }
        );
      }

      coordenadas.push(coord);
    }

    const origem = coordenadas[0];
    const destino = coordenadas[coordenadas.length - 1];
    const intermediarias = coordenadas.slice(1, -1);

    const respostaRota = await fetch(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": process.env.GOOGLE_MAPS_API_KEY,
          "X-Goog-FieldMask":
            "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline",
        },
        body: JSON.stringify({
          origin: {
            location: {
              latLng: {
                latitude: origem.lat,
                longitude: origem.lng,
              },
            },
          },
          destination: {
            location: {
              latLng: {
                latitude: destino.lat,
                longitude: destino.lng,
              },
            },
          },
          intermediates: intermediarias.map((p) => ({
            location: {
              latLng: {
                latitude: p.lat,
                longitude: p.lng,
              },
            },
          })),
          travelMode: "DRIVE",
          routingPreference: "TRAFFIC_AWARE",
          computeAlternativeRoutes: true,
          languageCode: "pt-BR",
          units: "METRIC",
        }),
      }
    );

    const dadosRota = await respostaRota.json();

    if (!respostaRota.ok) {
      return NextResponse.json(
        { erro: dadosRota?.error?.message || "Erro ao calcular rota." },
        { status: 500 }
      );
    }

    const rota = dadosRota.routes?.[0];

    if (!rota) {
      return NextResponse.json(
        { erro: "Nenhuma rota encontrada." },
        { status: 404 }
      );
    }

    const distanciaKm = rota.distanceMeters / 1000;

    const duracaoMin = Math.round(
      Number(String(rota.duration || "0s").replace("s", "")) / 60
    );

    const rotasAlternativas = (dadosRota.routes || []).map(
      (rotaItem: any, index: number) => {
        const distanciaKmItem = rotaItem.distanceMeters / 1000;

        const duracaoMinItem = Math.round(
          Number(String(rotaItem.duration || "0s").replace("s", "")) / 60
        );

        return {
          id: index,
          distanciaKm: distanciaKmItem,
          duracaoMin: duracaoMinItem,
          valorSugerido: calcularValor(
            distanciaKmItem,
            Boolean(temRetorno),
            coordenadas[0]?.cidade || "",
            coordenadas[coordenadas.length - 1]?.cidade || ""
          ),
          polyline: rotaItem.polyline?.encodedPolyline || null,
        };
      }
    );

    return NextResponse.json({
      distanciaKm,
      duracaoMin,
      valorSugerido: calcularValor(
        distanciaKm,
        Boolean(temRetorno),
        coordenadas[0]?.cidade || "",
        coordenadas[coordenadas.length - 1]?.cidade || ""
      ),
      enderecosEncontrados: coordenadas.map((c) => c.enderecoEncontrado),
      polyline: rota.polyline?.encodedPolyline || null,
      pontos: coordenadas.map((c) => ({
        lat: c.lat,
        lng: c.lng,
        endereco: c.enderecoEncontrado,
      })),
      rotasAlternativas,
    });
  } catch (error: any) {
    return NextResponse.json(
      { erro: error.message || "Erro ao calcular rota." },
      { status: 500 }
    );
  }
}