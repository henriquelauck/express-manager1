import { Parada } from "./Parada";

export type StatusTele =
  | "Aguardando cliente"
  | "Aguardando motoboy disponível"
  | "Em rota"
  | "Entregue";

export type FormaCobranca =
  | "na_hora"
  | "semanal"
  | "quinzenal"
  | "mensal";

export type StatusRecebimento =
  | "pendente"
  | "escritorio"
  | "motoboy";

export type Tele = {
  id: string;

  solicitante: string;

  motoboyId: string | null;
  motoboy: string;

  status: StatusTele;

  criadoEm: string;
dataTele: string;

  valorBase: number;
  retorno: number;
  espera: number;
  total: number;

  recebido: boolean;

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