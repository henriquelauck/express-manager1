import { zodTextFormat } from "openai/helpers/zod";
import { openai } from "./client";
import { PROMPT_SISTEMA } from "./promptSistema";
import { PedidoInterpretadoSchema } from "./schema";

type ContextoInterpretacao = {
  clientes: string[];

  clientesReconhecidos: {
    nome: string;
    score: number;
    confiavel: boolean;
  }[];
};

export async function interpretarPedido(mensagem: string, contexto: ContextoInterpretacao) {
  const clientesCadastrados =
    contexto.clientes.length > 0 ? contexto.clientes.join(", ") : "Nenhum cliente cadastrado.";

  const clientesReconhecidos =
    contexto.clientesReconhecidos.length > 0
      ? contexto.clientesReconhecidos
          .map((cliente) => `${cliente.nome} — confiança ${Math.round(cliente.score * 100)}%`)
          .join("\n")
      : "Nenhum cliente provável foi reconhecido.";

  const resposta = await openai.responses.parse({
    model: "gpt-5.6",

    input: [
      {
        role: "system",
        content: `${PROMPT_SISTEMA}

CLIENTES CADASTRADOS:
${clientesCadastrados}

CLIENTES PROVAVELMENTE MENCIONADOS NA MENSAGEM:
${clientesReconhecidos}

REGRAS OBRIGATÓRIAS:
- Nunca invente nome de cliente.
- Nunca use conhecimento externo para completar nomes.
- Quando houver um cliente reconhecido com alta confiança, use exatamente o nome cadastrado.
- O campo cliente de cada parada deve conter um nome cadastrado ou o texto literal informado pelo usuário.
- Se nenhum cliente cadastrado corresponder com segurança, marque precisaHumano=true.
- Se o solicitante não estiver explícito, use null e inclua "solicitante" em informacoesFaltantes.
`,
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
