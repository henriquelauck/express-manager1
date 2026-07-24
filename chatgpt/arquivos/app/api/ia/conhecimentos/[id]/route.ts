import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const AtualizarConhecimentoSchema = z.object({
  acao: z.enum(["APROVAR", "REJEITAR", "ARQUIVAR", "REATIVAR", "EDITAR"]),

  titulo: z.string().trim().min(3).optional(),

  descricao: z.string().trim().min(5).optional(),

  solicitante: z.string().trim().nullable().optional(),

  regra: z.unknown().nullable().optional(),

  confianca: z.number().min(0).max(1).optional(),

  observacaoHumana: z.string().trim().nullable().optional(),
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

    const dados = AtualizarConhecimentoSchema.parse(body);

    const conhecimento = await prisma.conhecimentoIA.findUnique({
      where: {
        id,
      },
    });

    if (!conhecimento) {
      return NextResponse.json(
        {
          sucesso: false,

          erro: "Conhecimento não encontrado.",
        },
        {
          status: 404,
        }
      );
    }

    const data =
      dados.acao === "APROVAR"
        ? {
            status: "APROVADO" as const,

            ativo: true,

            aprovadoEm: new Date(),

            aprovadoPor: "ADMIN",
          }
        : dados.acao === "REJEITAR"
          ? {
              status: "REJEITADO" as const,

              ativo: false,
            }
          : dados.acao === "ARQUIVAR"
            ? {
                status: "ARQUIVADO" as const,

                ativo: false,
              }
            : dados.acao === "REATIVAR"
              ? {
                  status: "APROVADO" as const,

                  ativo: true,
                }
              : {
                  ...(dados.titulo !== undefined
                    ? {
                        titulo: dados.titulo,
                      }
                    : {}),

                  ...(dados.descricao !== undefined
                    ? {
                        descricao: dados.descricao,
                      }
                    : {}),

                  ...(dados.solicitante !== undefined
                    ? {
                        solicitante: dados.solicitante,
                      }
                    : {}),

                  ...(dados.regra !== undefined
                    ? {
                        regra: JSON.parse(JSON.stringify(dados.regra)),
                      }
                    : {}),

                  ...(dados.confianca !== undefined
                    ? {
                        confianca: dados.confianca,
                      }
                    : {}),

                  ...(dados.observacaoHumana !== undefined
                    ? {
                        observacaoHumana: dados.observacaoHumana,
                      }
                    : {}),
                };

    const atualizado = await prisma.conhecimentoIA.update({
      where: {
        id,
      },

      data,
    });

    return NextResponse.json({
      sucesso: true,

      conhecimento: atualizado,
    });
  } catch (error) {
    console.error("Erro ao atualizar conhecimento da IA:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          sucesso: false,

          erro: "Dados de atualização inválidos.",

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

        erro: error instanceof Error ? error.message : "Não foi possível atualizar o conhecimento.",
      },
      {
        status: 500,
      }
    );
  }
}
