import { Tele } from "@/types/Tele";

export function normalizarTelefone(telefone: string) {
  const numeros = telefone.replace(/\D/g, "");

  if (!numeros) return "";

  if (numeros.startsWith("55")) {
    return numeros;
  }

  return `55${numeros}`;
}

export function gerarTextoOrcamento(tele: Tele) {
  let texto = `Olá!

Segue orçamento da tele:

`;

  tele.paradas.forEach((parada) => {
    texto += `${parada.tipo}

${parada.cliente}

${parada.endereco}

`;

    if (parada.observacao) {
      texto += `Obs: ${parada.observacao}

`;
    }

    texto += `--------------------

`;
  });

  texto += `Valor: R$ ${tele.total.toFixed(2).replace(".", ",")}

Aguardamos sua confirmação.`;

  return texto;
}

export function gerarTextoMotoboy(tele: Tele) {
  let texto = `🚨 NOVA TELE

`;

  tele.paradas.forEach((parada) => {
    texto += `${parada.tipo}

${parada.cliente}

${parada.endereco}

`;

    if (parada.observacao) {
      texto += `Obs: ${parada.observacao}

`;
    }

    texto += `--------------------

`;
  });

  texto += `Valor da tele: R$ ${tele.total
    .toFixed(2)
    .replace(".", ",")}`;

  return texto;
}