import type { Atendimento, ParadaAtendimento } from "./sessao/Atendimento";

export type EtapaAgenteOperacional =
  | "IDENTIFICAR_SOLICITANTE"
  | "INTERPRETAR_PEDIDO"
  | "CONFIRMAR_INFORMACOES"
  | "CALCULAR_ROTA"
  | "CONFIRMAR_ORCAMENTO"
  | "CRIAR_TELE"
  | "ATRIBUIR_MOTOBOY"
  | "AVISAR_CLIENTE"
  | "FINALIZADO"
  | "NAO_SUPORTADO";

export type StatusEtapaAgente = "CONCLUIDA" | "PENDENTE" | "BLOQUEADA" | "NAO_APLICAVEL";

export type AcaoPlanejadaAgente = {
  etapa: EtapaAgenteOperacional;
  status: StatusEtapaAgente;
  motivo: string;
};

export type PlanoAgenteOperacional = {
  objetivo: string;

  estado:
    | "AGUARDANDO_INFORMACOES"
    | "PRONTO_PARA_CALCULAR_ROTA"
    | "AGUARDANDO_CONFIRMACAO"
    | "PRONTO_PARA_EXECUCAO"
    | "NAO_SUPORTADO"
    | "FINALIZADO";

  proximaEtapa: EtapaAgenteOperacional;

  acoes: AcaoPlanejadaAgente[];

  podeExecutarAcao: boolean;

  requerConfirmacaoHumana: boolean;
};

type ParadaAgente = {
  cliente: string | null;
  endereco?: string | null;
};

type ParametrosAntigos = {
  atendimento?: never;

  intencao: string;
  solicitante: string | null;
  paradas: ParadaAgente[];
  informacoesFaltantes: string[];

  rotaCalculada?: boolean;
  orcamentoConfirmado?: boolean;
  teleCriada?: boolean;
  motoboyAtribuido?: boolean;
};

type ParametrosComAtendimento = {
  atendimento: Atendimento;

  intencao?: never;
  solicitante?: never;
  paradas?: never;
  informacoesFaltantes?: never;
  rotaCalculada?: never;
  orcamentoConfirmado?: never;
  teleCriada?: never;
  motoboyAtribuido?: never;
};

type GerarPlanoOperacionalParams = ParametrosAntigos | ParametrosComAtendimento;

type DadosPlano = {
  intencao: string | null;
  solicitante: string | null;
  paradas: ParadaAgente[];
  informacoesFaltantes: string[];
  rotaCalculada: boolean;
  orcamentoConfirmado: boolean;
  teleCriada: boolean;
  motoboyAtribuido: boolean;
};

function paradaIncompleta(parada: ParadaAtendimento) {
  return !parada.cliente || !parada.endereco;
}

function gerarPendenciasDoAtendimento(atendimento: Atendimento) {
  const pendencias: string[] = [];

  if (!atendimento.operacao.solicitante) {
    pendencias.push("Solicitante não identificado.");
  }

  const coleta = atendimento.operacao.paradas.find((parada) => parada.tipo === "COLETA");

  const entrega = atendimento.operacao.paradas.find((parada) => parada.tipo === "ENTREGA");

  if (!coleta?.cliente) {
    pendencias.push("Local de coleta não identificado.");
  } else if (!coleta.endereco) {
    pendencias.push(`O cliente "${coleta.cliente}" não possui endereço de coleta confirmado.`);
  }

  if (!entrega?.cliente) {
    pendencias.push("Local de entrega não identificado.");
  } else if (!entrega.endereco) {
    pendencias.push(`O cliente "${entrega.cliente}" não possui endereço de entrega confirmado.`);
  }

  for (const parada of atendimento.operacao.paradas) {
    if (parada.tipo !== "COLETA" && parada.tipo !== "ENTREGA" && paradaIncompleta(parada)) {
      pendencias.push(`A parada "${parada.textoOriginal || parada.tipo}" está incompleta.`);
    }
  }

  return Array.from(new Set(pendencias));
}

