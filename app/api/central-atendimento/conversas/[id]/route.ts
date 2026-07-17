import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

type ContextoRota = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, contexto: ContextoRota) {
  try {
    const { id } = await contexto.params;

    const conversa = await prisma.conversaAtendimento.findUnique({
      where: {
        id,
      },

      include: {
        cliente: {
          select: {
            id: true,
            nome: true,
            telefone: true,
            endereco1: true,
            endereco2: true,
            formaCobranca: true,
          },
        },

        mensagens: {
          orderBy: {
            enviadaEm: "asc",
          },

          include: {
            usuario: {
              select: {
                id: true,
                nome: true,
                email: true,
              },
            },

            atendimento: {
              select: {
                id: true,
                status: true,
                etapa: true,
                aguardando: true,
                operacao: true,
                estado: true,
              },
            },

            tele: {
              select: {
                id: true,
                solicitante: true,
                status: true,
                total: true,
                motoboyNome: true,
                dataTele: true,
              },
            },
          },
        },
      },
    });

    if (!conversa) {
      return NextResponse.json(
        {
          sucesso: false,

          erro: "Conversa não encontrada.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * Ao abrir a conversa, consideramos as mensagens
     * recebidas como visualizadas pela equipe.
     */
    await prisma.$transaction([
      prisma.conversaAtendimento.update({
        where: {
          id,
        },

        data: {
          naoLidas: 0,
        },
      }),

      prisma.mensagemAtendimento.updateMany({
        where: {
          conversaId: id,

          direcao: "ENTRADA",

          lidaEm: null,
        },

        data: {
          lidaEm: new Date(),
        },
      }),
    ]);

    return NextResponse.json({
      sucesso: true,

      conversa: {
        ...conversa,

        naoLidas: 0,

        mensagens: conversa.mensagens.map((mensagem) => ({
          ...mensagem,

          lidaEm:
            mensagem.lidaEm ?? (mensagem.direcao === "ENTRADA" ? new Date().toISOString() : null),
        })),
      },
    });
  } catch (error) {
    console.error("Erro ao abrir conversa da Central de Atendimento:", error);

    return NextResponse.json(
      {
        sucesso: false,

        erro: error instanceof Error ? error.message : "Não foi possível abrir a conversa.",
      },
      {
        status: 500,
      }
    );
  }
}
