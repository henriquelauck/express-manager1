import { obterCoordenadasPersistentes } from "@/lib/google-maps/geocodificacaoPersistente";
import { registrarUsoGoogle } from "@/lib/google-maps/usoApi";
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
  distanciaOperacionalKm?: number;
  duracaoOperacionalMin?: number;
};

export type ResultadoCalculoRota = {
  distanciaKm: number;
  duracaoMin: number;
  valorSugerido: number;
  enderecosEncontrados: string[];
  polyline: string | null;
  pontos: PontoRota[];
  rotasAlternativas: RotaAlternativa[];
  distanciaOperacionalKm?: number;
  duracaoOperacionalMin?: number;
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
  const ponto = await obterCoordenadasPersistentes(
    endereco,
    chaveGoogleMaps,
    "CALCULAR_ROTA"
  );

  return ponto
    ? {
        lat: ponto.latitude,
        lng: ponto.longitude,
        cidade: ponto.cidade,
        enderecoEncontrado: ponto.enderecoFormatado,
      }
    : null;
}

async function consultarRotasGoogle(
  coordenadas: Coordenada[],
  chaveGoogleMaps: string
): Promise<RotaGoogle[]> {
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

  await registrarUsoGoogle({
    servico: "Routes API",
    sku: "Compute Routes",
    origem: "CALCULAR_ROTA",
  });

  const dadosRota = (await respostaRota.json()) as RespostaRotasGoogle;

  if (!respostaRota.ok) {
    throw new ErroCalculoRota(dadosRota.error?.message || "Erro ao calcular rota.", 500);
  }

  const rotas = dadosRota.routes || [];

  if (rotas.length === 0 || typeof rotas[0]?.distanceMeters !== "number") {
    throw new ErroCalculoRota("Nenhuma rota encontrada.", 404);
  }

  return rotas;
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

  const coordenadasCobranca: Coordenada[] = [];

  for (const parada of paradas) {
    const endereco = parada.endereco.trim();
    const coordenada = await geocodificar(endereco, chaveGoogleMaps);

    if (!coordenada) {
      throw new ErroCalculoRota(`Não foi possível encontrar: ${endereco}`, 404);
    }

    coordenadasCobranca.push(coordenada);
  }

  /*
   * A rota de cobrança considera somente as paradas informadas.
   * O retorno operacional não entra na distância cobrada.
   */
  const rotasCobranca = await consultarRotasGoogle(coordenadasCobranca, chaveGoogleMaps);

  /*
   * Quando existe retorno, o ponto inicial é acrescentado apenas
   * à rota operacional exibida no mapa e usada pelo motoboy.
   */
  const coordenadasOperacionais = temRetorno
    ? [
        ...coordenadasCobranca,
        {
          ...coordenadasCobranca[0],
          enderecoEncontrado: `Retorno — ${coordenadasCobranca[0].enderecoEncontrado}`,
        },
      ]
    : coordenadasCobranca;

  const rotasOperacionais = temRetorno
    ? await consultarRotasGoogle(coordenadasOperacionais, chaveGoogleMaps)
    : rotasCobranca;

  const rotaCobrancaPrincipal = rotasCobranca[0];
  const rotaOperacionalPrincipal = rotasOperacionais[0];

  const distanciaKm = Number(rotaCobrancaPrincipal.distanceMeters || 0) / 1000;

  const distanciaOperacionalKm = Number(rotaOperacionalPrincipal.distanceMeters || 0) / 1000;

  const duracaoMin = converterDuracaoParaMinutos(rotaCobrancaPrincipal.duration);

  const duracaoOperacionalMin = converterDuracaoParaMinutos(rotaOperacionalPrincipal.duration);

  const cidadeOrigem = coordenadasCobranca[0]?.cidade || "";

  const cidadeDestino = coordenadasCobranca[coordenadasCobranca.length - 1]?.cidade || "";

  const rotasAlternativas = rotasOperacionais.flatMap((rotaOperacional, index) => {
    if (typeof rotaOperacional.distanceMeters !== "number") {
      return [];
    }

    const rotaCobranca = rotasCobranca[index] || rotasCobranca[0];

    if (!rotaCobranca || typeof rotaCobranca.distanceMeters !== "number") {
      return [];
    }

    const distanciaCobradaKm = rotaCobranca.distanceMeters / 1000;

    const distanciaCompletaKm = rotaOperacional.distanceMeters / 1000;

    return [
      {
        id: index,
        distanciaKm: distanciaCobradaKm,
        duracaoMin: converterDuracaoParaMinutos(rotaCobranca.duration),
        valorSugerido: calcularValorRota(
          distanciaCobradaKm,
          Boolean(temRetorno),
          cidadeOrigem,
          cidadeDestino
        ),
        polyline: rotaOperacional.polyline?.encodedPolyline || null,
        distanciaOperacionalKm: distanciaCompletaKm,
        duracaoOperacionalMin: converterDuracaoParaMinutos(rotaOperacional.duration),
      },
    ];
  });

  return {
    distanciaKm,
    duracaoMin,
    valorSugerido: calcularValorRota(distanciaKm, Boolean(temRetorno), cidadeOrigem, cidadeDestino),

    distanciaOperacionalKm,
    duracaoOperacionalMin,

    enderecosEncontrados: coordenadasOperacionais.map(
      (coordenada) => coordenada.enderecoEncontrado
    ),

    polyline: rotaOperacionalPrincipal.polyline?.encodedPolyline || null,

    pontos: coordenadasOperacionais.map((coordenada) => ({
      lat: coordenada.lat,
      lng: coordenada.lng,
      endereco: coordenada.enderecoEncontrado,
    })),

    rotasAlternativas,
  };
}