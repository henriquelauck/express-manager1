import type { CustoRota, PontoLogistico, TrechoLogistico } from "./types";

function criarChaveTrecho(origemId: string, destinoId: string) {
  return `${origemId}::${destinoId}`;
}

export function calcularCustoRota(
  sequencia: PontoLogistico[],
  trechos: TrechoLogistico[]
): CustoRota {
  if (sequencia.length < 2) {
    return {
      distanciaTotalKm: 0,
      duracaoTotalMin: 0,
      quantidadeTrechos: 0,
      trechosAusentes: [],
    };
  }

  const trechosPorChave = new Map(
    trechos.map((trecho) => [criarChaveTrecho(trecho.origemId, trecho.destinoId), trecho])
  );

  let distanciaTotalKm = 0;
  let duracaoTotalMin = 0;

  const trechosAusentes: CustoRota["trechosAusentes"] = [];

  for (let index = 0; index < sequencia.length - 1; index += 1) {
    const origem = sequencia[index];
    const destino = sequencia[index + 1];

    const trecho = trechosPorChave.get(criarChaveTrecho(origem.id, destino.id));

    if (!trecho) {
      trechosAusentes.push({
        origemId: origem.id,
        destinoId: destino.id,
      });

      continue;
    }

    distanciaTotalKm += trecho.distanciaKm;
    duracaoTotalMin += trecho.duracaoMin;
  }

  return {
    distanciaTotalKm,
    duracaoTotalMin,
    quantidadeTrechos: sequencia.length - 1,
    trechosAusentes,
  };
}
