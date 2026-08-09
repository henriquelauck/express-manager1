import { prisma } from "@/lib/prisma";
import { obterCoordenadasPersistentes } from "@/lib/google-maps/geocodificacaoPersistente";

type ItemFila = {
  id: string;
  teleId: string;
  ordem: number;
  parada: {
    ordem: number;
    endereco: string;
  };
};

function distanciaMetros(lat1: number, lon1: number, lat2: number, lon2: number) {
  const raio = 6371000;
  const rad = (valor: number) => (valor * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) *
      Math.cos(rad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  return 2 * raio * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function otimizarFilaOperacionalPorProximidade(
  motoboyId: string,
  chaveGoogleMaps: string
) {
  const motoboy = await prisma.motoboy.findUnique({
    where: { id: motoboyId },
    select: { latitude: true, longitude: true },
  });

  if (
    !motoboy ||
    typeof motoboy.latitude !== "number" ||
    typeof motoboy.longitude !== "number"
  ) {
    return { otimizada: false, motivo: "SEM_LOCALIZACAO" as const };
  }

  const [emAndamento, pendentes] = await Promise.all([
    prisma.itemFilaOperacionalMotoboy.findMany({
      where: { motoboyId, status: "EM_ANDAMENTO" },
      orderBy: [{ ordem: "asc" }, { createdAt: "asc" }],
      select: { id: true, ordem: true },
    }),
    prisma.itemFilaOperacionalMotoboy.findMany({
      where: { motoboyId, status: "PENDENTE" },
      orderBy: [{ ordem: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        teleId: true,
        ordem: true,
        parada: {
          select: {
            ordem: true,
            endereco: true,
          },
        },
      },
    }),
  ]);

  if (pendentes.length <= 1) {
    return { otimizada: false, motivo: "POUCOS_ITENS" as const };
  }

  const coordenadas = new Map<
    string,
    { latitude: number; longitude: number } | null
  >();

  for (const item of pendentes) {
    const endereco = String(item.parada.endereco || "").trim();

    if (!endereco || coordenadas.has(endereco)) continue;

    const ponto = await obterCoordenadasPersistentes(
      endereco,
      chaveGoogleMaps,
      "FILA_AUTOMATICA"
    );

    coordenadas.set(
      endereco,
      ponto
        ? { latitude: ponto.latitude, longitude: ponto.longitude }
        : null
    );
  }

  const porTele = new Map<string, ItemFila[]>();

  for (const item of pendentes as ItemFila[]) {
    const lista = porTele.get(item.teleId) || [];
    lista.push(item);
    porTele.set(item.teleId, lista);
  }

  for (const lista of porTele.values()) {
    lista.sort((a, b) => a.parada.ordem - b.parada.ordem);
  }

  let latitudeAtual = motoboy.latitude;
  let longitudeAtual = motoboy.longitude;
  const escolhidos: ItemFila[] = [];

  while (porTele.size > 0) {
    let melhor:
      | {
          teleId: string;
          item: ItemFila;
          distancia: number;
          latitude: number;
          longitude: number;
        }
      | null = null;

    for (const [teleId, lista] of porTele) {
      const item = lista[0];
      if (!item) continue;

      const ponto = coordenadas.get(String(item.parada.endereco || "").trim());
      const distancia = ponto
        ? distanciaMetros(
            latitudeAtual,
            longitudeAtual,
            ponto.latitude,
            ponto.longitude
          )
        : Number.POSITIVE_INFINITY;

      if (
        !melhor ||
        distancia < melhor.distancia ||
        (distancia === melhor.distancia && item.ordem < melhor.item.ordem)
      ) {
        melhor = {
          teleId,
          item,
          distancia,
          latitude: ponto?.latitude ?? latitudeAtual,
          longitude: ponto?.longitude ?? longitudeAtual,
        };
      }
    }

    if (!melhor) break;

    escolhidos.push(melhor.item);
    latitudeAtual = melhor.latitude;
    longitudeAtual = melhor.longitude;

    const restante = porTele.get(melhor.teleId) || [];
    restante.shift();

    if (restante.length === 0) {
      porTele.delete(melhor.teleId);
    }
  }

  if (escolhidos.length !== pendentes.length) {
    return { otimizada: false, motivo: "INCOMPLETA" as const };
  }

  const inicio = emAndamento.length + 1;

  await prisma.$transaction([
    ...emAndamento.map((item, indice) =>
      prisma.itemFilaOperacionalMotoboy.update({
        where: { id: item.id },
        data: { ordem: indice + 1 },
      })
    ),
    ...escolhidos.map((item, indice) =>
      prisma.itemFilaOperacionalMotoboy.update({
        where: { id: item.id },
        data: { ordem: inicio + indice },
      })
    ),
  ]);

  return {
    otimizada: true,
    motivo: "OK" as const,
    itens: escolhidos.map((item) => item.id),
  };
}
