import type { Atendimento } from "@/core/ia/atendimento/sessao/Atendimento";
import { prisma } from "@/lib/prisma";

export type ResultadoCriacaoTeleAtendimento = {
  atendimento: Atendimento;

  teleId: string;

  criada: boolean;

  mensagem: string;
};

function converterTipoParada(tipo: string): "ENTREGA" | "COLETA" | "TROCAR" | "ENTREGA_E_COLETA" {
  const normalizado = String(tipo || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();

  if (normalizado.includes("COLETA")) {
    return "COLETA";
  }

  if (normalizado.includes("TROCA") || normalizado.includes("TROCAR")) {
    return "TROCAR";
  }

  if (normalizado.includes("ENTREGA_E_COLETA") || normalizado.includes("ENTREGA E COLETA")) {
    return "ENTREGA_E_COLETA";
  }

  return "ENTREGA";
}

function definirTipoRota(atendimento: Atendimento) {
  const tipos = atendimento.operacao.paradas.map((parada) => converterTipoParada(parada.tipo));

  if (tipos.includes("ENTREGA_E_COLETA")) {
    return "Entrega e coleta";
  }

  if (tipos.includes("TROCAR")) {
    return "Trocar";
  }

  const possuiColeta = tipos.includes("COLETA");

  const possuiEntrega = tipos.includes("ENTREGA");

  if (possuiColeta && possuiEntrega) {
    return "Entrega";
  }

  if (possuiColeta) {
    return "Coleta";
  }

  return "Entrega";
}

function validarAtendimentoParaCriacao(atendimento: Atendimento) {
  const operacao = atendimento.operacao;

  if (!operacao.solicitante) {
    throw new Error("Não é possível criar a tele sem solicitante.");
  }

  if (!operacao.orcamentoConfirmado) {
    throw new Error("O orçamento ainda não foi confirmado pelo cliente.");
  }

  if (!operacao.rota.calculada) {
    throw new Error("A rota ainda não foi calculada.");
  }

  if (operacao.paradas.length < 2) {
    throw new Error("A tele precisa possuir pelo menos duas paradas.");
  }

  const paradaIncompleta = operacao.paradas.find((parada) => !parada.cliente || !parada.endereco);

  if (paradaIncompleta) {
    throw new Error("Existem paradas sem cliente ou endereço.");
  }

  const valor = operacao.rota.valorConfirmado ?? operacao.rota.valorSugerido;

  if (typeof valor !== "number" || valor <= 0) {
    throw new Error("O atendimento não possui um valor válido.");
  }
}

export async function criarTeleDoAtendimento(
  atendimento: Atendimento
): Promise<ResultadoCriacaoTeleAtendimento> {
  /*
   * Proteção contra criação duplicada.
   */
  if (atendimento.operacao.teleId && atendimento.operacao.teleCriada) {
    return {
      atendimento,

      teleId: atendimento.operacao.teleId,

      criada: false,

      mensagem: "A tele deste atendimento já havia sido criada.",
    };
  }

  validarAtendimentoParaCriacao(atendimento);

  const solicitante = atendimento.operacao.solicitante;

  if (!solicitante) {
    throw new Error("Solicitante não identificado.");
  }

  const cliente = await prisma.cliente.findFirst({
    where: {
      nome: solicitante,
    },

    select: {
      id: true,
      formaCobranca: true,
    },
  });

  const valorTotal =
    atendimento.operacao.rota.valorConfirmado ?? atendimento.operacao.rota.valorSugerido ?? 0;

  const valorRetorno = atendimento.operacao.temRetorno ? 5 : 0;

  /*
   * O valor sugerido da rota já inclui o retorno.
   * Por isso retiramos os R$ 5 do valorBase,
   * mantendo o total final inalterado.
   */
  const valorBase = Math.max(0, valorTotal - valorRetorno);

  const tele = await prisma.tele.create({
    data: {
      clienteId: cliente?.id ?? null,

      solicitante,

      motoboyId: null,

      motoboyNome: "",

      status: "AGUARDANDO_MOTOBOY",

      tipoRota: definirTipoRota(atendimento),

      valorBase,

      retorno: valorRetorno,

      espera: 0,

      total: valorTotal,

      distanciaKm: atendimento.operacao.rota.distanciaKm,

      tempoMinutos: atendimento.operacao.rota.duracaoMin,

      recebimento: "PENDENTE",

      formaCobranca: cliente?.formaCobranca ?? "SEMANAL",

      valorRecebido: 0,

      motoboyRecebedor: null,

      fechamentoId: null,

      observacaoGeral: atendimento.operacao.observacaoGeral || "",

      dataTele: new Date(),

      paradas: {
        create: atendimento.operacao.paradas.map((parada, index) => ({
          tipo: converterTipoParada(parada.tipo),

          cliente: parada.cliente || "",

          endereco: parada.endereco || "",

          contato: parada.telefone || "",

          observacao: "",

          ordem: index + 1,
        })),
      },
    },

    select: {
      id: true,
    },
  });

  const atendimentoAtualizado: Atendimento = {
    ...atendimento,

    atualizadoEm: new Date().toISOString(),

    status: "AGUARDANDO_MOTOBOY",

    operacao: {
      ...atendimento.operacao,

      teleId: tele.id,

      teleCriada: true,
    },

    estado: {
      etapa: "AGUARDANDO_MOTOBOY",

      aguardando: "RESPOSTA_MOTOBOY",

      ultimaAcao: "A tele foi criada no Express Manager.",

      proximaAcao: "Selecionar e atribuir um motoboy.",

      motivo: "A tele foi criada e ainda não possui motoboy atribuído.",

      precisaHumano: false,
    },
  };

  return {
    atendimento: atendimentoAtualizado,

    teleId: tele.id,

    criada: true,

    mensagem: `Tele criada com sucesso: ${tele.id}.`,
  };
}
