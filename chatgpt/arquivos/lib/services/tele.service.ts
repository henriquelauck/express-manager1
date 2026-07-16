import type { Parada } from "@/types/Parada";

export function converterValor(valor: string): number {
  const numero = Number(String(valor || "0").replace(",", "."));
  return Number.isFinite(numero) ? numero : 0;
}

export function formatarValor(valor: number): string {
  return Number(valor || 0).toFixed(2).replace(".", ",");
}

export function temRetorno(paradas: Parada[]): boolean {
  return paradas.some(
    (parada) =>
      parada.tipo === "Trocar" ||
      parada.tipo === "Entrega e coleta"
  );
}

export function calcularRetorno(
  solicitante: string,
  paradas: Parada[]
): number {
  const clienteNormalizado = String(solicitante || "")
    .trim()
    .toLowerCase();

  if (clienteNormalizado.includes("petexame")) {
    return 0;
  }

  return temRetorno(paradas) ? 5 : 0;
}

export function calcularTotal(
  valorBase: string | number,
  retorno: number,
  espera = 0
): number {
  const base =
    typeof valorBase === "number"
      ? valorBase
      : converterValor(valorBase);

  return base + retorno + espera;
}

export function descobrirTipoRota(paradas: Parada[]): string {
  if (paradas.length === 0) {
    return "";
  }

  if (paradas.length === 1) {
    return paradas[0].tipo;
  }

  if (temRetorno(paradas)) {
    return "Rota com retorno";
  }

  return "Rota com múltiplas paradas";
}