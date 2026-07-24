import type {
  Atendimento,
  ParadaAtendimento as ParadaSessaoAtendimento,
} from "./sessao/Atendimento";

type ParadaInterpretada = {
  tipo: string;
  texto: string;
  cliente: string | null;
  endereco?: string | null;
};

type ParametrosAntigos = {
  atendimento?: never;

  solicitante: string | null;
  paradas: ParadaInterpretada[];
  intencao: string;
};

type ParametrosComAtendimento = {
  atendimento: Atendimento;

  solicitante?: never;
  paradas?: never;
  intencao?: never;
};

type GerarRespostaAtendimentoParams = ParametrosAntigos | ParametrosComAtendimento;

export type RespostaAtendimento = {
  tipo: "PEDIDO_COMPREENDIDO" | "SOLICITAR_INFORMACOES" | "NAO_SUPORTADO";

  mensagem: string;

  podeEnviarAutomaticamente: boolean;

  informacoesSolicitadas: string[];
};

type DadosConsolidados = {
  solicitante: string | null;
  paradas: Array<{
    tipo: string;
    cliente: string | null;
    endereco: string | null;
  }>;
  intencao: string | null;
};

function formatarTipoParada(tipo: string) {
  const tipoNormalizado = String(tipo || "")
    .trim()
    .toLowerCase();

  if (tipoNormalizado === "coleta") {
    return "Coleta";
  }

  if (tipoNormalizado === "entrega") {
    return "Entrega";
  }

  if (tipoNormalizado === "trocar" || tipoNormalizado === "troca") {
    return "Troca";
  }

  return tipo;
}

function transformarParadaSessao(parada: ParadaSessaoAtendimento) {
  return {
    tipo: parada.tipo,
    cliente: parada.cliente,
    endereco: parada.endereco,
  };
}

function obterDadosConsolidados(parametros: GerarRespostaAtendimentoParams): DadosConsolidados {
  if (parametros.atendimento) {
    const atendimento = parametros.atendimento;

    return {
      solicitante: atendimento.operacao.solicitante,

      paradas: atendimento.operacao.paradas.map(transformarParadaSessao),

      intencao: atendimento.operacao.intencao,
    };
  }

  return {
    solicitante: parametros.solicitante,

    paradas: parametros.paradas.map((parada) => ({
      tipo: parada.tipo,
      cliente: parada.cliente,
      endereco: parada.endereco || null,
    })),

    intencao: parametros.intencao,
  };
}

function gerarRespostaPeloEstado(atendimento: Atendimento): RespostaAtendimento | null {
  switch (atendimento.estado.etapa) {
    case "IDENTIFICANDO_SOLICITANTE":
      return {
        tipo: "SOLICITAR_INFORMACOES",

        mensagem: "Para continuar, preciso identificar quem está solicitando o serviço.",

        podeEnviarAutomaticamente: false,

        informacoesSolicitadas: ["identificação do solicitante"],
      };

    case "INTERPRETANDO_PEDIDO":
      return {
        tipo: "SOLICITAR_INFORMACOES",

        mensagem: "Entendi. Pode me explicar onde devo coletar e onde devo entregar?",

        podeEnviarAutomaticamente: false,

        informacoesSolicitadas: ["descrição do pedido"],
      };

    case "AGUARDANDO_COLETA":
      return {
        tipo: "SOLICITAR_INFORMACOES",

        mensagem: "Perfeito. Onde devo realizar a coleta?",

        podeEnviarAutomaticamente: false,

        informacoesSolicitadas: ["local de coleta"],
      };

    case "AGUARDANDO_ENTREGA":
      return {
        tipo: "SOLICITAR_INFORMACOES",

        mensagem: "Perfeito. Agora me informe onde devo realizar a entrega.",

        podeEnviarAutomaticamente: false,

        informacoesSolicitadas: ["local de entrega"],
      };

    case "AGUARDANDO_ENDERECO": {
      const aguardando = atendimento.estado.aguardando;

      const descricao = aguardando === "ENDERECO_COLETA" ? "coleta" : "entrega";

      return {
        tipo: "SOLICITAR_INFORMACOES",

        mensagem: `Preciso confirmar o endereço de ${descricao}. Pode me informar o endereço completo?`,

        podeEnviarAutomaticamente: false,

        informacoesSolicitadas: [`endereço de ${descricao}`],
      };
    }

    case "AGUARDANDO_DADOS_COMPLEMENTARES":
      return {
        tipo: "SOLICITAR_INFORMACOES",

        mensagem: [
          "Para confirmar a entrega, preciso destas informações:",
          "",
          "Nome do cliente:",
          "Precisa cobrar a entrega?",
        ].join("\n"),

        podeEnviarAutomaticamente: false,

        informacoesSolicitadas: ["nome do cliente", "confirmação se precisa cobrar a entrega"],
      };

    case "PRONTO_PARA_CALCULAR_ROTA":
      return gerarRespostaPedidoCompreendido(atendimento.operacao.paradas);

    case "CALCULANDO_ROTA":
      return {
        tipo: "PEDIDO_COMPREENDIDO",

        mensagem: "Perfeito. Estou calculando a rota e o valor da solicitação.",

        podeEnviarAutomaticamente: false,

        informacoesSolicitadas: [],
      };

    case "AGUARDANDO_CONFIRMACAO_ORCAMENTO": {
      const valor = atendimento.operacao.rota.valorSugerido;

      const valorFormatado =
        typeof valor === "number"
          ? valor.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })
          : null;

      return {
        tipo: "SOLICITAR_INFORMACOES",

        mensagem: valorFormatado
          ? `O valor da solicitação ficou em ${valorFormatado}. Posso confirmar?`
          : "A rota foi calculada. Posso confirmar a solicitação?",

        podeEnviarAutomaticamente: false,

        informacoesSolicitadas: ["confirmação do orçamento"],
      };
    }

    case "PRONTO_PARA_CRIAR_TELE":
      return {
        tipo: "PEDIDO_COMPREENDIDO",

        mensagem: "Perfeito. A solicitação foi confirmada e já pode ser criada.",

        podeEnviarAutomaticamente: false,

        informacoesSolicitadas: [],
      };

    case "CRIANDO_TELE":
      return {
        tipo: "PEDIDO_COMPREENDIDO",

        mensagem: "Estou criando sua solicitação no sistema.",

        podeEnviarAutomaticamente: false,

        informacoesSolicitadas: [],
      };

    case "AGUARDANDO_MOTOBOY":
      return {
        tipo: "PEDIDO_COMPREENDIDO",

        mensagem: "Sua solicitação foi criada. Agora estou verificando o motoboy disponível.",

        podeEnviarAutomaticamente: false,

        informacoesSolicitadas: [],
      };

    case "DESPACHANDO":
      return {
        tipo: "PEDIDO_COMPREENDIDO",

        mensagem: "Estou enviando a solicitação para o motoboy.",

        podeEnviarAutomaticamente: false,

        informacoesSolicitadas: [],
      };

    case "EM_ACOMPANHAMENTO":
      return {
        tipo: "PEDIDO_COMPREENDIDO",

        mensagem: "Sua solicitação já está em andamento. Vou acompanhar a operação.",

        podeEnviarAutomaticamente: false,

        informacoesSolicitadas: [],
      };

    case "FINALIZADO":
      return {
        tipo: "PEDIDO_COMPREENDIDO",

        mensagem: "Sua solicitação foi finalizada com sucesso.",

        podeEnviarAutomaticamente: false,

        informacoesSolicitadas: [],
      };

    case "TRANSFERIDO_PARA_HUMANO":
      return {
        tipo: "PEDIDO_COMPREENDIDO",

        mensagem: "Vou encaminhar seu atendimento para um responsável.",

        podeEnviarAutomaticamente: false,

        informacoesSolicitadas: [],
      };

    case "CANCELADO":
      return {
        tipo: "PEDIDO_COMPREENDIDO",

        mensagem: "O atendimento foi cancelado.",

        podeEnviarAutomaticamente: false,

        informacoesSolicitadas: [],
      };

    default:
      return null;
  }
}

