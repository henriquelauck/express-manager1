import { NextResponse } from "next/server";

const VERSAO_ATUAL = {
  versionCode: 3,
  versionName: "1.1.1",
  obrigatoria: false,
  mensagem:
    "Uma nova versão do Express Manager está disponível. Esta atualização valida o novo sistema automático de atualização do aplicativo.",
  apkUrl:
    "https://express-manager1.vercel.app/downloads/express-manager-motoboy-1.1.1.apk",
};

export async function GET() {
  return NextResponse.json(VERSAO_ATUAL, {
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
