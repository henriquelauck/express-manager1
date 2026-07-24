import { prisma } from "@/lib/prisma";

type BuscarMemoriaIAParams = {
  telefoneRemetente?: string | null;

  solicitante?: string | null;

  mensagemCliente: string;

  limite?: number;
};

export type ExemploMemoriaIA = {
  id: string;

  solicitante: string | null;

  mensagemCliente: string;

  respostaHumana: string | null;

  interpretacaoIA: unknown;

  sugestaoIA: unknown;

  operacaoFinal: unknown;

  aprovado: boolean;

  corrigido: boolean;

  observacaoHumana: string | null;

  criadoEm: string;

  relevancia: number;
};

export type ResultadoMemoriaIA = {
  habilitada: boolean;

  modo: "DESATIVADO" | "SOMENTE_APRENDIZADO" | "SUGESTAO" | "AUTOMATICO" | string;

  exemplos: ExemploMemoriaIA[];

  quantidadeEncontrada: number;

  quantidadeMinimaExemplos: number;

  possuiMemoriaSuficiente: boolean;

  confiancaMinimaSugestao: number;

  confiancaMinimaAutomatico: number;
};

function normalizarTexto(texto: string | null | undefined) {
  return String(texto ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizarTelefone(telefone: string | null | undefined) {
  const numeros = String(telefone ?? "").replace(/\D/g, "");

  if (!numeros) {
    return "";
  }

  if (numeros.startsWith("55") && numeros.length >= 12) {
    return numeros.slice(2);
  }

  return numeros;
}

function criarConjuntoPalavras(texto: string) {
  const palavrasIgnoradas = new Set([
    "a",
    "ao",
    "aos",
    "as",
    "o",
    "os",
    "de",
    "da",
    "das",
    "do",
    "dos",
    "em",
    "na",
    "nas",
    "no",
    "nos",
    "para",
    "pra",
    "por",
    "com",
    "um",
    "uma",
    "e",
    "que",
    "eu",
    "me",
    "meu",
    "minha",
  ]);

  return new Set(
    normalizarTexto(texto)
      .split(" ")
      .filter((palavra) => palavra.length >= 2)
      .filter((palavra) => !palavrasIgnoradas.has(palavra))
  );
}

function calcularSimilaridade(textoAtual: string, textoExemplo: string) {
  const palavrasAtuais = criarConjuntoPalavras(textoAtual);

  const palavrasExemplo = criarConjuntoPalavras(textoExemplo);

  if (palavrasAtuais.size === 0 || palavrasExemplo.size === 0) {
    return 0;
  }

  let quantidadeEmComum = 0;

  for (const palavra of palavrasAtuais) {
    if (palavrasExemplo.has(palavra)) {
      quantidadeEmComum += 1;
    }
  }

  const totalPalavrasUnicas = new Set([...palavrasAtuais, ...palavrasExemplo]).size;

  if (totalPalavrasUnicas === 0) {
    return 0;
  }

  return quantidadeEmComum / totalPalavrasUnicas;
}

function calcularRelevancia(params: {
  mensagemAtual: string;

  mensagemExemplo: string;

  telefoneAtual: string;

  telefoneExemplo: string;

  solicitanteAtual: string;

  solicitanteExemplo: string;

  aprovado: boolean;

  corrigido: boolean;

  possuiRespostaHumana: boolean;
}) {
  let pontuacao = calcularSimilaridade(params.mensagemAtual, params.mensagemExemplo);

  if (
    params.telefoneAtual &&
    params.telefoneExemplo &&
    params.telefoneAtual === params.telefoneExemplo
  ) {
    pontuacao += 0.35;
  }

  if (
    params.solicitanteAtual &&
    params.solicitanteExemplo &&
    params.solicitanteAtual === params.solicitanteExemplo
  ) {
    pontuacao += 0.3;
  }

  if (params.aprovado) {
    pontuacao += 0.2;
  }

  if (params.corrigido) {
    pontuacao += 0.15;
  }

  if (params.possuiRespostaHumana) {
    pontuacao += 0.2;
  }

  return Math.min(pontuacao, 1);
}

export async function buscarMemoriaIA({
  telefoneRemetente,
  solicitante,
  mensagemCliente,
  limite = 8,
}: BuscarMemoriaIAParams): Promise<ResultadoMemoriaIA> {
  const configuracao = await prisma.configuracaoAprendizadoIA.findFirst({
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!configuracao || configuracao.modo === "DESATIVADO") {
    return {
      habilitada: false,

      modo: configuracao?.modo ?? "DESATIVADO",

      exemplos: [],

      quantidadeEncontrada: 0,

      quantidadeMinimaExemplos: configuracao?.quantidadeMinimaExemplos ?? 0,

      possuiMemoriaSuficiente: false,

      confiancaMinimaSugestao: configuracao?.confiancaMinimaSugestao ?? 0.75,

      confiancaMinimaAutomatico: configuracao?.confiancaMinimaAutomatico ?? 0.95,
    };
  }

  const telefoneNormalizado = normalizarTelefone(telefoneRemetente);

  const solicitanteNormalizado = normalizarTexto(solicitante);

  /*
   * Por enquanto buscamos os exemplos mais recentes e calculamos
   * a relevância dentro da aplicação.
   *
   * Mais adiante poderemos substituir isso por busca vetorial,
   * sem alterar quem utiliza esta função.
   */
  const exemplosBanco = await prisma.exemploAtendimentoIA.findMany({
    where: {
      OR: [
        {
          aprovado: true,
        },
        {
          corrigido: true,
        },
        {
          respostaHumana: {
            not: null,
          },
        },
      ],
    },

    orderBy: {
      createdAt: "desc",
    },

    take: 200,
  });

  const exemplosClassificados = exemplosBanco
    .map((exemplo): ExemploMemoriaIA => {
      const telefoneExemplo = normalizarTelefone(exemplo.telefoneRemetente);

      const solicitanteExemplo = normalizarTexto(exemplo.solicitante);

      const relevancia = calcularRelevancia({
        mensagemAtual: mensagemCliente,

        mensagemExemplo: exemplo.mensagemCliente,

        telefoneAtual: telefoneNormalizado,

        telefoneExemplo,

        solicitanteAtual: solicitanteNormalizado,

        solicitanteExemplo,

        aprovado: exemplo.aprovado,

        corrigido: exemplo.corrigido,

        possuiRespostaHumana: Boolean(exemplo.respostaHumana?.trim()),
      });

      return {
        id: exemplo.id,

        solicitante: exemplo.solicitante,

        mensagemCliente: exemplo.mensagemCliente,

        respostaHumana: exemplo.respostaHumana,

        interpretacaoIA: exemplo.interpretacaoIA,

        sugestaoIA: exemplo.sugestaoIA,

        operacaoFinal: exemplo.operacaoFinal,

        aprovado: exemplo.aprovado,

        corrigido: exemplo.corrigido,

        observacaoHumana: exemplo.observacaoHumana,

        criadoEm: exemplo.createdAt.toISOString(),

        relevancia,
      };
    })
    .filter((exemplo) => exemplo.relevancia > 0)
    .sort((exemploA, exemploB) => {
      if (exemploB.relevancia !== exemploA.relevancia) {
        return exemploB.relevancia - exemploA.relevancia;
      }

      return new Date(exemploB.criadoEm).getTime() - new Date(exemploA.criadoEm).getTime();
    })
    .slice(0, limite);

  return {
    habilitada: true,

    modo: configuracao.modo,

    exemplos: exemplosClassificados,

    quantidadeEncontrada: exemplosClassificados.length,

    quantidadeMinimaExemplos: configuracao.quantidadeMinimaExemplos,

    possuiMemoriaSuficiente: exemplosClassificados.length >= configuracao.quantidadeMinimaExemplos,

    confiancaMinimaSugestao: configuracao.confiancaMinimaSugestao,

    confiancaMinimaAutomatico: configuracao.confiancaMinimaAutomatico,
  };
}
