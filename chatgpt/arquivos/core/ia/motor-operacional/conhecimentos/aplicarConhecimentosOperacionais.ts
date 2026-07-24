import type { EntradaMotorOperacional, ResultadoMotorOperacional } from "../tipos";

import type { ConhecimentoOperacionalAtivo } from "./buscarConhecimentosAtivos";

import {
  RegraConhecimentoOperacionalSchema,
  type AcaoConhecimentoOperacional,
  type CondicaoConhecimentoOperacional,
  type RegraConhecimentoOperacional,
} from "./tiposConhecimentoOperacional";

function normalizarTexto(valor: string | null | undefined) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function condicaoAtendida({
  condicao,
  entrada,
  resultado,
}: {
  condicao: CondicaoConhecimentoOperacional;

  entrada: EntradaMotorOperacional;

  resultado: ResultadoMotorOperacional;
}) {
  if (condicao.tipo === "SOLICITANTE_IGUAL") {
    return normalizarTexto(entrada.solicitante) === normalizarTexto(condicao.valor);
  }

  if (condicao.tipo === "TEXTO_PARADA_CONTEM") {
    const trecho = normalizarTexto(condicao.valor);

    return resultado.paradas.some((parada) => {
      const texto = normalizarTexto(parada.textoOriginal ?? parada.cliente);

      return texto.includes(trecho);
    });
  }

  if (condicao.tipo === "TIPO_PARADA_IGUAL") {
    return resultado.paradas.some((parada) => parada.tipo === condicao.valor);
  }

  return false;
}

function aplicarAcao({
  acao,
  resultado,
  conhecimento,
}: {
  acao: AcaoConhecimentoOperacional;

  resultado: ResultadoMotorOperacional;

  conhecimento: ConhecimentoOperacionalAtivo;
}): ResultadoMotorOperacional {
  if (acao.tipo === "DEFINIR_CLIENTE_PARADA") {
    if (!resultado.paradas[acao.indiceParada]) {
      return {
        ...resultado,

        avisos: [
          ...resultado.avisos,

          `O conhecimento "${conhecimento.titulo}" tentou alterar uma parada inexistente.`,
        ],
      };
    }

    return {
      ...resultado,

      paradas: resultado.paradas.map((parada, indice) =>
        indice === acao.indiceParada
          ? {
              ...parada,

              cliente: acao.cliente,

              origem: "CONTEXTO_OPERACIONAL",

              confirmada: true,
            }
          : parada
      ),
    };
  }

  if (acao.tipo === "DEFINIR_TIPO_PARADA") {
    if (!resultado.paradas[acao.indiceParada]) {
      return {
        ...resultado,

        avisos: [
          ...resultado.avisos,

          `O conhecimento "${conhecimento.titulo}" tentou alterar uma parada inexistente.`,
        ],
      };
    }

    return {
      ...resultado,

      paradas: resultado.paradas.map((parada, indice) =>
        indice === acao.indiceParada
          ? {
              ...parada,

              tipo: acao.valor,

              origem: "CONTEXTO_OPERACIONAL",
            }
          : parada
      ),
    };
  }

  if (acao.tipo === "DEFINIR_RETORNO") {
    return {
      ...resultado,

      temRetorno: acao.valor,
    };
  }

  if (acao.tipo === "ADICIONAR_AVISO") {
    return {
      ...resultado,

      avisos: [...resultado.avisos, acao.mensagem],
    };
  }

  return resultado;
}

function aplicarRegraValidada({
  regra,
  conhecimento,
  entrada,
  resultado,
}: {
  regra: RegraConhecimentoOperacional;

  conhecimento: ConhecimentoOperacionalAtivo;

  entrada: EntradaMotorOperacional;

  resultado: ResultadoMotorOperacional;
}) {
  const todasCondicoesAtendidas = regra.condicoes.every((condicao) =>
    condicaoAtendida({
      condicao,

      entrada,

      resultado,
    })
  );

  if (!todasCondicoesAtendidas) {
    return resultado;
  }

  let resultadoAtual = resultado;

  for (const acao of regra.acoes) {
    resultadoAtual = aplicarAcao({
      acao,

      resultado: resultadoAtual,

      conhecimento,
    });
  }

  return {
    ...resultadoAtual,

    avisos: [...resultadoAtual.avisos, `Conhecimento aplicado: ${conhecimento.titulo}.`],
  };
}

export function aplicarConhecimentosOperacionais({
  entrada,
  resultado,
  conhecimentos,
}: {
  entrada: EntradaMotorOperacional;

  resultado: ResultadoMotorOperacional;

  conhecimentos: ConhecimentoOperacionalAtivo[];
}): ResultadoMotorOperacional {
  let resultadoAtual = resultado;

  for (const conhecimento of conhecimentos) {
    const regraValidada = RegraConhecimentoOperacionalSchema.safeParse(conhecimento.regra);

    if (!regraValidada.success) {
      resultadoAtual = {
        ...resultadoAtual,

        avisos: [
          ...resultadoAtual.avisos,

          `O conhecimento "${conhecimento.titulo}" foi ignorado porque não possui uma regra operacional válida.`,
        ],
      };

      continue;
    }

    resultadoAtual = aplicarRegraValidada({
      regra: regraValidada.data,

      conhecimento,

      entrada,

      resultado: resultadoAtual,
    });
  }

  return resultadoAtual;
}
