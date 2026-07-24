import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

type ContextoRota = {
  params: Promise<{
    id: string;
  }>;
};

type ResultadoInterpretacao = {
  erro?: string;
  [chave: string]: unknown;
};

function formatarAutor(autor: string) {
  switch (autor) {
    case "CLIENTE":
      return "CLIENTE";

    case "HUMANO":
      return "HENRIQUE";

    case "IA":
      return "IA";

    case "SISTEMA":
      return "SISTEMA";

    default:
      return autor;
  }
}

function formatarHorario(data: Date) {
  return data.toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function POST(request: NextRequest, contexto: ContextoRota) {
  try {
    const { id } = await contexto.params;

    const conversa = await prisma.conversaAtendimento.findUnique({
      where: {
        id,
      },
      include: {
        mensagens: {
          where: {
            tipo: "TEXTO",
            conteudo: {
              not: null,
            },
          },
          orderBy: {
            enviadaEm: "asc",
          },
          select: {
            id: true,
            autor: true,
            direcao: true,
            conteudo: true,
            enviadaEm: true,
          },
        },
      },
    });

    if (!conversa) {
      return NextResponse.json(
        {
          erro: "Conversa não encontrada.",
        },
        {
          status: 404,
        }
      );
    }

    if (!conversa.ativo) {
      return NextResponse.json(
        {
          erro: "Esta conversa não está ativa.",
        },
        {
          status: 400,
        }
      );
    }

    const mensagensValidas = conversa.mensagens.filter((mensagem) => mensagem.conteudo?.trim());

    if (mensagensValidas.length === 0) {
      return NextResponse.json(
        {
          erro: "A conversa não possui mensagens de texto para interpretar.",
        },
        {
          status: 400,
        }
      );
    }

    const historicoEstruturado = mensagensValidas.map((mensagem) => ({
      id: mensagem.id,
      autor: formatarAutor(mensagem.autor),
      direcao: mensagem.direcao,
      horario: formatarHorario(mensagem.enviadaEm),
      conteudo: mensagem.conteudo?.trim() ?? "",
    }));

    const conversaFormatada = historicoEstruturado
      .map((mensagem) => `[${mensagem.horario}] ${mensagem.autor}:\n${mensagem.conteudo}`)
      .join("\n\n");

    const contextoCompleto = [
      "Analise o histórico completo desta conversa de atendimento.",
      "As mensagens estão em ordem cronológica.",
      "Considere todas as informações enviadas pelo cliente antes de interpretar o pedido.",
      "",
      "HISTÓRICO DA CONVERSA:",
      conversaFormatada,
    ].join("\n");

    const urlInterpretacao = new URL("/api/ia/interpretar-pedido", request.url);

    const respostaInterpretacao = await fetch(urlInterpretacao, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mensagem: contextoCompleto,

        historico: historicoEstruturado.map((mensagem) => ({
          autor: mensagem.autor,
          direcao: mensagem.direcao,
          horario: mensagem.horario,
          conteudo: mensagem.conteudo,
        })),

        telefoneRemetente: conversa.telefoneRemetente,
        canal: "WHATSAPP",
      }),
      cache: "no-store",
    });

    const resultado = (await respostaInterpretacao.json()) as ResultadoInterpretacao;

    if (!respostaInterpretacao.ok) {
      console.error("Erro ao interpretar conversa:", resultado);

      return NextResponse.json(
        {
          erro: resultado.erro || "Não foi possível interpretar a conversa.",
          detalhes: resultado,
        },
        {
          status: respostaInterpretacao.status,
        }
      );
    }

    return NextResponse.json({
      conversaId: conversa.id,
      telefoneRemetente: conversa.telefoneRemetente,
      quantidadeMensagens: mensagensValidas.length,
      historico: historicoEstruturado,
      contextoEnviadoIA: contextoCompleto,
      interpretacao: resultado,
    });
  } catch (error) {
    console.error("Erro ao executar interpretação da conversa:", error);

    return NextResponse.json(
      {
        erro: error instanceof Error ? error.message : "Erro ao interpretar conversa.",
      },
      {
        status: 500,
      }
    );
  }
}
