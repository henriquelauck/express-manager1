import { calcularRota } from "@/lib/google-maps/calcularRota";
import type { Atendimento } from "../atendimento/sessao/Atendimento";
import { criarTeleDoAtendimento } from "./criarTeleDoAtendimento";

export type ResultadoExecucaoEtapa = {
  atendimento: Atendimento;

  executou: boolean;

  etapaExecutada: string | null;

  mensagem?: string;
};

async function executarCalculoRota(atendimento: Atendimento): Promise<ResultadoExecucaoEtapa> {
  const paradasComEndereco = atendimento.operacao.paradas
    .filter(
      (
        parada
      ): parada is typeof parada & {
        endereco: string;
      } => typeof parada.endereco === "string" && Boolean(parada.endereco.trim())
    )
    .map((parada) => ({
      endereco: parada.endereco,
    }));

  if (paradasComEndereco.length !== atendimento.operacao.paradas.length) {
    return {
      atendimento,

      executou: false,

      etapaExecutada: "PRONTO_PARA_CALCULAR_ROTA",

      mensagem: "Não foi possível calcular a rota porque existem paradas sem endereço.",
    };
  }

  if (paradasComEndereco.length < 2) {
    return {
      atendimento,

      executou: false,

      etapaExecutada: "PRONTO_PARA_CALCULAR_ROTA",

      mensagem: "São necessárias pelo menos duas paradas para calcular a rota.",
    };
  }

  try {
    const resultadoRota = await calcularRota({
      paradas: paradasComEndereco,

      temRetorno: atendimento.operacao.temRetorno,
    });

    const atendimentoAtualizado: Atendimento = {
      ...atendimento,

      atualizadoEm: new Date().toISOString(),

      status: "AGUARDANDO_CLIENTE",

      operacao: {
        ...atendimento.operacao,

        rota: {
          ...atendimento.operacao.rota,

          calculada: true,

          distanciaKm: resultadoRota.distanciaKm,

          duracaoMin: resultadoRota.duracaoMin,

          valorSugerido: resultadoRota.valorSugerido,

          valorConfirmado: null,

          polyline: resultadoRota.polyline,
        },
      },

      estado: {
        etapa: "AGUARDANDO_CONFIRMACAO_ORCAMENTO",

        aguardando: "CONFIRMACAO_ORCAMENTO",

        ultimaAcao: "A distância, o tempo e o valor da rota foram calculados.",

        proximaAcao: "Apresentar o orçamento ao cliente e aguardar a confirmação.",

        motivo: "A rota está calculada e o orçamento ainda não foi confirmado.",

        precisaHumano: false,
      },
    };

    return {
      atendimento: atendimentoAtualizado,

      executou: true,

      etapaExecutada: "PRONTO_PARA_CALCULAR_ROTA",

      mensagem: `Rota calculada: ${resultadoRota.distanciaKm.toFixed(
        1
      )} km, ${resultadoRota.duracaoMin} minutos, valor sugerido de R$ ${resultadoRota.valorSugerido
        .toFixed(2)
        .replace(".", ",")}.`,
    };
  } catch (error) {
    return {
      atendimento,

      executou: false,

      etapaExecutada: "PRONTO_PARA_CALCULAR_ROTA",

      mensagem: error instanceof Error ? error.message : "Não foi possível calcular a rota.",
    };
  }
}

async function executarCriacaoTele(atendimento: Atendimento): Promise<ResultadoExecucaoEtapa> {
  try {
    const resultado = await criarTeleDoAtendimento(atendimento);

    return {
      atendimento: resultado.atendimento,

      executou: resultado.criada,

      etapaExecutada: "PRONTO_PARA_CRIAR_TELE",

      mensagem: resultado.mensagem,
    };
  } catch (error) {
    return {
      atendimento,

      executou: false,

      etapaExecutada: "PRONTO_PARA_CRIAR_TELE",

      mensagem: error instanceof Error ? error.message : "Não foi possível criar a tele.",
    };
  }
}

export async function executarEtapa(atendimento: Atendimento): Promise<ResultadoExecucaoEtapa> {
  switch (atendimento.estado.etapa) {
    case "PRONTO_PARA_CALCULAR_ROTA":
      return executarCalculoRota(atendimento);

    case "PRONTO_PARA_CRIAR_TELE":
      return executarCriacaoTele(atendimento);

    case "AGUARDANDO_MOTOBOY":
      return {
        atendimento,

        executou: false,

        etapaExecutada: "AGUARDANDO_MOTOBOY",

        mensagem: "A atribuição automática do motoboy ainda não foi implementada.",
      };

    default:
      return {
        atendimento,

        executou: false,

        etapaExecutada: null,
      };
  }
}
