import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const polyline = searchParams.get("polyline");

  if (!polyline) {
    return NextResponse.json(
      { erro: "Polyline não informada." },
      { status: 400 }
    );
  }

  if (!process.env.GOOGLE_MAPS_API_KEY) {
    return NextResponse.json(
      { erro: "GOOGLE_MAPS_API_KEY não configurada." },
      { status: 500 }
    );
  }

  const url = new URL("https://maps.googleapis.com/maps/api/staticmap");

  url.searchParams.set("size", "900x420");
  url.searchParams.set("scale", "2");
  url.searchParams.set("maptype", "roadmap");
  url.searchParams.set("path", `weight:5|color:0x059669ff|enc:${polyline}`);
  url.searchParams.set("key", process.env.GOOGLE_MAPS_API_KEY);

  return NextResponse.redirect(url.toString());
}