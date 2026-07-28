import { NextResponse } from "next/server";

type Ponto = {
  lat: number;
  lng: number;
};

function decodificarPolyline(polyline: string): Ponto[] {
  const pontos: Ponto[] = [];

  let indice = 0;
  let latitude = 0;
  let longitude = 0;

  while (indice < polyline.length) {
    let resultado = 0;
    let deslocamento = 0;
    let byte: number;

    do {
      byte = polyline.charCodeAt(indice++) - 63;
      resultado |= (byte & 0x1f) << deslocamento;
      deslocamento += 5;
    } while (byte >= 0x20 && indice < polyline.length);

    const deltaLatitude = resultado & 1 ? ~(resultado >> 1) : resultado >> 1;

    latitude += deltaLatitude;

    resultado = 0;
    deslocamento = 0;

    do {
      byte = polyline.charCodeAt(indice++) - 63;
      resultado |= (byte & 0x1f) << deslocamento;
      deslocamento += 5;
    } while (byte >= 0x20 && indice < polyline.length);

    const deltaLongitude = resultado & 1 ? ~(resultado >> 1) : resultado >> 1;

    longitude += deltaLongitude;

    pontos.push({
      lat: latitude / 1e5,
      lng: longitude / 1e5,
    });
  }

  return pontos;
}

function escaparXml(valor: string) {
  return valor
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function gerarSvgRota(pontos: Ponto[]) {
  const largura = 900;
  const altura = 420;
  const margem = 42;

  const latitudes = pontos.map((ponto) => ponto.lat);
  const longitudes = pontos.map((ponto) => ponto.lng);

  const latitudeMinima = Math.min(...latitudes);
  const latitudeMaxima = Math.max(...latitudes);
  const longitudeMinima = Math.min(...longitudes);
  const longitudeMaxima = Math.max(...longitudes);

  const diferencaLatitude = Math.max(latitudeMaxima - latitudeMinima, 0.00001);

  const diferencaLongitude = Math.max(longitudeMaxima - longitudeMinima, 0.00001);

  const escalaX = (largura - margem * 2) / diferencaLongitude;

  const escalaY = (altura - margem * 2) / diferencaLatitude;

  const escala = Math.min(escalaX, escalaY);

  const larguraRota = diferencaLongitude * escala;
  const alturaRota = diferencaLatitude * escala;

  const deslocamentoX = (largura - larguraRota) / 2;
  const deslocamentoY = (altura - alturaRota) / 2;

  const coordenadas = pontos.map((ponto) => {
    const x = deslocamentoX + (ponto.lng - longitudeMinima) * escala;

    const y = altura - deslocamentoY - (ponto.lat - latitudeMinima) * escala;

    return {
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2)),
    };
  });

  const caminho = coordenadas
    .map((ponto, indice) => `${indice === 0 ? "M" : "L"} ${ponto.x} ${ponto.y}`)
    .join(" ");

  const inicio = coordenadas[0];
  const fim = coordenadas[coordenadas.length - 1];

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="${largura}"
  height="${altura}"
  viewBox="0 0 ${largura} ${altura}"
  role="img"
  aria-label="${escaparXml("Prévia da rota")}"
