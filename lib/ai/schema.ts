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
    tipo: z.enum(["Coleta", "Entrega", "Trocar", "Entrega e coleta"]),

    texto: z.string().describe(
      "Nome exatamente como o usuário escreveu."
    ),
  })
),

  precisaHumano: z.boolean(),

  informacoesFaltantes: z.array(z.string()),
});

export type PedidoInterpretado = z.infer<typeof PedidoInterpretadoSchema>;
