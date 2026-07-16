export type ParadaCalculoRota = {
  endereco: string;
};

export type PontoRota = {
  lat: number;
  lng: number;
  endereco: string;
};

export type RotaAlternativa = {
  id: number;
  distanciaKm: number;
  duracaoMin: number;
  valorSugerido: number;
  polyline: string | null;
};

export type ResultadoCalculoRota = {
  distanciaKm: number;
  duracaoMin: number;
  valorSugerido: number;
  enderecosEncontrados: string[];
  polyline: string | null;
  pontos: PontoRota[];
  rotasAlternativas: RotaAlternativa[];
};

type Coordenada = {
  lat: number;
  lng: number;
  cidade: string;
  enderecoEncontrado: string;
};

type ComponenteEnderecoGoogle = {
  long_name?: string;
  types?: string[];
};

type ResultadoGeocodificacaoGoogle = {
  formatted_address?: string;

  geometry?: {
    location?: {
      lat?: number;
      lng?: number;
    };
  };

  address_components?: ComponenteEnderecoGoogle[];
};

type RespostaGeocodificacaoGoogle = {
  results?: ResultadoGeocodificacaoGoogle[];
  error_message?: string;
};

type RotaGoogle = {
  distanceMeters?: number;
  duration?: string;

  polyline?: {
    encodedPolyline?: string;
  };
};

type RespostaRotasGoogle = {
  routes?: RotaGoogle[];

  error?: {
    message?: string;
  };
};

export class ErroCalculoRota extends Error {
  status: number;

  constructor(mensagem: string, status = 500) {
    super(mensagem);

    this.name = "ErroCalculoRota";
    this.status = status;
  }
}

function arredondarPara5(valor: number) {
  return Math.ceil(valor / 5) * 5;
}

function normalizarCidade(cidade: string) {
  return String(cidade || "")
    .trim()
    .toLowerCase();
}

export function calcularValorRota(
  distanciaKm: number,
  temRetorno: boolean,
  cidadeOrigem: string,
  cidadeDestino: string
) {
  let valor = 14;

  const foraNovoHamburgo =
    normalizarCidade(cidadeOrigem) !== "novo hamburgo" ||
    normalizarCidade(cidadeDestino) !== "novo hamburgo";

  const valorMinimo = foraNovoHamburgo ? 15 : 14;

  if (distanciaKm > 7) {
    valor = arredondarPara5(distanciaKm * 2);
  }

  if (valor < valorMinimo) {
    valor = valorMinimo;
  }

  if (temRetorno) {
    valor += 5;
  }

  return valor;
}

function converterDuracaoParaMinutos(duracao: string | undefined) {
  const segundos = Number(String(duracao || "0s").replace("s", ""));

  if (!Number.isFinite(segundos)) {
    return 0;
  }

  return Math.round(segundos / 60);
}

async function geocodificar(endereco: string, chaveGoogleMaps: string): Promise<Coordenada | null> {
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");

  url.searchParams.set("address", endereco);
  url.searchParams.set("region", "br");
  url.searchParams.set("key", chaveGoogleMaps);

  const resposta = await fetch(url, {
    cache: "no-store",
  });

  const dados = (await resposta.json()) as RespostaGeocodificacaoGoogle;

  if (!resposta.ok) {
    throw new ErroCalculoRota(
      dados.error_message || "Erro ao consultar o endereço no Google Maps."
    );
  }

  const resultado = dados.results?.[0];

  const latitude = resultado?.geometry?.location?.lat;

  const longitude = resultado?.geometry?.location?.lng;

  if (!resultado || typeof latitude !== "number" || typeof longitude !== "number") {
    return null;
  }

  const componenteCidade = resultado.address_components?.find((componente) =>
    componente.types?.includes("administrative_area_level_2")
  );

  return {
    lat: latitude,
    lng: longitude,

    cidade: componenteCidade?.long_name || "",

    enderecoEncontrado: resultado.formatted_address || endereco,
  };
}

