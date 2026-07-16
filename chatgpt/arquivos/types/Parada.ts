export type TipoParada =
  | "Entrega"
  | "Coleta"
  | "Trocar"
  | "Entrega e coleta";

export type Parada = {
  id: string;

  tipo: TipoParada;

  cliente: string;

  endereco: string;

  contato: string;

  observacao: string;
};