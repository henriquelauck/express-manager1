import { NextResponse } from "next/server";

export async function POST() {
  const resposta = NextResponse.json({ ok: true });

  resposta.cookies.delete("express_user_id");
  resposta.cookies.delete("express_user_role");

  return resposta;
}