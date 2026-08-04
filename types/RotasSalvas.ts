export type LocalSolicitante = {
  id: string;
  solicitante: string;
  cliente: string;
  endereco: string;
  contato?: string | null;
  observacaoFixa?: string | null;
};

export type RotaSalvaParada = {
  id?: string;
  ordem: number;
  tipo: "Entrega" | "Coleta" | "Trocar" | "Entrega e coleta";
  cliente: string;
  endereco: string;
  contato?: string | null;
  observacao?: string | null;
};

export type RotaSalva = {
  id: string;
  solicitante: string;
  nome: string;
  paradas: RotaSalvaParada[];
};
