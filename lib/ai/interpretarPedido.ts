import { normalizarMensagem } from "@/core/ia/normalizacao/normalizarMensagem";
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

export async function interpretarPedido(mensagem: string, _contexto: ContextoInterpretacao) {
  const mensagemNormalizada = normalizarMensagem(mensagem);
  const resposta = await openai.responses.parse({
    model: "gpt-5.6",

    input: [
      {
        role: "system",

        content: `${PROMPT_SISTEMA}

REGRAS OBRIGATÓRIAS PARA O CAMPO "texto":

- O campo "texto" representa somente o local da parada.
- Nunca coloque a frase inteira da mensagem no campo "texto".
- Nunca inclua verbos como pegar, buscar, levar, entregar ou coletar.
- Nunca inclua objetos como material, produto, documento ou aparelho.
- Nunca inclua instruções como "vai ter coleta também".
- Preserve referências de local como "aqui", "na loja" ou "na clínica".
- O reconhecimento do cliente será feito posteriormente pelo Express Manager.

REGRA PARA A EXPRESSÃO "VAI TER COLETA TAMBÉM":

Quando o usuário disser que vai entregar em um local
e que nesse mesmo local haverá coleta também,
a parada desse local deve ser do tipo:

"Entrega e coleta"

A expressão "vai ter coleta também" modifica o local de destino
mencionado imediatamente antes dela.

EXEMPLO OBRIGATÓRIO:

Mensagem:
"Pegar material aqui e levar na Lovato, vai ter coleta também"

Resultado esperado:

{
  "intencao": "CRIAR_TELE",
  "solicitante": null,
  "paradas": [
    {
      "tipo": "Coleta",
      "texto": "aqui"
    },
    {
      "tipo": "Entrega e coleta",
      "texto": "Lovato"
    }
  ],
  "precisaHumano": false,
  "informacoesFaltantes": []
}

OUTROS EXEMPLOS:

Mensagem:
"Pegar aqui e entregar na Lovato"

Paradas:

[
  {
    "tipo": "Coleta",
    "texto": "aqui"
  },
  {
    "tipo": "Entrega",
    "texto": "Lovato"
  }
]

Mensagem:
"Buscar na SOS Animal"

Paradas:

[
  {
    "tipo": "Coleta",
    "texto": "SOS Animal"
  }
]

Não identifique clientes cadastrados.
Não resolva endereços.
Não aplique regras específicas da PETEXAME.
Somente interprete as ações e os locais mencionados.
`,
      },
      {
        role: "user",

        content: `
MENSAGEM ORIGINAL:

${mensagemNormalizada.mensagemOriginal}

ESTRUTURA IDENTIFICADA PELO EXPRESS MANAGER:

${mensagemNormalizada.contextoParaIA}

INSTRUÇÃO:

Interprete a mensagem original usando a estrutura identificada apenas
como auxílio. Preserve no campo "texto" o nome do local informado pelo
usuário. Não coloque o endereço no campo "texto".
`,
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
