import {
  calcularRota,
  ErroCalculoRota,
  type ParadaCalculoRota,
} from "@/lib/google-maps/calcularRota";
import { NextResponse } from "next/server";

type CorpoCalculoRota = {
  paradas?: ParadaCalculoRota[];
  temRetorno?: boolean;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CorpoCalculoRota;

    const resultado = await calcularRota({
      paradas: body.paradas || [],

      temRetorno: Boolean(body.temRetorno),
    });

    return NextResponse.json(resultado);
  } catch (error) {
    console.error("ERRO AO CALCULAR ROTA:", error);

    if (error instanceof ErroCalculoRota) {
      return NextResponse.json(
        {
          erro: error.message,
        },
        {
          status: error.status,
        }
      );
    }

    return NextResponse.json(
      {
        erro: error instanceof Error ? error.message : "Erro ao calcular rota.",
      },
      {
        status: 500,
      }
    );
  }
}
