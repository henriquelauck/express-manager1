import { z } from "zod";

export const PedidoInterpretadoSchema = z.object({
  intencao: z.enum([
    "CRIAR_TELE",
    "CONSULTAR_STATUS",
    "CONSULTAR_VALOR",
    "FALAR_HUMANO",
    "DESCONHECIDO",
  ]),

  solicitante: z.string().nullable(),

  paradas: z.array(
    z.object({
      tipo: z
        .enum(["Coleta", "Entrega", "Trocar", "Entrega e coleta"])
        .describe(
          [
            'Use "Coleta" quando o motoboy apenas retirar algo no local.',
            'Use "Entrega" quando o motoboy apenas deixar algo no local.',
            'Use "Trocar" quando houver troca de um item por outro.',
            'Use "Entrega e coleta" quando o motoboy entregar algo e também retirar algo no mesmo local.',
            'Expressões como "vai ter coleta também", "pegar algo de volta", "deixar e buscar" ou "entregar e coletar" indicam "Entrega e coleta".',
          ].join(" ")
        ),

      texto: z
        .string()
        .describe(
          "Nome do local exatamente como o usuário escreveu, sem incluir verbos ou instruções."
        ),
    })
  ),

  precisaHumano: z.boolean(),

  informacoesFaltantes: z.array(z.string()),
});

export type PedidoInterpretado = z.infer<typeof PedidoInterpretadoSchema>;
