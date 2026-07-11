export type ClienteReconhecido = {
  nome: string;
  score: number;
  confiavel: boolean;
};

function normalizarTexto(texto: string): string {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function calcularDistanciaLevenshtein(a: string, b: string): number {
  const linhas = a.length + 1;
  const colunas = b.length + 1;

  const matriz = Array.from({ length: linhas }, () => Array<number>(colunas).fill(0));

  for (let i = 0; i < linhas; i += 1) {
    matriz[i][0] = i;
  }

  for (let j = 0; j < colunas; j += 1) {
    matriz[0][j] = j;
  }

  for (let i = 1; i < linhas; i += 1) {
    for (let j = 1; j < colunas; j += 1) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;

      matriz[i][j] = Math.min(
        matriz[i - 1][j] + 1,
        matriz[i][j - 1] + 1,
        matriz[i - 1][j - 1] + custo
      );
    }
  }

  return matriz[a.length][b.length];
}

function calcularSimilaridade(a: string, b: string): number {
  const textoA = normalizarTexto(a);
  const textoB = normalizarTexto(b);

  if (!textoA || !textoB) {
    return 0;
  }

  if (textoA === textoB) {
    return 1;
  }

  if (textoA.includes(textoB) || textoB.includes(textoA)) {
    const menor = Math.min(textoA.length, textoB.length);
    const maior = Math.max(textoA.length, textoB.length);

    return Math.max(0.86, menor / maior);
  }

  const distancia = calcularDistanciaLevenshtein(textoA, textoB);
  const maiorComprimento = Math.max(textoA.length, textoB.length);

  return Math.max(0, 1 - distancia / maiorComprimento);
}

function extrairTrechosMensagem(mensagem: string): string[] {
  const normalizada = normalizarTexto(mensagem);
  const palavras = normalizada.split(" ").filter(Boolean);
  const trechos = new Set<string>();

  for (let tamanho = 1; tamanho <= 4; tamanho += 1) {
    for (let inicio = 0; inicio <= palavras.length - tamanho; inicio += 1) {
      trechos.add(palavras.slice(inicio, inicio + tamanho).join(" "));
    }
  }

  return Array.from(trechos);
}

export function reconhecerClientesNaMensagem(
  mensagem: string,
  clientes: string[]
): ClienteReconhecido[] {
  const trechos = extrairTrechosMensagem(mensagem);

  return clientes
    .map((cliente) => {
      const melhorScore = trechos.reduce((maior, trecho) => {
        return Math.max(maior, calcularSimilaridade(trecho, cliente));
      }, 0);

      return {
        nome: cliente,
        score: Number(melhorScore.toFixed(3)),
        confiavel: melhorScore >= 0.9,
      };
    })
    .filter((resultado) => resultado.score >= 0.62)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}
