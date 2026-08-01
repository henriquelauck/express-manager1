"use client";

import {
  AlertCircle,
  ArrowLeft,
  Bike,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Fuel,
  Gauge,
  Loader2,
  RefreshCw,
  Save,
  Settings,
  TrendingDown,
  TrendingUp,
  WalletCards,
  Wrench,
} from "lucide-react";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";

const FUSO_BRASIL = "America/Sao_Paulo";

type SessaoOnline = {
  id: string;
  iniciadaEm: string;
  encerradaEm?: string | null;
  kmOnline: number;
  tempoSegundos: number;
  pontosAceitos: number;
  pontosDescartados: number;
};

type ControleDiario = {
  id: string;
  dataReferencia: string;
  valorExpressManager: number;
  valorPorFora: number;
  gasolina: number;
  manutencao: number;
  alimentacao: number;
  outrasDespesas: number;
  descricaoManutencao?: string | null;
  descricaoOutrasDespesas?: string | null;
  observacoes?: string | null;
  kmInicial?: number | null;
  kmFinal?: number | null;
  kmOnlineTotal: number;
  tempoOnlineSegundos: number;
  sessoesOnline: SessaoOnline[];
};

type ResumoControle = {
  faturamentoTotal: number;
  despesasTotais: number;
  lucroLiquido: number;
  kmTotalRodado?: number | null;
  faturamentoPorKmOnline?: number | null;
  lucroPorKmOnline?: number | null;
  kmForaDoApp?: number | null;
  tempoOnlineSegundos: number;
};

type RespostaControle = {
  controle: ControleDiario;
  resumo: ResumoControle;
};

type FormularioControle = {
  valorPorFora: string;
  gasolina: string;
  manutencao: string;
  alimentacao: string;
  outrasDespesas: string;
  descricaoManutencao: string;
  descricaoOutrasDespesas: string;
  observacoes: string;
  kmInicial: string;
  kmFinal: string;
};

const FORMULARIO_VAZIO: FormularioControle = {
  valorPorFora: "",
  gasolina: "",
  manutencao: "",
  alimentacao: "",
  outrasDespesas: "",
  descricaoManutencao: "",
  descricaoOutrasDespesas: "",
  observacoes: "",
  kmInicial: "",
  kmFinal: "",
};

