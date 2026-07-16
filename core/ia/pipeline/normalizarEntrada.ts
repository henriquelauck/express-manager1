export type EntradaPipelineIA = {
  mensagem: string;
  telefoneRemetente: string;
};

export class ErroEntradaPipelineIA extends Error {
  status: number;

  constructor(mensagem: string, status = 400) {
    super(mensagem);

    this.name = "ErroEntradaPipelineIA";
    this.status = status;
  }
}

export function normalizarEntradaPipelineIA(
  body: unknown
): EntradaPipelineIA {
  if (
    typeof body !== "object" ||
    body === null
  ) {
    throw new ErroEntradaPipelineIA(
      "Corpo da requisição inválido."
    );
  }

  const dados = body as {
    mensagem?: unknown;
    telefoneRemetente?: unknown;
  };

  if (
    typeof dados.mensagem !== "string" ||
    !dados.mensagem.trim()
  ) {
    throw new ErroEntradaPipelineIA(
      "Mensagem não informada."
    );
  }

  const telefoneRemetente =
    typeof dados.telefoneRemetente === "string"
      ? dados.telefoneRemetente.trim()
      : "";

  return {
    mensagem: dados.mensagem.trim(),
    telefoneRemetente,
  };
}