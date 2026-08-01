import { NextResponse } from "next/server";

const VERSAO_ATUAL = {
  versionCode: 4,
  versionName: "1.1.2",
  obrigatoria: false,
  mensagem:
    "Nova versão com botões inteligentes para abrir localização, GPS, notificações, bateria e configurações especiais do aparelho.",
  apkUrl:
    "https://express-manager1.vercel.app/downloads/express-manager-motoboy-1.1.2.apk",
};

export async function GET() {
  return NextResponse.json(VERSAO_ATUAL, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
