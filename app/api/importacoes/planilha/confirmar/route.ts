import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type RegistroImportacao = {
  aba: string;
  data: string;
  clienteNomeOriginal: string;
  clienteId: string | null;
  clienteNomeSistema: string | null;
  valor: number;
};

type AssociacaoRecebida = {
  nomePlanilha: string;
  clienteId?: string | null;
};

function normalizarTexto(valor: unknown) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

function dataValida(data: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(data);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const nomeArquivo = String(body.nomeArquivo || "").trim();
    const ano = Number(body.ano);
    const registros = body.registros as RegistroImportacao[];
    const associacoes = (body.associacoes || []) as AssociacaoRecebida[];

    if (!nomeArquivo) {
      return NextResponse.json(
        { erro: "Nome do arquivo não informado." },
        { status: 400 }
      );
    }

    if (!Number.isInteger(ano) || ano < 2000 || ano > 2100) {
      return NextResponse.json(
        { erro: "Ano inválido." },
        { status: 400 }
      );
    }

    if (!Array.isArray(registros) || registros.length === 0) {
      return NextResponse.json(
        { erro: "Nenhum registro foi enviado para importação." },
        { status: 400 }
      );
    }

    for (const registro of registros) {
      if (
        !registro.clienteNomeOriginal?.trim() ||
        !dataValida(registro.data) ||
        !Number.isFinite(Number(registro.valor)) ||
        Number(registro.valor) <= 0
      ) {
        return NextResponse.json(
          { erro: "Existem registros inválidos na importação." },
          { status: 400 }
        );
      }
    }

    const importacaoExistente =
      await prisma.importacaoPlanilha.findFirst({
        where: {
          nomeArquivo,
          ano,
        },
        select: {
          id: true,
        },
      });

    if (importacaoExistente) {
      return NextResponse.json(
        {
          erro: "Essa planilha já foi importada para esse ano.",
        },
        { status: 409 }
      );
    }

    const resultado = await prisma.$transaction(
      async (tx) => {
        const clientesExistentes = await tx.cliente.findMany({
          select: {
            id: true,
            nome: true,
          },
        });

        const clientesPorId = new Map(
          clientesExistentes.map((cliente) => [
            cliente.id,
            cliente,
          ])
        );

        const clientesPorNome = new Map(
          clientesExistentes.map((cliente) => [
            normalizarTexto(cliente.nome),
            cliente,
          ])
        );

        const associacoesPorNome = new Map(
          associacoes.map((associacao) => [
            normalizarTexto(associacao.nomePlanilha),
            associacao.clienteId || null,
          ])
        );

        const nomesOriginais = Array.from(
          new Set(
            registros.map((registro) =>
              registro.clienteNomeOriginal.trim()
            )
          )
        );

        const clienteIdPorNomeOriginal = new Map<string, string>();
        let clientesCriados = 0;

        for (const nomeOriginal of nomesOriginais) {
          const chaveNome = normalizarTexto(nomeOriginal);
          const clienteIdAssociado =
            associacoesPorNome.get(chaveNome);

          if (clienteIdAssociado) {
            const clienteAssociado =
              clientesPorId.get(clienteIdAssociado);

            if (!clienteAssociado) {
              throw new Error(
                `O cliente associado a "${nomeOriginal}" não foi encontrado.`
              );
            }

            clienteIdPorNomeOriginal.set(
              chaveNome,
              clienteAssociado.id
            );

            continue;
          }

          const clienteJaExistente =
            clientesPorNome.get(chaveNome);

          if (clienteJaExistente) {
            clienteIdPorNomeOriginal.set(
              chaveNome,
              clienteJaExistente.id
            );

            continue;
          }

          const novoCliente = await tx.cliente.create({
            data: {
              nome: nomeOriginal,
            },
            select: {
              id: true,
              nome: true,
            },
          });

          clientesCriados += 1;

          clientesPorId.set(novoCliente.id, novoCliente);
          clientesPorNome.set(chaveNome, novoCliente);

          clienteIdPorNomeOriginal.set(
            chaveNome,
            novoCliente.id
          );
        }

        const importacao =
          await tx.importacaoPlanilha.create({
            data: {
              nomeArquivo,
              ano,
              quantidade: registros.length,
            },
          });

        await tx.faturamentoHistoricoCliente.createMany({
          data: registros.map((registro) => {
            const nomeOriginal =
              registro.clienteNomeOriginal.trim();

            const clienteId = clienteIdPorNomeOriginal.get(
              normalizarTexto(nomeOriginal)
            );

            if (!clienteId) {
              throw new Error(
                `Não foi possível resolver o cliente "${nomeOriginal}".`
              );
            }

            return {
              importacaoId: importacao.id,
              clienteId,
              clienteNomeOriginal: nomeOriginal,
              dataReferencia: new Date(
                `${registro.data}T12:00:00.000Z`
              ),
              valor: Number(
                Number(registro.valor).toFixed(2)
              ),
            };
          }),
        });

        return {
          importacaoId: importacao.id,
          quantidadeRegistros: registros.length,
          clientesCriados,
        };
      },
      {
        maxWait: 10_000,
        timeout: 30_000,
      }
    );

    return NextResponse.json({
      ok: true,
      mensagem: "Histórico importado com sucesso.",
      ...resultado,
    });
  } catch (error) {
    console.error("ERRO AO IMPORTAR HISTÓRICO:", error);

    return NextResponse.json(
      {
        erro:
          error instanceof Error
            ? error.message
            : "Erro ao importar o histórico.",
      },
      { status: 500 }
    );
  }
}