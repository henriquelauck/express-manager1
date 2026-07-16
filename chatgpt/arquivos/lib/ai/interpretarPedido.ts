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

REGRAS OBRIGATÓRIAS DE SEGURANÇA:
- Nunca invente nome de cliente.
- Nunca use conhecimento externo para completar nomes.
- Quando houver um cliente reconhecido com alta confiança, use exatamente o nome cadastrado.
- O campo cliente de cada parada deve conter um nome cadastrado ou o texto literal informado pelo usuário.
- Se nenhum cliente cadastrado corresponder com segurança, preserve o texto literal informado.
- Se o solicitante não estiver explícito, use null e inclua "solicitante" em informacoesFaltantes.
- Não invente endereço, telefone, tipo de parada, retorno ou observação.
- Não transforme uma informação ambígua em certeza.

REGRAS PARA MENSAGENS REAIS DE WHATSAPP:
- Clientes podem enviar pedidos sem usar verbos como buscar, entregar, coletar ou levar.
- Um bloco contendo nome de pessoa, empresa, clínica ou local junto de um endereço deve ser considerado uma parada operacional provável.
- Emojis como 📍, ➜, ➡️, 🏠 ou marcadores semelhantes podem separar nome, endereço e observação.
- Quebras de linha podem separar diferentes campos da mesma parada.
- Preserve o endereço completo exatamente como foi informado.
- Texto adicional como "deixar na portaria", "chamar no local", "casa 09" ou "falar com fulano" deve ser preservado como observação, quando o schema permitir.
- Não descarte uma mensagem apenas porque ela não contém verbo.

COMO INTERPRETAR BLOCOS:
Exemplo 1:
"📍 CLÍNICA LOVATO
📍 R. Gomes Jardim, 2"

Interpretação:
- Existe uma parada provável.
- cliente/texto: "CLÍNICA LOVATO"
- endereço: "R. Gomes Jardim, 2"
- A intenção pode ser CRIAR_TELE quando o conteúdo representa claramente uma solicitação logística.
- Se não for possível determinar se é coleta ou entrega, não invente: use o tipo mais compatível permitido pelo schema e registre a informação faltante correspondente.

Exemplo 2:
"DRA. MARTHYNA SCHUCH
Rua Maria Olinda Teles, número 900, casa 09
Pode deixar na portaria"

Interpretação:
- cliente/texto: "DRA. MARTHYNA SCHUCH"
- endereço: "Rua Maria Olinda Teles, número 900, casa 09"
- observação: "Pode deixar na portaria", quando houver campo compatível.
- A ausência de verbo não torna a mensagem inválida.

Exemplo 3:
"Pegar material aqui para entrega
DRA. MARTHYNA SCHUCH
Rua Maria Olinda Teles, número 900"

Interpretação:
- coleta: "aqui"
- entrega: "DRA. MARTHYNA SCHUCH"
- endereço da entrega: "Rua Maria Olinda Teles, número 900"

REGRAS DE INTENÇÃO:
- Use CRIAR_TELE quando a mensagem contiver uma solicitação logística explícita ou um bloco operacional claro com local e endereço.
- Não use DESCONHECIDO somente pela ausência de verbo.
- Use DESCONHECIDO quando a mensagem realmente não representar uma solicitação logística nem contiver dados suficientes de uma parada.
- Quando houver uma parada completa, mas faltar a outra, mantenha CRIAR_TELE e liste apenas a informação realmente faltante.
- Não marque precisaHumano=true apenas porque a mensagem está escrita de forma curta ou em formato de lista.
- Marque precisaHumano=true somente quando existir ambiguidade operacional relevante que o sistema não consiga resolver com segurança.

REGRAS PARA COLETA E ENTREGA:
- Expressões como "aqui", "na loja", "na empresa" e "na clínica" podem representar o próprio solicitante.
- Expressões introduzidas por "para", "entrega", "levar", "destino" ou seta normalmente indicam entrega.
- Expressões introduzidas por "pegar", "buscar", "coletar", "retirar" ou "origem" normalmente indicam coleta.
- Quando houver dois blocos claros, preserve a ordem e os sinais linguísticos para distinguir coleta e entrega.
- Quando houver apenas um bloco e o tipo não estiver claro, não invente certeza absoluta.

RETORNO DA INTERPRETAÇÃO:
- Preserve todo texto útil da mensagem.
- Evite perder endereço ou observação ao reconhecer o cliente.
- Uma parada pode ter cliente literal e endereço explícito mesmo que o cliente não exista no cadastro.
- informacoesFaltantes deve conter apenas dados realmente ausentes.
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
