import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const AtualizarExemploSchema = z.object({
  acao: z.enum(["APROVAR", "CORRIGIR", "DESCARTAR"]),

  respostaHumana: z.string().trim().nullable().optional(),

  observacaoHumana: z.string().trim().nullable().optional(),

  operacaoFinal: z.unknown().optional(),
});

type ContextoRota = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(request: Request, contexto: ContextoRota) {
  try {
    const { id } = await contexto.params;

    const body = await request.json();

    const dados = AtualizarExemploSchema.parse(body);

    const exemplo = await prisma.exemploAtendimentoIA.findUnique({
      where: {
        id,
      },
    });

    if (!exemplo) {
      return NextResponse.json(
        {
          sucesso: false,

          erro: "Exemplo de aprendizado não encontrado.",
        },
        {
          status: 404,
        }
      );
    }

    const status =
      dados.acao === "APROVAR"
        ? "APROVADO"
        : dados.acao === "CORRIGIR"
          ? "CORRIGIDO"
          : "DESCARTADO";

    const exemploAtualizado = await prisma.exemploAtendimentoIA.update({
      where: {
        id,
      },

      data: {
        status,

        aprovado: dados.acao === "APROVAR",

        corrigido: dados.acao === "CORRIGIR",

        respostaHumana:
          dados.respostaHumana !== undefined ? dados.respostaHumana : exemplo.respostaHumana,

        observacaoHumana:
          dados.observacaoHumana !== undefined ? dados.observacaoHumana : exemplo.observacaoHumana,

        operacaoFinal:
          dados.operacaoFinal !== undefined
            ? JSON.parse(JSON.stringify(dados.operacaoFinal))
            : exemplo.operacaoFinal,
      },
    });

    return NextResponse.json({
      sucesso: true,

      exemplo: exemploAtualizado,
    });
  } catch (error) {
    console.error("Erro ao revisar exemplo de aprendizado:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          sucesso: false,

          erro: "Dados de revisão inválidos.",

          detalhes: error.issues,
        },
        {
          status: 400,
        }
      );
    }

    return NextResponse.json(
      {
        sucesso: false,

        erro: error instanceof Error ? error.message : "Não foi possível revisar o exemplo.",
      },
      {
        status: 500,
      }
    );
  }
}
