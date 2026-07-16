import type { DadosComplementaresParada, ParadaAtendimento } from "./sessao/Atendimento";

export type CampoComplementarPendente = "NOME_CLIENTE" | "COBRAR_ENTREGA";

export type PendenciaDadosComplementares = {
  indiceParada: number;

  parada: ParadaAtendimento;

  camposPendentes: CampoComplementarPendente[];
};

function criarDadosComplementaresVazios(): DadosComplementaresParada {
  return {
    nomeCliente: null,

    cobrarEntrega: null,
  };
}

export function garantirDadosComplementares(parada: ParadaAtendimento): ParadaAtendimento {
  if (parada.dadosComplementares) {
    return parada;
  }

  return {
    ...parada,

    dadosComplementares: criarDadosComplementaresVazios(),
  };
}

function paradaPrecisaDadosComplementares(parada: ParadaAtendimento) {
  /*
   * Só pedimos dados complementares quando a parada já possui
   * endereço suficiente para calcular a rota.
   *
   * O endereço continua sendo obrigatório no fluxo principal.
   */
  return Boolean(parada.endereco);
}

export function detectarDadosComplementaresPendentes(
  paradas: ParadaAtendimento[]
): PendenciaDadosComplementares[] {
  return paradas
    .map((paradaOriginal, indiceParada) => {
      const parada = garantirDadosComplementares(paradaOriginal);

      if (!paradaPrecisaDadosComplementares(parada)) {
        return null;
      }

      const dados = parada.dadosComplementares;

      const camposPendentes: CampoComplementarPendente[] = [];

      /*
       * Se a parada já possui um cliente identificado, usamos esse
       * nome como suficiente e não perguntamos novamente.
       */
      const possuiNome = Boolean(parada.cliente?.trim()) || Boolean(dados?.nomeCliente?.trim());

      if (!possuiNome) {
        camposPendentes.push("NOME_CLIENTE");
      }

      if (dados?.cobrarEntrega === null) {
        camposPendentes.push("COBRAR_ENTREGA");
      }

      return {
        indiceParada,

        parada,

        camposPendentes,
      };
    })
    .filter(
      (pendencia): pendencia is PendenciaDadosComplementares =>
        pendencia !== null && pendencia.camposPendentes.length > 0
    );
}
