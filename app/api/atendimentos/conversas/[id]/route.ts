import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

type ContextoRota = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: NextRequest, contexto: ContextoRota) {
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
          select: {
            id: true,
            autor: true,
            direcao: true,
            tipo: true,
            conteudo: true,
            usuarioId: true,
            atendimentoId: true,
            teleId: true,
            idExterno: true,
            mediaUrl: true,
            mediaMimeType: true,
            mediaNomeArquivo: true,
            sugestaoIA: true,
            metadata: true,
            enviadaEm: true,
            lidaEm: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!conversa) {
      return NextResponse.json(
        {
          erro: "Conversa não encontrada.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: conversa.id,
      canal: conversa.canal,
      clienteId: conversa.clienteId,
      cliente: conversa.cliente,
      telefoneRemetente: conversa.telefoneRemetente,
      telefoneNormalizado: conversa.telefoneNormalizado,
      nomeExibicao: conversa.nomeExibicao,
      status: conversa.status,
      naoLidas: conversa.naoLidas,
      ativo: conversa.ativo,
      ultimaMensagemEm: conversa.ultimaMensagemEm,
      mensagens: conversa.mensagens,
      createdAt: conversa.createdAt,
      updatedAt: conversa.updatedAt,
    });
  } catch (error) {
    console.error("Erro ao buscar conversa de atendimento:", error);

    return NextResponse.json(
      {
        erro: error instanceof Error ? error.message : "Erro ao buscar conversa de atendimento.",
      },
      { status: 500 }
    );
  }
}
