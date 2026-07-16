import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const ParametrosBuscaSchema = z.object({
  status: z.enum(["PENDENTE_REVISAO", "APROVADO", "CORRIGIDO", "DESCARTADO"]).optional(),

  solicitante: z.string().trim().min(1).optional(),

  limite: z.coerce.number().int().min(1).max(100).default(30),
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    const parametros = ParametrosBuscaSchema.parse({
      status: url.searchParams.get("status") || undefined,

      solicitante: url.searchParams.get("solicitante") || undefined,

      limite: url.searchParams.get("limite") || undefined,
    });

    const exemplos = await prisma.exemploAtendimentoIA.findMany({
      where: {
        ...(parametros.status
          ? {
              status: parametros.status,
            }
          : {}),

        ...(parametros.solicitante
          ? {
              solicitante: {
                contains: parametros.solicitante,

                mode: "insensitive",
              },
            }
          : {}),
      },

      orderBy: {
        createdAt: "desc",
      },

      take: parametros.limite,

      select: {
        id: true,

        atendimentoId: true,

        teleId: true,

        telefoneRemetente: true,

        solicitante: true,

        mensagemCliente: true,

        respostaHumana: true,

        interpretacaoIA: true,

        sugestaoIA: true,

        operacaoFinal: true,

        status: true,

        aprovado: true,

        corrigido: true,

        observacaoHumana: true,

        createdAt: true,

        updatedAt: true,
      },
    });

    const totaisPorStatus = await prisma.exemploAtendimentoIA.groupBy({
      by: ["status"],

      _count: {
        _all: true,
      },
    });

    const totais = {
      PENDENTE_REVISAO: 0,

      APROVADO: 0,

      CORRIGIDO: 0,

      DESCARTADO: 0,
    };

    for (const item of totaisPorStatus) {
      totais[item.status] = item._count._all;
    }

    return NextResponse.json({
      sucesso: true,

      exemplos,

      totais,

      quantidadeRetornada: exemplos.length,
    });
  } catch (error) {
    console.error("Erro ao buscar exemplos de aprendizado:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          sucesso: false,

          erro: "Parâmetros de busca inválidos.",

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

        erro: error instanceof Error ? error.message : "Não foi possível buscar os exemplos.",
      },
      {
        status: 500,
      }
    );
  }
}
