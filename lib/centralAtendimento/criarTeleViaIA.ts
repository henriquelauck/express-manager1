export type ParadaParaCriarTele = {
  tipo: string;
  texto?: string;
  textoOriginal?: string | null;
  cliente: string | null;
  endereco: string | null;
  telefone?: string | null;
};

export type AnaliseParaCriarTele = {
  solicitante: string | null;

  motoboySugerido: {
    nome: string;
  } | null;

  atendimento: {
    operacao: {
      rota: {
        distanciaKm: number | null;
        duracaoMin: number | null;
        valorSugerido: number | null;
        valorConfirmado: number | null;
      };

      paradas: ParadaParaCriarTele[];

      teleCriada: boolean;

      teleId: string | null;
    };
  };

  propostaOperacional: {
    status: "PRONTA_PARA_REVISAO" | "NECESSITA_CONFIRMACAO" | "DADOS_INSUFICIENTES";

    paradas: ParadaParaCriarTele[];

    pendencias: string[];
  };
};

export type TeleCriadaPelaIA = {
  id: string;
  solicitante: string;
  motoboyId?: string | null;
  motoboy?: string;
  status: string;
  tipoRota: string;
  valorBase: number;
  retorno: number;
  espera: number;
  total: number;
  distanciaKm?: number | null;
  tempoMinutos?: number | null;

  paradas: Array<{
    id?: string;
    tipo: string;
    cliente: string;
    endereco: string;
    contato?: string;
    observacao?: string;
  }>;
};

function converterTipoParada(tipo: string) {
  const normalizado = String(tipo).trim().toUpperCase().replaceAll(" ", "_");

  const mapa: Record<string, string> = {
    ENTREGA: "Entrega",
    COLETA: "Coleta",
    TROCAR: "Trocar",
    TROCA: "Trocar",
    ENTREGA_E_COLETA: "Entrega e coleta",
  };

  return mapa[normalizado] ?? "Entrega";
}

function determinarTipoRota(paradas: ParadaParaCriarTele[]) {
  if (paradas.length === 1) {
    return converterTipoParada(paradas[0].tipo);
  }

  const tipos = paradas.map((parada) => String(parada.tipo).toUpperCase());

  const possuiColeta = tipos.includes("COLETA");

  const possuiEntrega = tipos.includes("ENTREGA");

  if (possuiColeta && possuiEntrega) {
    return "Entrega";
  }

  return converterTipoParada(paradas[0]?.tipo ?? "ENTREGA");
}

function validarAnalise(analise: AnaliseParaCriarTele) {
  if (!analise.solicitante?.trim()) {
    throw new Error("A IA não identificou o solicitante da Tele.");
  }

  if (analise.propostaOperacional.status !== "PRONTA_PARA_REVISAO") {
    throw new Error("A operação ainda possui informações pendentes e não pode criar a Tele.");
  }

  if (analise.propostaOperacional.pendencias.length > 0) {
    throw new Error("Resolva as informações pendentes antes de criar a Tele.");
  }

  const paradas =
    analise.atendimento.operacao.paradas.length > 0
      ? analise.atendimento.operacao.paradas
      : analise.propostaOperacional.paradas;

  if (paradas.length === 0) {
    throw new Error("A IA não identificou nenhuma parada.");
  }

  const paradaIncompleta = paradas.find(
    (parada) => !parada.cliente?.trim() || !parada.endereco?.trim()
  );

  if (paradaIncompleta) {
    throw new Error("Existe uma parada sem cliente ou endereço confirmado.");
  }

  return paradas;
}

export async function criarTeleViaIA(analise: AnaliseParaCriarTele): Promise<TeleCriadaPelaIA> {
  if (analise.atendimento.operacao.teleCriada || analise.atendimento.operacao.teleId) {
    throw new Error("Este atendimento já possui uma Tele criada.");
  }

  const paradas = validarAnalise(analise);

  const rota = analise.atendimento.operacao.rota;

  const valor = rota.valorConfirmado ?? rota.valorSugerido ?? 0;

  const corpo = {
    solicitante: analise.solicitante,

    motoboy: analise.motoboySugerido?.nome ?? "",

    status: analise.motoboySugerido
      ? "Aguardando motoboy disponível"
      : "Aguardando motoboy disponível",

    tipoRota: determinarTipoRota(paradas),

    valorBase: valor,

    retorno: 0,

    espera: 0,

    total: valor,

    distanciaKm: rota.distanciaKm,

    tempoMinutos: rota.duracaoMin,

    recebimento: "pendente",

    formaCobranca: "semanal",

    valorRecebido: 0,

    observacaoGeral: "Tele criada pela Central de Atendimento com auxílio da IA.",

    paradas: paradas.map((parada) => ({
      tipo: converterTipoParada(parada.tipo),

      cliente: parada.cliente?.trim() ?? "",

      endereco: parada.endereco?.trim() ?? "",

      contato: parada.telefone?.trim() ?? "",

      observacao: "",
    })),
  };

  const resposta = await fetch("/api/teles", {
    method: "POST",

    headers: {
      "Content-Type": "application/json",
    },

    body: JSON.stringify(corpo),
  });

  const resultado = (await resposta.json()) as
    | TeleCriadaPelaIA
    | {
        erro?: string;
      };

  if (!resposta.ok || !("id" in resultado)) {
    throw new Error(
      "erro" in resultado && resultado.erro ? resultado.erro : "Não foi possível criar a Tele."
    );
  }

  return resultado;
}
