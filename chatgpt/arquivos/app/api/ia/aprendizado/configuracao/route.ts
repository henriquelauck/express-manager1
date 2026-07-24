import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const AtualizarConfiguracaoSchema = z.object({
  modo: z.enum(["DESATIVADO", "OBSERVACAO", "SUGESTAO", "AUTOMATICO"]),

  confiancaMinimaSugestao: z.number().min(0).max(1).optional(),

  confiancaMinimaAutomatico: z.number().min(0).max(1).optional(),

  quantidadeMinimaExemplos: z.number().int().min(1).optional(),

  permitirPerguntasIA: z.boolean().optional(),

  respostasPorAudio: z.boolean().optional(),

  atualizacoesPorAudio: z.boolean().optional(),
});

async function obterOuCriarConfiguracao() {
  const configuracaoExistente = await prisma.configuracaoAprendizadoIA.findFirst({
    orderBy: {
      createdAt: "asc",
    },
  });

  if (configuracaoExistente) {
    return configuracaoExistente;
  }

  return prisma.configuracaoAprendizadoIA.create({
    data: {
      modo: "DESATIVADO",
    },
  });
}

export async function GET() {
  try {
    const configuracao = await obterOuCriarConfiguracao();

    return NextResponse.json({
      sucesso: true,

      configuracao,
    });
  } catch (error) {
    console.error("Erro ao buscar configuração do aprendizado da IA:", error);

    return NextResponse.json(
      {
        sucesso: false,

        erro: error instanceof Error ? error.message : "Não foi possível buscar a configuração.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();

    const dados = AtualizarConfiguracaoSchema.parse(body);

    const configuracaoAtual = await obterOuCriarConfiguracao();

    const configuracaoAtualizada = await prisma.configuracaoAprendizadoIA.update({
      where: {
        id: configuracaoAtual.id,
      },

      data: {
        modo: dados.modo,

        ...(dados.confiancaMinimaSugestao !== undefined
          ? {
              confiancaMinimaSugestao: dados.confiancaMinimaSugestao,
            }
          : {}),

        ...(dados.confiancaMinimaAutomatico !== undefined
          ? {
              confiancaMinimaAutomatico: dados.confiancaMinimaAutomatico,
            }
          : {}),

        ...(dados.quantidadeMinimaExemplos !== undefined
          ? {
              quantidadeMinimaExemplos: dados.quantidadeMinimaExemplos,
            }
          : {}),

        ...(dados.permitirPerguntasIA !== undefined
          ? {
              permitirPerguntasIA: dados.permitirPerguntasIA,
            }
          : {}),

        ...(dados.respostasPorAudio !== undefined
          ? {
              respostasPorAudio: dados.respostasPorAudio,
            }
          : {}),

        ...(dados.atualizacoesPorAudio !== undefined
          ? {
              atualizacoesPorAudio: dados.atualizacoesPorAudio,
            }
          : {}),
      },
    });

    return NextResponse.json({
      sucesso: true,

      configuracao: configuracaoAtualizada,
    });
  } catch (error) {
    console.error("Erro ao atualizar configuração do aprendizado da IA:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          sucesso: false,

          erro: "Dados de configuração inválidos.",

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

        erro: error instanceof Error ? error.message : "Não foi possível atualizar a configuração.",
      },
      {
        status: 500,
      }
    );
  }
}
