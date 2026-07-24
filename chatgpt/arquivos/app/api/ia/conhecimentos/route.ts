import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const FiltroConhecimentosSchema = z.object({
  status: z.enum(["SUGERIDO", "APROVADO", "REJEITADO", "ARQUIVADO"]).optional(),

  categoria: z
    .enum([
      "INTERPRETACAO",
      "REGRA_OPERACIONAL",
      "RESPOSTA_CLIENTE",
      "ORCAMENTO",
      "DESPACHO",
      "MOTOBOY",
      "COBRANCA",
      "OUTRO",
    ])
    .optional(),

  solicitante: z.string().trim().min(1).optional(),

  ativo: z
    .enum(["true", "false"])
    .transform((valor) => valor === "true")
    .optional(),

  limite: z.coerce.number().int().min(1).max(100).default(50),
});

const CriarConhecimentoSchema = z.object({
  titulo: z.string().trim().min(3),

  descricao: z.string().trim().min(5),

  categoria: z.enum([
    "INTERPRETACAO",
    "REGRA_OPERACIONAL",
    "RESPOSTA_CLIENTE",
    "ORCAMENTO",
    "DESPACHO",
    "MOTOBOY",
    "COBRANCA",
    "OUTRO",
  ]),

  origem: z.enum(["CORRECAO_HUMANA", "EXEMPLOS_APROVADOS", "ANALISE_IA", "REGRA_MANUAL"]),

  solicitante: z.string().trim().nullable().optional(),

  regra: z.unknown().nullable().optional(),

  confianca: z.number().min(0).max(1).default(0),

  quantidadeExemplos: z.number().int().min(0).default(0),

  exemploIds: z.array(z.string()).default([]),

  observacaoHumana: z.string().trim().nullable().optional(),
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    const parametros = FiltroConhecimentosSchema.parse({
      status: url.searchParams.get("status") || undefined,

      categoria: url.searchParams.get("categoria") || undefined,

      solicitante: url.searchParams.get("solicitante") || undefined,

      ativo: url.searchParams.get("ativo") || undefined,

      limite: url.searchParams.get("limite") || undefined,
    });

    const conhecimentos = await prisma.conhecimentoIA.findMany({
      where: {
        ...(parametros.status
          ? {
              status: parametros.status,
            }
          : {}),

        ...(parametros.categoria
          ? {
              categoria: parametros.categoria,
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

        ...(parametros.ativo !== undefined
          ? {
              ativo: parametros.ativo,
            }
          : {}),
      },

      orderBy: [
        {
          ativo: "desc",
        },
        {
          createdAt: "desc",
        },
      ],

      take: parametros.limite,
    });

    const totaisPorStatus = await prisma.conhecimentoIA.groupBy({
      by: ["status"],

      _count: {
        _all: true,
      },
    });

    const totais = {
      SUGERIDO: 0,
      APROVADO: 0,
      REJEITADO: 0,
      ARQUIVADO: 0,
    };

    for (const item of totaisPorStatus) {
      totais[item.status] = item._count._all;
    }

    return NextResponse.json({
      sucesso: true,

      conhecimentos,

      totais,

      quantidadeRetornada: conhecimentos.length,
    });
  } catch (error) {
    console.error("Erro ao buscar conhecimentos da IA:", error);

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

        erro: error instanceof Error ? error.message : "Não foi possível buscar os conhecimentos.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const dados = CriarConhecimentoSchema.parse(body);

    const conhecimento = await prisma.conhecimentoIA.create({
      data: {
        titulo: dados.titulo,

        descricao: dados.descricao,

        categoria: dados.categoria,

        origem: dados.origem,

        solicitante: dados.solicitante ?? null,

        regra: dados.regra === undefined ? undefined : JSON.parse(JSON.stringify(dados.regra)),

        confianca: dados.confianca,

        quantidadeExemplos: dados.quantidadeExemplos,

        exemploIds: dados.exemploIds,

        observacaoHumana: dados.observacaoHumana ?? null,

        status: "SUGERIDO",

        ativo: false,
      },
    });

    return NextResponse.json(
      {
        sucesso: true,

        conhecimento,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error("Erro ao criar conhecimento da IA:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          sucesso: false,

          erro: "Dados do conhecimento inválidos.",

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

        erro: error instanceof Error ? error.message : "Não foi possível criar o conhecimento.",
      },
      {
        status: 500,
      }
    );
  }
}
