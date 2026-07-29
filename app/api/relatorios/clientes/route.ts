import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

function dataBrasil(data: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(data);
}

function inicioMesBrasil(data = new Date()) {
  const partes = dataBrasil(data).split("-").map(Number);
  return new Date(`${partes[0]}-${String(partes[1]).padStart(2, "0")}-01T12:00:00.000Z`);
}

function adicionarMeses(data: Date, quantidade: number) {
  const resultado = new Date(data);
  resultado.setUTCMonth(resultado.getUTCMonth() + quantidade);
  return resultado;
}

function chaveMes(dataISO: string) {
  return dataISO.slice(0, 7);
}

function arredondar(valor: number) {
  return Number(valor.toFixed(2));
}

function diferencaMeses(chaveInicial: string, chaveFinal: string) {
  const [anoInicial, mesInicial] = chaveInicial.split("-").map(Number);
  const [anoFinal, mesFinal] = chaveFinal.split("-").map(Number);

  return Math.max((anoFinal - anoInicial) * 12 + (mesFinal - mesInicial), 0);
}

function classificarCliente({
  total,
  participacao,
  tendenciaPercentual,
  mesesSemMovimento,
  mesesAtivos,
}: {
  total: number;
  participacao: number;
  tendenciaPercentual: number;
  mesesSemMovimento: number;
  mesesAtivos: number;
}) {
  let nota = 0;

  if (participacao >= 15) nota += 30;
  else if (participacao >= 8) nota += 24;
  else if (participacao >= 3) nota += 18;
  else if (participacao > 0) nota += 10;

  if (mesesAtivos >= 18) nota += 25;
  else if (mesesAtivos >= 10) nota += 20;
  else if (mesesAtivos >= 5) nota += 14;
  else if (mesesAtivos > 0) nota += 7;

  if (tendenciaPercentual >= 20) nota += 20;
  else if (tendenciaPercentual >= 5) nota += 16;
  else if (tendenciaPercentual > -5) nota += 11;
  else if (tendenciaPercentual > -20) nota += 5;

  if (mesesSemMovimento === 0) nota += 15;
  else if (mesesSemMovimento === 1) nota += 11;
  else if (mesesSemMovimento <= 3) nota += 6;

  if (total >= 10000) nota += 10;
  else if (total >= 5000) nota += 8;
  else if (total >= 1000) nota += 5;
  else if (total > 0) nota += 2;

  nota = Math.min(nota, 100);

  let classificacao = "Inativo";

  if (nota >= 80) classificacao = "Estratégico";
  else if (nota >= 60) classificacao = "Forte";
  else if (nota >= 40) classificacao = "Regular";
  else if (nota >= 20) classificacao = "Em atenção";

  return {
    nota,
    classificacao,
  };
}

