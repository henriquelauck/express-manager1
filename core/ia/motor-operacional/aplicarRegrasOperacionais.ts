import { selecionarRegra } from "./selecionarRegra";
import type { EntradaMotorOperacional, ResultadoMotorOperacional } from "./tipos";

export function aplicarRegrasOperacionais(
  entrada: EntradaMotorOperacional
): ResultadoMotorOperacional {
  const regra = selecionarRegra(entrada.solicitante);

  return regra(entrada);
}
