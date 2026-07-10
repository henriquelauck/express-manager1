import { interpretarPedido } from "@/lib/ai/interpretarPedido";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const pedido = await interpretarPedido(body.mensagem);

    return NextResponse.json(pedido);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        erro: "Erro ao interpretar pedido.",
      },
      {
        status: 500,
      }
    );
  }
}
