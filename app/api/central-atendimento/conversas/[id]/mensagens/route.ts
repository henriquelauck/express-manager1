import { NextResponse } from "next/server";
import { z } from "zod";

import { prisma } from "@/lib/prisma";

const EnviarMensagemSchema = z.object({
  conteudo: z.string().trim().min(1),

  autor: z.enum(["HUMANO", "IA", "SISTEMA"]).default("HUMANO"),

  tipo: z.enum(["TEXTO", "AUDIO", "IMAGEM", "DOCUMENTO", "SISTEMA"]).default("TEXTO"),

  usuarioId: z.string().nullable().optional(),

  atendimentoId: z.string().nullable().optional(),

  teleId: z.string().nullable().optional(),

  sugestaoIA: z.any().optional(),

  metadata: z.any().optional(),
});

type Contexto = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, { params }: Contexto) {
  try {
    const { id } = await params;

    const body = await request.json();

    const dados = EnviarMensagemSchema.parse(body);

    const conversa = await prisma.conversaAtendimento.findUnique({
      where: {
        id,
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

    const agora = new Date();

    const mensagem = await prisma.mensagemAtendimento.create({
      data: {
        conversaId: id,

        autor: dados.autor,

        direcao: dados.autor === "HUMANO" ? "SAIDA" : "INTERNA",

        tipo: dados.tipo,

        conteudo: dados.conteudo,

        usuarioId: dados.usuarioId ?? null,

        atendimentoId: dados.atendimentoId ?? null,

        teleId: dados.teleId ?? null,

        sugestaoIA: dados.sugestaoIA,

        metadata: dados.metadata,

        enviadaEm: agora,

        lidaEm: dados.autor === "HUMANO" ? agora : null,
      },
    });

    await prisma.conversaAtendimento.update({
      where: {
        id,
      },

      data: {
        status: dados.autor === "HUMANO" ? "AGUARDANDO_CLIENTE" : conversa.status,

        ultimaMensagemEm: agora,

        naoLidas: 0,
      },
    });

    return NextResponse.json({
      sucesso: true,

      mensagem,
    });
  } catch (error) {
    console.error(error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          sucesso: false,
          erro: "Dados inválidos.",
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
        erro: error instanceof Error ? error.message : "Erro interno.",
      },
      {
        status: 500,
      }
    );
  }
}
