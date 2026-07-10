export type PontoLogistico = {
  id: string;
  teleId: string;
  tipo: "COLETA" | "ENTREGA";
  endereco: string;
};

export type TrechoLogistico = {
  origemId: string;
  destinoId: string;
  distanciaKm: number;
  duracaoMin: number;
};

export type CustoRota = {
  distanciaTotalKm: number;
  duracaoTotalMin: number;
  quantidadeTrechos: number;
  trechosAusentes: {
    origemId: string;
    destinoId: string;
  }[];
};
