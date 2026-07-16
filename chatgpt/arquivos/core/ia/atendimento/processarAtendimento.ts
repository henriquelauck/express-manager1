import { resolverLocalRecorrente } from "@/core/ia/historico/resolverLocalRecorrente";
import { prisma } from "@/lib/prisma";
import { interpretarRespostaContextual } from "./interpretarRespostaContextual";
import {
  adicionarMensagemAtendimento,
  type Atendimento,
  type EstadoAtendimento,
  type MensagemAtendimento,
  type OrigemDadoAtendimento,
  type ParadaAtendimento,
  type StatusAtendimento,
} from "./sessao/Atendimento";
import { atualizarAtendimento } from "./sessao/atualizarAtendimento";

import { resolverClienteContextual } from "./resolverClienteContextual";
import { validarRespostaContextual } from "./validarRespostaContextual";

type ResultadoInterpretacaoAtendimento = {
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

type ProcessarAtendimentoParams = {
  atendimento: Atendimento;

  mensagemCliente: string;

  resultadoInterpretacao: ResultadoInterpretacaoAtendimento;

  respostaAgente?: string | null;
};

export type ResultadoProcessamentoAtendimento = {
  atendimento: Atendimento;

  estadoAnterior: EstadoAtendimento;

  estadoAtual: EstadoAtendimento;

  alterouEtapa: boolean;
};

function criarIdMensagem() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function criarMensagemCliente(conteudo: string): MensagemAtendimento {
  return {
    id: criarIdMensagem(),

    autor: "CLIENTE",

    tipo: "TEXTO",

    conteudo,

    criadaEm: new Date().toISOString(),
  };
}

function criarMensagemAgente(conteudo: string, estado: EstadoAtendimento): MensagemAtendimento {
  return {
    id: criarIdMensagem(),

    autor: "AGENTE",

    tipo: estado.aguardando !== null ? "PERGUNTA" : "AVISO",

    conteudo,

    criadaEm: new Date().toISOString(),
  };
}

function normalizarTipoParada(tipo: string) {
  return String(tipo || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function normalizarTexto(texto: string) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function referenciaAoSolicitante(texto: string) {
  const textoNormalizado = normalizarTexto(texto);

  const referencias = new Set([
    "aqui",
    "aqui na loja",
    "aqui na empresa",
    "aqui na clinica",
    "na loja",
    "na nossa loja",
    "nossa loja",
    "na empresa",
    "na nossa empresa",
    "nossa empresa",
    "na clinica",
    "na nossa clinica",
    "nossa clinica",
    "meu endereco",
    "nosso endereco",
    "no meu endereco",
    "no nosso endereco",
  ]);

  return referencias.has(textoNormalizado);
}

function encontrarParada(paradas: ParadaAtendimento[], tipo: "COLETA" | "ENTREGA") {
  return paradas.find((parada) => {
    const tipoNormalizado = normalizarTipoParada(parada.tipo);

    return tipoNormalizado.includes(tipo);
  });
}

function paradaCompleta(parada: ParadaAtendimento | undefined) {
  return Boolean(parada?.cliente && parada?.endereco);
}

function encontrarParadaSemEndereco(paradas: ParadaAtendimento[]) {
  return paradas.find((parada) => Boolean(parada.cliente) && !parada.endereco);
}

function definirEstadoAtendimento(atendimento: Atendimento): {
  estado: EstadoAtendimento;
  status: StatusAtendimento;
} {
  const operacao = atendimento.operacao;

  if (!operacao.solicitante) {
    return {
      status: "AGUARDANDO_CLIENTE",

      estado: {
        etapa: "IDENTIFICANDO_SOLICITANTE",

        aguardando: "SOLICITANTE",

        ultimaAcao: "A nova mensagem foi adicionada ao atendimento.",

        proximaAcao: "Identificar o solicitante pelo telefone do remetente.",

        motivo: "O solicitante ainda não foi identificado.",

        precisaHumano: false,
      },
    };
  }

  if (operacao.intencao !== "CRIAR_TELE") {
    return {
      status: "AGUARDANDO_CLIENTE",

      estado: {
        etapa: "INTERPRETANDO_PEDIDO",

        aguardando: null,

        ultimaAcao: "A mensagem foi interpretada.",

        proximaAcao: "Solicitar que o cliente explique a operação desejada.",

        motivo: "A intenção de criar uma tele ainda não foi confirmada.",

        precisaHumano: false,
      },
    };
  }

  const coleta = encontrarParada(operacao.paradas, "COLETA");

  const entrega = encontrarParada(operacao.paradas, "ENTREGA");

  if (!coleta?.cliente) {
    return {
      status: "AGUARDANDO_CLIENTE",

      estado: {
        etapa: "AGUARDANDO_COLETA",

        aguardando: "COLETA",

        ultimaAcao: "O pedido foi interpretado parcialmente.",

        proximaAcao: "Perguntar ao cliente onde será feita a coleta.",

        motivo: "O local de coleta ainda não foi identificado.",

        precisaHumano: false,
      },
    };
  }

  if (!entrega?.cliente) {
    return {
      status: "AGUARDANDO_CLIENTE",

      estado: {
        etapa: "AGUARDANDO_ENTREGA",

        aguardando: "ENTREGA",

        ultimaAcao: "O local de coleta foi identificado.",

        proximaAcao: "Perguntar ao cliente onde será feita a entrega.",

        motivo: "O local de entrega ainda não foi identificado.",

        precisaHumano: false,
      },
    };
  }

  const paradaSemEndereco = encontrarParadaSemEndereco(operacao.paradas);

  if (paradaSemEndereco) {
    const aguardando = paradaSemEndereco.tipo === "COLETA" ? "ENDERECO_COLETA" : "ENDERECO_ENTREGA";

    return {
      status: "AGUARDANDO_CLIENTE",

      estado: {
        etapa: "AGUARDANDO_ENDERECO",

        aguardando,

        ultimaAcao: "O cliente da parada foi identificado.",

        proximaAcao: `Solicitar o endereço de ${paradaSemEndereco.tipo.toLowerCase()}.`,

        motivo: `O cliente "${paradaSemEndereco.cliente}" não possui endereço disponível.`,

        precisaHumano: false,
      },
    };
  }

  if (paradaCompleta(coleta) && paradaCompleta(entrega) && !operacao.rota.calculada) {
    return {
      status: "AGUARDANDO_SISTEMA",

      estado: {
        etapa: "PRONTO_PARA_CALCULAR_ROTA",

        aguardando: null,

        ultimaAcao: "Coleta e entrega foram identificadas.",

        proximaAcao: "Calcular distância, tempo e valor da rota.",

        motivo: "As informações necessárias para calcular a rota estão completas.",

        precisaHumano: false,
      },
    };
  }

  if (operacao.rota.calculada && !operacao.orcamentoConfirmado) {
    return {
      status: "AGUARDANDO_CLIENTE",

      estado: {
        etapa: "AGUARDANDO_CONFIRMACAO_ORCAMENTO",

        aguardando: "CONFIRMACAO_ORCAMENTO",

        ultimaAcao: "A rota e o valor foram calculados.",

        proximaAcao: "Apresentar o orçamento e aguardar a confirmação do cliente.",

        motivo: "O orçamento ainda não foi confirmado.",

        precisaHumano: false,
      },
    };
  }

  if (operacao.orcamentoConfirmado && !operacao.teleCriada) {
    return {
      status: "AGUARDANDO_SISTEMA",

      estado: {
        etapa: "PRONTO_PARA_CRIAR_TELE",

        aguardando: null,

        ultimaAcao: "O cliente confirmou o orçamento.",

        proximaAcao: "Criar a tele no Express Manager.",

        motivo: "O pedido está completo e autorizado.",

        precisaHumano: false,
      },
    };
  }

  if (operacao.teleCriada && !operacao.motoboy.atribuido) {
    return {
      status: "AGUARDANDO_MOTOBOY",

      estado: {
        etapa: "AGUARDANDO_MOTOBOY",

        aguardando: "RESPOSTA_MOTOBOY",

        ultimaAcao: "A tele foi criada.",

        proximaAcao: "Selecionar e confirmar um motoboy.",

        motivo: "A tele ainda não foi atribuída.",

        precisaHumano: false,
      },
    };
  }

  if (operacao.teleCriada && operacao.motoboy.atribuido) {
    return {
      status: "ATIVO",

      estado: {
        etapa: "EM_ACOMPANHAMENTO",

        aguardando: null,

        ultimaAcao: "A tele foi atribuída ao motoboy.",

        proximaAcao: "Acompanhar o andamento da entrega.",

        motivo: "A operação está em andamento.",

        precisaHumano: false,
      },
    };
  }

  return {
    status: "ATIVO",

    estado: {
      etapa: "INTERPRETANDO_PEDIDO",

      aguardando: null,

      ultimaAcao: "O atendimento foi atualizado.",

      proximaAcao: "Continuar avaliando o estado da operação.",

      motivo: "O atendimento ainda não alcançou uma etapa operacional conhecida.",

      precisaHumano: false,
    },
  };
}

async function enriquecerParadasComCadastro(atendimento: Atendimento): Promise<Atendimento> {
  const clientes = await prisma.cliente.findMany({
    select: {
      id: true,
      nome: true,
      telefone: true,
      endereco1: true,
      endereco2: true,
    },
  });

  const origemBanco: OrigemDadoAtendimento = "BANCO_DE_DADOS";

  const solicitante = atendimento.operacao.solicitante;

  const novasParadas: ParadaAtendimento[] = await Promise.all(
    atendimento.operacao.paradas.map(async (parada): Promise<ParadaAtendimento> => {
      if (parada.endereco || !parada.cliente) {
        return parada;
      }

      const textoParaResolver =
        solicitante && referenciaAoSolicitante(parada.cliente) ? solicitante : parada.cliente;

      const resultado = resolverClienteContextual({
        texto: textoParaResolver,
        clientes,
      });

      if (resultado.encontrado && resultado.cliente) {
        return {
          ...parada,

          cliente: resultado.cliente.nome,

          endereco: resultado.cliente.endereco1 ?? resultado.cliente.endereco2 ?? null,

          telefone: resultado.cliente.telefone ?? null,

          confianca: resultado.confianca,

          origem: origemBanco,
        };
      }

      if (!solicitante) {
        return parada;
      }

      const historico = await resolverLocalRecorrente({
        solicitante,

        textoLocal: textoParaResolver,

        tipo: parada.tipo === "COLETA" || parada.tipo === "ENTREGA" ? parada.tipo : undefined,
      });

      if (!historico.encontrado || !historico.cliente || !historico.endereco) {
        return parada;
      }

      return {
        ...parada,

        cliente: historico.cliente,

        endereco: historico.endereco,

        telefone: historico.telefone,

        confianca: historico.confianca,

        origem: "HISTORICO_SOLICITANTE",
      };
    })
  );

  const coletaExistente = novasParadas.find((parada) => parada.tipo === "COLETA");

  const entregaExistente = novasParadas.find((parada) => parada.tipo === "ENTREGA");

  let paradasFinais = novasParadas;

  const nomeSolicitanteNormalizado = String(solicitante || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();

  const solicitanteEhPetexame = nomeSolicitanteNormalizado === "PETEXAME";

  const resultadoSolicitante = solicitante
    ? resolverClienteContextual({
        texto: solicitante,
        clientes,
      })
    : null;

  const clienteSolicitante = resultadoSolicitante?.cliente ?? null;

  const enderecoSolicitante =
    clienteSolicitante?.endereco1 ?? clienteSolicitante?.endereco2 ?? null;

  /*
   * Regra específica da PETEXAME:
   *
   * Quando a PETEXAME envia somente um local/endereço,
   * significa que o motoboy deve coletar nesse local
   * e entregar na PETEXAME.
   *
   * Exemplo:
   * "SOS ANIMAL
   * Rua..."
   *
   * Resultado:
   * 1. COLETA — SOS ANIMAL
   * 2. ENTREGA — PETEXAME
   */
  if (
    solicitanteEhPetexame &&
    novasParadas.length === 1 &&
    !coletaExistente &&
    entregaExistente &&
    resultadoSolicitante?.encontrado &&
    clienteSolicitante &&
    enderecoSolicitante
  ) {
    const coletaExterna: ParadaAtendimento = {
      ...entregaExistente,

      tipo: "COLETA",

      textoOriginal: entregaExistente.textoOriginal,

      origem: entregaExistente.origem ?? "CONTEXTO_OPERACIONAL",

      confirmada: true,
    };

    const entregaPetexame: ParadaAtendimento = {
      tipo: "ENTREGA",

      textoOriginal: "Entrega final inferida automaticamente na PETEXAME.",

      cliente: clienteSolicitante.nome,

      endereco: enderecoSolicitante,

      telefone: clienteSolicitante.telefone ?? null,

      confianca: 1,

      origem: "CONTEXTO_OPERACIONAL",

      confirmada: true,
    };

    paradasFinais = [coletaExterna, entregaPetexame];
  }

  /*
   * Regra geral para os demais solicitantes:
   *
   * Quando existe somente uma entrega, a coleta é
   * inferida automaticamente no próprio solicitante.
   */
  if (
    !solicitanteEhPetexame &&
    solicitante &&
    novasParadas.length === 1 &&
    !coletaExistente &&
    entregaExistente &&
    resultadoSolicitante?.encontrado &&
    clienteSolicitante &&
    enderecoSolicitante
  ) {
    const coletaInferida: ParadaAtendimento = {
      tipo: "COLETA",

      textoOriginal: "Coleta inferida automaticamente no solicitante.",

      cliente: clienteSolicitante.nome,

      endereco: enderecoSolicitante,

      telefone: clienteSolicitante.telefone ?? null,

      confianca: 1,

      origem: "CONTEXTO_OPERACIONAL",

      confirmada: true,
    };

    paradasFinais = [coletaInferida, ...novasParadas];
  }

  return {
    ...atendimento,

    operacao: {
      ...atendimento.operacao,

      paradas: paradasFinais,
    },
  };
}

export async function processarAtendimento({
  atendimento,
  mensagemCliente,
  resultadoInterpretacao,
  respostaAgente,
}: ProcessarAtendimentoParams): Promise<ResultadoProcessamentoAtendimento> {
  const estadoAnterior = atendimento.estado;

  let atendimentoAtualizado = adicionarMensagemAtendimento(
    atendimento,
    criarMensagemCliente(mensagemCliente)
  );

  const validacaoContextual = validarRespostaContextual(atendimentoAtualizado, mensagemCliente);

  const respostaContextual = interpretarRespostaContextual(atendimentoAtualizado, mensagemCliente);

  if (validacaoContextual.valida && respostaContextual.consumida) {
    const paradas = [...atendimentoAtualizado.operacao.paradas];

    if (respostaContextual.atualizacoes.coleta) {
      const coleta = paradas.find((parada) => parada.tipo === "COLETA");

      if (coleta) {
        Object.assign(coleta, respostaContextual.atualizacoes.coleta);
      } else {
        paradas.push({
          tipo: "COLETA",
          textoOriginal: mensagemCliente,
          cliente: respostaContextual.atualizacoes.coleta.cliente ?? null,
          endereco: null,
          telefone: null,
          confianca: 1,
          origem: "CONFIRMACAO_CLIENTE",
          confirmada: true,
        });
      }
    }

    if (respostaContextual.atualizacoes.entrega) {
      const entrega = paradas.find((parada) => parada.tipo === "ENTREGA");

      if (entrega) {
        Object.assign(entrega, respostaContextual.atualizacoes.entrega);
      } else {
        paradas.push({
          tipo: "ENTREGA",
          textoOriginal: mensagemCliente,
          cliente: respostaContextual.atualizacoes.entrega.cliente ?? null,
          endereco: null,
          telefone: null,
          confianca: 1,
          origem: "CONFIRMACAO_CLIENTE",
          confirmada: true,
        });
      }
    }

    atendimentoAtualizado = {
      ...atendimentoAtualizado,

      operacao: {
        ...atendimentoAtualizado.operacao,

        paradas,

        temRetorno:
          respostaContextual.atualizacoes.temRetorno ?? atendimentoAtualizado.operacao.temRetorno,

        orcamentoConfirmado:
          respostaContextual.atualizacoes.orcamentoConfirmado ??
          atendimentoAtualizado.operacao.orcamentoConfirmado,
      },
    };
  }

  if (!validacaoContextual.valida || !respostaContextual.consumida) {
    atendimentoAtualizado = atualizarAtendimento(atendimentoAtualizado, resultadoInterpretacao);
  }

  atendimentoAtualizado = await enriquecerParadasComCadastro(atendimentoAtualizado);

  const estadoResolvido = definirEstadoAtendimento(atendimentoAtualizado);

  atendimentoAtualizado = {
    ...atendimentoAtualizado,

    atualizadoEm: new Date().toISOString(),

    status: estadoResolvido.status,

    estado: estadoResolvido.estado,
  };

  if (respostaAgente?.trim()) {
    atendimentoAtualizado = adicionarMensagemAtendimento(
      atendimentoAtualizado,
      criarMensagemAgente(respostaAgente.trim(), estadoResolvido.estado)
    );
  }

  return {
    atendimento: atendimentoAtualizado,

    estadoAnterior,

    estadoAtual: atendimentoAtualizado.estado,

    alterouEtapa: estadoAnterior.etapa !== atendimentoAtualizado.estado.etapa,
  };
}
