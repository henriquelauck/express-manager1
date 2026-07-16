import { aplicarRegraDefault } from "./regras/default";
import { aplicarRegraPetexame } from "./regras/petexame";
import type { RegraOperacional } from "./tipos";

function normalizarNome(nome: string | null) {
  return String(nome ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

export function selecionarRegra(solicitante: string | null): RegraOperacional {
  const solicitanteNormalizado = normalizarNome(solicitante);

  if (solicitanteNormalizado === "PETEXAME") {
    return aplicarRegraPetexame;
  }

  return aplicarRegraDefault;
}