export async function GET() {
  try {
    const clientes = await prisma.cliente.findMany({
      orderBy: {
        nome: "asc",
      },
      select: {
        id: true,
        nome: true,
        faturamentosHistoricos: {
          select: {
            dataReferencia: true,
            valor: true,
          },
        },
        teles: {
          select: {
            dataTele: true,
            total: true,
          },
        },
      },
    });

    const hoje = new Date();
    const mesAtual = inicioMesBrasil(hoje);
    const inicioPeriodoRecente = adicionarMeses(mesAtual, -2);
    const inicioPeriodoAnterior = adicionarMeses(mesAtual, -5);
    const fimPeriodoAnterior = adicionarMeses(mesAtual, -2);
    const chaveMesAtual = dataBrasil(mesAtual).slice(0, 7);

    const dadosBase = clientes.map((cliente) => {
      const sistemaPorDia = new Map<string, number>();

      for (const tele of cliente.teles) {
        const data = dataBrasil(tele.dataTele);
        sistemaPorDia.set(data, (sistemaPorDia.get(data) ?? 0) + Number(tele.total || 0));
      }

      const historicoPorDia = new Map<string, number>();

      for (const item of cliente.faturamentosHistoricos) {
        const data = dataBrasil(item.dataReferencia);

        if (sistemaPorDia.has(data)) {
          continue;
        }

        historicoPorDia.set(data, (historicoPorDia.get(data) ?? 0) + Number(item.valor || 0));
      }

      const movimentos = [
        ...Array.from(historicoPorDia.entries()).map(([data, valor]) => ({
          data,
          valor,
          fonte: "IMPORTADO" as const,
        })),
        ...Array.from(sistemaPorDia.entries()).map(([data, valor]) => ({
          data,
          valor,
          fonte: "SISTEMA" as const,
        })),
      ].sort((a, b) => a.data.localeCompare(b.data));

      const porMes = new Map<string, number>();

      for (const movimento of movimentos) {
        const mes = chaveMes(movimento.data);
        porMes.set(mes, (porMes.get(mes) ?? 0) + movimento.valor);
      }

      const total = arredondar(movimentos.reduce((soma, movimento) => soma + movimento.valor, 0));

      const mesesAtivos = porMes.size;
      const primeiroRegistro = movimentos[0]?.data ?? null;
      const ultimoRegistro = movimentos[movimentos.length - 1]?.data ?? null;
      const ultimoMes = ultimoRegistro ? chaveMes(ultimoRegistro) : null;
      const mesesSemMovimento = ultimoMes ? diferencaMeses(ultimoMes, chaveMesAtual) : 999;

      let periodoRecente = 0;
      let periodoAnterior = 0;

      for (const [mes, valor] of porMes.entries()) {
        const dataMes = new Date(`${mes}-01T12:00:00.000Z`);

        if (dataMes >= inicioPeriodoRecente) {
          periodoRecente += valor;
        } else if (dataMes >= inicioPeriodoAnterior && dataMes < fimPeriodoAnterior) {
          periodoAnterior += valor;
        }
      }

      let tendenciaPercentual = 0;

      if (periodoAnterior > 0) {
        tendenciaPercentual = ((periodoRecente - periodoAnterior) / periodoAnterior) * 100;
      } else if (periodoRecente > 0) {
        tendenciaPercentual = 100;
      }

      let tendencia = "Estável";

      if (mesesSemMovimento >= 3) tendencia = "Sem movimento";
      else if (tendenciaPercentual >= 5) tendencia = "Crescendo";
      else if (tendenciaPercentual <= -5) tendencia = "Caindo";

      return {
        id: cliente.id,
        nome: cliente.nome,
        total,
        receitaEscritorio: arredondar(total * 0.2),
        primeiroRegistro,
        ultimoRegistro,
        mesesAtivos,
        mesesSemMovimento,
        periodoRecente: arredondar(periodoRecente),
        periodoAnterior: arredondar(periodoAnterior),
        tendenciaPercentual: arredondar(tendenciaPercentual),
        tendencia,
        quantidadeDiasImportados: historicoPorDia.size,
        quantidadeDiasSistema: sistemaPorDia.size,
      };
    });

    const faturamentoTotal = arredondar(
      dadosBase.reduce((soma, cliente) => soma + cliente.total, 0)
    );

    const clientesAnalisados = dadosBase
      .map((cliente) => {
        const participacao = faturamentoTotal > 0 ? (cliente.total / faturamentoTotal) * 100 : 0;

        const avaliacao = classificarCliente({
          total: cliente.total,
          participacao,
          tendenciaPercentual: cliente.tendenciaPercentual,
          mesesSemMovimento: cliente.mesesSemMovimento,
          mesesAtivos: cliente.mesesAtivos,
        });

        return {
          ...cliente,
          participacao: arredondar(participacao),
          ...avaliacao,
        };
      })
      .sort((a, b) => b.total - a.total);

    const maiorCliente = clientesAnalisados[0] ?? null;

    const clienteMaiorCrescimento =
      [...clientesAnalisados]
        .filter((cliente) => cliente.periodoAnterior > 0 || cliente.periodoRecente > 0)
        .sort((a, b) => b.tendenciaPercentual - a.tendenciaPercentual)[0] ?? null;

    const clientesSemMovimento = clientesAnalisados.filter(
      (cliente) => cliente.mesesSemMovimento >= 3
    );

    const clientesEstrategicos = clientesAnalisados.filter(
      (cliente) => cliente.classificacao === "Estratégico"
    );

    return NextResponse.json({
      resumo: {
        faturamentoTotal,
        receitaEscritorioTotal: arredondar(faturamentoTotal * 0.2),
        quantidadeClientes: clientesAnalisados.length,
        quantidadeEstrategicos: clientesEstrategicos.length,
        quantidadeSemMovimento: clientesSemMovimento.length,
        maiorCliente,
        clienteMaiorCrescimento,
      },
      clientes: clientesAnalisados,
      metodologia: {
        tendencia:
          "Compara os três meses atuais, incluindo o mês em andamento, com os três meses anteriores.",
        duplicidade:
          "Quando uma data existe na planilha e no Express Manager, prevalecem as teles do sistema.",
        receitaEscritorio: "Calculada como 20% do faturamento bruto do cliente.",
        nota: "Pontuação de 0 a 100 baseada em participação, recorrência, tendência, atividade recente e faturamento.",
      },
    });
  } catch (error) {
    console.error("ERRO AO GERAR ANÁLISE DE CLIENTES:", error);

    return NextResponse.json(
      {
        erro: error instanceof Error ? error.message : "Erro ao gerar a análise de clientes.",
      },
      {
        status: 500,
      }
    );
  }
}
