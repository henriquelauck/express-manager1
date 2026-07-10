import { zodTextFormat } from "openai/helpers/zod";
import { openai } from "./client";
import { PROMPT_SISTEMA } from "./promptSistema";
import { PedidoInterpretadoSchema } from "./schema";

export async function interpretarPedido(mensagem: string) {
  const resposta = await openai.responses.parse({
    model: "gpt-5.6",

    input: [
      {
        role: "system",
        content: PROMPT_SISTEMA,
      },
      {
        role: "user",
        content: mensagem,
      },
    ],

    text: {
      format: zodTextFormat(PedidoInterpretadoSchema, "pedido"),
    },
  });

  if (!resposta.output_parsed) {
    throw new Error("A IA não retornou um pedido interpretado.");
  }

  return resposta.output_parsed;
}