>
  <defs>
    <pattern
      id="grade"
      width="36"
      height="36"
      patternUnits="userSpaceOnUse"
    >
      <path
        d="M 36 0 L 0 0 0 36"
        fill="none"
        stroke="#dbe4ee"
        stroke-width="1"
      />
    </pattern>

    <filter
      id="sombra"
      x="-20%"
      y="-20%"
      width="140%"
      height="140%"
    >
      <feDropShadow
        dx="0"
        dy="3"
        stdDeviation="4"
        flood-color="#0f172a"
        flood-opacity="0.22"
      />
    </filter>
  </defs>

  <rect
    width="100%"
    height="100%"
    fill="#f1f5f9"
  />

  <rect
    width="100%"
    height="100%"
    fill="url(#grade)"
  />

  <path
    d="${caminho}"
    fill="none"
    stroke="#ffffff"
    stroke-width="15"
    stroke-linecap="round"
    stroke-linejoin="round"
    opacity="0.95"
  />

  <path
    d="${caminho}"
    fill="none"
    stroke="#059669"
    stroke-width="8"
    stroke-linecap="round"
    stroke-linejoin="round"
  />

  <g filter="url(#sombra)">
    <circle
      cx="${inicio.x}"
      cy="${inicio.y}"
      r="17"
      fill="#0f172a"
      stroke="#ffffff"
      stroke-width="5"
    />
    <text
      x="${inicio.x}"
      y="${inicio.y + 6}"
      text-anchor="middle"
      font-family="Arial, sans-serif"
      font-size="16"
      font-weight="700"
      fill="#ffffff"
    >1</text>
  </g>

  <g filter="url(#sombra)">
    <circle
      cx="${fim.x}"
      cy="${fim.y}"
      r="17"
      fill="#059669"
      stroke="#ffffff"
      stroke-width="5"
    />
    <text
      x="${fim.x}"
      y="${fim.y + 6}"
      text-anchor="middle"
      font-family="Arial, sans-serif"
      font-size="16"
      font-weight="700"
      fill="#ffffff"
    >2</text>
  </g>

  <rect
    x="20"
    y="${altura - 55}"
    width="225"
    height="35"
    rx="17.5"
    fill="#ffffff"
    opacity="0.93"
  />

  <text
    x="37"
    y="${altura - 32}"
    font-family="Arial, sans-serif"
    font-size="15"
    font-weight="600"
    fill="#334155"
  >Prévia do trajeto</text>
</svg>`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const polyline = searchParams.get("polyline");

  if (!polyline) {
    return NextResponse.json(
      {
        erro: "Polyline não informada.",
      },
      {
        status: 400,
      }
    );
  }

  try {
    const pontos = decodificarPolyline(polyline);

    if (pontos.length < 2) {
      return NextResponse.json(
        {
          erro: "A rota não possui pontos suficientes.",
        },
        {
          status: 400,
        }
      );
    }

    const chave = process.env.GOOGLE_MAPS_API_KEY;

    if (chave) {
      const inicio = pontos[0];
      const fim = pontos[pontos.length - 1];

      const parametros = new URLSearchParams({
        size: "600x300",
        scale: "2",
        format: "png",
        maptype: "roadmap",
        language: "pt-BR",
        region: "BR",
        key: chave,
      });

      parametros.append("path", `color:0x059669ff|weight:6|enc:${polyline}`);

      parametros.append("markers", `size:mid|color:0x0f172a|label:1|${inicio.lat},${inicio.lng}`);

      parametros.append("markers", `size:mid|color:0x059669|label:2|${fim.lat},${fim.lng}`);

      const urlGoogle = `https://maps.googleapis.com/maps/api/staticmap?${parametros.toString()}`;

      const respostaGoogle = await fetch(urlGoogle, {
        cache: "no-store",
      });

      const tipoConteudo = respostaGoogle.headers.get("content-type") || "";

      if (respostaGoogle.ok && tipoConteudo.startsWith("image/")) {
        const imagem = await respostaGoogle.arrayBuffer();

        return new NextResponse(imagem, {
          status: 200,
          headers: {
            "Content-Type": tipoConteudo,
            "Cache-Control": "private, max-age=300",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }

      const detalheErro = await respostaGoogle.text().catch(() => "");

      console.error(
        "Maps Static API não retornou uma imagem:",
        respostaGoogle.status,
        tipoConteudo,
        detalheErro.slice(0, 500)
      );
    } else {
      console.error("GOOGLE_MAPS_API_KEY não está configurada.");
    }

    const svg = gerarSvgRota(pontos);

    return new NextResponse(svg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "private, max-age=60",
        "X-Content-Type-Options": "nosniff",
        "X-Mapa-Fallback": "svg",
      },
    });
  } catch (erro) {
    console.error("Erro ao gerar imagem da rota:", erro);

    return NextResponse.json(
      {
        erro: "Não foi possível gerar a imagem da rota.",
      },
      {
        status: 500,
      }
    );
  }
}
