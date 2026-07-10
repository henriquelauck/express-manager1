export function converterValor(valor: string) {
  return Number(valor.replace(",", "."));
}

export function formatarValor(valor: number) {
  return valor.toFixed(2).replace(".", ",");
}

export function calcularEspera(minutos: number) {
  return Math.floor(minutos / 15) * 5;
}

export function calcularTotal(valorBase: number, retorno: number, espera: number) {
  return valorBase + retorno + espera;
}

export function calcularRetorno(tipo: string) {
  if (tipo === "Trocar" || tipo === "Entrega e coleta") {
    return 5;
  }

  return 0;
}
