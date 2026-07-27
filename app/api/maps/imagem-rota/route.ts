import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const polyline = searchParams.get("polyline");

  if (!polyline) {
    return NextResponse.json({ erro: "Polyline não informada." }, { status: 400 });
  }

  const chaveGoogleMaps = process.env.GOOGLE_MAPS_API_KEY;

  if (!chaveGoogleMaps) {
    return NextResponse.json({ erro: "GOOGLE_MAPS_API_KEY não configurada." }, { status: 500 });
  }

  try {
    const url = new URL("https://maps.googleapis.com/maps/api/staticmap");

    url.searchParams.set("size", "900x420");
    url.searchParams.set("scale", "2");
    url.searchParams.set("maptype", "roadmap");
    url.searchParams.set("path", `weight:5|color:0x059669ff|enc:${polyline}`);
    url.searchParams.set("key", chaveGoogleMaps);

    const respostaGoogle = await fetch(url, {
      cache: "no-store",
    });

    if (!respostaGoogle.ok) {
      const mensagem = await respostaGoogle.text();

      console.error("Erro ao buscar imagem estática da rota:", respostaGoogle.status, mensagem);

      return NextResponse.json(
        {
          erro: "Não foi possível carregar a imagem da rota.",
        },
        {
          status: respostaGoogle.status,
        }
      );
    }

    const imagem = await respostaGoogle.arrayBuffer();
    const contentType = respostaGoogle.headers.get("content-type") || "image/png";

    return new NextResponse(imagem, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (erro) {
    console.error("Erro ao gerar imagem estática da rota:", erro);

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
