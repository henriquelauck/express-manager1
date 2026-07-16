export type StatusDecisaoIA =
  | "OK"
  | "PENDENTE"
  | "SUGERIDO"
  | "NAO_APLICAVEL";

export type TipoDecisaoIA =
  | "INTENCAO"
  | "SOLICITANTE"
  | "PARADA"
  | "MOTOBOY";

export type DecisaoIA = {
  tipo: TipoDecisaoIA;
  status: StatusDecisaoIA;
  resultado: string | null;
  confianca: number | null;
  motivo: string;
  referencia?: string;
};

type ParadaParaDecisao = {
  tipo: string;
  texto: string;
  cliente: string | null;
  confianca: number;
  endereco?: string | null;
};

type MotoboyParaDecisao = {
  nome: string;
  score: number;
  motivo: string;
} | null;

type GerarDecisoesParams = {
  intencao: string;

  solicitanteInformado: string | null;
  solicitanteReconhecido: string | null;
  confiancaSolicitante: number;

  paradas: ParadaParaDecisao[];

  motoboySugerido: MotoboyParaDecisao;
};

export function gerarDecisoes({
  intencao,
  solicitanteInformado,
  solicitanteReconhecido,
  confiancaSolicitante,
  paradas,
  motoboySugerido,
}: GerarDecisoesParams): DecisaoIA[] {
  const decisoes: DecisaoIA[] = [];

  decisoes.push({
    tipo: "INTENCAO",
    status:
      intencao === "CRIAR_TELE"
        ? "OK"
        : "NAO_APLICAVEL",
    resultado: intencao,
    confianca: null,
    motivo:
      intencao === "CRIAR_TELE"
        ? "A mensagem foi interpretada como uma solicitação de criação de tele."
        : `A intenção identificada foi "${intencao}".`,
  });

  if (solicitanteReconhecido) {
    decisoes.push({
      tipo: "SOLICITANTE",
      status: "OK",
      resultado: solicitanteReconhecido,
      confianca: confiancaSolicitante,
      motivo:
        "O solicitante foi localizado no cadastro de clientes com confiança suficiente.",
    });
  } else {
    decisoes.push({
      tipo: "SOLICITANTE",
      status: "PENDENTE",
      resultado: null,
      confianca: confiancaSolicitante,
      motivo: solicitanteInformado
        ? `O solicitante informado como "${solicitanteInformado}" não foi identificado com segurança.`
        : "Nenhum solicitante foi identificado na mensagem.",
    });
  }

  paradas.forEach((parada, index) => {
    const referencia = `${index + 1}. ${parada.tipo}`;

    if (!parada.cliente) {
      decisoes.push({
        tipo: "PARADA",
        status: "PENDENTE",
        resultado: null,
        confianca: parada.confianca,
        referencia,
        motivo: `O local informado como "${parada.texto}" não foi associado com segurança a um cliente cadastrado.`,
      });

      return;
    }

    if (!parada.endereco) {
      decisoes.push({
        tipo: "PARADA",
        status: "PENDENTE",
        resultado: parada.cliente,
        confianca: parada.confianca,
        referencia,
        motivo: `O cliente "${parada.cliente}" foi reconhecido, mas não possui endereço principal disponível.`,
      });

      return;
    }

    decisoes.push({
      tipo: "PARADA",
      status: "OK",
      resultado: parada.cliente,
      confianca: parada.confianca,
      referencia,
      motivo: `O cliente "${parada.cliente}" e seu endereço principal foram encontrados no cadastro.`,
    });
  });

  if (motoboySugerido) {
    decisoes.push({
      tipo: "MOTOBOY",
      status: "SUGERIDO",
      resultado: motoboySugerido.nome,
      confianca: normalizarScore(
        motoboySugerido.score
      ),
      motivo: motoboySugerido.motivo,
    });
  } else {
    decisoes.push({
      tipo: "MOTOBOY",
      status: "PENDENTE",
      resultado: null,
      confianca: null,
      motivo:
        "Nenhum motoboy pôde ser sugerido neste momento.",
    });
  }

  return decisoes;
}

function normalizarScore(score: number) {
  if (score > 1) {
    return Math.min(score / 100, 1);
  }

  return Math.max(score, 0);
}