import { reconhecerClientesNaMensagem } from "@/core/reconhecimento";
import { prisma } from "@/lib/prisma";
import type { TipoParada } from "@prisma/client";

export type ResultadoLocalRecorrente = {
  encontrado: boolean;

  cliente: string | null;

  endereco: string | null;

  telefone: string | null;

  confianca: number;

  quantidadeUsos: number;

  origem: "HISTORICO_SOLICITANTE" | null;

  motivo: string;
};

type LocalHistorico = {
  cliente: string;
  endereco: string;
  telefone: string | null;
  tipo: TipoParada;
  dataTele: Date;
};

function normalizarTexto(texto: string) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function limparTextoLocal(texto: string) {
  return normalizarTexto(texto)
    .replace(/^(?:na|no|em|da|do|para|pra|pela|pelo)\s+/, "")
    .replace(/^(?:clinica|clínica|loja|empresa)\s+/, "")
    .trim();
}

function solicitantesCorrespondem(solicitado: string, salvo: string) {
  return normalizarTexto(solicitado) === normalizarTexto(salvo);
}

function agruparLocais(locais: LocalHistorico[]) {
  const grupos = new Map<
    string,
    {
      cliente: string;
      endereco: string;
      telefone: string | null;
      quantidadeUsos: number;
      ultimaUtilizacao: Date;
    }
  >();

  for (const local of locais) {
    const chave = [normalizarTexto(local.cliente), normalizarTexto(local.endereco)].join("|");

    const existente = grupos.get(chave);

    if (existente) {
      existente.quantidadeUsos += 1;

      if (local.dataTele > existente.ultimaUtilizacao) {
        existente.ultimaUtilizacao = local.dataTele;

        existente.telefone = local.telefone;
      }

      continue;
    }

    grupos.set(chave, {
      cliente: local.cliente,

      endereco: local.endereco,

      telefone: local.telefone,

      quantidadeUsos: 1,

      ultimaUtilizacao: local.dataTele,
    });
  }

  return Array.from(grupos.values());
}

export async function resolverLocalRecorrente({
  solicitante,
  textoLocal,
  tipo,
}: {
  solicitante: string;
  textoLocal: string;
  tipo?: TipoParada;
}): Promise<ResultadoLocalRecorrente> {
  const solicitanteLimpo = String(solicitante || "").trim();

  const localInformado = String(textoLocal || "").trim();

  if (!solicitanteLimpo || !localInformado) {
    return {
      encontrado: false,

      cliente: null,

      endereco: null,

      telefone: null,

      confianca: 0,

      quantidadeUsos: 0,

      origem: null,

      motivo: "O solicitante ou o local informado está vazio.",
    };
  }

  /*
   * Buscamos um volume limitado e recente de teles.
   * A comparação do solicitante será feita de forma
   * normalizada para tolerar diferenças de escrita.
   */
  const teles = await prisma.tele.findMany({
    select: {
      solicitante: true,
      dataTele: true,

      paradas: {
        select: {
          tipo: true,
          cliente: true,
          endereco: true,
          contato: true,
        },
      },
    },

    orderBy: {
      dataTele: "desc",
    },

    take: 500,
  });

  const locaisHistoricos: LocalHistorico[] = teles
    .filter((tele) => solicitantesCorrespondem(solicitanteLimpo, tele.solicitante))
    .flatMap((tele) =>
      tele.paradas
        .filter((parada) => {
          if (!parada.cliente || !parada.endereco) {
            return false;
          }

          if (tipo && parada.tipo !== tipo) {
            return false;
          }

          return true;
        })
        .map((parada) => ({
          cliente: parada.cliente,

          endereco: parada.endereco,

          telefone: parada.contato,

          tipo: parada.tipo,

          dataTele: tele.dataTele,
        }))
    );

  if (locaisHistoricos.length === 0) {
    return {
      encontrado: false,

      cliente: null,

      endereco: null,

      telefone: null,

      confianca: 0,

      quantidadeUsos: 0,

      origem: null,

      motivo: `Não existem locais recorrentes registrados para o solicitante "${solicitante}".`,
    };
  }

  const locaisAgrupados = agruparLocais(locaisHistoricos);

  const nomesUnicos = Array.from(new Set(locaisAgrupados.map((local) => local.cliente)));

  const textoLimpo = limparTextoLocal(localInformado);

  const clienteExato = nomesUnicos.find((nome) => limparTextoLocal(nome) === textoLimpo);

  let nomeReconhecido: string | null = clienteExato ?? null;

  let confianca = clienteExato ? 1 : 0;

  if (!nomeReconhecido) {
    const reconhecidos = reconhecerClientesNaMensagem(textoLimpo, nomesUnicos);

    const melhor = reconhecidos[0];

    if (melhor?.confiavel) {
      nomeReconhecido = melhor.nome;
      confianca = melhor.score;
    }
  }

  if (!nomeReconhecido) {
    return {
      encontrado: false,

      cliente: null,

      endereco: null,

      telefone: null,

      confianca,

      quantidadeUsos: 0,

      origem: null,

      motivo: `O local "${textoLocal}" não foi reconhecido no histórico do solicitante "${solicitante}".`,
    };
  }

  const candidatos = locaisAgrupados
    .filter((local) => normalizarTexto(local.cliente) === normalizarTexto(nomeReconhecido))
    .sort((a, b) => {
      if (b.quantidadeUsos !== a.quantidadeUsos) {
        return b.quantidadeUsos - a.quantidadeUsos;
      }

      return b.ultimaUtilizacao.getTime() - a.ultimaUtilizacao.getTime();
    });

  const melhorLocal = candidatos[0];

  if (!melhorLocal) {
    return {
      encontrado: false,

      cliente: nomeReconhecido,

      endereco: null,

      telefone: null,

      confianca,

      quantidadeUsos: 0,

      origem: null,

      motivo: "O cliente foi reconhecido, mas nenhum endereço histórico foi localizado.",
    };
  }

  return {
    encontrado: true,

    cliente: melhorLocal.cliente,

    endereco: melhorLocal.endereco,

    telefone: melhorLocal.telefone,

    confianca,

    quantidadeUsos: melhorLocal.quantidadeUsos,

    origem: "HISTORICO_SOLICITANTE",

    motivo: `O local "${textoLocal}" foi reconhecido como "${melhorLocal.cliente}" pelo histórico de "${solicitante}". O endereço escolhido foi utilizado ${melhorLocal.quantidadeUsos} vez(es).`,
  };
}
