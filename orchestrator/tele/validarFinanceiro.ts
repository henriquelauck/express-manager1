import { converterValor } from "@/lib/services/tele.service";

export function validarFinanceiro(valorBase: string) {
  const valor = converterValor(valorBase);

  const erros: string[] = [];
  const avisos: string[] = [];

  if (valor <= 0) {
    erros.push("O valor da tele deve ser maior que zero.");
  }

  if (valor < 14) {
    avisos.push(
      "O valor informado está abaixo do valor mínimo padrão."
    );
  }

  return {
    sucesso: erros.length === 0,
    erros,
    avisos,
  };
}