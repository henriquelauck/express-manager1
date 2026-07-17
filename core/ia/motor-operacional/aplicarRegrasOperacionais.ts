import { aplicarConhecimentosOperacionais } from "./conhecimentos/aplicarConhecimentosOperacionais";
import { buscarConhecimentosAtivos } from "./conhecimentos/buscarConhecimentosAtivos";
import { selecionarRegra } from "./selecionarRegra";
import type { EntradaMotorOperacional, ResultadoMotorOperacional } from "./tipos";

export async function aplicarRegrasOperacionais(
  entrada: EntradaMotorOperacional
): Promise<ResultadoMotorOperacional> {
  const regra = selecionarRegra(entrada.solicitante);

  const resultadoRegraFixa = regra(entrada);

  const conhecimentosAtivos = await buscarConhecimentosAtivos({
    solicitante: entrada.solicitante,

    categoria: "REGRA_OPERACIONAL",
  });

  return aplicarConhecimentosOperacionais({
    entrada,

    resultado: resultadoRegraFixa,

    conhecimentos: conhecimentosAtivos,
  });
}
