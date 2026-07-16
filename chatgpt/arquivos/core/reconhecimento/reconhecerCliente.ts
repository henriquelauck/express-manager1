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

function compactarTexto(texto: string): string {
  return normalizarTexto(texto).replace(/\s+/g, "");
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

  const compactoA = compactarTexto(textoA);
  const compactoB = compactarTexto(textoB);

  /*
   * Reconhece diferenças apenas de espaço:
   * "SaveCell" e "Save Cell"
   * "PetExame" e "Pet Exame"
   */
  if (compactoA === compactoB) {
    return 1;
  }

  const menorTexto = textoA.length <= textoB.length ? textoA : textoB;

  const maiorTexto = textoA.length > textoB.length ? textoA : textoB;

  const menorCompacto = compactoA.length <= compactoB.length ? compactoA : compactoB;

  const maiorCompacto = compactoA.length > compactoB.length ? compactoA : compactoB;

  const possuiTrechoDireto =
    maiorTexto.includes(menorTexto) || maiorCompacto.includes(menorCompacto);

  /*
   * Uma parte significativa do nome pode identificar
   * corretamente o cliente:
   *
   * "SaveCell" → "SaveCell Canudos"
   * "Hardware" → "Hardware Auto Peças"
   *
   * Termos muito curtos, como "pet" ou "loja",
   * não recebem confiança elevada.
   */
  if (possuiTrechoDireto && menorCompacto.length >= 5) {
    return 0.94;
  }

  if (possuiTrechoDireto) {
    const proporcao = menorCompacto.length / maiorCompacto.length;

    return Math.max(0.7, proporcao);
  }

  const distancia = calcularDistanciaLevenshtein(compactoA, compactoB);

  const maiorComprimento = Math.max(compactoA.length, compactoB.length);

  return Math.max(0, 1 - distancia / maiorComprimento);
}

function extrairTrechosMensagem(mensagem: string): string[] {
  const normalizada = normalizarTexto(mensagem);
  const palavras = normalizada.split(" ").filter(Boolean);

  const trechos = new Set<string>();

  /*
   * Mantemos até quatro palavras para encontrar nomes
   * como "Hardware Auto Peças Canudos".
   */
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

  const resultados = clientes
    .map((cliente) => {
      const melhorScore = trechos.reduce(
        (maior, trecho) => Math.max(maior, calcularSimilaridade(trecho, cliente)),
        0
      );

      return {
        nome: cliente,
        score: Number(melhorScore.toFixed(3)),
      };
    })
    .filter((resultado) => resultado.score >= 0.62)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return resultados.map((resultado, index) => {
    const segundoMelhor = index === 0 ? (resultados[1]?.score ?? 0) : (resultados[0]?.score ?? 0);

    const diferenca = resultado.score - segundoMelhor;

    /*
     * Para aceitar automaticamente:
     *
     * 1. O score precisa ser alto.
     * 2. O resultado precisa ser claramente melhor
     *    que outra opção semelhante.
     *
     * Correspondência exata continua segura,
     * mesmo quando há outros resultados próximos.
     */
    const correspondenciaExata = resultado.score === 1;

    const possuiVantagemSegura = diferenca >= 0.08;

    const confiavel = correspondenciaExata || (resultado.score >= 0.9 && possuiVantagemSegura);

    return {
      ...resultado,
      confiavel,
    };
  });
}
