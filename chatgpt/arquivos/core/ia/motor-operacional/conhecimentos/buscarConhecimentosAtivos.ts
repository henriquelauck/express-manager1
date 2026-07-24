import { prisma } from "@/lib/prisma";

export type ConhecimentoOperacionalAtivo = {
  id: string;

  titulo: string;

  descricao: string;

  categoria:
    | "INTERPRETACAO"
    | "REGRA_OPERACIONAL"
    | "RESPOSTA_CLIENTE"
    | "ORCAMENTO"
    | "DESPACHO"
    | "MOTOBOY"
    | "COBRANCA"
    | "OUTRO";

  solicitante: string | null;

  regra: unknown;

  confianca: number;

  quantidadeExemplos: number;
};

function normalizarNome(nome: string | null | undefined) {
  return String(nome ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase();
}

export async function buscarConhecimentosAtivos({
  solicitante,
  categoria,
}: {
  solicitante: string | null;

  categoria?: ConhecimentoOperacionalAtivo["categoria"];
}): Promise<ConhecimentoOperacionalAtivo[]> {
  const conhecimentos = await prisma.conhecimentoIA.findMany({
    where: {
      status: "APROVADO",

      ativo: true,

      ...(categoria
        ? {
            categoria,
          }
        : {}),

      OR: [
        {
          solicitante: null,
        },

        ...(solicitante
          ? [
              {
                solicitante: {
                  equals: solicitante,

                  mode: "insensitive" as const,
                },
              },
            ]
          : []),
      ],
    },

    orderBy: [
      {
        confianca: "desc",
      },

      {
        quantidadeExemplos: "desc",
      },

      {
        updatedAt: "desc",
      },
    ],

    select: {
      id: true,

      titulo: true,

      descricao: true,

      categoria: true,

      solicitante: true,

      regra: true,

      confianca: true,

      quantidadeExemplos: true,
    },
  });

  const solicitanteNormalizado = normalizarNome(solicitante);

  /*
   * Proteção adicional:
   * conhecimentos específicos de outro solicitante nunca
   * podem ser aplicados ao atendimento atual.
   */
  return conhecimentos.filter((conhecimento) => {
    if (!conhecimento.solicitante) {
      return true;
    }

    return normalizarNome(conhecimento.solicitante) === solicitanteNormalizado;
  });
}
