import type { Parada } from "@/types/Parada";
import type { Tele } from "@/types/Tele";

export type CriarTeleInput = {
  solicitante: string;
  dataTele: string;
  valorBase: string;
  observacaoGeral: string;
  paradas: Parada[];

  distanciaKm?: number | null;
  tempoMinutos?: number | null;
};

export type ResultadoOrquestrador<T> = {
  sucesso: boolean;
  dados: T | null;
  erros: string[];
  avisos: string[];
};

export type ResultadoCriarTele = ResultadoOrquestrador<Tele>;
