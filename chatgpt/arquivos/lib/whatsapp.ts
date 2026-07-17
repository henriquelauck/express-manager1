import { Tele } from "@/types/Tele";

export function normalizarTelefone(telefone: string) {
  const numeros = telefone.replace(/\D/g, "");

  if (!numeros) return "";

  if (numeros.startsWith("55")) {
    return numeros;
  }

  return `55${numeros}`;
}

function gerarLinkRotaGoogleMaps(tele: Tele) {
  const enderecos = tele.paradas
    .map((parada) => parada.endereco?.trim())
    .filter((endereco): endereco is string => Boolean(endereco));

  if (enderecos.length < 2) {
    return "";
  }

  const origem = enderecos[0];
  const destino = enderecos[enderecos.length - 1];
  const paradasIntermediarias = enderecos.slice(1, -1);

  const parametros = new URLSearchParams({
    api: "1",
    origin: origem,
    destination: destino,
    travelmode: "driving",
  });

  if (paradasIntermediarias.length > 0) {
    parametros.set("waypoints", paradasIntermediarias.join("|"));
  }

  return `https://www.google.com/maps/dir/?${parametros.toString()}`;
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

    if (parada.contato) {
      texto += `Contato: ${parada.contato}

`;
    }

    if (parada.observacao) {
      texto += `Obs: ${parada.observacao}

`;
    }

    texto += `--------------------

`;
  });

  texto += `Valor da tele: R$ ${tele.total.toFixed(2).replace(".", ",")}`;

  const linkRota = gerarLinkRotaGoogleMaps(tele);

  if (linkRota) {
    texto += `

🗺️ Abrir rota no Google Maps:
${linkRota}`;
  }

  return texto;
}
