import type { Atendimento, ParadaAtendimento } from "./sessao/Atendimento";

export type ResultadoRespostaContextual = {
  consumida: boolean;

  atualizacoes: {
    coleta?: Partial<ParadaAtendimento>;

    entrega?: Partial<ParadaAtendimento>;

    temRetorno?: boolean;

    orcamentoConfirmado?: boolean;
  };
};

function normalizarTexto(texto: string) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function limparLocal(texto: string) {
  return String(texto || "")
    .trim()
    .replace(/^[,;:\-\s]+/, "")
    .replace(/[,;:\-\s]+$/, "")
    .replace(/^(?:é|e|fica|deve ser feita|deve ser feito)\s+/i, "")
    .replace(/^(?:na|no|em|para|pra)\s+/i, "")
    .trim();
}

function pareceEndereco(texto: string) {
  const textoNormalizado = normalizarTexto(texto);

  const indicadores = [
    "rua ",
    "avenida ",
    "av ",
    "travessa ",
    "estrada ",
    "rodovia ",
    "r ",
    "cep ",
  ];

  return (
    /\d/.test(textoNormalizado) ||
    indicadores.some((indicador) => textoNormalizado.startsWith(indicador))
  );
}

function criarAtualizacaoLocal(texto: string): Partial<ParadaAtendimento> | undefined {
  const local = limparLocal(texto);

  if (!local) {
    return undefined;
  }

  if (pareceEndereco(local)) {
    return {
      cliente: local,
      endereco: local,
      telefone: null,
      confianca: 1,
      origem: "CONFIRMACAO_CLIENTE",
      confirmada: true,
      textoOriginal: local,
    };
  }

  return {
    cliente: local,
    endereco: null,
    telefone: null,
    confianca: 1,
    origem: "CONFIRMACAO_CLIENTE",
    confirmada: true,
    textoOriginal: local,
  };
}

function extrairColeta(mensagem: string): Partial<ParadaAtendimento> | undefined {
  const correspondencia = mensagem.match(
    /(?:coleta|coletar|buscar|busca|pegar|pega|retirar|retira)\s+(?:deve\s+ser\s+feita\s+)?(?:é\s+|e\s+)?(.+?)(?=\s*(?:,|;)?\s*(?:e\s+)?(?:a\s+)?(?:entrega|entregar|leva|levar)\b|$)/i
  );

  return correspondencia?.[1] ? criarAtualizacaoLocal(correspondencia[1]) : undefined;
}

function extrairEntrega(mensagem: string): Partial<ParadaAtendimento> | undefined {
  const correspondencia = mensagem.match(
    /(?:entrega|entregar|leva|levar)\s+(?:deve\s+ser\s+feita\s+)?(?:é\s+|e\s+)?(.+?)(?=\s*(?:,|;)?\s*(?:e\s+)?(?:com\s+)?retorno\b|$)/i
  );

  return correspondencia?.[1] ? criarAtualizacaoLocal(correspondencia[1]) : undefined;
}

function extrairRetorno(mensagem: string): boolean | undefined {
  const texto = normalizarTexto(mensagem);

  if (/\b(?:sem retorno|nao tem retorno|nao precisa retornar)\b/.test(texto)) {
    return false;
  }

  if (/\b(?:com retorno|tem retorno|e retorno|precisa retornar|trazer de volta)\b/.test(texto)) {
    return true;
  }

  return undefined;
}

function interpretarConfirmacaoOrcamento(mensagem: string) {
  const resposta = normalizarTexto(mensagem);

  const confirmacoes = [
    "sim",
    "ok",
    "pode",
    "pode fazer",
    "fechado",
    "confirmo",
    "segue",
    "pode seguir",
    "pode confirmar",
  ];

  return confirmacoes.some(
    (confirmacao) => resposta === confirmacao || resposta.startsWith(`${confirmacao} `)
  );
}

export function interpretarRespostaContextual(
  atendimento: Atendimento,
  mensagem: string
): ResultadoRespostaContextual {
  const texto = mensagem.trim();

  if (!texto) {
    return {
      consumida: false,
      atualizacoes: {},
    };
  }

  if (atendimento.estado.aguardando === "CONFIRMACAO_ORCAMENTO") {
    const confirmou = interpretarConfirmacaoOrcamento(texto);

    if (!confirmou) {
      return {
        consumida: false,
        atualizacoes: {},
      };
    }

    return {
      consumida: true,

      atualizacoes: {
        orcamentoConfirmado: true,
      },
    };
  }

  const coletaExtraida = extrairColeta(texto);

  const entregaExtraida = extrairEntrega(texto);

  const temRetorno = extrairRetorno(texto);

  const atualizacoes: ResultadoRespostaContextual["atualizacoes"] = {};

  if (coletaExtraida) {
    atualizacoes.coleta = coletaExtraida;
  }

  if (entregaExtraida) {
    atualizacoes.entrega = entregaExtraida;
  }

  if (temRetorno !== undefined) {
    atualizacoes.temRetorno = temRetorno;
  }

  /*
   * Se a frase não informou explicitamente coleta
   * ou entrega, usamos o estado atual como contexto.
   *
   * Exemplos:
   * AGUARDANDO_COLETA + "Na SaveCell"
   * AGUARDANDO_ENTREGA + "Hardware"
   */
  if (!coletaExtraida && !entregaExtraida) {
    if (atendimento.estado.aguardando === "COLETA") {
      atualizacoes.coleta = criarAtualizacaoLocal(texto);
    }

    if (atendimento.estado.aguardando === "ENTREGA") {
      atualizacoes.entrega = criarAtualizacaoLocal(texto);
    }
  }

  const consumida =
    Boolean(atualizacoes.coleta) || Boolean(atualizacoes.entrega) || temRetorno !== undefined;

  return {
    consumida,
    atualizacoes,
  };
}
