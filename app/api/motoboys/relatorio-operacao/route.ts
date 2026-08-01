import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type LinhaMensal = {
  ano: number;
  mes: number;
  periodo: string;
  mesNome: string;
  origem: "HISTORICO_IMPORTADO" | "CONTROLE_DIARIO";
  faturamentoTrabalho: number;
  feitoPorFora: number;
  gasolina: number;
  manutencao: number;
  alimentacao: number;
  outrasDespesas: number;
  faturamentoTotal: number;
  despesasTotais: number;
  lucroLiquido: number;
  diasTrabalhados: number;
  kmRodados: number;
  kmOnline: number;
  tempoOnlineSegundos: number;
};

function respostaErro(mensagem: string, status: number) {
  return NextResponse.json({ erro: mensagem }, { status });
}

async function obterMotoboyAutenticado() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("express_user_id")?.value;

  if (!userId) {
    return null;
  }

  const usuario = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      role: true,
      motoboy: {
        select: {
          id: true,
          nome: true,
        },
      },
    },
  });

  if (!usuario || usuario.role !== "MOTOBOY" || !usuario.motoboy) {
    return null;
  }

  return usuario.motoboy;
}

function arredondar(valor: number, casas = 2) {
  const fator = 10 ** casas;
  return Math.round((Number(valor || 0) + Number.EPSILON) * fator) / fator;
}

function nomeMes(mes: number) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(Date.UTC(2026, mes - 1, 1)));
}

function periodoValido(valor: string | null) {
  if (!valor || !/^\d{4}-\d{2}$/.test(valor)) {
    return null;
  }

  const [anoTexto, mesTexto] = valor.split("-");
  const ano = Number(anoTexto);
  const mes = Number(mesTexto);

  if (
    !Number.isInteger(ano) ||
    ano < 2000 ||
    ano > 2100 ||
    !Number.isInteger(mes) ||
    mes < 1 ||
    mes > 12
  ) {
    return null;
  }

  return {
    ano,
    mes,
    chave: `${ano}-${String(mes).padStart(2, "0")}`,
  };
}

function periodoDaData(data: Date) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(data);

  const ano = Number(partes.find((parte) => parte.type === "year")?.value);
  const mes = Number(partes.find((parte) => parte.type === "month")?.value);

  return {
    ano,
    mes,
    chave: `${ano}-${String(mes).padStart(2, "0")}`,
  };
}

function dentroDoPeriodo(
  ano: number,
  mes: number,
  inicio: ReturnType<typeof periodoValido>,
  fim: ReturnType<typeof periodoValido>
) {
  const chave = `${ano}-${String(mes).padStart(2, "0")}`;

  if (inicio && chave < inicio.chave) {
    return false;
  }

  if (fim && chave > fim.chave) {
    return false;
  }

  return true;
}

