import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const importacoes = await prisma.importacaoPlanilha.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        nomeArquivo: true,
        ano: true,
        quantidade: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            itens: true,
          },
        },
        itens: {
          select: {
            valor: true,
          },
        },
      },
    });

    const resultado = importacoes.map((importacao) => ({
      id: importacao.id,
      nomeArquivo: importacao.nomeArquivo,
      ano: importacao.ano,
      quantidade: importacao.quantidade,
      quantidadeRegistros: importacao._count.itens,
      total: Number(
        importacao.itens.reduce((soma, item) => soma + Number(item.valor || 0), 0).toFixed(2)
      ),
      createdAt: importacao.createdAt,
      updatedAt: importacao.updatedAt,
    }));

    return NextResponse.json(resultado);
  } catch (error) {
    console.error("ERRO AO LISTAR IMPORTAÇÕES:", error);

    return NextResponse.json(
      {
        erro:
          error instanceof Error ? error.message : "Erro ao carregar o histórico de importações.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const importacaoId = String(body.importacaoId || "").trim();

    if (!importacaoId) {
      return NextResponse.json(
        {
          erro: "Importação não informada.",
        },
        {
          status: 400,
        }
      );
    }

    const importacao = await prisma.importacaoPlanilha.findUnique({
      where: {
        id: importacaoId,
      },
      select: {
        id: true,
        nomeArquivo: true,
        ano: true,
        _count: {
          select: {
            itens: true,
          },
        },
      },
    });

    if (!importacao) {
      return NextResponse.json(
        {
          erro: "Importação não encontrada.",
        },
        {
          status: 404,
        }
      );
    }

    await prisma.importacaoPlanilha.delete({
      where: {
        id: importacaoId,
      },
    });

    return NextResponse.json({
      ok: true,
      mensagem: "Importação excluída com sucesso.",
      importacao: {
        id: importacao.id,
        nomeArquivo: importacao.nomeArquivo,
        ano: importacao.ano,
        quantidadeRegistrosExcluidos: importacao._count.itens,
      },
    });
  } catch (error) {
    console.error("ERRO AO EXCLUIR IMPORTAÇÃO:", error);

    return NextResponse.json(
      {
        erro: error instanceof Error ? error.message : "Erro ao excluir a importação.",
      },
      {
        status: 500,
      }
    );
  }
}
