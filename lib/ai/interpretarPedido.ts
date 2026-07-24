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

  historico?: {
    autor: string;
    direcao: string;
    horario: string;
    conteudo: string;
  }[];

  memoria?: {
    solicitante?: string | null;

    exemplos: {
      mensagemCliente: string;
      respostaHumana: string | null;
      interpretacaoIA: unknown;
      sugestaoIA: unknown;
      operacaoFinal: unknown;
      corrigido: boolean;
      aprovado: boolean;
      observacaoHumana: string | null;
      relevancia: number;
    }[];
  } | null;
};

function converterParaTextoSeguro(valor: unknown) {
  if (valor === null || valor === undefined) {
    return null;
  }

  try {
    return JSON.stringify(valor, null, 2);
  } catch {
    return String(valor);
  }
}

function montarHistoricoConversa(contexto: ContextoInterpretacao) {
  const historico = contexto.historico ?? [];

  if (historico.length === 0) {
    return null;
  }

  const mensagensFormatadas = historico.map((mensagem, index) => {
    const identificacao = [
      mensagem.horario ? `[${mensagem.horario}]` : null,
      mensagem.autor || "DESCONHECIDO",
    ]
      .filter(Boolean)
      .join(" ");

    return `${index + 1}. ${identificacao}:
${mensagem.conteudo}`;
  });

  return `
HISTÓRICO ESTRUTURADO DA CONVERSA:

As mensagens abaixo estão em ordem cronológica.

Analise a conversa como um atendimento completo.

Não interprete cada mensagem isoladamente.

Uma mensagem pode complementar, corrigir ou substituir informações
enviadas anteriormente.

${mensagensFormatadas.join("\n\n")}
`;
}

function montarContextoMemoria(contexto: ContextoInterpretacao) {
  const exemplos = contexto.memoria?.exemplos ?? [];

  if (exemplos.length === 0) {
    return `
MEMÓRIA DE ATENDIMENTOS ANTERIORES:

Nenhum atendimento anterior relevante foi encontrado.

Interprete a mensagem normalmente, sem inventar comportamentos,
locais, clientes, endereços ou decisões anteriores.
`;
  }

  const exemplosFormatados = exemplos.map((exemplo, index) => {
    const interpretacaoAnterior = converterParaTextoSeguro(exemplo.interpretacaoIA);

    const operacaoFinal = converterParaTextoSeguro(exemplo.operacaoFinal);

    return `
EXEMPLO ${index + 1}

Relevância aproximada:
${exemplo.relevancia}

Mensagem recebida:
${exemplo.mensagemCliente}

Resposta real do Henrique:
${exemplo.respostaHumana ?? "Não registrada"}

Interpretação anterior:
${interpretacaoAnterior ?? "Não registrada"}

Operação final:
${operacaoFinal ?? "Não registrada"}

Foi corrigido pelo Henrique:
${exemplo.corrigido ? "Sim" : "Não"}

Foi aprovado:
${exemplo.aprovado ? "Sim" : "Não"}

Observação do Henrique:
${exemplo.observacaoHumana ?? "Nenhuma"}
`;
  });

  return `
MEMÓRIA DE ATENDIMENTOS ANTERIORES:

Solicitante atual:
${contexto.memoria?.solicitante ?? "Não identificado"}

Os exemplos abaixo são atendimentos anteriores do Express Manager.

Use-os como referência para entender:

- como Henrique interpretou mensagens parecidas;
- quais correções ele realizou;
- qual foi a operação final;
- como situações semelhantes costumam ser tratadas.

Priorize exemplos corrigidos ou aprovados.

Não copie cegamente um exemplo.

Não invente informações que não estejam na mensagem atual ou que não
possam ser justificadas claramente pelo contexto anterior.

${exemplosFormatados.join("\n")}
`;
}

export async function interpretarPedido(mensagem: string, contexto: ContextoInterpretacao) {
  const mensagemNormalizada = normalizarMensagem(mensagem);

  const contextoMemoria = montarContextoMemoria(contexto);

  const historicoConversa = montarHistoricoConversa(contexto);

  const resposta = await openai.responses.parse({
    model: "gpt-5.6",

    input: [
      {
        role: "system",

        content: `${PROMPT_SISTEMA}

Você está interpretando um atendimento do Express Manager.

O atendimento pode conter somente uma mensagem ou um histórico completo
de conversa.

Quando existir um histórico estruturado:

- leia todas as mensagens em ordem cronológica;
- entenda o pedido pelo conjunto completo da conversa;
- considere que mensagens posteriores podem complementar informações anteriores;
- considere que mensagens posteriores podem corrigir informações anteriores;
- não trate cada mensagem como um pedido separado;
- gere uma única interpretação consolidada do atendimento.

Você pode receber exemplos de atendimentos anteriores realizados ou
corrigidos por Henrique.

Esses exemplos servem como memória operacional.

Quando houver exemplos relevantes:

- observe como Henrique resolveu situações parecidas;
- dê prioridade às correções humanas;
- considere a operação final registrada;
- preserve o padrão de interpretação usado por Henrique;
- não repita erros anteriores da IA.

A memória nunca autoriza inventar coleta, entrega, endereço, retorno,
cliente ou outra informação que não esteja sustentada pela conversa.

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

${historicoConversa ?? ""}

${contextoMemoria}
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

Quando houver histórico estruturado, interprete o atendimento completo
usando todas as mensagens em ordem cronológica.

Quando não houver histórico estruturado, interprete apenas a mensagem
original.

Use a estrutura identificada e a memória anterior apenas como auxílio.

Preserve no campo "texto" o nome do local informado pelo usuário.

Não coloque o endereço no campo "texto".

Quando existir uma correção anterior claramente aplicável, siga o padrão
corrigido por Henrique.
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