function obterDadosPlano(parametros: GerarPlanoOperacionalParams): DadosPlano {
  if (parametros.atendimento) {
    const atendimento = parametros.atendimento;

    return {
      intencao: atendimento.operacao.intencao,

      solicitante: atendimento.operacao.solicitante,

      paradas: atendimento.operacao.paradas.map((parada) => ({
        cliente: parada.cliente,
        endereco: parada.endereco,
      })),

      informacoesFaltantes: gerarPendenciasDoAtendimento(atendimento),

      rotaCalculada: atendimento.operacao.rota.calculada,

      orcamentoConfirmado: atendimento.operacao.orcamentoConfirmado,

      teleCriada: atendimento.operacao.teleCriada,

      motoboyAtribuido: atendimento.operacao.motoboy.atribuido,
    };
  }

  return {
    intencao: parametros.intencao,

    solicitante: parametros.solicitante,

    paradas: parametros.paradas,

    informacoesFaltantes: parametros.informacoesFaltantes,

    rotaCalculada: parametros.rotaCalculada ?? false,

    orcamentoConfirmado: parametros.orcamentoConfirmado ?? false,

    teleCriada: parametros.teleCriada ?? false,

    motoboyAtribuido: parametros.motoboyAtribuido ?? false,
  };
}

export function gerarPlanoOperacional(
  parametros: GerarPlanoOperacionalParams
): PlanoAgenteOperacional {
  const {
    intencao,
    solicitante,
    paradas,
    informacoesFaltantes,
    rotaCalculada,
    orcamentoConfirmado,
    teleCriada,
    motoboyAtribuido,
  } = obterDadosPlano(parametros);

  if (intencao !== "CRIAR_TELE") {
    return {
      objetivo: "Compreender a solicitação do cliente",

      estado: "NAO_SUPORTADO",

      proximaEtapa: "NAO_SUPORTADO",

      acoes: [
        {
          etapa: "INTERPRETAR_PEDIDO",

          status: "CONCLUIDA",

          motivo: "A mensagem foi interpretada, mas ainda não representa uma criação de tele.",
        },

        {
          etapa: "NAO_SUPORTADO",

          status: "PENDENTE",

          motivo: "O agente precisa solicitar mais detalhes ao cliente.",
        },
      ],

      podeExecutarAcao: false,

      requerConfirmacaoHumana: true,
    };
  }

  const possuiParadasIncompletas =
    paradas.length === 0 || paradas.some((parada) => !parada.cliente || !parada.endereco);

  const possuiPendencias =
    informacoesFaltantes.length > 0 || !solicitante || possuiParadasIncompletas;

  const acoes: AcaoPlanejadaAgente[] = [
    {
      etapa: "IDENTIFICAR_SOLICITANTE",

      status: solicitante ? "CONCLUIDA" : "PENDENTE",

      motivo: solicitante
        ? `Solicitante identificado como "${solicitante}".`
        : "O solicitante ainda não foi identificado.",
    },

    {
      etapa: "INTERPRETAR_PEDIDO",

      status: paradas.length > 0 ? "CONCLUIDA" : "PENDENTE",

      motivo:
        paradas.length > 0
          ? `${paradas.length} parada(s) identificada(s).`
          : "Nenhuma parada foi identificada.",
    },
  ];

  if (possuiPendencias) {
    acoes.push(
      {
        etapa: "CONFIRMAR_INFORMACOES",

        status: "PENDENTE",

        motivo: "Existem informações que precisam ser confirmadas com o cliente.",
      },

      {
        etapa: "CALCULAR_ROTA",

        status: "BLOQUEADA",

        motivo:
          "A rota só pode ser calculada depois que todas as paradas tiverem cliente e endereço.",
      },

      {
        etapa: "CRIAR_TELE",

        status: "BLOQUEADA",

        motivo: "A tele não pode ser criada enquanto houver informações pendentes.",
      }
    );

    return {
      objetivo: "Criar uma nova tele",

      estado: "AGUARDANDO_INFORMACOES",

      proximaEtapa: "CONFIRMAR_INFORMACOES",

      acoes,

      podeExecutarAcao: false,

      requerConfirmacaoHumana: true,
    };
  }

  acoes.push({
    etapa: "CONFIRMAR_INFORMACOES",

    status: "NAO_APLICAVEL",

    motivo: "Não existem informações operacionais pendentes.",
  });

  if (!rotaCalculada) {
    acoes.push(
      {
        etapa: "CALCULAR_ROTA",

        status: "PENDENTE",

        motivo: "As paradas estão completas e a rota já pode ser calculada.",
      },

      {
        etapa: "CONFIRMAR_ORCAMENTO",

        status: "BLOQUEADA",

        motivo: "O orçamento depende do cálculo da rota.",
      },

      {
        etapa: "CRIAR_TELE",

        status: "BLOQUEADA",

        motivo: "A criação da tele depende da confirmação do orçamento.",
      }
    );

    return {
      objetivo: "Criar uma nova tele",

      estado: "PRONTO_PARA_CALCULAR_ROTA",

      proximaEtapa: "CALCULAR_ROTA",

      acoes,

      podeExecutarAcao: true,

      requerConfirmacaoHumana: false,
    };
  }

  acoes.push({
    etapa: "CALCULAR_ROTA",

    status: "CONCLUIDA",

    motivo: "A distância, o tempo e o valor sugerido foram calculados.",
  });

  if (!orcamentoConfirmado) {
    acoes.push(
      {
        etapa: "CONFIRMAR_ORCAMENTO",

        status: "PENDENTE",

        motivo: "O cliente ainda precisa confirmar o orçamento.",
      },

      {
        etapa: "CRIAR_TELE",

        status: "BLOQUEADA",

        motivo: "A tele será criada somente depois da confirmação do cliente.",
      }
    );

    return {
      objetivo: "Criar uma nova tele",

      estado: "AGUARDANDO_CONFIRMACAO",

      proximaEtapa: "CONFIRMAR_ORCAMENTO",

      acoes,

      podeExecutarAcao: false,

      requerConfirmacaoHumana: false,
    };
  }

  acoes.push({
    etapa: "CONFIRMAR_ORCAMENTO",

    status: "CONCLUIDA",

    motivo: "O orçamento foi confirmado.",
  });

  if (!teleCriada) {
    acoes.push({
      etapa: "CRIAR_TELE",

      status: "PENDENTE",

      motivo: "O pedido está completo e autorizado para criação da tele.",
    });

    return {
      objetivo: "Criar uma nova tele",

      estado: "PRONTO_PARA_EXECUCAO",

      proximaEtapa: "CRIAR_TELE",

      acoes,

      podeExecutarAcao: true,

      requerConfirmacaoHumana: false,
    };
  }

  acoes.push({
    etapa: "CRIAR_TELE",

    status: "CONCLUIDA",

    motivo: "A tele foi criada no sistema.",
  });

  if (!motoboyAtribuido) {
    acoes.push({
      etapa: "ATRIBUIR_MOTOBOY",

      status: "PENDENTE",

      motivo: "A tele ainda precisa ser atribuída a um motoboy.",
    });

    return {
      objetivo: "Concluir o atendimento da tele",

      estado: "PRONTO_PARA_EXECUCAO",

      proximaEtapa: "ATRIBUIR_MOTOBOY",

      acoes,

      podeExecutarAcao: true,

      requerConfirmacaoHumana: false,
    };
  }

  acoes.push(
    {
      etapa: "ATRIBUIR_MOTOBOY",

      status: "CONCLUIDA",

      motivo: "Um motoboy foi atribuído à tele.",
    },

    {
      etapa: "AVISAR_CLIENTE",

      status: "PENDENTE",

      motivo: "O cliente deve ser informado de que a solicitação foi criada.",
    }
  );

  return {
    objetivo: "Concluir o atendimento da tele",

    estado: "PRONTO_PARA_EXECUCAO",

    proximaEtapa: "AVISAR_CLIENTE",

    acoes,

    podeExecutarAcao: true,

    requerConfirmacaoHumana: false,
  };
}
