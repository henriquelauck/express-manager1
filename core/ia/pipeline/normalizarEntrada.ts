export type ItemHistoricoPipelineIA = {
  autor: string;
  direcao: string;
  horario: string;
  conteudo: string;
};

export type EntradaPipelineIA = {
  mensagem: string;
  telefoneRemetente: string;
  historico: ItemHistoricoPipelineIA[];
};

export class ErroEntradaPipelineIA extends Error {
  status: number;

  constructor(mensagem: string, status = 400) {
    super(mensagem);

    this.name = "ErroEntradaPipelineIA";
    this.status = status;
  }
}

function normalizarHistorico(valor: unknown): ItemHistoricoPipelineIA[] {
  if (!Array.isArray(valor)) {
    return [];
  }

  return valor
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => ({
      autor: typeof item.autor === "string" ? item.autor.trim() : "DESCONHECIDO",

      direcao: typeof item.direcao === "string" ? item.direcao.trim() : "",

      horario: typeof item.horario === "string" ? item.horario.trim() : "",

      conteudo: typeof item.conteudo === "string" ? item.conteudo.trim() : "",
    }))
    .filter((item) => Boolean(item.conteudo));
}

export function normalizarEntradaPipelineIA(body: unknown): EntradaPipelineIA {
  if (typeof body !== "object" || body === null) {
    throw new ErroEntradaPipelineIA("Corpo da requisição inválido.");
  }

  const dados = body as {
    mensagem?: unknown;
    telefoneRemetente?: unknown;
    historico?: unknown;
  };

  if (typeof dados.mensagem !== "string" || !dados.mensagem.trim()) {
    throw new ErroEntradaPipelineIA("Mensagem não informada.");
  }

  const telefoneRemetente =
    typeof dados.telefoneRemetente === "string" ? dados.telefoneRemetente.trim() : "";

  const historico = normalizarHistorico(dados.historico);

  return {
    mensagem: dados.mensagem.trim(),
    telefoneRemetente,
    historico,
  };
}
