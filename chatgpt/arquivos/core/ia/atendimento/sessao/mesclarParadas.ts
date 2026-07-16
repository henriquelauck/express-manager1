import type { ParadaAtendimento } from "./Atendimento";

function paradaPossuiDados(parada: ParadaAtendimento) {
  return Boolean(parada.cliente || parada.endereco || parada.textoOriginal);
}

function encontrarIndiceCompatível(existentes: ParadaAtendimento[], novaParada: ParadaAtendimento) {
  /*
   * Primeiro tenta localizar uma parada existente
   * do mesmo tipo.
   */
  const indiceMesmoTipo = existentes.findIndex((parada) => parada.tipo === novaParada.tipo);

  if (indiceMesmoTipo >= 0) {
    return indiceMesmoTipo;
  }

  /*
   * Paradas genéricas podem preencher a primeira
   * posição ainda incompleta.
   */
  return existentes.findIndex((parada) => !parada.cliente && !parada.endereco);
}

function escolherTextoOriginal(atual: ParadaAtendimento, nova: ParadaAtendimento) {
  return nova.textoOriginal || atual.textoOriginal || null;
}

function escolherConfianca(atual: ParadaAtendimento, nova: ParadaAtendimento) {
  if (nova.cliente || nova.endereco) {
    return Math.max(atual.confianca, nova.confianca);
  }

  return atual.confianca;
}

function mesclarParada(atual: ParadaAtendimento, nova: ParadaAtendimento): ParadaAtendimento {
  return {
    tipo: nova.tipo !== "OUTRA" ? nova.tipo : atual.tipo,

    textoOriginal: escolherTextoOriginal(atual, nova),

    cliente: nova.cliente || atual.cliente,

    endereco: nova.endereco || atual.endereco,

    telefone: nova.telefone || atual.telefone,

    confianca: escolherConfianca(atual, nova),

    origem: nova.origem || atual.origem,

    confirmada: nova.confirmada || atual.confirmada,
  };
}

export function mesclarParadas(
  paradasExistentes: ParadaAtendimento[],
  novasParadas: ParadaAtendimento[]
): ParadaAtendimento[] {
  const resultado = paradasExistentes.map((parada) => ({ ...parada }));

  for (const novaParada of novasParadas) {
    if (!paradaPossuiDados(novaParada)) {
      continue;
    }

    const indice = encontrarIndiceCompatível(resultado, novaParada);

    if (indice < 0) {
      resultado.push(novaParada);
      continue;
    }

    resultado[indice] = mesclarParada(resultado[indice], novaParada);
  }

  return resultado;
}
