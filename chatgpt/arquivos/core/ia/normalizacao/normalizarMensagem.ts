export type BlocoMensagemNormalizada = {
  nomeProvavel: string | null;

  enderecoProvavel: string | null;

  observacoes: string[];
};

export type ResultadoNormalizacaoMensagem = {
  mensagemOriginal: string;

  mensagemLimpa: string;

  blocos: BlocoMensagemNormalizada[];

  possuiBlocoOperacional: boolean;

  contextoParaIA: string;
};

function limparLinha(linha: string) {
  return String(linha || "")
    .replace(/^[\s|•\-–—>]+/, "")
    .replace(/[📍🏠🏥➡️➜👉]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function removerRotuloEndereco(linha: string) {
  return linha
    .replace(/^endere[cç]o\s*:\s*/i, "")
    .trim();
}

function pareceEndereco(texto: string) {
  const normalizado = texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  const possuiTipoLogradouro =
    /\b(rua|r\.|avenida|av\.|travessa|estrada|rodovia|alameda|praca|beco|br-|rs-)\b/i.test(
      normalizado
    );

  const possuiCep = /\b\d{5}-?\d{3}\b/.test(normalizado);

  const possuiNumero =
    /\b(numero|nº|n°)\s*\d+/i.test(normalizado) ||
    /,\s*\d+\b/.test(normalizado);

  return possuiTipoLogradouro || possuiCep || possuiNumero;
}

function separarBlocos(mensagem: string) {
  const linhasOriginais = mensagem.split(/\r?\n/);

  const grupos: string[][] = [];

  let grupoAtual: string[] = [];

  for (const linhaOriginal of linhasOriginais) {
    const linha = limparLinha(linhaOriginal);

    if (!linha) {
      if (grupoAtual.length > 0) {
        grupos.push(grupoAtual);
        grupoAtual = [];
      }

      continue;
    }

    grupoAtual.push(linha);
  }

  if (grupoAtual.length > 0) {
    grupos.push(grupoAtual);
  }

  return grupos;
}

function analisarBloco(linhas: string[]): BlocoMensagemNormalizada {
  let nomeProvavel: string | null = null;
  let enderecoProvavel: string | null = null;

  const observacoes: string[] = [];

  for (const linhaOriginal of linhas) {
    const linhaSemRotulo = removerRotuloEndereco(linhaOriginal);

    if (!enderecoProvavel && pareceEndereco(linhaSemRotulo)) {
      enderecoProvavel = linhaSemRotulo;
      continue;
    }

    if (!nomeProvavel) {
      nomeProvavel = linhaOriginal;
      continue;
    }

    observacoes.push(linhaOriginal);
  }

  return {
    nomeProvavel,

    enderecoProvavel,

    observacoes,
  };
}

function montarContextoParaIA(
  blocos: BlocoMensagemNormalizada[],
  possuiBlocoOperacional: boolean
) {
  if (blocos.length === 0) {
    return "Nenhum bloco estrutural foi identificado.";
  }

  const blocosFormatados = blocos
    .map((bloco, indice) => {
      const linhas = [
        `Bloco ${indice + 1}:`,
        `- Nome provável: ${bloco.nomeProvavel ?? "não identificado"}`,
        `- Endereço provável: ${bloco.enderecoProvavel ?? "não identificado"}`,
      ];

      if (bloco.observacoes.length > 0) {
        linhas.push(
          `- Observações: ${bloco.observacoes.join(" | ")}`
        );
      }

      return linhas.join("\n");
    })
    .join("\n\n");

  const regraBloco = possuiBlocoOperacional
    ? [
        "",
        "REGRA ESTRUTURAL:",
        "- Existe ao menos um bloco com nome e endereço.",
        "- Isso representa uma solicitação logística provável.",
        '- Use a intenção "CRIAR_TELE".',
        '- Quando houver um único bloco sem verbo, represente-o inicialmente como uma parada do tipo "Entrega".',
        "- Não invente outra parada.",
        "- O Motor Operacional decidirá posteriormente origem, destino e regras do solicitante.",
      ].join("\n")
    : "";

  return `${blocosFormatados}${regraBloco}`;
}

export function normalizarMensagem(
  mensagem: string
): ResultadoNormalizacaoMensagem {
  const grupos = separarBlocos(mensagem);

  const blocos = grupos.map(analisarBloco);

  const possuiBlocoOperacional = blocos.some(
    (bloco) => Boolean(bloco.nomeProvavel && bloco.enderecoProvavel)
  );

  const mensagemLimpa = mensagem
    .split(/\r?\n/)
    .map(limparLinha)
    .filter(Boolean)
    .join("\n");

  return {
    mensagemOriginal: mensagem,

    mensagemLimpa,

    blocos,

    possuiBlocoOperacional,

    contextoParaIA: montarContextoParaIA(
      blocos,
      possuiBlocoOperacional
    ),
  };
}