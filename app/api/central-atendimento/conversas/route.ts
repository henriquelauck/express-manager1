import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const CriarConversaSchema = z.object({
  canal: z
    .enum(["INTERNO", "SIMULADOR", "WHATSAPP"])
    .default("INTERNO"),

  clienteId: z.string().trim().min(1).nullable().optional(),

  telefoneRemetente: z.string().trim().min(8),

  nomeExibicao: z.string().trim().nullable().optional(),

  mensagemInicial: z.string().trim().min(1).optional(),
});

const FiltroConversasSchema = z.object({
  status: z
    .enum([
      "ABERTA",
      "AGUARDANDO_CLIENTE",
      "AGUARDANDO_EQUIPE",
      "ENCERRADA",
    ])
    .optional(),

  canal: z
    .enum(["INTERNO", "SIMULADOR", "WHATSAPP"])
    .optional(),

  ativo: z
    .enum(["true", "false"])
    .transform((valor) => valor === "true")
    .optional(),

  busca: z.string().trim().min(1).optional(),

  limite: z.coerce.number().int().min(1).max(100).default(50),
});

function normalizarTelefone(telefone: string) {
  const numeros = telefone.replace(/\D/g, "");

  if (numeros.startsWith("55") && numeros.length >= 12) {
    return numeros.slice(2);
  }

  return numeros;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);

    const parametros = FiltroConversasSchema.parse({
      status: url.searchParams.get("status") || undefined,
      canal: url.searchParams.get("canal") || undefined,
      ativo: url.searchParams.get("ativo") || undefined,
      busca: url.searchParams.get("busca") || undefined,
      limite: url.searchParams.get("limite") || undefined,
    });

    const conversas = await prisma.conversaAtendimento.findMany({
      where: {
        ...(parametros.status
          ? {
              status: parametros.status,
            }
          : {}),

        ...(parametros.canal
          ? {
              canal: parametros.canal,
            }
          : {}),

        ...(parametros.ativo !== undefined
          ? {
              ativo: parametros.ativo,
            }
          : {}),

        ...(parametros.busca
          ? {
              OR: [
                {
                  nomeExibicao: {
                    contains: parametros.busca,
                    mode: "insensitive",
                  },
                },
                {
                  telefoneRemetente: {
                    contains: parametros.busca,
                  },
                },
                {
                  cliente: {
                    nome: {
                      contains: parametros.busca,
                      mode: "insensitive",
                    },
                  },
                },
              ],
            }
          : {}),
      },

      orderBy: {
        ultimaMensagemEm: "desc",
      },

      take: parametros.limite,

      include: {
        cliente: {
          select: {
            id: true,
            nome: true,
            telefone: true,
          },
        },

        mensagens: {
          orderBy: {
            enviadaEm: "desc",
          },

          take: 1,

          select: {
            id: true,
            autor: true,
            direcao: true,
            tipo: true,
            conteudo: true,
            enviadaEm: true,
            lidaEm: true,
          },
        },
      },
    });

    return NextResponse.json({
      sucesso: true,

      conversas: conversas.map((conversa) => ({
        ...conversa,

        ultimaMensagem: conversa.mensagens[0] ?? null,

        mensagens: undefined,
      })),

      quantidadeRetornada: conversas.length,
    });
  } catch (error) {
    console.error(
      "Erro ao buscar conversas da Central de Atendimento:",
      error
    );

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

        erro:
          error instanceof Error
            ? error.message
            : "Não foi possível buscar as conversas.",
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

    const dados = CriarConversaSchema.parse(body);

    const telefoneNormalizado = normalizarTelefone(
      dados.telefoneRemetente
    );

    const cliente = dados.clienteId
      ? await prisma.cliente.findUnique({
          where: {
            id: dados.clienteId,
          },

          select: {
            id: true,
            nome: true,
            telefone: true,
          },
        })
      : await prisma.cliente.findFirst({
          where: {
            telefone: {
              contains: telefoneNormalizado.slice(-8),
            },
          },

          select: {
            id: true,
            nome: true,
            telefone: true,
          },
        });

    const conversaExistente =
      await prisma.conversaAtendimento.findFirst({
        where: {
          telefoneNormalizado,
          canal: dados.canal,
          ativo: true,
        },

        include: {
          cliente: true,
        },
      });

    if (conversaExistente) {
      return NextResponse.json({
        sucesso: true,
        conversa: conversaExistente,
        reutilizada: true,
      });
    }

    const conversa = await prisma.$transaction(async (tx) => {
      const criada = await tx.conversaAtendimento.create({
        data: {
          canal: dados.canal,

          clienteId: cliente?.id ?? null,

          telefoneRemetente: dados.telefoneRemetente,

          telefoneNormalizado,

          nomeExibicao:
            dados.nomeExibicao ??
            cliente?.nome ??
            dados.telefoneRemetente,

          status: dados.mensagemInicial
            ? "AGUARDANDO_EQUIPE"
            : "ABERTA",

          naoLidas: dados.mensagemInicial ? 1 : 0,

          ultimaMensagemEm: new Date(),
        },
      });

      if (dados.mensagemInicial) {
        await tx.mensagemAtendimento.create({
          data: {
            conversaId: criada.id,

            autor: "CLIENTE",

            direcao: "ENTRADA",

            tipo: "TEXTO",

            conteudo: dados.mensagemInicial,

            enviadaEm: new Date(),
          },
        });
      }

      return tx.conversaAtendimento.findUniqueOrThrow({
        where: {
          id: criada.id,
        },

        include: {
          cliente: true,

          mensagens: {
            orderBy: {
              enviadaEm: "asc",
            },
          },
        },
      });
    });

    return NextResponse.json(
      {
        sucesso: true,
        conversa,
        reutilizada: false,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Erro ao criar conversa da Central de Atendimento:",
      error
    );

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: "Dados da conversa inválidos.",
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

        erro:
          error instanceof Error
            ? error.message
            : "Não foi possível criar a conversa.",
      },
      {
        status: 500,
      }
    );
  }
}