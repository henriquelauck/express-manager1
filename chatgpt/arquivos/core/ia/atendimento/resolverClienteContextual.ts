import { reconhecerClientesNaMensagem } from "@/core/reconhecimento";

export type ClienteDisponivelContextual = {
  id: string;
  nome: string;
  telefone: string | null;
  endereco1: string | null;
  endereco2: string | null;
};

export type ResultadoClienteContextual = {
  encontrado: boolean;

  textoOriginal: string;

  textoNormalizado: string;

  cliente: ClienteDisponivelContextual | null;

  confianca: number;

  motivo: string;
};

function normalizarTexto(texto: string) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function removerPrefixosDeLocal(texto: string) {
  let resultado = normalizarTexto(texto);

  const prefixos = [
    "aqui na ",
    "aqui no ",
    "aqui em ",
    "aqui ",
    "na loja da ",
    "na loja do ",
    "na loja ",
    "na empresa da ",
    "na empresa do ",
    "na empresa ",
    "na clinica ",
    "na clínica ",
    "no cliente ",
    "na cliente ",
    "na ",
    "no ",
    "em ",
  ]
    .map(normalizarTexto)
    .sort(
      (prefixoA, prefixoB) =>
        prefixoB.length - prefixoA.length
    );

  for (const prefixo of prefixos) {
    if (resultado.startsWith(prefixo)) {
      resultado = resultado
        .slice(prefixo.length)
        .trim();

      break;
    }
  }

  return resultado;
}

function localizarClientePorNome(
  nome: string,
  clientes: ClienteDisponivelContextual[]
) {
  const nomeNormalizado = normalizarTexto(nome);

  return clientes.find(
    (cliente) =>
      normalizarTexto(cliente.nome) ===
      nomeNormalizado
  );
}

export function resolverClienteContextual({
  texto,
  clientes,
}: {
  texto: string;
  clientes: ClienteDisponivelContextual[];
}): ResultadoClienteContextual {
  const textoOriginal = String(texto || "").trim();

  const textoNormalizado =
    removerPrefixosDeLocal(textoOriginal);

  if (!textoNormalizado) {
    return {
      encontrado: false,

      textoOriginal,

      textoNormalizado,

      cliente: null,

      confianca: 0,

      motivo:
        "A resposta não contém um nome de cliente ou local identificável.",
    };
  }

  const clienteExato = localizarClientePorNome(
    textoNormalizado,
    clientes
  );

  if (clienteExato) {
    return {
      encontrado: true,

      textoOriginal,

      textoNormalizado,

      cliente: clienteExato,

      confianca: 1,

      motivo:
        `O texto "${textoOriginal}" corresponde exatamente ao cliente "${clienteExato.nome}".`,
    };
  }

  const nomesClientes = clientes.map(
    (cliente) => cliente.nome
  );

  const reconhecidos =
    reconhecerClientesNaMensagem(
      textoNormalizado,
      nomesClientes
    );

  const melhorResultado = reconhecidos[0];

  if (
    !melhorResultado ||
    !melhorResultado.confiavel
  ) {
    return {
      encontrado: false,

      textoOriginal,

      textoNormalizado,

      cliente: null,

      confianca:
        melhorResultado?.score ?? 0,

      motivo: melhorResultado
        ? `O cliente mais próximo foi "${melhorResultado.nome}", mas a confiança de ${Math.round(
            melhorResultado.score * 100
          )}% não é suficiente.`
        : "Nenhum cliente cadastrado foi reconhecido na resposta.",
    };
  }

  const clienteReconhecido =
    localizarClientePorNome(
      melhorResultado.nome,
      clientes
    );

  if (!clienteReconhecido) {
    return {
      encontrado: false,

      textoOriginal,

      textoNormalizado,

      cliente: null,

      confianca:
        melhorResultado.score,

      motivo:
        "O reconhecimento encontrou um nome, mas o cadastro correspondente não foi localizado.",
    };
  }

  return {
    encontrado: true,

    textoOriginal,

    textoNormalizado,

    cliente: clienteReconhecido,

    confianca:
      melhorResultado.score,

    motivo:
      `O texto "${textoOriginal}" foi reconhecido como o cliente "${clienteReconhecido.nome}".`,
  };
}