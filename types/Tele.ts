import { Parada } from "./Parada";

export type StatusTele =
  | "Aguardando cliente"
  | "Aguardando motoboy disponível"
  | "Aguardando coleta"
  | "Em rota"
  | "Entregue";

export type FormaCobranca = "na_hora" | "semanal" | "quinzenal" | "mensal";

export type StatusRecebimento = "pendente" | "escritorio" | "motoboy";

export type RecebimentoHistoricoTele = {
  id: string;
  valor: number;
  recebedor: StatusRecebimento;
  motoboyId: string | null;
  motoboyNome: string | null;
  dataRecebimento: string;
  origem: string;
  fechamentoId: string | null;
  recebimentosHistorico?: RecebimentoHistoricoTele[];
};

export type StatusAceiteTele = "NAO_ENVIADA" | "AGUARDANDO_ACEITE" | "ACEITA" | "RECUSADA";

export type EtapaMotoboyTele =
  | "AGUARDANDO_INICIO_COLETA"
  | "EM_ROTA_COLETA"
  | "CHEGOU_NA_COLETA"
  | "EM_ROTA_ENTREGA"
  | "CHEGOU_NA_ENTREGA"
  | "CONCLUIDA";

export type Tele = {
  orcamento?: boolean;
  id: string;

  solicitante: string;

  motoboyId: string | null;
  motoboy: string;

  status: StatusTele;

  statusAceite?: StatusAceiteTele;
  etapaMotoboy?: EtapaMotoboyTele | null;

  atribuidaAoMotoboyEm?: string | null;
  aceitaPeloMotoboyEm?: string | null;
  recusadaPeloMotoboyEm?: string | null;
  motivoRecusaMotoboy?: string | null;

  rotaColetaIniciadaEm?: string | null;
  chegouNaColetaEm?: string | null;
  entregaIniciadaEm?: string | null;
  chegouNaEntregaEm?: string | null;
  concluidaPeloMotoboyEm?: string | null;

  criadoEm: string;
  dataTele: string;

  valorBase: number;
  retorno: number;
  espera: number;
  total: number;

  recebido: boolean;
  dataOperacao: string;

  recebimento: StatusRecebimento;
  formaCobranca: FormaCobranca;
  valorRecebido: number;
  dataRecebimento: string | null;
  motoboyRecebedor: string | null;
  fechamentoId: string | null;

  observacaoGeral: string;

  paradas: Parada[];

  tipoRota: string;
  nomeCliente: string;
  endereco: string;
  contato: string;
  observacao: string;
  valor: string;
  esperaMinutos: number;
};
