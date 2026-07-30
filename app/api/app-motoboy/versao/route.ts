import { NextResponse } from "next/server";

const VERSAO_ATUAL = {
  versionCode: 2,
  versionName: "1.1.0",
  obrigatoria: false,
  mensagem:
    "Uma nova versão do Express Manager está disponível. Atualize para receber melhorias de estabilidade e notificações.",
  apkUrl:
    "https://express-manager1.vercel.app/downloads/express-manager-motoboy-1.1.0.apk",
};

export async function GET() {
  return NextResponse.json(VERSAO_ATUAL, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
