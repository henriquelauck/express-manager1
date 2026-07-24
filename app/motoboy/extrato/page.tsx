"use client";

import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  FilterX,
  Loader2,
  MapPin,
  PackageCheck,
  ReceiptText,
  RefreshCw,
  Route,
  Search,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const FUSO_BRASIL = "America/Sao_Paulo";

type Parada = {
  id?: string;
  ordem?: number;
  tipo?: string | null;
  cliente?: string | null;
  endereco?: string | null;
};

type Tele = {
  id: string;
  solicitante?: string | null;
  status: string;
  total?: number | string | null;
  dataTele?: string | null;
  createdAt?: string | null;
  criadoEm?: string | null;
  paradas?: Parada[];
};

type Movimento = {
  id: string;
  tipo?: string | null;
  valor?: number | string | null;
  clienteNome?: string | null;
  descricao?: string | null;
  dataReferenciaInicio?: string | null;
  dataReferenciaFim?: string | null;
  criadoEm: string;
};

export default function ExtratoMotoboyPage() {
  const [teles, setTeles] = useState<Tele[]>([]);
  const [movimentos, setMovimentos] = useState<Movimento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [busca, setBusca] = useState("");

  async function carregar(mostrarAtualizacao = false) {
    if (mostrarAtualizacao) setAtualizando(true);
    else setCarregando(true);

    setErro("");

    try {
      const [telesRes, financeiroRes] = await Promise.all([
        fetch("/api/motoboys/minhas-teles", { cache: "no-store" }),
        fetch("/api/motoboys/meu-financeiro", { cache: "no-store" }),
      ]);

      if (telesRes.status === 401 || financeiroRes.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!telesRes.ok) {
        throw new Error(await extrairErro(telesRes, "Não foi possível carregar suas entregas."));
      }

      if (!financeiroRes.ok) {
        throw new Error(
          await extrairErro(financeiroRes, "Não foi possível carregar seu financeiro.")
        );
      }

      const [telesDados, financeiroDados] = await Promise.all([
        telesRes.json(),
        financeiroRes.json(),
      ]);

      setTeles(Array.isArray(telesDados) ? telesDados : []);
      setMovimentos(Array.isArray(financeiroDados) ? financeiroDados : []);
    } catch (erroCarregamento) {
      setErro(
        erroCarregamento instanceof Error
          ? erroCarregamento.message
          : "Não foi possível carregar o extrato."
      );
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }

  useEffect(() => {
    void carregar();
  }, []);

  const filtrosAtivos = Boolean(dataInicio || dataFim || busca.trim());

  const telesFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return teles
      .filter((tele) => {
        const dataTele = dataDaTele(tele);

        if (dataInicio && dataTele < dataInicio) return false;
        if (dataFim && dataTele > dataFim) return false;

        if (termo) {
          const texto = [
            tele.solicitante,
            tele.status,
            ...(tele.paradas || []).flatMap((parada) => [
              parada.cliente,
              parada.endereco,
              parada.tipo,
            ]),
          ]
            .join(" ")
            .toLowerCase();

          if (!texto.includes(termo)) return false;
        }

        return true;
      })
      .sort(ordenarTeles);
  }, [teles, dataInicio, dataFim, busca]);

  const movimentosFiltrados = useMemo(() => {
    return movimentos.filter((movimento) => {
      const dataCriacao = dataBrasilISO(movimento.criadoEm);
      const inicio = movimento.dataReferenciaInicio
        ? dataBrasilISO(movimento.dataReferenciaInicio)
        : dataCriacao;
      const fim = movimento.dataReferenciaFim ? dataBrasilISO(movimento.dataReferenciaFim) : inicio;

      if (dataInicio && fim < dataInicio) return false;
      if (dataFim && inicio > dataFim) return false;

      return true;
    });
  }, [movimentos, dataInicio, dataFim]);

  const bruto = useMemo(
    () => telesFiltradas.reduce((total, tele) => total + Number(tele.total || 0), 0),
    [telesFiltradas]
  );

  const liquido = bruto * 0.8;

  const recebido = useMemo(
    () => movimentosFiltrados.reduce((total, movimento) => total + Number(movimento.valor || 0), 0),
    [movimentosFiltrados]
  );

  const aReceber = Math.max(liquido - recebido, 0);

  const entregasConcluidas = telesFiltradas.filter((tele) => tele.status === "ENTREGUE").length;

  const ticketMedio = telesFiltradas.length > 0 ? bruto / telesFiltradas.length : 0;

  function limparFiltros() {
    setDataInicio("");
    setDataFim("");
    setBusca("");
  }

  if (carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 size={30} className="animate-spin text-emerald-600" />
          <div>
            <p className="font-semibold text-slate-800">Carregando extrato</p>
            <p className="mt-1 text-sm text-slate-500">Buscando suas entregas e recebimentos.</p>
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

                <p className="mt-5 text-sm font-medium text-emerald-300">Área do motoboy</p>

                <h1 className="mt-1 text-2xl font-bold sm:text-3xl">Extrato detalhado</h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                  Consulte suas entregas, valores e recebimentos por período.
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

        <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/70 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <CalendarDays size={20} />
              </div>

              <div>
                <h2 className="font-bold text-slate-900">Filtrar extrato</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Escolha o período ou pesquise uma entrega.
                </p>
              </div>
            </div>

            {filtrosAtivos && (
              <button
                type="button"
                onClick={limparFiltros}
                className="flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                <FilterX size={16} />
                Limpar filtros
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-3 md:p-6">
            <div>
              <label className="text-sm font-medium text-slate-600">Data inicial</label>
              <input
                type="date"
                value={dataInicio}
                max={dataFim || undefined}
                onChange={(evento) => setDataInicio(evento.target.value)}
                className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-600">Data final</label>
              <input
                type="date"
                value={dataFim}
                min={dataInicio || undefined}
                onChange={(evento) => setDataFim(evento.target.value)}
                className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-600">Pesquisar entrega</label>
              <div className="relative mt-2">
                <Search
                  size={18}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  value={busca}
                  onChange={(evento) => setBusca(evento.target.value)}
                  placeholder="Cliente, endereço ou solicitante"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          <Resumo
            titulo="Entregas"
            valor={String(telesFiltradas.length)}
            subtitulo={`${entregasConcluidas} concluídas`}
            icone={<PackageCheck size={20} />}
          />
          <Resumo
            titulo="Bruto"
            valor={formatarMoeda(bruto)}
            subtitulo="Valor das teles"
            icone={<ReceiptText size={20} />}
          />
          <Resumo
            titulo="Líquido"
            valor={formatarMoeda(liquido)}
            subtitulo="80% do bruto"
            icone={<WalletCards size={20} />}
            destaque="verde"
          />
          <Resumo
            titulo="Recebido"
            valor={formatarMoeda(recebido)}
            subtitulo="Pagamentos registrados"
            icone={<CheckCircle2 size={20} />}
          />
          <Resumo
            titulo="A receber"
            valor={formatarMoeda(aReceber)}
            subtitulo="Saldo estimado"
            icone={<CircleDollarSign size={20} />}
            destaque={aReceber > 0 ? "laranja" : "verde"}
          />
          <Resumo
            titulo="Ticket médio"
            valor={formatarMoeda(ticketMedio)}
            subtitulo="Média por tele"
            icone={<Route size={20} />}
          />
        </section>

        <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <CabecalhoSecao
            titulo="Histórico financeiro"
            descricao="Valores já registrados como recebidos."
            quantidade={movimentosFiltrados.length}
            icone={<WalletCards size={21} />}
          />

          {movimentosFiltrados.length === 0 ? (
            <EstadoVazio
              titulo="Nenhum recebimento encontrado"
              descricao="Não existem movimentos financeiros dentro do período selecionado."
              icone={<WalletCards size={26} />}
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {movimentosFiltrados.map((movimento) => (
                <article
                  key={movimento.id}
                  className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-slate-900">{tituloMovimento(movimento)}</strong>
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                        Recebido
                      </span>
                    </div>

                    <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-500">
                      <CalendarDays size={15} />
                      {formatarData(movimento.criadoEm)}
                    </p>

                    {movimento.dataReferenciaInicio && (
                      <p className="mt-2 text-xs leading-5 text-slate-400">
                        Referente a {formatarData(movimento.dataReferenciaInicio)}
                        {movimento.dataReferenciaFim &&
                          ` até ${formatarData(movimento.dataReferenciaFim)}`}
                      </p>
                    )}

                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      {movimento.descricao || "Recebimento registrado"}
                    </p>
                  </div>

                  <strong className="shrink-0 whitespace-nowrap text-lg text-emerald-700">
                    {formatarMoeda(Number(movimento.valor || 0))}
                  </strong>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <CabecalhoSecao
            titulo="Entregas"
            descricao="Histórico de teles dentro do período selecionado."
            quantidade={telesFiltradas.length}
            icone={<PackageCheck size={21} />}
          />

          {telesFiltradas.length === 0 ? (
            <EstadoVazio
              titulo="Nenhuma entrega encontrada"
              descricao="Ajuste o período ou a pesquisa para localizar outras teles."
              icone={<PackageCheck size={26} />}
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {telesFiltradas.map((tele) => (
                <CardTeleExtrato key={tele.id} tele={tele} />
              ))}
            </div>
          )}
        </section>

        <footer className="py-8 text-center text-xs text-slate-400">
          Express Manager • Extrato do motoboy
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
  destaque?: "padrao" | "verde" | "laranja";
}) {
  const estilos = {
    padrao: "bg-slate-100 text-slate-700",
    verde: "bg-emerald-100 text-emerald-700",
    laranja: "bg-orange-100 text-orange-700",
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${estilos[destaque]}`}>
        {icone}
      </div>
      <p className="mt-4 text-xs font-medium text-slate-500 sm:text-sm">{titulo}</p>
      <strong className="mt-1 block break-words text-lg text-slate-900 sm:text-xl">{valor}</strong>
      <p className="mt-1 text-xs text-slate-400">{subtitulo}</p>
    </div>
  );
}

function CabecalhoSecao({
  titulo,
  descricao,
  quantidade,
  icone,
}: {
  titulo: string;
  descricao: string;
  quantidade: number;
  icone: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/70 px-5 py-5 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
          {icone}
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-slate-900 sm:text-xl">{titulo}</h2>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">{descricao}</p>
        </div>
      </div>
      <span className="flex h-9 min-w-9 shrink-0 items-center justify-center rounded-xl bg-slate-200 px-3 text-sm font-bold text-slate-700">
        {quantidade}
      </span>
    </div>
  );
}

function CardTeleExtrato({ tele }: { tele: Tele }) {
  const paradas = Array.isArray(tele.paradas)
    ? [...tele.paradas].sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0))
    : [];

  return (
    <article className="p-5 sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="text-lg text-slate-900">
              {tele.solicitante || "Solicitante não informado"}
            </strong>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${classeStatus(tele.status)}`}
            >
              {formatarStatus(tele.status)}
            </span>
          </div>

          <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-500">
            <CalendarDays size={15} />
            {formatarData(tele.dataTele || tele.createdAt)}
          </p>

          {paradas.length > 0 ? (
            <div className="mt-5 space-y-3">
              {paradas.map((parada, indice) => (
                <div key={parada.id || `${tele.id}-${indice}`} className="flex gap-3">
                  <div className="flex w-7 shrink-0 flex-col items-center">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                      {indice + 1}
                    </div>
                    {indice < paradas.length - 1 && (
                      <div className="mt-1 h-full min-h-6 w-px bg-slate-200" />
                    )}
                  </div>

                  <div className="min-w-0 pb-2">
                    <p className="font-semibold text-slate-800">
                      {parada.cliente || tituloTipoParada(parada.tipo) || `Parada ${indice + 1}`}
                    </p>
                    <p className="mt-1 break-words text-sm leading-6 text-slate-500">
                      {parada.endereco || "Endereço não informado"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
              <MapPin size={16} />
              Nenhuma parada informada.
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-slate-100 pt-4 lg:min-w-44 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0 lg:text-right">
          <p className="text-xs text-slate-400">Valor da tele</p>
          <strong className="mt-1 block text-xl text-slate-900">
            {formatarMoeda(Number(tele.total || 0))}
          </strong>
          <p className="mt-1 text-sm font-semibold text-emerald-700">
            Líquido {formatarMoeda(Number(tele.total || 0) * 0.8)}
          </p>
        </div>
      </div>
    </article>
  );
}

function EstadoVazio({
  titulo,
  descricao,
  icone,
}: {
  titulo: string;
  descricao: string;
  icone: React.ReactNode;
}) {
  return (
    <div className="px-6 py-12 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        {icone}
      </div>
      <h3 className="mt-4 font-bold text-slate-800">{titulo}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">{descricao}</p>
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

function dataBrasilISO(data: string | Date) {
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

function dataDaTele(tele: Tele) {
  if (tele.dataTele) return dataBrasilISO(tele.dataTele);
  if (tele.createdAt) return dataBrasilISO(tele.createdAt);

  if (tele.criadoEm) {
    const parteData = tele.criadoEm.split(",")[0]?.trim();
    const [dia, mes, ano] = parteData.split("/");
    if (dia && mes && ano) return `${ano}-${mes}-${dia}`;
  }

  return "";
}

function ordenarTeles(a: Tele, b: Tele) {
  const dataA = new Date(a.dataTele || a.createdAt || 0).getTime();
  const dataB = new Date(b.dataTele || b.createdAt || 0).getTime();
  return dataB - dataA;
}

function formatarData(data?: string | null) {
  if (!data) return "Data não informada";

  return new Date(data).toLocaleDateString("pt-BR", {
    timeZone: FUSO_BRASIL,
  });
}

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

function tituloMovimento(movimento: Movimento) {
  if (movimento.tipo === "CLIENTE") {
    return movimento.clienteNome || "Recebimento de cliente";
  }

  if (movimento.tipo === "ESCRITORIO") {
    return "Pagamento do escritório";
  }

  return "Ajuste financeiro";
}

function tituloTipoParada(tipo?: string | null) {
  const mapa: Record<string, string> = {
    COLETA: "Coleta",
    ENTREGA: "Entrega",
    RETORNO: "Retorno",
  };

  return tipo ? mapa[tipo] || tipo : "";
}

function formatarStatus(status: string) {
  const mapa: Record<string, string> = {
    AGUARDANDO_CLIENTE: "Aguardando cliente",
    AGUARDANDO_MOTOBOY: "Aguardando motoboy",
    AGUARDANDO_COLETA: "Aguardando coleta",
    EM_ROTA: "Em rota",
    ENTREGUE: "Entregue",
  };

  return mapa[status] || status;
}

function classeStatus(status: string) {
  const mapa: Record<string, string> = {
    AGUARDANDO_CLIENTE: "bg-amber-100 text-amber-700",
    AGUARDANDO_MOTOBOY: "bg-orange-100 text-orange-700",
    AGUARDANDO_COLETA: "bg-sky-100 text-sky-700",
    EM_ROTA: "bg-blue-100 text-blue-700",
    ENTREGUE: "bg-emerald-100 text-emerald-700",
  };

  return mapa[status] || "bg-slate-100 text-slate-700";
}
