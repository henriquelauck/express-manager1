import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type CorpoEncerrarAtendimento = {
  telefoneRemetente?: unknown;
};

function normalizarTelefone(valor: unknown) {
  const numeros = String(valor ?? "").replace(/\D/g, "");

  if (!numeros) {
    return "";
  }

  if (numeros.startsWith("55") && numeros.length >= 12) {
    return numeros.slice(2);
  }

  return numeros;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CorpoEncerrarAtendimento;

    const telefoneNormalizado = normalizarTelefone(body.telefoneRemetente);

    if (!telefoneNormalizado) {
      return NextResponse.json(
        {
          erro: "Informe o telefone da sessão que será encerrada.",
        },
        {
          status: 400,
        }
      );
    }

    const telefonesPossiveis = Array.from(
      new Set([telefoneNormalizado, `55${telefoneNormalizado}`])
    );

    const resultado = await prisma.atendimentoIA.updateMany({
      where: {
        ativo: true,

        canal: "SIMULADOR",

        telefoneNormalizado: {
          in: telefonesPossiveis,
        },
      },

      data: {
        ativo: false,

        status: "FINALIZADO",

        aguardando: null,

        encerradoEm: new Date(),

        ultimaMensagemEm: new Date(),
      },
    });

    return NextResponse.json({
      ok: true,

      atendimentosEncerrados: resultado.count,
    });
  } catch (error) {
    console.error("ERRO AO ENCERRAR ATENDIMENTO:", error);

    return NextResponse.json(
      {
        erro: error instanceof Error ? error.message : "Não foi possível encerrar o atendimento.",
      },
      {
        status: 500,
      }
    );
  }
}
