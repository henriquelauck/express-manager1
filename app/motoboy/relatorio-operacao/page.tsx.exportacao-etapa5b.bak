"use client";

import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Bike,
  CalendarDays,
  Clock3,
  Fuel,
  Gauge,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  WalletCards,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const FUSO_BRASIL = "America/Sao_Paulo";

type MesRelatorio = {
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

type AnoRelatorio = {
  ano: number;
  meses: number;
  faturamentoTotal: number;
  despesasTotais: number;
  lucroLiquido: number;
  diasTrabalhados: number;
  mediaMensal: number;
};

type RespostaRelatorio = {
  motoboy: {
    id: string;
    nome: string;
  };
  filtros: {
    inicio: string | null;
    fim: string | null;
  };
  regraConsolidacao: string;
  resumo: {
    mesesComDados: number;
    anosComDados: number;
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
    mediaMensal: number;
    mediaLucroMensal: number;
    mediaDiaria: number;
    lucroPorDia: number;
    faturamentoPorKm: number | null;
    lucroPorKm: number | null;
  };
  destaques: {
    melhorMes: MesRelatorio | null;
    piorMes: MesRelatorio | null;
  };
  anos: AnoRelatorio[];
  meses: MesRelatorio[];
};

export default function RelatorioOperacaoMotoboyPage() {
  const [inicio, setInicio] = useState("");
  const [fim, setFim] = useState("");
  const [dados, setDados] = useState<RespostaRelatorio | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState("");
  const [exportandoExcel, setExportandoExcel] = useState(false);

  async function carregar(mostrarAtualizacao = false) {
    if (mostrarAtualizacao) {
      setAtualizando(true);
    } else {
      setCarregando(true);
    }

    setErro("");

    try {
      const parametros = new URLSearchParams();

      if (inicio) {
        parametros.set("inicio", inicio);
      }

      if (fim) {
        parametros.set("fim", fim);
      }

      const query = parametros.toString();
      const resposta = await fetch(
        `/api/motoboys/relatorio-operacao${query ? `?${query}` : ""}`,
        {
          cache: "no-store",
        }
      );

      if (resposta.status === 401 || resposta.status === 403) {
        window.location.href = "/login";
        return;
      }

      const resultado = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          resultado?.erro || "Não foi possível carregar o relatório."
        );
      }

      setDados(resultado as RespostaRelatorio);
    } catch (erroCarregamento) {
      setErro(
        erroCarregamento instanceof Error
          ? erroCarregamento.message
          : "Não foi possível carregar o relatório."
      );
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }

  async function exportarExcel() {
    if (!dados || exportandoExcel) {
      return;
    }

    setExportandoExcel(true);
    setErro("");

    try {
      const XLSX = await import("xlsx");

      const resumoLinhas = [
        ["RELATÓRIO DA OPERAÇÃO DO MOTOBOY"],
        [],
        ["Motoboy", dados.motoboy.nome],
        [
          "Período",
          `${dados.filtros.inicio || "Início"} até ${dados.filtros.fim || "Atual"}`,
        ],
        ["Meses com dados", dados.resumo.mesesComDados],
        ["Anos com dados", dados.resumo.anosComDados],
        [],
        ["INDICADOR", "VALOR"],
        ["Faturamento do trabalho", dados.resumo.faturamentoTrabalho],
        ["Feito por fora", dados.resumo.feitoPorFora],
        ["Faturamento total", dados.resumo.faturamentoTotal],
        ["Gasolina", dados.resumo.gasolina],
        ["Manutenção", dados.resumo.manutencao],
        ["Alimentação", dados.resumo.alimentacao],
        ["Outras despesas", dados.resumo.outrasDespesas],
        ["Despesas totais", dados.resumo.despesasTotais],
        ["Lucro líquido", dados.resumo.lucroLiquido],
        ["Dias trabalhados", dados.resumo.diasTrabalhados],
        ["Km rodados", dados.resumo.kmRodados],
        ["Km online", dados.resumo.kmOnline],
        ["Tempo online em segundos", dados.resumo.tempoOnlineSegundos],
        ["Média mensal", dados.resumo.mediaMensal],
        ["Lucro médio mensal", dados.resumo.mediaLucroMensal],
        ["Média diária", dados.resumo.mediaDiaria],
        ["Lucro por dia", dados.resumo.lucroPorDia],
        ["Faturamento por km", dados.resumo.faturamentoPorKm ?? ""],
        ["Lucro por km", dados.resumo.lucroPorKm ?? ""],
        [],
        ["Regra de consolidação", dados.regraConsolidacao],
      ];

      const anosLinhas = dados.anos.map((ano) => ({
        ANO: ano.ano,
        MESES: ano.meses,
        FATURAMENTO_TOTAL: ano.faturamentoTotal,
        DESPESAS_TOTAIS: ano.despesasTotais,
        LUCRO_LIQUIDO: ano.lucroLiquido,
        DIAS_TRABALHADOS: ano.diasTrabalhados,
        MEDIA_MENSAL: ano.mediaMensal,
      }));

      const mesesLinhas = dados.meses.map((mes) => ({
        ANO: mes.ano,
        MES: mes.mes,
        PERIODO: mes.periodo,
        MES_NOME: mes.mesNome,
        ORIGEM:
          mes.origem === "HISTORICO_IMPORTADO"
            ? "HISTORICO IMPORTADO"
            : "CONTROLE DIARIO",
        FATURAMENTO_TRABALHO: mes.faturamentoTrabalho,
        FEITO_POR_FORA: mes.feitoPorFora,
        FATURAMENTO_TOTAL: mes.faturamentoTotal,
        GASOLINA: mes.gasolina,
        MANUTENCAO: mes.manutencao,
        ALIMENTACAO: mes.alimentacao,
        OUTRAS_DESPESAS: mes.outrasDespesas,
        DESPESAS_TOTAIS: mes.despesasTotais,
        LUCRO_LIQUIDO: mes.lucroLiquido,
        DIAS_TRABALHADOS: mes.diasTrabalhados,
        KM_RODADOS: mes.kmRodados,
        KM_ONLINE: mes.kmOnline,
        TEMPO_ONLINE_SEGUNDOS: mes.tempoOnlineSegundos,
      }));

      const workbook = XLSX.utils.book_new();

      const resumoSheet = XLSX.utils.aoa_to_sheet(resumoLinhas);
      const anosSheet = XLSX.utils.json_to_sheet(anosLinhas);
      const mesesSheet = XLSX.utils.json_to_sheet(mesesLinhas);

      resumoSheet["!cols"] = [{ wch: 34 }, { wch: 70 }];
      anosSheet["!cols"] = [
        { wch: 10 },
        { wch: 10 },
        { wch: 22 },
        { wch: 22 },
        { wch: 22 },
        { wch: 20 },
        { wch: 20 },
      ];
      mesesSheet["!cols"] = [
        { wch: 10 },
        { wch: 8 },
        { wch: 12 },
        { wch: 16 },
        { wch: 22 },
        { wch: 24 },
        { wch: 20 },
        { wch: 22 },
        { wch: 16 },
        { wch: 18 },
        { wch: 16 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 18 },
        { wch: 15 },
        { wch: 15 },
        { wch: 24 },
      ];

      XLSX.utils.book_append_sheet(workbook, resumoSheet, "RESUMO");
      XLSX.utils.book_append_sheet(workbook, anosSheet, "ANOS");
      XLSX.utils.book_append_sheet(workbook, mesesSheet, "MESES");

      const periodoArquivo =
        dados.filtros.inicio || dados.filtros.fim
          ? `${dados.filtros.inicio || "inicio"}_${dados.filtros.fim || "atual"}`
          : "completo";

      const nomeSeguro = dados.motoboy.nome
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .toLowerCase();

      XLSX.writeFile(
        workbook,
        `relatorio_operacao_${nomeSeguro || "motoboy"}_${periodoArquivo}.xlsx`
      );
    } catch (erroExportacao) {
      setErro(
        erroExportacao instanceof Error
          ? erroExportacao.message
          : "Não foi possível exportar o relatório em Excel."
      );
    } finally {
      setExportandoExcel(false);
    }
  }

  useEffect(() => {
    void carregar();
  }, []);

  const maiorFaturamentoMensal = useMemo(() => {
    return Math.max(
      ...(dados?.meses || []).map((mes) => mes.faturamentoTotal),
      1
    );
  }, [dados?.meses]);

  const maiorFaturamentoAnual = useMemo(() => {
    return Math.max(
      ...(dados?.anos || []).map((ano) => ano.faturamentoTotal),
      1
    );
  }, [dados?.anos]);

  const periodoInvalido = Boolean(inicio && fim && inicio > fim);

  if (carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 size={30} className="animate-spin text-emerald-600" />
          <div>
            <p className="font-semibold text-slate-800">
              Montando seu relatório
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Consolidando histórico e controles atuais.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 sm:px-6 sm:py-7">
      <div className="mx-auto w-full max-w-7xl">
        <header className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-lg">
          <div className="relative p-5 sm:p-7">
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-500/20 blur-3xl" />

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <Link
                  href="/motoboy/minha-operacao"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-300 transition hover:text-emerald-200"
                >
                  <ArrowLeft size={17} />
                  Voltar à Minha operação
                </Link>

                <p className="mt-5 text-sm font-medium text-emerald-300">
                  Visão financeira completa
                </p>

                <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
                  Relatório da operação
                </h1>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
                  Acompanhe faturamento, despesas, lucro, dias trabalhados e
                  quilometragem ao longo dos meses e anos.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => void exportarExcel()}
                  disabled={
                    !dados ||
                    exportandoExcel ||
                    periodoInvalido ||
                    dados.meses.length === 0
                  }
                  className="flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {exportandoExcel ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <FileSpreadsheet size={18} />
                  )}
                  Exportar Excel
                </button>

                <button
                  type="button"
                  onClick={() => void carregar(true)}
                  disabled={atualizando || periodoInvalido}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-5 font-semibold text-white transition hover:bg-white/15 disabled:opacity-60"
                >
                  <RefreshCw
                    size={18}
                    className={atualizando ? "animate-spin" : ""}
                  />
                  Atualizar
                </button>
              </div>
            </div>
          </div>
        </header>

        {erro && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            {erro}
          </div>
        )}

        <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-5 sm:px-6">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <CalendarDays size={20} />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">Filtrar período</h2>
              <p className="mt-1 text-xs text-slate-500">
                Selecione o mês inicial e final.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-3 sm:p-6">
            <div>
              <label className="text-sm font-medium text-slate-600">
                Mês inicial
              </label>
              <input
                type="month"
                value={inicio}
                max={fim || undefined}
                onChange={(evento) => setInicio(evento.target.value)}
                className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-600">
                Mês final
              </label>
              <input
                type="month"
                value={fim}
                min={inicio || undefined}
                onChange={(evento) => setFim(evento.target.value)}
                className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => void carregar(true)}
                disabled={atualizando || periodoInvalido}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              >
                {atualizando ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <BarChart3 size={18} />
                )}
                Aplicar filtro
              </button>
            </div>
          </div>

          {periodoInvalido && (
            <div className="mx-5 mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-6 sm:mb-6">
              O mês inicial não pode ser posterior ao mês final.
            </div>
          )}
        </section>

        {dados && (
          <>
            <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4 xl:grid-cols-8">
              <Resumo
                titulo="Faturamento"
                valor={formatarMoeda(dados.resumo.faturamentoTotal)}
                subtitulo={`${dados.resumo.mesesComDados} meses`}
                icone={<TrendingUp size={20} />}
                destaque="verde"
              />
              <Resumo
                titulo="Lucro líquido"
                valor={formatarMoeda(dados.resumo.lucroLiquido)}
                subtitulo="Após despesas"
                icone={<WalletCards size={20} />}
                destaque={
                  dados.resumo.lucroLiquido >= 0 ? "verde" : "vermelho"
                }
              />
              <Resumo
                titulo="Trabalho"
                valor={formatarMoeda(dados.resumo.faturamentoTrabalho)}
                subtitulo="Atividade principal"
                icone={<Bike size={20} />}
              />
              <Resumo
                titulo="Feito por fora"
                valor={formatarMoeda(dados.resumo.feitoPorFora)}
                subtitulo="Extras e particulares"
                icone={<TrendingUp size={20} />}
              />
              <Resumo
                titulo="Gasolina"
                valor={formatarMoeda(dados.resumo.gasolina)}
                subtitulo="Total do período"
                icone={<Fuel size={20} />}
                destaque="laranja"
              />
              <Resumo
                titulo="Manutenção"
                valor={formatarMoeda(dados.resumo.manutencao)}
                subtitulo="Total do período"
                icone={<Wrench size={20} />}
                destaque="laranja"
              />
              <Resumo
                titulo="Dias trabalhados"
                valor={String(dados.resumo.diasTrabalhados)}
                subtitulo={formatarMoeda(dados.resumo.mediaDiaria) + "/dia"}
                icone={<CalendarDays size={20} />}
                destaque="azul"
              />
              <Resumo
                titulo="Km rodados"
                valor={`${formatarNumero(dados.resumo.kmRodados, 1)} km`}
                subtitulo={
                  dados.resumo.faturamentoPorKm === null
                    ? "Sem dados"
                    : `${formatarMoeda(dados.resumo.faturamentoPorKm)}/km`
                }
                icone={<Gauge size={20} />}
                destaque="azul"
              />
            </section>

            <section className="mt-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
              <DestaqueMes
                titulo="Melhor mês"
                mes={dados.destaques.melhorMes}
                tipo="melhor"
              />
              <DestaqueMes
                titulo="Pior mês"
                mes={dados.destaques.piorMes}
                tipo="pior"
              />
            </section>

            <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <CabecalhoSecao
                titulo="Indicadores médios"
                descricao="Médias calculadas para o período selecionado."
                icone={<TrendingUp size={21} />}
              />

              <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-3 lg:grid-cols-6 sm:p-6">
                <Indicador
                  titulo="Média mensal"
                  valor={formatarMoeda(dados.resumo.mediaMensal)}
                />
                <Indicador
                  titulo="Lucro médio mensal"
                  valor={formatarMoeda(dados.resumo.mediaLucroMensal)}
                />
                <Indicador
                  titulo="Média diária"
                  valor={formatarMoeda(dados.resumo.mediaDiaria)}
                />
                <Indicador
                  titulo="Lucro por dia"
                  valor={formatarMoeda(dados.resumo.lucroPorDia)}
                />
                <Indicador
                  titulo="Lucro por km"
                  valor={
                    dados.resumo.lucroPorKm === null
                      ? "Sem dados"
                      : `${formatarMoeda(dados.resumo.lucroPorKm)}/km`
                  }
                />
                <Indicador
                  titulo="Tempo online"
                  valor={formatarDuracao(dados.resumo.tempoOnlineSegundos)}
                />
              </div>
            </section>

            <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <CabecalhoSecao
                titulo="Comparação anual"
                descricao="Faturamento, despesas e lucro de cada ano."
                icone={<BarChart3 size={21} />}
              />

              {dados.anos.length === 0 ? (
                <EstadoVazio texto="Nenhum ano encontrado no período." />
              ) : (
                <div className="space-y-5 p-5 sm:p-6">
                  {dados.anos.map((ano) => {
                    const percentual =
                      (ano.faturamentoTotal / maiorFaturamentoAnual) * 100;

                    return (
                      <article
                        key={ano.ano}
                        className="rounded-2xl border border-slate-200 p-4 sm:p-5"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <strong className="text-xl text-slate-900">
                              {ano.ano}
                            </strong>
                            <p className="mt-1 text-sm text-slate-500">
                              {ano.meses} meses • {ano.diasTrabalhados} dias
                              trabalhados
                            </p>
                          </div>

                          <div className="grid grid-cols-3 gap-4 text-right">
                            <div>
                              <p className="text-xs text-slate-400">
                                Faturamento
                              </p>
                              <strong className="text-slate-900">
                                {formatarMoeda(ano.faturamentoTotal)}
                              </strong>
                            </div>
                            <div>
                              <p className="text-xs text-slate-400">
                                Despesas
                              </p>
                              <strong className="text-orange-700">
                                {formatarMoeda(ano.despesasTotais)}
                              </strong>
                            </div>
                            <div>
                              <p className="text-xs text-slate-400">Lucro</p>
                              <strong
                                className={
                                  ano.lucroLiquido >= 0
                                    ? "text-emerald-700"
                                    : "text-red-700"
                                }
                              >
                                {formatarMoeda(ano.lucroLiquido)}
                              </strong>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{
                              width: `${Math.max(percentual, 2)}%`,
                            }}
                          />
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <CabecalhoSecao
                titulo="Evolução mensal"
                descricao="Compare o faturamento dos meses encontrados."
                icone={<TrendingUp size={21} />}
              />

              {dados.meses.length === 0 ? (
                <EstadoVazio texto="Nenhum mês encontrado no período." />
              ) : (
                <div className="space-y-4 p-5 sm:p-6">
                  {dados.meses.map((mes) => {
                    const percentual =
                      (mes.faturamentoTotal / maiorFaturamentoMensal) * 100;

                    return (
                      <div key={mes.periodo}>
                        <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                          <div className="min-w-0">
                            <strong className="capitalize text-slate-900">
                              {mes.mesNome} de {mes.ano}
                            </strong>
                            <span className="ml-2 text-xs text-slate-400">
                              {mes.origem === "HISTORICO_IMPORTADO"
                                ? "Importado"
                                : "Controle diário"}
                            </span>
                          </div>

                          <strong className="shrink-0 text-emerald-700">
                            {formatarMoeda(mes.faturamentoTotal)}
                          </strong>
                        </div>

                        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{
                              width: `${Math.max(percentual, 2)}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <CabecalhoSecao
                titulo="Detalhamento mensal"
                descricao="Todos os valores consolidados por mês."
                icone={<CalendarDays size={21} />}
              />

              {dados.meses.length === 0 ? (
                <EstadoVazio texto="Nenhum mês encontrado no período." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1250px]">
                    <thead>
                      <tr className="border-b bg-slate-50/70 text-left text-xs uppercase tracking-wide text-slate-400">
                        <th className="p-4">Período</th>
                        <th className="p-4">Origem</th>
                        <th className="p-4 text-right">Trabalho</th>
                        <th className="p-4 text-right">Por fora</th>
                        <th className="p-4 text-right">Faturamento</th>
                        <th className="p-4 text-right">Gasolina</th>
                        <th className="p-4 text-right">Manutenção</th>
                        <th className="p-4 text-right">Outras</th>
                        <th className="p-4 text-right">Lucro</th>
                        <th className="p-4 text-right">Dias</th>
                        <th className="p-4 text-right">Km</th>
                      </tr>
                    </thead>

                    <tbody>
                      {dados.meses.map((mes) => (
                        <tr
                          key={mes.periodo}
                          className="border-b border-slate-100 last:border-b-0"
                        >
                          <td className="p-4 font-semibold capitalize text-slate-900">
                            {mes.mesNome} de {mes.ano}
                          </td>
                          <td className="p-4">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                mes.origem === "HISTORICO_IMPORTADO"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-emerald-100 text-emerald-700"
                              }`}
                            >
                              {mes.origem === "HISTORICO_IMPORTADO"
                                ? "Importado"
                                : "Atual"}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            {formatarMoeda(mes.faturamentoTrabalho)}
                          </td>
                          <td className="p-4 text-right">
                            {formatarMoeda(mes.feitoPorFora)}
                          </td>
                          <td className="p-4 text-right font-semibold text-slate-900">
                            {formatarMoeda(mes.faturamentoTotal)}
                          </td>
                          <td className="p-4 text-right">
                            {formatarMoeda(mes.gasolina)}
                          </td>
                          <td className="p-4 text-right">
                            {formatarMoeda(mes.manutencao)}
                          </td>
                          <td className="p-4 text-right">
                            {formatarMoeda(
                              mes.alimentacao + mes.outrasDespesas
                            )}
                          </td>
                          <td
                            className={`p-4 text-right font-semibold ${
                              mes.lucroLiquido >= 0
                                ? "text-emerald-700"
                                : "text-red-700"
                            }`}
                          >
                            {formatarMoeda(mes.lucroLiquido)}
                          </td>
                          <td className="p-4 text-right">
                            {mes.diasTrabalhados}
                          </td>
                          <td className="p-4 text-right">
                            {formatarNumero(mes.kmRodados, 1)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-800">
              <strong>Como os dados são unidos:</strong>{" "}
              {dados.regraConsolidacao}
            </div>
          </>
        )}

        <footer className="py-8 text-center text-xs text-slate-400">
          Express Manager • Relatório da operação do motoboy
        </footer>
      </div>
    </main>
  );
}

function Resumo({
  titulo,
  valor,
  subtitulo,
  icone,
  destaque = "padrao",
}: {
  titulo: string;
  valor: string;
  subtitulo: string;
  icone: React.ReactNode;
  destaque?: "padrao" | "verde" | "laranja" | "azul" | "vermelho";
}) {
  const estilos = {
    padrao: "bg-slate-100 text-slate-700",
    verde: "bg-emerald-100 text-emerald-700",
    laranja: "bg-orange-100 text-orange-700",
    azul: "bg-blue-100 text-blue-700",
    vermelho: "bg-red-100 text-red-700",
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${estilos[destaque]}`}
      >
        {icone}
      </div>
      <p className="mt-4 text-xs font-medium text-slate-500">{titulo}</p>
      <strong className="mt-1 block break-words text-base text-slate-900 sm:text-lg">
        {valor}
      </strong>
      <p className="mt-1 text-xs text-slate-400">{subtitulo}</p>
    </div>
  );
}

function DestaqueMes({
  titulo,
  mes,
  tipo,
}: {
  titulo: string;
  mes: MesRelatorio | null;
  tipo: "melhor" | "pior";
}) {
  const positivo = tipo === "melhor";

  return (
    <div
      className={`rounded-3xl border p-5 shadow-sm sm:p-6 ${
        positivo
          ? "border-emerald-200 bg-emerald-50"
          : "border-orange-200 bg-orange-50"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p
            className={`text-sm font-semibold ${
              positivo ? "text-emerald-700" : "text-orange-700"
            }`}
          >
            {titulo}
          </p>

          {mes ? (
            <>
              <h2 className="mt-2 text-2xl font-bold capitalize text-slate-900">
                {mes.mesNome} de {mes.ano}
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Faturamento: {formatarMoeda(mes.faturamentoTotal)}
              </p>
              <strong
                className={`mt-3 block text-xl ${
                  mes.lucroLiquido >= 0
                    ? "text-emerald-700"
                    : "text-red-700"
                }`}
              >
                Lucro {formatarMoeda(mes.lucroLiquido)}
              </strong>
            </>
          ) : (
            <p className="mt-2 text-sm text-slate-500">Sem dados.</p>
          )}
        </div>

        <div
          className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
            positivo
              ? "bg-emerald-100 text-emerald-700"
              : "bg-orange-100 text-orange-700"
          }`}
        >
          {positivo ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
        </div>
      </div>
    </div>
  );
}

function CabecalhoSecao({
  titulo,
  descricao,
  icone,
}: {
  titulo: string;
  descricao: string;
  icone: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-5 sm:px-6">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
        {icone}
      </div>
      <div>
        <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
          {titulo}
        </h2>
        <p className="mt-1 text-xs text-slate-500 sm:text-sm">
          {descricao}
        </p>
      </div>
    </div>
  );
}

function Indicador({
  titulo,
  valor,
}: {
  titulo: string;
  valor: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium text-slate-500">{titulo}</p>
      <strong className="mt-2 block text-lg text-slate-900">{valor}</strong>
    </div>
  );
}

function EstadoVazio({ texto }: { texto: string }) {
  return (
    <div className="px-6 py-12 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <BarChart3 size={26} />
      </div>
      <p className="mt-4 text-sm text-slate-500">{texto}</p>
    </div>
  );
}

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(valor || 0));
}

function formatarNumero(valor: number, casas = 2) {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  }).format(Number(valor || 0));
}

function formatarDuracao(segundosTotais: number) {
  const total = Math.max(0, Math.floor(Number(segundosTotais || 0)));
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);

  if (horas > 0) {
    return `${horas}h ${String(minutos).padStart(2, "0")}min`;
  }

  return `${minutos} min`;
}