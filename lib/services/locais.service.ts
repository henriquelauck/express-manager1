import type { Tele } from "@/types/Tele";

export type LocalFrequente = {
  cliente: string;
  endereco: string;
  contato: string;
};

export function obterLocaisFrequentes(teles: Tele[], solicitante: string): LocalFrequente[] {
  const locais = teles
    .filter((tele) => tele.solicitante === solicitante)
    .flatMap((tele) => tele.paradas || [])
    .filter((parada) => parada.cliente && parada.endereco)
    .map((parada) => ({
      cliente: parada.cliente,
      endereco: parada.endereco,
      contato: parada.contato || "",
    }));

  return Array.from(
    new Map(locais.map((local) => [local.cliente.trim().toLowerCase(), local])).values()
  );
}
