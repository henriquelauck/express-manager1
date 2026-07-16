import type { Atendimento, ParadaAtendimento } from "./Atendimento";
import { mesclarParadas } from "./mesclarParadas";

type ResultadoInterpretacao = {
  intencao: string;

  solicitante: string | null;

  origemSolicitante: "TELEFONE_REMETENTE" | "MENSAGEM" | null;

  paradas: Array<{
    tipo: string;
    texto: string;
    textoOriginal?: string | null;
    cliente: string | null;
    endereco?: string | null;
    telefone?: string | null;
    confianca: number;
    resolvidaPorContexto?: boolean;
  }>;
};

function converterTipo(tipo: string): ParadaAtendimento["tipo"] {
  const normalizado = String(tipo || "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (normalizado.includes("COLETA")) {
    return "COLETA";
  }

  if (normalizado.includes("ENTREGA")) {
    return "ENTREGA";
  }

  if (normalizado.includes("TROCA")) {
    return "TROCA";
  }

  return "OUTRA";
}

function converterParadas(resultado: ResultadoInterpretacao): ParadaAtendimento[] {
  return resultado.paradas.map((parada) => ({
    tipo: converterTipo(parada.tipo),

    textoOriginal: parada.textoOriginal || parada.texto || null,

    cliente: parada.cliente,

    endereco: parada.endereco || null,

    telefone: parada.telefone || null,

    confianca: parada.confianca,

    origem: parada.resolvidaPorContexto ? "CONTEXTO_OPERACIONAL" : "MENSAGEM",

    confirmada: parada.confianca >= 0.9 && Boolean(parada.cliente),
  }));
}

function resolverIntencao({
  intencaoAtual,
  novaIntencao,
}: {
  intencaoAtual: string | null;
  novaIntencao: string;
}) {
  const novaNormalizada = String(
    novaIntencao || ""
  )
    .trim()
    .toUpperCase();

  if (!novaNormalizada) {
    return intencaoAtual;
  }

  if (
    novaNormalizada === "DESCONHECIDO" ||
    novaNormalizada === "NAO_SUPORTADO"
  ) {
    return intencaoAtual;
  }

  const intencoesExplicitas = [
    "CRIAR_TELE",
    "FALAR_HUMANO",
    "CANCELAR",
    "CANCELAR_TELE",
  ];

  if (
    intencoesExplicitas.includes(
      novaNormalizada
    )
  ) {
    return novaNormalizada;
  }

  return intencaoAtual || novaNormalizada;
}

export function atualizarAtendimento(
  atendimento: Atendimento,
  resultado: ResultadoInterpretacao
): Atendimento {
  const novasParadas = converterParadas(resultado);

  const paradasConsolidadas = mesclarParadas(atendimento.operacao.paradas, novasParadas);

  const solicitante = resultado.solicitante || atendimento.operacao.solicitante;

  const origemSolicitante = resultado.solicitante
    ? resultado.origemSolicitante
    : atendimento.operacao.origemSolicitante;

const intencao = resolverIntencao({
  intencaoAtual:
    atendimento.operacao.intencao,

  novaIntencao:
    resultado.intencao,
});

  return {
    ...atendimento,

    atualizadoEm: new Date().toISOString(),

    operacao: {
      ...atendimento.operacao,
intencao,
      solicitante,

      origemSolicitante,

      paradas: paradasConsolidadas,
    },
  };
}
