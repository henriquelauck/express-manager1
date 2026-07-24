export type AutorMensagemAtendimento = "CLIENTE" | "AGENTE" | "SISTEMA";

export type TipoMensagemAtendimento = "TEXTO" | "PERGUNTA" | "CONFIRMACAO" | "AVISO" | "ERRO";

export type MensagemAtendimento = {
  id: string;

  autor: AutorMensagemAtendimento;

  tipo: TipoMensagemAtendimento;

  conteudo: string;

  criadaEm: string;
};

export type TipoParadaAtendimento = "COLETA" | "ENTREGA" | "TROCA" | "ENTREGA_E_COLETA" | "OUTRA";

export type OrigemDadoAtendimento =
  | "MENSAGEM"
  | "TELEFONE_REMETENTE"
  | "CONTEXTO_OPERACIONAL"
  | "BANCO_DE_DADOS"
  | "HISTORICO_SOLICITANTE"
  | "GOOGLE_MAPS"
  | "CONFIRMACAO_CLIENTE"
  | "SISTEMA";

export type DadosComplementaresParada = {
  nomeCliente: string | null;

  cobrarEntrega: boolean | null;
};

export type ParadaAtendimento = {
  tipo: TipoParadaAtendimento;

  textoOriginal: string | null;

  cliente: string | null;

  endereco: string | null;

  telefone: string | null;

  confianca: number;

  origem: OrigemDadoAtendimento | null;

  confirmada: boolean;

  dadosComplementares?: DadosComplementaresParada;
};

export type EstadoEtapaAtendimento =
  | "IDENTIFICANDO_SOLICITANTE"
  | "INTERPRETANDO_PEDIDO"
  | "AGUARDANDO_COLETA"
  | "AGUARDANDO_ENTREGA"
  | "AGUARDANDO_ENDERECO"
  | "AGUARDANDO_DADOS_COMPLEMENTARES"
  | "PRONTO_PARA_CALCULAR_ROTA"
  | "CALCULANDO_ROTA"
  | "AGUARDANDO_CONFIRMACAO_ORCAMENTO"
  | "PRONTO_PARA_CRIAR_TELE"
  | "CRIANDO_TELE"
  | "AGUARDANDO_MOTOBOY"
  | "DESPACHANDO"
  | "EM_ACOMPANHAMENTO"
  | "FINALIZADO"
  | "TRANSFERIDO_PARA_HUMANO"
  | "CANCELADO";

export type InformacaoAguardadaAtendimento =
  | "SOLICITANTE"
  | "COLETA"
  | "ENTREGA"
  | "ENDERECO_COLETA"
  | "ENDERECO_ENTREGA"
  | "DADOS_COMPLEMENTARES"
  | "CONFIRMACAO_ORCAMENTO"
  | "CONFIRMACAO_TELE"
  | "RESPOSTA_MOTOBOY"
  | null;

export type StatusAtendimento =
  | "ATIVO"
  | "AGUARDANDO_CLIENTE"
  | "AGUARDANDO_SISTEMA"
  | "AGUARDANDO_MOTOBOY"
  | "FINALIZADO"
  | "CANCELADO"
  | "TRANSFERIDO";

export type RotaAtendimento = {
  calculada: boolean;

  distanciaKm: number | null;

  duracaoMin: number | null;

  valorSugerido: number | null;

  valorConfirmado: number | null;

  polyline: string | null;
};

export type MotoboyAtendimento = {
  id: string | null;

  nome: string | null;

  score: number | null;

  motivo: string | null;

  atribuido: boolean;

  confirmado: boolean;
};

export type EstrategiaAtendimento = {
  exigeConfirmacaoOrcamento: boolean;

  criarTeleAutomaticamente: boolean;

  usarOrcamentoEstruturado: boolean;

  mensagemAposCriarTele: string | null;

  mensagemAposAtribuirMotoboy: string | null;
};

export type OperacaoAtendimento = {
  intencao: string | null;

  solicitante: string | null;

  origemSolicitante: "TELEFONE_REMETENTE" | "MENSAGEM" | null;

  paradas: ParadaAtendimento[];

  temRetorno: boolean;

  observacaoGeral: string;

  rota: RotaAtendimento;

  motoboy: MotoboyAtendimento;

  estrategia: EstrategiaAtendimento;

  orcamentoConfirmado: boolean;

  teleId: string | null;

  teleCriada: boolean;
};

export type EstadoAtendimento = {
  etapa: EstadoEtapaAtendimento;

  aguardando: InformacaoAguardadaAtendimento;

  ultimaAcao: string | null;

  proximaAcao: string | null;

  motivo: string;

  precisaHumano: boolean;
};

export type Atendimento = {
  id: string;

  telefoneRemetente: string;

  criadoEm: string;

  atualizadoEm: string;

  status: StatusAtendimento;

  historico: MensagemAtendimento[];

  operacao: OperacaoAtendimento;

  estado: EstadoAtendimento;
};

export function criarAtendimentoVazio({
  id,
  telefoneRemetente,
}: {
  id: string;
  telefoneRemetente: string;
}): Atendimento {
  const agora = new Date().toISOString();

  return {
    id,

    telefoneRemetente,

    criadoEm: agora,

    atualizadoEm: agora,

    status: "ATIVO",

    historico: [],

    operacao: {
      intencao: null,

      solicitante: null,

      origemSolicitante: null,

      paradas: [],

      temRetorno: false,

      observacaoGeral: "",

      rota: {
        calculada: false,

        distanciaKm: null,

        duracaoMin: null,

        valorSugerido: null,

        valorConfirmado: null,

        polyline: null,
      },

      motoboy: {
        id: null,

        nome: null,

        score: null,

        motivo: null,

        atribuido: false,

        confirmado: false,
      },

      estrategia: {
        exigeConfirmacaoOrcamento: true,

        criarTeleAutomaticamente: false,

        usarOrcamentoEstruturado: true,

        mensagemAposCriarTele: null,

        mensagemAposAtribuirMotoboy: null,
      },

      orcamentoConfirmado: false,

      teleId: null,

      teleCriada: false,
    },

    estado: {
      etapa: "IDENTIFICANDO_SOLICITANTE",

      aguardando: null,

      ultimaAcao: null,

      proximaAcao: "Identificar o solicitante pelo telefone do remetente.",

      motivo: "A sessão de atendimento foi iniciada.",

      precisaHumano: false,
    },
  };
}

export function adicionarMensagemAtendimento(
  atendimento: Atendimento,
  mensagem: MensagemAtendimento
): Atendimento {
  return {
    ...atendimento,

    atualizadoEm: new Date().toISOString(),

    historico: [...atendimento.historico, mensagem],
  };
}
