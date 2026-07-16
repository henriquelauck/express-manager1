import type { Atendimento } from "./sessao/Atendimento";
import { validarRespostaContextual } from "./validarRespostaContextual";

export type TipoFluxoMensagem =
  "NOVO_ATENDIMENTO" | "CONTINUAR_ATENDIMENTO" | "INTERPRETAR_NORMALMENTE";

export type DecisaoFluxoMensagem = {
  tipo: TipoFluxoMensagem;

  motivo: string;

  possuiAtendimentoAtivo: boolean;

  respostaContextualValida: boolean;
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

function parecePedidoNovoExplicito(mensagem: string) {
  const texto = normalizarTexto(mensagem);

  const expressoes = [
    "nova tele",
    "outra tele",
    "outro pedido",
    "novo pedido",
    "preciso de outra tele",
    "preciso de um motoboy",
    "chamar outro motoboy",
    "buscar ",
    "coletar ",
    "retirar ",
    "pegar ",
    "entregar ",
    "levar ",
  ];

  return expressoes.some((expressao) => texto.startsWith(expressao));
}

function atendimentoEstaEncerrado(atendimento: Atendimento) {
  return ["FINALIZADO", "CANCELADO", "TRANSFERIDO"].includes(atendimento.status);
}

export function decidirFluxoMensagem({
  atendimento,
  mensagem,
}: {
  atendimento: Atendimento | null;
  mensagem: string;
}): DecisaoFluxoMensagem {
  if (!atendimento) {
    return {
      tipo: "NOVO_ATENDIMENTO",

      motivo: "Não existe atendimento ativo para o remetente.",

      possuiAtendimentoAtivo: false,

      respostaContextualValida: false,
    };
  }

  if (atendimentoEstaEncerrado(atendimento)) {
    return {
      tipo: "NOVO_ATENDIMENTO",

      motivo: "O atendimento anterior já foi encerrado.",

      possuiAtendimentoAtivo: true,

      respostaContextualValida: false,
    };
  }

  const validacaoContextual = validarRespostaContextual(atendimento, mensagem);

  if (validacaoContextual.valida) {
    return {
      tipo: "CONTINUAR_ATENDIMENTO",

      motivo: validacaoContextual.motivo,

      possuiAtendimentoAtivo: true,

      respostaContextualValida: true,
    };
  }

  if (parecePedidoNovoExplicito(mensagem)) {
    return {
      tipo: "NOVO_ATENDIMENTO",

      motivo: "A mensagem parece iniciar uma nova solicitação e não responde ao estado atual.",

      possuiAtendimentoAtivo: true,

      respostaContextualValida: false,
    };
  }

  return {
    tipo: "INTERPRETAR_NORMALMENTE",

    motivo:
      "Existe um atendimento ativo, mas a mensagem não corresponde claramente à informação aguardada.",

    possuiAtendimentoAtivo: true,

    respostaContextualValida: false,
  };
}