export async function calcularRota({
  paradas,
  temRetorno,
}: {
  paradas: ParadaCalculoRota[];
  temRetorno: boolean;
}): Promise<ResultadoCalculoRota> {
  const chaveGoogleMaps = process.env.GOOGLE_MAPS_API_KEY;

  if (!chaveGoogleMaps) {
    throw new ErroCalculoRota("GOOGLE_MAPS_API_KEY não configurada.", 500);
  }

  if (!Array.isArray(paradas) || paradas.length < 2) {
    throw new ErroCalculoRota("Informe pelo menos duas paradas.", 400);
  }

  const possuiEnderecoInvalido = paradas.some(
    (parada) => typeof parada?.endereco !== "string" || !parada.endereco.trim()
  );

  if (possuiEnderecoInvalido) {
    throw new ErroCalculoRota("Todas as paradas precisam possuir endereço.", 400);
  }

  const coordenadas: Coordenada[] = [];

  for (const parada of paradas) {
    const endereco = parada.endereco.trim();

    const coordenada = await geocodificar(endereco, chaveGoogleMaps);

    if (!coordenada) {
      throw new ErroCalculoRota(`Não foi possível encontrar: ${endereco}`, 404);
    }

    coordenadas.push(coordenada);
  }

  const origem = coordenadas[0];

  const destino = coordenadas[coordenadas.length - 1];

  const intermediarias = coordenadas.slice(1, -1);

  const respostaRota = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",

    headers: {
      "Content-Type": "application/json",

      "X-Goog-Api-Key": chaveGoogleMaps,

      "X-Goog-FieldMask": "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline",
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

      intermediates: intermediarias.map((ponto) => ({
        location: {
          latLng: {
            latitude: ponto.lat,
            longitude: ponto.lng,
          },
        },
      })),

      travelMode: "DRIVE",

      routingPreference: "TRAFFIC_AWARE",

      computeAlternativeRoutes: true,

      languageCode: "pt-BR",

      units: "METRIC",
    }),

    cache: "no-store",
  });

  const dadosRota = (await respostaRota.json()) as RespostaRotasGoogle;

  if (!respostaRota.ok) {
    throw new ErroCalculoRota(dadosRota.error?.message || "Erro ao calcular rota.", 500);
  }

  const rotaPrincipal = dadosRota.routes?.[0];

  if (!rotaPrincipal || typeof rotaPrincipal.distanceMeters !== "number") {
    throw new ErroCalculoRota("Nenhuma rota encontrada.", 404);
  }

  const distanciaKm = rotaPrincipal.distanceMeters / 1000;

  const duracaoMin = converterDuracaoParaMinutos(rotaPrincipal.duration);

  const cidadeOrigem = coordenadas[0]?.cidade || "";

  const cidadeDestino = coordenadas[coordenadas.length - 1]?.cidade || "";

  const rotasAlternativas = (dadosRota.routes || []).flatMap((rotaItem, index) => {
    if (typeof rotaItem.distanceMeters !== "number") {
      return [];
    }

    const distanciaKmItem = rotaItem.distanceMeters / 1000;

    const duracaoMinItem = converterDuracaoParaMinutos(rotaItem.duration);

    return [
      {
        id: index,

        distanciaKm: distanciaKmItem,

        duracaoMin: duracaoMinItem,

        valorSugerido: calcularValorRota(
          distanciaKmItem,
          Boolean(temRetorno),
          cidadeOrigem,
          cidadeDestino
        ),

        polyline: rotaItem.polyline?.encodedPolyline || null,
      },
    ];
  });

  return {
    distanciaKm,

    duracaoMin,

    valorSugerido: calcularValorRota(distanciaKm, Boolean(temRetorno), cidadeOrigem, cidadeDestino),

    enderecosEncontrados: coordenadas.map((coordenada) => coordenada.enderecoEncontrado),

    polyline: rotaPrincipal.polyline?.encodedPolyline || null,

    pontos: coordenadas.map((coordenada) => ({
      lat: coordenada.lat,
      lng: coordenada.lng,

      endereco: coordenada.enderecoEncontrado,
    })),

    rotasAlternativas,
  };
}
