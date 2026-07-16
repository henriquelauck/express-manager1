type ParadaInterpretada = {
  tipo: string;
  texto: string;
};

export type ParadaComContexto = ParadaInterpretada & {
  textoOriginal: string;
  resolvidaPorContexto: boolean;
  motivoContexto: string | null;
};

const referenciasAoSolicitante = new Set([
  "aqui",
  "loja",
  "a loja",
  "na loja",
  "nossa loja",
  "na nossa loja",
  "empresa",
  "a empresa",
  "na empresa",
  "nossa empresa",
  "na nossa empresa",
  "aqui na loja",
  "aqui na empresa",
  "meu endereco",
  "nosso endereco",
]);

function normalizarTexto(texto: string) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function ehColeta(tipo: string) {
  return normalizarTexto(tipo) === "coleta";
}

function referenciaAoProprioSolicitante(
  texto: string
) {
  return referenciasAoSolicitante.has(
    normalizarTexto(texto)
  );
}

export function resolverContextoParadas(
  paradas: ParadaInterpretada[],
  solicitante: string | null
): ParadaComContexto[] {
  return paradas.map((parada) => {
    const textoOriginal = parada.texto;

    const podeUsarSolicitante =
      Boolean(solicitante) &&
      ehColeta(parada.tipo) &&
      referenciaAoProprioSolicitante(
        parada.texto
      );

    if (!podeUsarSolicitante || !solicitante) {
      return {
        ...parada,
        textoOriginal,
        resolvidaPorContexto: false,
        motivoContexto: null,
      };
    }

    return {
      ...parada,

      textoOriginal,

      texto: solicitante,

      resolvidaPorContexto: true,

      motivoContexto:
        `A referência "${textoOriginal}" foi interpretada como o próprio solicitante "${solicitante}".`,
    };
  });
}