export async function GET(request: Request) {
  try {
    const motoboy = await obterMotoboyAutenticado();

    if (!motoboy) {
      return respostaErro("Acesso negado.", 403);
    }

    const url = new URL(request.url);
    const inicioTexto = url.searchParams.get("inicio");
    const fimTexto = url.searchParams.get("fim");

    const inicio = inicioTexto ? periodoValido(inicioTexto) : null;
    const fim = fimTexto ? periodoValido(fimTexto) : null;

    if (inicioTexto && !inicio) {
      return respostaErro("Período inicial inválido. Use AAAA-MM.", 400);
    }

    if (fimTexto && !fim) {
      return respostaErro("Período final inválido. Use AAAA-MM.", 400);
    }

    if (inicio && fim && inicio.chave > fim.chave) {
      return respostaErro(
        "O período inicial não pode ser posterior ao período final.",
        400
      );
    }

    const [historicosMensais, controlesDiarios] = await Promise.all([
      prisma.historicoMensalMotoboy.findMany({
        where: {
          motoboyId: motoboy.id,
        },
        orderBy: [{ ano: "asc" }, { mes: "asc" }],
        select: {
          ano: true,
          mes: true,
          faturamentoTrabalho: true,
          feitoPorFora: true,
          gasolina: true,
          manutencao: true,
          diasTrabalhados: true,
        },
      }),
      prisma.controleDiarioMotoboy.findMany({
        where: {
          motoboyId: motoboy.id,
        },
        orderBy: {
          dataReferencia: "asc",
        },
        select: {
          dataReferencia: true,
          valorExpressManager: true,
          valorPorFora: true,
          gasolina: true,
          manutencao: true,
          alimentacao: true,
          outrasDespesas: true,
          kmInicial: true,
          kmFinal: true,
          kmOnlineTotal: true,
          tempoOnlineSegundos: true,
        },
      }),
    ]);

    const linhasPorPeriodo = new Map<string, LinhaMensal>();

    for (const historico of historicosMensais) {
      if (!dentroDoPeriodo(historico.ano, historico.mes, inicio, fim)) {
        continue;
      }

      const periodo = `${historico.ano}-${String(historico.mes).padStart(2, "0")}`;
      const faturamentoTrabalho = Number(historico.faturamentoTrabalho || 0);
      const feitoPorFora = Number(historico.feitoPorFora || 0);
      const gasolina = Number(historico.gasolina || 0);
      const manutencao = Number(historico.manutencao || 0);
      const faturamentoTotal = faturamentoTrabalho + feitoPorFora;
      const despesasTotais = gasolina + manutencao;

      linhasPorPeriodo.set(periodo, {
        ano: historico.ano,
        mes: historico.mes,
        periodo,
        mesNome: nomeMes(historico.mes),
        origem: "HISTORICO_IMPORTADO",
        faturamentoTrabalho: arredondar(faturamentoTrabalho),
        feitoPorFora: arredondar(feitoPorFora),
        gasolina: arredondar(gasolina),
        manutencao: arredondar(manutencao),
        alimentacao: 0,
        outrasDespesas: 0,
        faturamentoTotal: arredondar(faturamentoTotal),
        despesasTotais: arredondar(despesasTotais),
        lucroLiquido: arredondar(faturamentoTotal - despesasTotais),
        diasTrabalhados: Number(historico.diasTrabalhados || 0),
        kmRodados: 0,
        kmOnline: 0,
        tempoOnlineSegundos: 0,
      });
    }

    for (const controle of controlesDiarios) {
      const periodoData = periodoDaData(controle.dataReferencia);

      if (
        !dentroDoPeriodo(periodoData.ano, periodoData.mes, inicio, fim) ||
        linhasPorPeriodo.get(periodoData.chave)?.origem === "HISTORICO_IMPORTADO"
      ) {
        continue;
      }

      const atual = linhasPorPeriodo.get(periodoData.chave) || {
        ano: periodoData.ano,
        mes: periodoData.mes,
        periodo: periodoData.chave,
        mesNome: nomeMes(periodoData.mes),
        origem: "CONTROLE_DIARIO" as const,
        faturamentoTrabalho: 0,
        feitoPorFora: 0,
        gasolina: 0,
        manutencao: 0,
        alimentacao: 0,
        outrasDespesas: 0,
        faturamentoTotal: 0,
        despesasTotais: 0,
        lucroLiquido: 0,
        diasTrabalhados: 0,
        kmRodados: 0,
        kmOnline: 0,
        tempoOnlineSegundos: 0,
      };

      const faturamentoTrabalho = Number(controle.valorExpressManager || 0);
      const feitoPorFora = Number(controle.valorPorFora || 0);
      const gasolina = Number(controle.gasolina || 0);
      const manutencao = Number(controle.manutencao || 0);
      const alimentacao = Number(controle.alimentacao || 0);
      const outrasDespesas = Number(controle.outrasDespesas || 0);

      const possuiMovimento =
        faturamentoTrabalho > 0 ||
        feitoPorFora > 0 ||
        gasolina > 0 ||
        manutencao > 0 ||
        alimentacao > 0 ||
        outrasDespesas > 0 ||
        Number(controle.kmOnlineTotal || 0) > 0 ||
        Number(controle.tempoOnlineSegundos || 0) > 0;

      atual.faturamentoTrabalho += faturamentoTrabalho;
      atual.feitoPorFora += feitoPorFora;
      atual.gasolina += gasolina;
      atual.manutencao += manutencao;
      atual.alimentacao += alimentacao;
      atual.outrasDespesas += outrasDespesas;
      atual.kmOnline += Number(controle.kmOnlineTotal || 0);
      atual.tempoOnlineSegundos += Number(controle.tempoOnlineSegundos || 0);

      if (
        controle.kmInicial !== null &&
        controle.kmFinal !== null &&
        controle.kmFinal >= controle.kmInicial
      ) {
        atual.kmRodados += controle.kmFinal - controle.kmInicial;
      }

      if (possuiMovimento) {
        atual.diasTrabalhados += 1;
      }

      atual.faturamentoTotal =
        atual.faturamentoTrabalho + atual.feitoPorFora;

      atual.despesasTotais =
        atual.gasolina +
        atual.manutencao +
        atual.alimentacao +
        atual.outrasDespesas;

      atual.lucroLiquido =
        atual.faturamentoTotal - atual.despesasTotais;

      linhasPorPeriodo.set(periodoData.chave, atual);
    }

    const meses = Array.from(linhasPorPeriodo.values())
      .map((linha) => ({
        ...linha,
        faturamentoTrabalho: arredondar(linha.faturamentoTrabalho),
        feitoPorFora: arredondar(linha.feitoPorFora),
        gasolina: arredondar(linha.gasolina),
        manutencao: arredondar(linha.manutencao),
        alimentacao: arredondar(linha.alimentacao),
        outrasDespesas: arredondar(linha.outrasDespesas),
        faturamentoTotal: arredondar(linha.faturamentoTotal),
        despesasTotais: arredondar(linha.despesasTotais),
        lucroLiquido: arredondar(linha.lucroLiquido),
        kmRodados: arredondar(linha.kmRodados, 1),
        kmOnline: arredondar(linha.kmOnline, 1),
      }))
      .sort((a, b) => a.periodo.localeCompare(b.periodo));

    const totais = meses.reduce(
      (acumulado, mes) => {
        acumulado.faturamentoTrabalho += mes.faturamentoTrabalho;
        acumulado.feitoPorFora += mes.feitoPorFora;
        acumulado.gasolina += mes.gasolina;
        acumulado.manutencao += mes.manutencao;
        acumulado.alimentacao += mes.alimentacao;
        acumulado.outrasDespesas += mes.outrasDespesas;
        acumulado.faturamentoTotal += mes.faturamentoTotal;
        acumulado.despesasTotais += mes.despesasTotais;
        acumulado.lucroLiquido += mes.lucroLiquido;
        acumulado.diasTrabalhados += mes.diasTrabalhados;
        acumulado.kmRodados += mes.kmRodados;
        acumulado.kmOnline += mes.kmOnline;
        acumulado.tempoOnlineSegundos += mes.tempoOnlineSegundos;
        return acumulado;
      },
      {
        faturamentoTrabalho: 0,
        feitoPorFora: 0,
        gasolina: 0,
        manutencao: 0,
        alimentacao: 0,
        outrasDespesas: 0,
        faturamentoTotal: 0,
        despesasTotais: 0,
        lucroLiquido: 0,
        diasTrabalhados: 0,
        kmRodados: 0,
        kmOnline: 0,
        tempoOnlineSegundos: 0,
      }
    );

    const mesesComDados = meses.length;
    const mediaMensal =
      mesesComDados > 0 ? totais.faturamentoTotal / mesesComDados : 0;

    const mediaLucroMensal =
      mesesComDados > 0 ? totais.lucroLiquido / mesesComDados : 0;

    const mediaDiaria =
      totais.diasTrabalhados > 0
        ? totais.faturamentoTotal / totais.diasTrabalhados
        : 0;

    const lucroPorDia =
      totais.diasTrabalhados > 0
        ? totais.lucroLiquido / totais.diasTrabalhados
        : 0;

    const faturamentoPorKm =
      totais.kmRodados > 0
        ? totais.faturamentoTotal / totais.kmRodados
        : null;

    const lucroPorKm =
      totais.kmRodados > 0
        ? totais.lucroLiquido / totais.kmRodados
        : null;

    const melhorMes =
      meses.length > 0
        ? [...meses].sort(
            (a, b) => b.lucroLiquido - a.lucroLiquido
          )[0]
        : null;

    const piorMes =
      meses.length > 0
        ? [...meses].sort(
            (a, b) => a.lucroLiquido - b.lucroLiquido
          )[0]
        : null;

    const anosMap = new Map<
      number,
      {
        ano: number;
        meses: number;
        faturamentoTotal: number;
        despesasTotais: number;
        lucroLiquido: number;
        diasTrabalhados: number;
      }
    >();

    for (const mes of meses) {
      const anoAtual = anosMap.get(mes.ano) || {
        ano: mes.ano,
        meses: 0,
        faturamentoTotal: 0,
        despesasTotais: 0,
        lucroLiquido: 0,
        diasTrabalhados: 0,
      };

      anoAtual.meses += 1;
      anoAtual.faturamentoTotal += mes.faturamentoTotal;
      anoAtual.despesasTotais += mes.despesasTotais;
      anoAtual.lucroLiquido += mes.lucroLiquido;
      anoAtual.diasTrabalhados += mes.diasTrabalhados;

      anosMap.set(mes.ano, anoAtual);
    }

    const anos = Array.from(anosMap.values())
      .map((ano) => ({
        ...ano,
        faturamentoTotal: arredondar(ano.faturamentoTotal),
        despesasTotais: arredondar(ano.despesasTotais),
        lucroLiquido: arredondar(ano.lucroLiquido),
        mediaMensal: arredondar(
          ano.meses > 0 ? ano.faturamentoTotal / ano.meses : 0
        ),
      }))
      .sort((a, b) => a.ano - b.ano);

    return NextResponse.json({
      motoboy: {
        id: motoboy.id,
        nome: motoboy.nome,
      },
      filtros: {
        inicio: inicio?.chave || null,
        fim: fim?.chave || null,
      },
      regraConsolidacao:
        "Quando um mês possui histórico importado, ele prevalece sobre os controles diários daquele mesmo mês para evitar duplicidade.",
      resumo: {
        mesesComDados,
        anosComDados: anos.length,
        faturamentoTrabalho: arredondar(totais.faturamentoTrabalho),
        feitoPorFora: arredondar(totais.feitoPorFora),
        gasolina: arredondar(totais.gasolina),
        manutencao: arredondar(totais.manutencao),
        alimentacao: arredondar(totais.alimentacao),
        outrasDespesas: arredondar(totais.outrasDespesas),
        faturamentoTotal: arredondar(totais.faturamentoTotal),
        despesasTotais: arredondar(totais.despesasTotais),
        lucroLiquido: arredondar(totais.lucroLiquido),
        diasTrabalhados: totais.diasTrabalhados,
        kmRodados: arredondar(totais.kmRodados, 1),
        kmOnline: arredondar(totais.kmOnline, 1),
        tempoOnlineSegundos: totais.tempoOnlineSegundos,
        mediaMensal: arredondar(mediaMensal),
        mediaLucroMensal: arredondar(mediaLucroMensal),
        mediaDiaria: arredondar(mediaDiaria),
        lucroPorDia: arredondar(lucroPorDia),
        faturamentoPorKm:
          faturamentoPorKm === null ? null : arredondar(faturamentoPorKm),
        lucroPorKm:
          lucroPorKm === null ? null : arredondar(lucroPorKm),
      },
      destaques: {
        melhorMes,
        piorMes,
      },
      anos,
      meses,
    });
  } catch (erro) {
    console.error("Erro ao gerar relatório da operação do motoboy:", erro);

    return respostaErro(
      erro instanceof Error
        ? erro.message
        : "Não foi possível gerar o relatório da operação.",
      500
    );
  }
}
