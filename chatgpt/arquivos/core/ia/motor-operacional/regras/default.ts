import type { ParadaAtendimento } from "@/core/ia/atendimento/sessao/Atendimento";
import type { EntradaMotorOperacional, ResultadoMotorOperacional } from "../tipos";

const estrategiaDefault = {
  exigeConfirmacaoOrcamento: true,

  criarTeleAutomaticamente: false,

  usarOrcamentoEstruturado: true,

  mensagemAposCriarTele: null,

  mensagemAposAtribuirMotoboy: null,
};

function normalizarTipo(tipo: string) {
  return String(tipo || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

export function aplicarRegraDefault(entrada: EntradaMotorOperacional): ResultadoMotorOperacional {
  const paradas = [...entrada.paradas];

  const coletaExistente = paradas.find((parada) => normalizarTipo(parada.tipo) === "COLETA");

  const entregaExistente = paradas.find((parada) => normalizarTipo(parada.tipo) === "ENTREGA");

  const clienteSolicitante = entrada.clienteSolicitante;

  if (paradas.length === 1 && !coletaExistente && entregaExistente && clienteSolicitante) {
    const coletaInferida: ParadaAtendimento = {
      tipo: "COLETA",

      textoOriginal: "Coleta inferida automaticamente no solicitante.",

      cliente: clienteSolicitante.nome,

      endereco: clienteSolicitante.endereco,

      telefone: clienteSolicitante.telefone,

      confianca: 1,

      origem: "CONTEXTO_OPERACIONAL",

      confirmada: true,
    };

    return {
      regraAplicada: "DEFAULT",

      paradas: [coletaInferida, ...paradas],

      temRetorno: false,

      avisos: [],

      estrategia: estrategiaDefault,
    };
  }

  return {
    regraAplicada: "DEFAULT",

    paradas,

    temRetorno: false,

    avisos: [],

    estrategia: estrategiaDefault,
  };
}