function gerarRespostaPedidoCompreendido(
  paradas: Array<{
    tipo: string;
    cliente: string | null;
  }>
): RespostaAtendimento {
  const resumoParadas = paradas
    .filter((parada) => Boolean(parada.cliente))
    .map((parada) => {
      const tipo = formatarTipoParada(parada.tipo);

      return `• ${tipo}: ${parada.cliente}`;
    })
    .join("\n");

  return {
    tipo: "PEDIDO_COMPREENDIDO",

    mensagem: resumoParadas
      ? `Perfeito! Entendi o pedido:\n\n${resumoParadas}\n\nVou calcular a rota e confirmar o valor para você.`
      : "Perfeito. Vou calcular a rota e confirmar o valor para você.",

    podeEnviarAutomaticamente: false,

    informacoesSolicitadas: [],
  };
}

export function gerarRespostaAtendimento(
  parametros: GerarRespostaAtendimentoParams
): RespostaAtendimento {
  if (parametros.atendimento) {
    const respostaPeloEstado = gerarRespostaPeloEstado(parametros.atendimento);

    if (respostaPeloEstado) {
      return respostaPeloEstado;
    }
  }

  const { solicitante, paradas, intencao } = obterDadosConsolidados(parametros);

  if (intencao !== "CRIAR_TELE") {
    return {
      tipo: "NAO_SUPORTADO",

      mensagem:
        "Não consegui identificar uma solicitação de entrega nessa mensagem. Pode me explicar o que você precisa?",

      podeEnviarAutomaticamente: false,

      informacoesSolicitadas: ["descrição do pedido"],
    };
  }

  const informacoesSolicitadas: string[] = [];

  if (!solicitante) {
    informacoesSolicitadas.push("identificação do solicitante");
  }

  if (paradas.length === 0) {
    informacoesSolicitadas.push("local de coleta", "local de entrega");
  }

  paradas.forEach((parada) => {
    const tipo = formatarTipoParada(parada.tipo);

    if (!parada.cliente) {
      informacoesSolicitadas.push(`identificação do local de ${tipo.toLowerCase()}`);

      return;
    }

    if (!parada.endereco) {
      informacoesSolicitadas.push(`endereço de ${tipo.toLowerCase()} de ${parada.cliente}`);
    }
  });

  const informacoesUnicas = Array.from(new Set(informacoesSolicitadas));

  if (informacoesUnicas.length > 0) {
    return {
      tipo: "SOLICITAR_INFORMACOES",

      mensagem: montarMensagemPendencias(informacoesUnicas),

      podeEnviarAutomaticamente: false,

      informacoesSolicitadas: informacoesUnicas,
    };
  }

  return gerarRespostaPedidoCompreendido(paradas);
}

function montarMensagemPendencias(informacoes: string[]) {
  if (informacoes.length === 1) {
    return "Consigo organizar essa entrega. " + `Só preciso confirmar a ${informacoes[0]}.`;
  }

  const ultimaInformacao = informacoes[informacoes.length - 1];

  const demaisInformacoes = informacoes.slice(0, -1).join(", ");

  return (
    "Consigo organizar essa entrega. " +
    `Só preciso confirmar: ${demaisInformacoes} e ${ultimaInformacao}.`
  );
}
