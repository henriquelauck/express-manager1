import type { ParadaAtendimento } from "@/core/ia/atendimento/sessao/Atendimento";
import type { EntradaMotorOperacional, ResultadoMotorOperacional } from "../tipos";

const estrategiaPetexame = {
  exigeConfirmacaoOrcamento: false,

  criarTeleAutomaticamente: true,

  usarOrcamentoEstruturado: false,

  mensagemAposCriarTele: "Já coloquei a entrega no sistema. Estou providenciando um motoboy.",

  mensagemAposAtribuirMotoboy: "O motoboy {nomeMotoboy} está a caminho.",
};

function normalizarTipo(tipo: string) {
  return String(tipo || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

function criarEntregaPetexame(entrada: EntradaMotorOperacional): ParadaAtendimento | null {
  const clienteSolicitante = entrada.clienteSolicitante;

  if (!clienteSolicitante) {
    return null;
  }

  return {
    tipo: "ENTREGA",

    textoOriginal: "Entrega final inferida automaticamente na PETEXAME.",

    cliente: clienteSolicitante.nome,

    endereco: clienteSolicitante.endereco,

    telefone: clienteSolicitante.telefone,

    confianca: 1,

    origem: "CONTEXTO_OPERACIONAL",

    confirmada: true,
  };
}

export function aplicarRegraPetexame(entrada: EntradaMotorOperacional): ResultadoMotorOperacional {
  const paradas = [...entrada.paradas];

  const clienteSolicitante = entrada.clienteSolicitante;

  const coletaExistente = paradas.find((parada) => normalizarTipo(parada.tipo) === "COLETA");

  const entregaExistente = paradas.find((parada) => normalizarTipo(parada.tipo) === "ENTREGA");

  const entregaEColetaExistente = paradas.find(
    (parada) => normalizarTipo(parada.tipo) === "ENTREGA_E_COLETA"
  );

  /*
   * Caso 1 e Caso 4:
   *
   * A PETEXAME informou somente um local externo.
   *
   * Resultado:
   * COLETA no local externo
   * ENTREGA na PETEXAME
   */
  if (paradas.length === 1 && !coletaExistente && entregaExistente && clienteSolicitante) {
    const coletaExterna: ParadaAtendimento = {
      ...entregaExistente,

      tipo: "COLETA",

      origem: entregaExistente.origem ?? "CONTEXTO_OPERACIONAL",

      confirmada: true,
    };

    const entregaPetexame = criarEntregaPetexame(entrada);

    return {
      regraAplicada: "PETEXAME",

      paradas: entregaPetexame ? [coletaExterna, entregaPetexame] : [coletaExterna],

      temRetorno: false,

      estrategia: estrategiaPetexame,

      avisos: [],
    };
  }

  /*
   * Caso 3:
   *
   * COLETA na PETEXAME
   * ENTREGA E COLETA no local externo
   * ENTREGA final na PETEXAME
   */
  if (coletaExistente && entregaEColetaExistente && clienteSolicitante) {
    const jaPossuiEntregaFinalPetexame = paradas.some((parada) => {
      const tipo = normalizarTipo(parada.tipo);

      const cliente = String(parada.cliente || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toUpperCase();

      const solicitante = clienteSolicitante.nome
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toUpperCase();

      return tipo === "ENTREGA" && cliente === solicitante;
    });

    if (!jaPossuiEntregaFinalPetexame) {
      const entregaPetexame = criarEntregaPetexame(entrada);

      if (entregaPetexame) {
        return {
          regraAplicada: "PETEXAME",

          paradas: [...paradas, entregaPetexame],

          temRetorno: false,

          estrategia: estrategiaPetexame,

          avisos: [],
        };
      }
    }
  }

  return {
    regraAplicada: "PETEXAME",

    paradas,

    temRetorno: false,

    estrategia: estrategiaPetexame,

    avisos: [],
  };
}
