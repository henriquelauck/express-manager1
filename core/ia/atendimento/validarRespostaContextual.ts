import type { Atendimento, InformacaoAguardadaAtendimento } from "./sessao/Atendimento";

export type ResultadoValidacaoContextual = {
  valida: boolean;

  motivo: string;
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

function possuiAlgumaExpressao(texto: string, expressoes: string[]) {
  return expressoes.some((expressao) => texto.includes(expressao));
}

function pareceNovoPedido(texto: string) {
  const expressoesNovoPedido = [
    "buscar ",
    "busca ",
    "coletar ",
    "coleta ",
    "retirar ",
    "retira ",
    "pegar ",
    "pega ",
    "entregar ",
    "entrega ",
    "levar ",
    "leva ",
    "preciso de uma tele",
    "preciso de um motoboy",
    "chamar motoboy",
    "mandar motoboy",
    "nova tele",
    "outra tele",
    "outro pedido",
  ];

  return possuiAlgumaExpressao(texto, expressoesNovoPedido);
}

function mencionaColeta(texto: string) {
  const expressoes = [
    "coleta ",
    "coletar ",
    "buscar ",
    "busca ",
    "pegar ",
    "pega ",
    "retirar ",
    "retira ",
  ];

  return possuiAlgumaExpressao(texto, expressoes);
}

function mencionaEntrega(texto: string) {
  const expressoes = ["entrega ", "entregar ", "levar ", "leva "];

  return possuiAlgumaExpressao(texto, expressoes);
}

function mensagemRespondeAoContexto(aguardando: InformacaoAguardadaAtendimento, texto: string) {
  switch (aguardando) {
    case "COLETA":
      return mencionaColeta(texto);

    case "ENTREGA":
      return mencionaEntrega(texto);

    case "ENDERECO_COLETA":
    case "ENDERECO_ENTREGA":
      return pareceEndereco(texto);

    case "CONFIRMACAO_ORCAMENTO":
    case "CONFIRMACAO_TELE":
      return pareceConfirmacaoPositiva(texto) || pareceConfirmacaoNegativa(texto);

    default:
      return false;
  }
}

function pareceConfirmacaoPositiva(texto: string) {
  const confirmacoes = [
    "sim",
    "ok",
    "pode",
    "pode fazer",
    "pode seguir",
    "segue",
    "confirmo",
    "fechado",
    "manda",
    "pode mandar",
  ];

  return confirmacoes.some(
    (confirmacao) => texto === confirmacao || texto.startsWith(`${confirmacao} `)
  );
}

function pareceConfirmacaoNegativa(texto: string) {
  const negativas = [
    "nao",
    "não",
    "cancelar",
    "cancela",
    "deixa",
    "deixa pra la",
    "não precisa",
    "nao precisa",
  ].map(normalizarTexto);

  return negativas.some((negativa) => texto === negativa || texto.startsWith(`${negativa} `));
}

function pareceLocal(texto: string) {
  if (!texto) {
    return false;
  }

  if (pareceConfirmacaoPositiva(texto) || pareceConfirmacaoNegativa(texto)) {
    return false;
  }

  // restante continua igual

  if (pareceNovoPedido(texto) && !mencionaColeta(texto) && !mencionaEntrega(texto)) {
    return false;
  }

  if (pareceConfirmacaoPositiva(texto) || pareceConfirmacaoNegativa(texto)) {
    return false;
  }

  const indicadoresLocal = [
    "na ",
    "no ",
    "em ",
    "aqui",
    "loja",
    "empresa",
    "clinica",
    "clínica",
    "rua ",
    "avenida ",
    "av ",
    "travessa ",
    "estrada ",
    "rodovia ",
    "numero ",
    "número ",
  ].map(normalizarTexto);

  if (possuiAlgumaExpressao(texto, indicadoresLocal)) {
    return true;
  }

  /*
   * Respostas curtas como:
   * "SaveCell"
   * "Hardware"
   * "PetExame"
   *
   * podem representar um cliente ou local.
   */
  const quantidadePalavras = texto.split(" ").filter(Boolean).length;

  return quantidadePalavras >= 1 && quantidadePalavras <= 5 && texto.length <= 80;
}

function pareceEndereco(texto: string) {
  if (
    !texto ||
    pareceNovoPedido(texto) ||
    pareceConfirmacaoPositiva(texto) ||
    pareceConfirmacaoNegativa(texto)
  ) {
    return false;
  }

  const indicadoresEndereco = [
    "rua ",
    "avenida ",
    "av ",
    "travessa ",
    "estrada ",
    "rodovia ",
    "numero ",
    "número ",
    "bairro ",
    "cep ",
  ].map(normalizarTexto);

  const possuiNumero = /\d/.test(texto);

  return possuiNumero || possuiAlgumaExpressao(texto, indicadoresEndereco);
}

function validarPeloQueEstaAguardando(
  aguardando: InformacaoAguardadaAtendimento,
  texto: string
): ResultadoValidacaoContextual {
  switch (aguardando) {
    case "COLETA":
    case "ENTREGA":
      if (!pareceLocal(texto)) {
        return {
          valida: false,

          motivo:
            "A mensagem não parece informar um local e pode representar uma nova solicitação.",
        };
      }

      return {
        valida: true,

        motivo: "A mensagem parece informar o local solicitado pelo agente.",
      };

    case "ENDERECO_COLETA":
    case "ENDERECO_ENTREGA":
      if (!pareceEndereco(texto)) {
        return {
          valida: false,

          motivo: "A mensagem não parece conter um endereço completo.",
        };
      }

      return {
        valida: true,

        motivo: "A mensagem parece conter o endereço solicitado pelo agente.",
      };

    case "CONFIRMACAO_ORCAMENTO":
    case "CONFIRMACAO_TELE":
      if (!pareceConfirmacaoPositiva(texto) && !pareceConfirmacaoNegativa(texto)) {
        return {
          valida: false,

          motivo: "A mensagem não parece ser uma confirmação positiva ou negativa.",
        };
      }

      return {
        valida: true,

        motivo: "A mensagem parece responder à confirmação solicitada.",
      };

    case "SOLICITANTE":
      if (!texto || pareceNovoPedido(texto)) {
        return {
          valida: false,

          motivo: "A mensagem não parece identificar o solicitante.",
        };
      }

      return {
        valida: true,

        motivo: "A mensagem pode representar a identificação do solicitante.",
      };

    case "RESPOSTA_MOTOBOY":
      return {
        valida: true,

        motivo: "Existe uma resposta pendente do motoboy.",
      };

    default:
      return {
        valida: false,

        motivo: "O atendimento não está aguardando uma informação contextual.",
      };
  }
}

export function validarRespostaContextual(
  atendimento: Atendimento,
  mensagem: string
): ResultadoValidacaoContextual {
  const texto = normalizarTexto(mensagem);

  if (!texto) {
    return {
      valida: false,

      motivo: "A mensagem está vazia.",
    };
  }

  if (!atendimento.estado.aguardando) {
    return {
      valida: false,

      motivo: "O atendimento não está aguardando uma resposta específica.",
    };
  }

  const respondeAoContexto = mensagemRespondeAoContexto(atendimento.estado.aguardando, texto);

  if (pareceNovoPedido(texto) && !respondeAoContexto) {
    return {
      valida: false,

      motivo: "A mensagem parece iniciar uma nova solicitação e não contém a informação aguardada.",
    };
  }

  return validarPeloQueEstaAguardando(atendimento.estado.aguardando, texto);
}