export default function MinhaOperacaoPage() {
  const [dataSelecionada, setDataSelecionada] = useState(() => dataBrasilISO(new Date()));
  const [controle, setControle] = useState<ControleDiario | null>(null);
  const [resumo, setResumo] = useState<ResumoControle | null>(null);
  const [formulario, setFormulario] = useState<FormularioControle>(FORMULARIO_VAZIO);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  async function carregar(mostrarAtualizacao = false) {
    if (mostrarAtualizacao) {
      setAtualizando(true);
    } else {
      setCarregando(true);
    }

    setErro("");
    setSucesso("");

    try {
      const resposta = await fetch(
        `/api/motoboys/meu-controle-diario?data=${encodeURIComponent(dataSelecionada)}`,
        {
          cache: "no-store",
        }
      );

      if (resposta.status === 401 || resposta.status === 403) {
        window.location.href = "/login";
        return;
      }

      if (!resposta.ok) {
        throw new Error(
          await extrairErro(resposta, "Não foi possível carregar seu controle diário.")
        );
      }

      const dados = (await resposta.json()) as RespostaControle;

      setControle(dados.controle);
      setResumo(dados.resumo);
      preencherFormulario(dados.controle);
    } catch (erroCarregamento) {
      setErro(
        erroCarregamento instanceof Error
          ? erroCarregamento.message
          : "Não foi possível carregar seu controle diário."
      );
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }

  useEffect(() => {
    void carregar();
  }, [dataSelecionada]);

  function preencherFormulario(dados: ControleDiario) {
    setFormulario({
      valorPorFora: valorParaCampo(dados.valorPorFora),
      gasolina: valorParaCampo(dados.gasolina),
      manutencao: valorParaCampo(dados.manutencao),
      alimentacao: valorParaCampo(dados.alimentacao),
      outrasDespesas: valorParaCampo(dados.outrasDespesas),
      descricaoManutencao: dados.descricaoManutencao || "",
      descricaoOutrasDespesas: dados.descricaoOutrasDespesas || "",
      observacoes: dados.observacoes || "",
      kmInicial: numeroOpcionalParaCampo(dados.kmInicial),
      kmFinal: numeroOpcionalParaCampo(dados.kmFinal),
    });
  }

  function atualizarCampo(campo: keyof FormularioControle, valor: string) {
    setFormulario((atual) => ({
      ...atual,
      [campo]: valor,
    }));
  }

  async function salvar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (salvando) {
      return;
    }

    setSalvando(true);
    setErro("");
    setSucesso("");

    try {
      const resposta = await fetch("/api/motoboys/meu-controle-diario", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dataReferencia: dataSelecionada,
          valorPorFora: campoParaNumero(formulario.valorPorFora),
          gasolina: campoParaNumero(formulario.gasolina),
          manutencao: campoParaNumero(formulario.manutencao),
          alimentacao: campoParaNumero(formulario.alimentacao),
          outrasDespesas: campoParaNumero(formulario.outrasDespesas),
          descricaoManutencao: formulario.descricaoManutencao,
          descricaoOutrasDespesas: formulario.descricaoOutrasDespesas,
          observacoes: formulario.observacoes,
          kmInicial: campoParaNumeroOpcional(formulario.kmInicial),
          kmFinal: campoParaNumeroOpcional(formulario.kmFinal),
        }),
      });

      if (resposta.status === 401 || resposta.status === 403) {
        window.location.href = "/login";
        return;
      }

      if (!resposta.ok) {
        throw new Error(
          await extrairErro(resposta, "Não foi possível salvar seu controle diário.")
        );
      }

      const dados = (await resposta.json()) as RespostaControle;

      setControle(dados.controle);
      setResumo(dados.resumo);
      preencherFormulario(dados.controle);
      setSucesso("Controle diário salvo com sucesso.");
    } catch (erroSalvamento) {
      setErro(
        erroSalvamento instanceof Error
          ? erroSalvamento.message
          : "Não foi possível salvar seu controle diário."
      );
    } finally {
      setSalvando(false);
    }
  }

  const resumoPrevisto = useMemo(() => {
    const valorExpressManager = Number(controle?.valorExpressManager || 0);
    const valorPorFora = campoParaNumero(formulario.valorPorFora);
    const gasolina = campoParaNumero(formulario.gasolina);
    const manutencao = campoParaNumero(formulario.manutencao);
    const alimentacao = campoParaNumero(formulario.alimentacao);
    const outrasDespesas = campoParaNumero(formulario.outrasDespesas);

    const faturamentoTotal = valorExpressManager + valorPorFora;
    const despesasTotais = gasolina + manutencao + alimentacao + outrasDespesas;
    const lucroLiquido = faturamentoTotal - despesasTotais;

    return {
      faturamentoTotal,
      despesasTotais,
      lucroLiquido,
    };
  }, [controle?.valorExpressManager, formulario]);

  if (carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 size={30} className="animate-spin text-emerald-600" />
          <div>
            <p className="font-semibold text-slate-800">Carregando sua operação</p>
            <p className="mt-1 text-sm text-slate-500">
              Buscando faturamento, despesas e quilometragem.
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 sm:px-6 sm:py-7">
      <div className="mx-auto w-full max-w-6xl">
        <header className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-lg">
          <div className="relative p-5 sm:p-7">
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-500/20 blur-3xl" />

            <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <Link
                  href="/motoboy"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-300 transition hover:text-emerald-200"
                >
                  <ArrowLeft size={17} />
                  Voltar ao painel
                </Link>

                <p className="mt-5 text-sm font-medium text-emerald-300">
                  Controle pessoal
                </p>

                <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
                  Minha operação
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                  Registre ganhos, despesas, manutenção e quilometragem do dia.
                </p>
              </div>

              <button
                type="button"
                onClick={() => void carregar(true)}
                disabled={atualizando}
                className="flex h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-5 font-semibold text-white transition hover:bg-white/15 disabled:opacity-60"
              >
                <RefreshCw size={18} className={atualizando ? "animate-spin" : ""} />
                Atualizar
              </button>
            </div>
          </div>
        </header>

        {erro && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            {erro}
          </div>
        )}

        {sucesso && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
            {sucesso}
          </div>
        )}

        <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/70 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <CalendarDays size={20} />
              </div>

              <div>
                <h2 className="font-bold text-slate-900">Dia da operação</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Consulte ou preencha qualquer dia.
                </p>
              </div>
            </div>

            <input
              type="date"
              value={dataSelecionada}
              max={dataBrasilISO(new Date())}
              onChange={(evento) => setDataSelecionada(evento.target.value)}
              className="h-12 rounded-xl border border-slate-200 bg-white px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />
          </div>
        </section>

        <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          <Resumo
            titulo="Express Manager"
            valor={formatarMoeda(Number(controle?.valorExpressManager || 0))}
            subtitulo="Bruto das teles"
            icone={<Bike size={20} />}
          />
          <Resumo
            titulo="Feito por fora"
            valor={formatarMoeda(campoParaNumero(formulario.valorPorFora))}
            subtitulo="Informado por você"
            icone={<CircleDollarSign size={20} />}
          />
          <Resumo
            titulo="Faturamento total"
            valor={formatarMoeda(resumoPrevisto.faturamentoTotal)}
            subtitulo="Express + por fora"
            icone={<TrendingUp size={20} />}
            destaque="verde"
          />
          <Resumo
            titulo="Despesas"
            valor={formatarMoeda(resumoPrevisto.despesasTotais)}
            subtitulo="Total do dia"
            icone={<TrendingDown size={20} />}
            destaque="laranja"
          />
          <Resumo
            titulo="Lucro líquido"
            valor={formatarMoeda(resumoPrevisto.lucroLiquido)}
            subtitulo="Antes de outros custos"
            icone={<WalletCards size={20} />}
            destaque={resumoPrevisto.lucroLiquido >= 0 ? "verde" : "vermelho"}
          />
          <Resumo
            titulo="Km online"
            valor={`${formatarNumero(Number(controle?.kmOnlineTotal || 0), 1)} km`}
            subtitulo={formatarDuracao(Number(controle?.tempoOnlineSegundos || 0))}
            icone={<Gauge size={20} />}
            destaque="azul"
          />
        </section>

        <form onSubmit={salvar}>
          <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <CabecalhoFormulario
              titulo="Ganhos e despesas"
              descricao="Informe os valores pessoais do dia."
              icone={<CircleDollarSign size={21} />}
            />

            <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 lg:grid-cols-3 sm:p-6">
              <CampoDinheiro
                label="Valor feito por fora"
                value={formulario.valorPorFora}
                onChange={(valor) => atualizarCampo("valorPorFora", valor)}
              />
              <CampoDinheiro
                label="Gasolina"
                value={formulario.gasolina}
                onChange={(valor) => atualizarCampo("gasolina", valor)}
                icone={<Fuel size={17} />}
              />
              <CampoDinheiro
                label="Manutenção"
                value={formulario.manutencao}
                onChange={(valor) => atualizarCampo("manutencao", valor)}
                icone={<Wrench size={17} />}
              />
              <CampoDinheiro
                label="Alimentação"
                value={formulario.alimentacao}
                onChange={(valor) => atualizarCampo("alimentacao", valor)}
              />
              <CampoDinheiro
                label="Outras despesas"
                value={formulario.outrasDespesas}
                onChange={(valor) => atualizarCampo("outrasDespesas", valor)}
                icone={<Settings size={17} />}
              />
            </div>

            <div className="grid grid-cols-1 gap-5 border-t border-slate-100 p-5 sm:grid-cols-2 sm:p-6">
              <CampoTexto
                label="O que foi feito na manutenção?"
                value={formulario.descricaoManutencao}
                onChange={(valor) => atualizarCampo("descricaoManutencao", valor)}
                placeholder="Ex.: troca de óleo, relação, pneu..."
              />
              <CampoTexto
                label="Descrição das outras despesas"
                value={formulario.descricaoOutrasDespesas}
                onChange={(valor) => atualizarCampo("descricaoOutrasDespesas", valor)}
                placeholder="Ex.: lavagem, estacionamento..."
              />
            </div>
          </section>

          <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <CabecalhoFormulario
              titulo="Quilometragem"
              descricao="Compare o hodômetro da moto com os quilômetros calculados pelo app."
              icone={<Gauge size={21} />}
            />

            <div className="grid grid-cols-1 gap-5 p-5 sm:grid-cols-2 lg:grid-cols-4 sm:p-6">
              <CampoNumero
                label="Km inicial da moto"
                value={formulario.kmInicial}
                onChange={(valor) => atualizarCampo("kmInicial", valor)}
              />
              <CampoNumero
                label="Km final da moto"
                value={formulario.kmFinal}
                onChange={(valor) => atualizarCampo("kmFinal", valor)}
              />
              <InfoQuilometragem
                titulo="Km total rodado"
                valor={
                  resumo?.kmTotalRodado === null || resumo?.kmTotalRodado === undefined
                    ? "Informe início e fim"
                    : `${formatarNumero(resumo.kmTotalRodado, 1)} km`
                }
              />
              <InfoQuilometragem
                titulo="Km fora do app"
                valor={
                  resumo?.kmForaDoApp === null || resumo?.kmForaDoApp === undefined
                    ? "Aguardando hodômetro"
                    : `${formatarNumero(resumo.kmForaDoApp, 1)} km`
                }
              />
            </div>

            <div className="grid grid-cols-1 gap-4 border-t border-slate-100 bg-slate-50/70 p-5 sm:grid-cols-2 lg:grid-cols-4 sm:p-6">
              <InfoQuilometragem
                titulo="Km enquanto online"
                valor={`${formatarNumero(Number(controle?.kmOnlineTotal || 0), 1)} km`}
                destaque
              />
              <InfoQuilometragem
                titulo="Tempo online"
                valor={formatarDuracao(Number(controle?.tempoOnlineSegundos || 0))}
              />
              <InfoQuilometragem
                titulo="Faturamento por km"
                valor={
                  resumo?.faturamentoPorKmOnline
                    ? `${formatarMoeda(resumo.faturamentoPorKmOnline)}/km`
                    : "Sem dados"
                }
              />
              <InfoQuilometragem
                titulo="Lucro por km"
                valor={
                  resumo?.lucroPorKmOnline
                    ? `${formatarMoeda(resumo.lucroPorKmOnline)}/km`
                    : "Sem dados"
                }
              />
            </div>
          </section>

          <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <CabecalhoFormulario
              titulo="Observações"
              descricao="Anote qualquer informação importante sobre o dia."
              icone={<Settings size={21} />}
            />

            <div className="p-5 sm:p-6">
              <textarea
                value={formulario.observacoes}
                onChange={(evento) => atualizarCampo("observacoes", evento.target.value)}
                rows={4}
                placeholder="Ex.: chuva forte, moto parada, rota fora do comum..."
                className="w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
            </div>
          </section>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={salvando}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60 sm:w-auto"
            >
              {salvando ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Salvar controle do dia
                </>
              )}
            </button>
          </div>
        </form>

        <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <CabecalhoFormulario
            titulo="Sessões online"
            descricao="Períodos em que o aplicativo registrou sua operação."
            icone={<Clock3 size={21} />}
          />

          {!controle?.sessoesOnline?.length ? (
            <div className="px-6 py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                <Clock3 size={26} />
              </div>
              <h3 className="mt-4 font-bold text-slate-800">
                Nenhuma sessão registrada
              </h3>
              <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">
                As sessões aparecerão depois que você ficar online no aplicativo.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {controle.sessoesOnline.map((sessao, indice) => (
                <article
                  key={sessao.id}
                  className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-slate-900">Sessão {indice + 1}</strong>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          sessao.encerradaEm
                            ? "bg-slate-100 text-slate-600"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {sessao.encerradaEm ? "Encerrada" : "Em andamento"}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-500">
                      {formatarHorario(sessao.iniciadaEm)} até{" "}
                      {sessao.encerradaEm
                        ? formatarHorario(sessao.encerradaEm)
                        : "agora"}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {sessao.pontosAceitos} pontos aceitos •{" "}
                      {sessao.pontosDescartados} descartados
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 sm:text-right">
                    <div>
                      <p className="text-xs text-slate-400">Distância</p>
                      <strong className="mt-1 block text-slate-900">
                        {formatarNumero(sessao.kmOnline, 1)} km
                      </strong>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400">Tempo</p>
                      <strong className="mt-1 block text-slate-900">
                        {formatarDuracao(sessao.tempoSegundos)}
                      </strong>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <footer className="py-8 text-center text-xs text-slate-400">
          Express Manager • Minha operação
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
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${estilos[destaque]}`}>
        {icone}
      </div>
      <p className="mt-4 text-xs font-medium text-slate-500 sm:text-sm">{titulo}</p>
      <strong className="mt-1 block break-words text-lg text-slate-900 sm:text-xl">
        {valor}
      </strong>
      <p className="mt-1 text-xs text-slate-400">{subtitulo}</p>
    </div>
  );
}

function CabecalhoFormulario({
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
        <h2 className="text-lg font-bold text-slate-900 sm:text-xl">{titulo}</h2>
        <p className="mt-1 text-xs text-slate-500 sm:text-sm">{descricao}</p>
      </div>
    </div>
  );
}

function CampoDinheiro({
  label,
  value,
  onChange,
  icone,
}: {
  label: string;
  value: string;
  onChange: (valor: string) => void;
  icone?: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-600">{label}</label>
      <div className="relative mt-2">
        {icone ? (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            {icone}
          </span>
        ) : (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400">
            R$
          </span>
        )}
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(evento) => onChange(limparCampoNumerico(evento.target.value))}
          placeholder="0,00"
          className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
        />
      </div>
    </div>
  );
}

function CampoNumero({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (valor: string) => void;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-600">{label}</label>
      <div className="relative mt-2">
        <input
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(evento) => onChange(limparCampoNumerico(evento.target.value))}
          placeholder="0"
          className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-12 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">
          km
        </span>
      </div>
    </div>
  );
}

function CampoTexto({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (valor: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-600">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(evento) => onChange(evento.target.value)}
        placeholder={placeholder}
        className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
      />
    </div>
  );
}

function InfoQuilometragem({
  titulo,
  valor,
  destaque = false,
}: {
  titulo: string;
  valor: string;
  destaque?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        destaque
          ? "border-emerald-200 bg-emerald-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <p className="text-xs font-medium text-slate-500">{titulo}</p>
      <strong
        className={`mt-2 block text-lg ${
          destaque ? "text-emerald-700" : "text-slate-900"
        }`}
      >
        {valor}
      </strong>
    </div>
  );
}

async function extrairErro(resposta: Response, padrao: string) {
  try {
    const dados = await resposta.json();
    return dados?.erro || padrao;
  } catch {
    return padrao;
  }
}

function limparCampoNumerico(valor: string) {
  return valor.replace(/[^\d.,]/g, "").replace(/\.(?=.*\.)/g, "");
}

function campoParaNumero(valor: string) {
  const normalizado = String(valor || "0")
    .replace(/\./g, "")
    .replace(",", ".");

  const numero = Number(normalizado);

  return Number.isFinite(numero) && numero >= 0 ? numero : 0;
}

function campoParaNumeroOpcional(valor: string) {
  if (!valor.trim()) {
    return null;
  }

  return campoParaNumero(valor);
}

function valorParaCampo(valor: number) {
  if (!valor) {
    return "";
  }

  return Number(valor).toFixed(2).replace(".", ",");
}

function numeroOpcionalParaCampo(valor?: number | null) {
  if (valor === null || valor === undefined) {
    return "";
  }

  return String(valor).replace(".", ",");
}

function dataBrasilISO(data: Date | string) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO_BRASIL,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(data));

  const ano = partes.find((parte) => parte.type === "year")?.value;
  const mes = partes.find((parte) => parte.type === "month")?.value;
  const dia = partes.find((parte) => parte.type === "day")?.value;

  return `${ano}-${mes}-${dia}`;
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

function formatarHorario(data: string) {
  return new Date(data).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: FUSO_BRASIL,
  });
}
