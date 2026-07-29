import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type ContextoRota = {
  params: Promise<{
    id: string;
  }>;
};

function chaveDataBrasil(data: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(data);
}

function arredondar(valor: number) {
  return Number(valor.toFixed(2));
}

export async function GET(_request: Request, contexto: ContextoRota) {
  try {
    const { id } = await contexto.params;

    const cliente = await prisma.cliente.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        nome: true,
        telefone: true,
        endereco1: true,
        endereco2: true,
        formaCobranca: true,
        createdAt: true,
        faturamentosHistoricos: {
          orderBy: {
            dataReferencia: "asc",
          },
          select: {
            id: true,
            dataReferencia: true,
            valor: true,
            clienteNomeOriginal: true,
            importacao: {
              select: {
                id: true,
                nomeArquivo: true,
                ano: true,
              },
            },
          },
        },
        teles: {
          orderBy: {
            dataTele: "asc",
          },
          select: {
            id: true,
            dataTele: true,
            total: true,
            status: true,
          },
        },
      },
    });

    if (!cliente) {
      return NextResponse.json(
        {
          erro: "Cliente não encontrado.",
        },
        {
          status: 404,
        }
      );
    }

    const sistemaPorDia = new Map<
      string,
      {
        data: string;
        valor: number;
        quantidade: number;
        fonte: "SISTEMA";
      }
    >();

    for (const tele of cliente.teles) {
      const data = chaveDataBrasil(tele.dataTele);
      const atual = sistemaPorDia.get(data) ?? {
        data,
        valor: 0,
        quantidade: 0,
        fonte: "SISTEMA" as const,
      };

      atual.valor += Number(tele.total || 0);
      atual.quantidade += 1;

      sistemaPorDia.set(data, atual);
    }

    const historicoPorDia = new Map<
      string,
      {
        data: string;
        valor: number;
        quantidade: number;
        fonte: "IMPORTADO";
      }
    >();

    for (const item of cliente.faturamentosHistoricos) {
      const data = chaveDataBrasil(item.dataReferencia);

      // Evita duplicidade: quando existe tele nativa no mesmo dia,
      // os dados do sistema têm prioridade sobre a planilha.
      if (sistemaPorDia.has(data)) {
        continue;
      }

      const atual = historicoPorDia.get(data) ?? {
        data,
        valor: 0,
        quantidade: 0,
        fonte: "IMPORTADO" as const,
      };

      atual.valor += Number(item.valor || 0);
      atual.quantidade += 1;

      historicoPorDia.set(data, atual);
    }

    const movimentos = [
      ...Array.from(historicoPorDia.values()),
      ...Array.from(sistemaPorDia.values()),
    ]
      .map((item) => ({
        ...item,
        valor: arredondar(item.valor),
      }))
      .sort((a, b) => a.data.localeCompare(b.data));

    const totalDesdeSempre = arredondar(movimentos.reduce((soma, item) => soma + item.valor, 0));

    const quantidadeRegistros = movimentos.reduce((soma, item) => soma + item.quantidade, 0);

    const primeiroRegistro = movimentos[0]?.data ?? null;
    const ultimoRegistro = movimentos[movimentos.length - 1]?.data ?? null;

    const porMesMap = new Map<
      string,
      {
        chave: string;
        ano: number;
        mes: number;
        total: number;
        quantidade: number;
      }
    >();

    const porAnoMap = new Map<
      number,
      {
        ano: number;
        total: number;
        quantidade: number;
      }
    >();

    for (const movimento of movimentos) {
      const [anoTexto, mesTexto] = movimento.data.split("-");
      const ano = Number(anoTexto);
      const mes = Number(mesTexto);
      const chaveMes = `${anoTexto}-${mesTexto}`;

      const mesAtual = porMesMap.get(chaveMes) ?? {
        chave: chaveMes,
        ano,
        mes,
        total: 0,
        quantidade: 0,
      };

      mesAtual.total += movimento.valor;
      mesAtual.quantidade += movimento.quantidade;
      porMesMap.set(chaveMes, mesAtual);

      const anoAtual = porAnoMap.get(ano) ?? {
        ano,
        total: 0,
        quantidade: 0,
      };

      anoAtual.total += movimento.valor;
      anoAtual.quantidade += movimento.quantidade;
      porAnoMap.set(ano, anoAtual);
    }

    const meses = Array.from(porMesMap.values())
      .map((item) => ({
        ...item,
        total: arredondar(item.total),
      }))
      .sort((a, b) => a.chave.localeCompare(b.chave));

    const anos = Array.from(porAnoMap.values())
      .map((item) => ({
        ...item,
        total: arredondar(item.total),
      }))
      .sort((a, b) => a.ano - b.ano);

    const melhorMes = [...meses].sort((a, b) => b.total - a.total)[0] ?? null;

    const melhorAno = [...anos].sort((a, b) => b.total - a.total)[0] ?? null;

    const mediaMensal = meses.length > 0 ? arredondar(totalDesdeSempre / meses.length) : 0;

    const ticketMedio =
      quantidadeRegistros > 0 ? arredondar(totalDesdeSempre / quantidadeRegistros) : 0;

    return NextResponse.json({
      cliente: {
        id: cliente.id,
        nome: cliente.nome,
        telefone: cliente.telefone,
        endereco1: cliente.endereco1,
        endereco2: cliente.endereco2,
        formaCobranca: cliente.formaCobranca,
        createdAt: cliente.createdAt,
      },
      resumo: {
        primeiroRegistro,
        ultimoRegistro,
        totalDesdeSempre,
        quantidadeRegistros,
        quantidadeMesesAtivos: meses.length,
        mediaMensal,
        ticketMedio,
        melhorMes,
        melhorAno,
      },
      anos,
      meses,
      movimentos,
      fontes: {
        quantidadeDiasImportados: historicoPorDia.size,
        quantidadeDiasSistema: sistemaPorDia.size,
        regraMesclagem:
          "Em datas com teles no Express Manager, os dados do sistema substituem os valores importados da planilha.",
      },
    });
  } catch (error) {
    console.error("ERRO AO CARREGAR PERFORMANCE DO CLIENTE:", error);

    return NextResponse.json(
      {
        erro:
          error instanceof Error
            ? error.message
            : "Erro ao carregar o histórico de desempenho do cliente.",
      },
      {
        status: 500,
      }
    );
  }
}
