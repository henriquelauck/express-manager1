import type { ParadaAtendimento } from "@/core/ia/atendimento/sessao/Atendimento";

export type ClienteSolicitanteOperacional = {
  nome: string;
  endereco: string;
  telefone: string | null;
};

export type EstrategiaAtendimentoOperacional = {
  exigeConfirmacaoOrcamento: boolean;

  criarTeleAutomaticamente: boolean;

  usarOrcamentoEstruturado: boolean;

  mensagemAposCriarTele: string | null;

  mensagemAposAtribuirMotoboy: string | null;
};

export type EntradaMotorOperacional = {
  mensagemOriginal: string;

  solicitante: string | null;

  clienteSolicitante: ClienteSolicitanteOperacional | null;

  paradas: ParadaAtendimento[];
};

export type ResultadoMotorOperacional = {
  regraAplicada: string;

  paradas: ParadaAtendimento[];

  temRetorno: boolean;

  avisos: string[];

  estrategia: EstrategiaAtendimentoOperacional;
};

export type RegraOperacional = (
  entrada: EntradaMotorOperacional
) => ResultadoMotorOperacional;