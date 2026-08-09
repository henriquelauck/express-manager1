import { prisma } from "@/lib/prisma";
import { registrarUsoGoogle } from "@/lib/google-maps/usoApi";

export type CoordenadaPersistente = {
  latitude: number;
  longitude: number;
  enderecoFormatado: string;
  cidade: string;
  cache: boolean;
};

export function normalizarEnderecoGeocodificacao(valor: string) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function coordenadaValida(valor: unknown) {
  return typeof valor === "number" && Number.isFinite(valor);
}

export async function obterCoordenadasPersistentes(
  endereco: string,
  chaveGoogleMaps: string,
  origem: string
): Promise<CoordenadaPersistente | null> {
  const enderecoOriginal = String(endereco || "").trim();
  const enderecoNormalizado = normalizarEnderecoGeocodificacao(enderecoOriginal);

  if (!enderecoNormalizado) return null;

  const salvo = await prisma.cacheGeocodificacao.findUnique({
    where: { enderecoNormalizado },
  });

  if (
    salvo &&
    coordenadaValida(salvo.latitude) &&
    coordenadaValida(salvo.longitude)
  ) {
    void prisma.cacheGeocodificacao
      .update({
        where: { id: salvo.id },
        data: { ultimoUsoEm: new Date() },
      })
      .catch(() => {});

    return {
      latitude: salvo.latitude,
      longitude: salvo.longitude,
      enderecoFormatado: salvo.enderecoFormatado || salvo.enderecoOriginal,
      cidade: salvo.cidade || "",
      cache: true,
    };
  }

  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", enderecoOriginal);
  url.searchParams.set("language", "pt-BR");
  url.searchParams.set("region", "BR");
  url.searchParams.set("key", chaveGoogleMaps);

  const resposta = await fetch(url, { cache: "no-store" });

  await registrarUsoGoogle({
    servico: "Geocoding API",
    sku: "Geocoding",
    origem,
  });

  const dados = await resposta.json();

  if (!resposta.ok || dados?.status !== "OK") {
    console.error(
      "Falha ao geocodificar endereço:",
      enderecoOriginal,
      dados?.status,
      dados?.error_message
    );
    return null;
  }

  const resultado = dados?.results?.[0];
  const localizacao = resultado?.geometry?.location;

  if (!coordenadaValida(localizacao?.lat) || !coordenadaValida(localizacao?.lng)) {
    return null;
  }

  const componenteCidade = Array.isArray(resultado?.address_components)
    ? resultado.address_components.find((componente: any) =>
        Array.isArray(componente?.types) &&
        componente.types.includes("administrative_area_level_2")
      )
    : null;

  const cidade = String(componenteCidade?.long_name || "").trim();

  const enderecoFormatado =
    String(resultado?.formatted_address || "").trim() || enderecoOriginal;

  await prisma.cacheGeocodificacao.upsert({
    where: { enderecoNormalizado },
    update: {
      enderecoOriginal,
      enderecoFormatado,
      cidade,
      latitude: localizacao.lat,
      longitude: localizacao.lng,
      ultimoUsoEm: new Date(),
    },
    create: {
      enderecoNormalizado,
      enderecoOriginal,
      enderecoFormatado,
      cidade,
      latitude: localizacao.lat,
      longitude: localizacao.lng,
      ultimoUsoEm: new Date(),
    },
  });

  return {
    latitude: localizacao.lat,
    longitude: localizacao.lng,
    enderecoFormatado,
    cidade,
    cache: false,
  };
}
