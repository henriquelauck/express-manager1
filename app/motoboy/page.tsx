"use client";

import {
  Bike,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Loader2,
  LogOut,
  MapPin,
  PackageCheck,
  RefreshCw,
  Route,
  Target,
  Trophy,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const META_TROCA_OLEO = 1500;
const FUSO_BRASIL = "America/Sao_Paulo";

type Usuario = {
  id: string;
  nome: string;
  email: string;
  role: string;
  motoboyId?: string | null;
};

type Parada = {
  id?: string;
  ordem?: number;
  tipo?: string | null;
  cliente?: string | null;
  endereco?: string | null;
  telefone?: string | null;
  observacao?: string | null;
};

type Tele = {
  id: string;
  solicitante?: string | null;
  status: string;
  total?: number | string | null;
  dataTele?: string | null;
  createdAt?: string | null;
  criadoEm?: string | null;
  observacao?: string | null;
  observacaoGeral?: string | null;
  paradas?: Parada[];
};

export default function MotoboyPage() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [teles, setTeles] = useState<Tele[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [teleAtualizando, setTeleAtualizando] = useState<string | null>(null);
  const [erro, setErro] = useState("");

  async function carregarDados(mostrarAtualizacao = false) {
    if (mostrarAtualizacao) {
      setAtualizando(true);
    } else {
      setCarregando(true);
    }

    setErro("");

    try {
      const [usuarioRes, telesRes] = await Promise.all([
        fetch("/api/auth/me", {
          cache: "no-store",
        }),
        fetch("/api/motoboys/minhas-teles", {
          cache: "no-store",
        }),
      ]);

      if (usuarioRes.status === 401 || telesRes.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!usuarioRes.ok) {
        throw new Error("Não foi possível carregar seu usuário.");
      }

      if (!telesRes.ok) {
        let mensagem = "Não foi possível carregar suas entregas.";

        try {
          const dadosErro = await telesRes.json();
          mensagem = dadosErro?.erro || mensagem;
        } catch {}

        throw new Error(mensagem);
      }

      const usuarioDados = await usuarioRes.json();
      const telesDados = await telesRes.json();

      setUsuario(usuarioDados.usuario || null);
      setTeles(Array.isArray(telesDados) ? telesDados : []);
    } catch (erroCarregamento) {
      setErro(
        erroCarregamento instanceof Error
          ? erroCarregamento.message
          : "Não foi possível carregar o painel."
      );
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }

  useEffect(() => {
    void carregarDados();
  }, []);

  async function sair() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } finally {
      window.location.href = "/login";
    }
  }

  async function avancarStatus(tele: Tele) {
    const proximo = proximoStatus(tele.status);

    if (!proximo || teleAtualizando) return;

    if (
      proximo === "ENTREGUE" &&
      !window.confirm(
        "Confirmar que esta entrega foi concluída? Depois disso, o status não poderá ser alterado pelo aplicativo."
      )
    ) {
      return;
    }

    setTeleAtualizando(tele.id);
    setErro("");

    try {
      const resposta = await fetch("/api/motoboys/minhas-teles/status", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teleId: tele.id,
          status: proximo,
        }),
      });

      if (!resposta.ok) {
        let mensagem = "Não foi possível atualizar o status da tele.";

        try {
          const dadosErro = await resposta.json();
          mensagem = dadosErro?.erro || mensagem;
        } catch {}

        throw new Error(mensagem);
      }

      const dados = await resposta.json();
      const statusAtualizado = dados?.tele?.status || proximo;

      setTeles((atuais) =>
        atuais.map((item) =>
          item.id === tele.id
            ? {
                ...item,
                status: statusAtualizado,
              }
            : item
        )
      );
    } catch (erroAtualizacao) {
      setErro(
        erroAtualizacao instanceof Error
          ? erroAtualizacao.message
          : "Não foi possível atualizar o status."
      );
    } finally {
      setTeleAtualizando(null);
    }
  }

  const telesHoje = useMemo(() => {
    const hoje = dataBrasilISO(new Date());

    return teles.filter((tele) => dataDaTele(tele) === hoje);
  }, [teles]);

  const telesSemana = useMemo(() => {
    const hoje = dataBrasilISO(new Date());
    const inicioSemana = inicioDaSemanaISO(hoje);
    const fimSemana = fimDaSemanaISO(hoje);

    return teles.filter((tele) => {
      const data = dataDaTele(tele);

      return data >= inicioSemana && data <= fimSemana;
    });
  }, [teles]);

  const brutoHoje = useMemo(
    () => telesHoje.reduce((total, tele) => total + Number(tele.total || 0), 0),
    [telesHoje]
  );

  const liquidoHoje = brutoHoje * 0.8;

  const brutoSemana = useMemo(
    () => telesSemana.reduce((total, tele) => total + Number(tele.total || 0), 0),
    [telesSemana]
  );

  const progressoMeta = Math.min((brutoSemana / META_TROCA_OLEO) * 100, 100);

  const ganhouTrocaOleo = brutoSemana >= META_TROCA_OLEO;
  const faltaMeta = Math.max(META_TROCA_OLEO - brutoSemana, 0);

  const entregasAndamento = useMemo(
    () => telesHoje.filter((tele) => tele.status !== "ENTREGUE").sort(ordenarTeles),
    [telesHoje]
  );

  const entregasConcluidas = useMemo(
    () => telesHoje.filter((tele) => tele.status === "ENTREGUE").sort(ordenarTeles),
    [telesHoje]
  );

  if (carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <RefreshCw size={30} className="animate-spin text-emerald-600" />

          <div>
            <p className="font-semibold text-slate-800">Carregando painel</p>
            <p className="mt-1 text-sm text-slate-500">Buscando suas entregas e valores.</p>
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

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-slate-950">
                  <Bike size={27} />
                </div>

                <div>
                  <p className="text-sm font-medium text-emerald-300">Área do motoboy</p>

                  <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
                    Olá, {usuario?.nome || "Motoboy"}
                  </h1>

                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Acompanhe suas entregas e atualize o andamento.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/motoboy/extrato"
                  className="flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  <WalletCards size={18} />
                  Ver extrato
                </Link>

                <button
                  type="button"
                  onClick={() => void carregarDados(true)}
                  disabled={atualizando || Boolean(teleAtualizando)}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-5 font-semibold text-white transition hover:bg-white/15 disabled:opacity-60"
                >
                  <RefreshCw size={18} className={atualizando ? "animate-spin" : ""} />
                  Atualizar
                </button>

                <button
                  type="button"
                  onClick={() => void sair()}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-5 font-semibold text-red-200 transition hover:bg-red-500/20"
                >
                  <LogOut size={18} />
                  Sair
                </button>
              </div>
            </div>
          </div>
        </header>

        {erro && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {erro}
          </div>
        )}

        <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <CardResumo
            titulo="Entregas hoje"
            valor={String(telesHoje.length)}
            subtitulo={`${entregasConcluidas.length} concluídas`}
            icone={<PackageCheck size={21} />}
          />

          <CardResumo
            titulo="Em andamento"
            valor={String(entregasAndamento.length)}
            subtitulo="Pendentes hoje"
            icone={<Clock3 size={21} />}
            destaque="laranja"
          />

          <CardResumo
            titulo="Bruto hoje"
            valor={formatarMoeda(brutoHoje)}
            subtitulo="Valor das teles"
            icone={<CircleDollarSign size={21} />}
          />

          <CardResumo
            titulo="Seu líquido"
            valor={formatarMoeda(liquidoHoje)}
            subtitulo="80% do bruto"
            icone={<WalletCards size={21} />}
            destaque="verde"
          />
        </section>

        <section
          className={`mt-6 overflow-hidden rounded-3xl border shadow-sm ${
            ganhouTrocaOleo
              ? "border-emerald-600 bg-emerald-600 text-white"
              : "border-slate-200 bg-white text-slate-900"
          }`}
        >
          <div className="p-5 sm:p-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                    ganhouTrocaOleo ? "bg-white/15 text-white" : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {ganhouTrocaOleo ? <Trophy size={23} /> : <Target size={23} />}
                </div>

                <div>
                  <p
                    className={`text-sm font-semibold ${
                      ganhouTrocaOleo ? "text-emerald-100" : "text-emerald-600"
                    }`}
                  >
                    Meta semanal
                  </p>

                  <h2 className="mt-1 text-xl font-bold sm:text-2xl">
                    {ganhouTrocaOleo ? "Meta atingida" : "Troca de óleo"}
                  </h2>

                  <p
                    className={`mt-2 max-w-2xl text-sm leading-6 ${
                      ganhouTrocaOleo ? "text-emerald-50" : "text-slate-500"
                    }`}
                  >
                    {ganhouTrocaOleo
                      ? "Você atingiu a meta de bruto da semana e garantiu uma troca de óleo grátis."
                      : `Faltam ${formatarMoeda(faltaMeta)} para atingir a meta.`}
                  </p>
                </div>
              </div>

              <div className="shrink-0 md:text-right">
                <p className={`text-sm ${ganhouTrocaOleo ? "text-emerald-100" : "text-slate-500"}`}>
                  Acumulado na semana
                </p>

                <strong className="mt-1 block text-2xl">{formatarMoeda(brutoSemana)}</strong>

                <p
                  className={`mt-1 text-sm ${
                    ganhouTrocaOleo ? "text-emerald-100" : "text-slate-500"
                  }`}
                >
                  de {formatarMoeda(META_TROCA_OLEO)}
                </p>
              </div>
            </div>

            <div
              className={`mt-6 h-3 overflow-hidden rounded-full ${
                ganhouTrocaOleo ? "bg-white/20" : "bg-slate-100"
              }`}
            >
              <div
                className={`h-full rounded-full transition-all ${
                  ganhouTrocaOleo ? "bg-white" : "bg-emerald-600"
                }`}
                style={{ width: `${progressoMeta}%` }}
              />
            </div>

            <div className="mt-3 flex items-center justify-between gap-4 text-sm">
              <span className={ganhouTrocaOleo ? "text-emerald-100" : "text-slate-500"}>
                {Math.round(progressoMeta)}% concluído
              </span>

              <span
                className={
                  ganhouTrocaOleo ? "font-semibold text-white" : "font-medium text-slate-700"
                }
              >
                {telesSemana.length} teles na semana
              </span>
            </div>
          </div>
        </section>

        <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <CabecalhoSecao
            titulo="Entregas em andamento"
            descricao="Atualize cada etapa conforme o serviço avança."
            quantidade={entregasAndamento.length}
            icone={<Route size={21} />}
          />

          {entregasAndamento.length === 0 ? (
            <EstadoVazio
              titulo="Nenhuma entrega em andamento"
              descricao="Quando uma tele for atribuída para hoje, ela aparecerá aqui."
              icone={<Route size={26} />}
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {entregasAndamento.map((tele) => (
                <CardTele
                  key={tele.id}
                  tele={tele}
                  atualizando={teleAtualizando === tele.id}
                  bloqueado={Boolean(teleAtualizando)}
                  onAvancar={() => void avancarStatus(tele)}
                />
              ))}
            </div>
          )}
        </section>

        <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <CabecalhoSecao
            titulo="Entregas concluídas"
            descricao="Teles finalizadas hoje."
            quantidade={entregasConcluidas.length}
            icone={<CheckCircle2 size={21} />}
            concluida
          />

          {entregasConcluidas.length === 0 ? (
            <EstadoVazio
              titulo="Nenhuma entrega concluída"
              descricao="As teles finalizadas hoje aparecerão nesta lista."
              icone={<CheckCircle2 size={26} />}
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {entregasConcluidas.map((tele) => (
                <CardTele
                  key={tele.id}
                  tele={tele}
                  concluida
                  atualizando={false}
                  bloqueado
                  onAvancar={() => {}}
                />
              ))}
            </div>
          )}
        </section>

        <footer className="py-8 text-center text-xs text-slate-400">
          Express Manager • Área do motoboy
        </footer>
      </div>
    </main>
  );
}

function CardResumo({
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

      <strong className="mt-1 block break-words text-xl text-slate-900 sm:text-2xl">{valor}</strong>

      <p className="mt-1 text-xs text-slate-400">{subtitulo}</p>
    </div>
  );
}

function CabecalhoSecao({
  titulo,
  descricao,
  quantidade,
  icone,
  concluida = false,
}: {
  titulo: string;
  descricao: string;
  quantidade: number;
  icone: React.ReactNode;
  concluida?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/70 px-5 py-5 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
            concluida ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"
          }`}
        >
          {icone}
        </div>

        <div className="min-w-0">
          <h2 className="text-lg font-bold text-slate-900 sm:text-xl">{titulo}</h2>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">{descricao}</p>
        </div>
      </div>

      <span
        className={`flex h-9 min-w-9 shrink-0 items-center justify-center rounded-xl px-3 text-sm font-bold ${
          concluida ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"
        }`}
      >
        {quantidade}
      </span>
    </div>
  );
}

function CardTele({
  tele,
  concluida = false,
  atualizando,
  bloqueado,
  onAvancar,
}: {
  tele: Tele;
  concluida?: boolean;
  atualizando: boolean;
  bloqueado: boolean;
  onAvancar: () => void;
}) {
  const paradas = Array.isArray(tele.paradas)
    ? [...tele.paradas].sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0))
    : [];

  const proximo = proximoStatus(tele.status);
  const observacao = tele.observacaoGeral || tele.observacao;

  return (
    <article className="p-5 sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="text-lg text-slate-900">
              {tele.solicitante || "Solicitante não informado"}
            </strong>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                concluida ? "bg-emerald-100 text-emerald-700" : classeStatus(tele.status)
              }`}
            >
              {formatarStatus(tele.status)}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
            <span className="flex items-center gap-1.5">
              <CalendarDays size={15} />
              {formatarData(tele.dataTele || tele.createdAt)}
            </span>

            <span className="flex items-center gap-1.5">
              <MapPin size={15} />
              {paradas.length} {paradas.length === 1 ? "parada" : "paradas"}
            </span>
          </div>

          {paradas.length > 0 ? (
            <div className="mt-5 space-y-3">
              {paradas.map((parada, indice) => (
                <div key={parada.id || `${tele.id}-${indice}`} className="relative flex gap-3">
                  <div className="flex w-7 shrink-0 flex-col items-center">
                    <div
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                        concluida ? "bg-emerald-100 text-emerald-700" : "bg-slate-900 text-white"
                      }`}
                    >
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

                    {parada.observacao && (
                      <p className="mt-1 text-sm text-slate-600">{parada.observacao}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
              Nenhuma parada informada nesta tele.
            </div>
          )}

          {observacao && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
              <strong>Observação:</strong> {observacao}
            </div>
          )}

          {!concluida && proximo && (
            <button
              type="button"
              onClick={onAvancar}
              disabled={bloqueado}
              className={`mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl px-5 font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto ${
                proximo === "ENTREGUE"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-slate-900 hover:bg-slate-800"
              }`}
            >
              {atualizando ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Atualizando...
                </>
              ) : (
                <>
                  {iconeProximoStatus(proximo)}
                  {textoBotaoStatus(proximo)}
                </>
              )}
            </button>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-4 border-t border-slate-100 pt-4 lg:min-w-44 lg:flex-col lg:items-end lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <div className="lg:text-right">
            <p className="text-xs text-slate-400">Valor da tele</p>
            <strong className="mt-1 block text-xl text-slate-900">
              {formatarMoeda(Number(tele.total || 0))}
            </strong>
            <p className="mt-1 text-sm font-semibold text-emerald-700">
              Líquido {formatarMoeda(Number(tele.total || 0) * 0.8)}
            </p>
          </div>

          <ChevronRight size={20} className="text-slate-300 lg:hidden" />
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

function proximoStatus(status: string): string | null {
  const mapa: Record<string, string> = {
    AGUARDANDO_CLIENTE: "AGUARDANDO_COLETA",
    AGUARDANDO_MOTOBOY: "AGUARDANDO_COLETA",
    AGUARDANDO_COLETA: "EM_ROTA",
    EM_ROTA: "ENTREGUE",
  };

  return mapa[status] || null;
}

function textoBotaoStatus(status: string) {
  const mapa: Record<string, string> = {
    AGUARDANDO_COLETA: "Iniciar coleta",
    EM_ROTA: "Sair para entrega",
    ENTREGUE: "Concluir entrega",
  };

  return mapa[status] || "Atualizar status";
}

function iconeProximoStatus(status: string) {
  if (status === "ENTREGUE") {
    return <CheckCircle2 size={18} />;
  }

  return <Route size={18} />;
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

function dataDaTele(tele: Tele) {
  if (tele.dataTele) {
    return dataBrasilISO(tele.dataTele);
  }

  if (tele.createdAt) {
    return dataBrasilISO(tele.createdAt);
  }

  if (tele.criadoEm) {
    const parteData = tele.criadoEm.split(",")[0]?.trim();
    const [dia, mes, ano] = parteData.split("/");

    if (dia && mes && ano) {
      return `${ano}-${mes}-${dia}`;
    }
  }

  return "";
}

function inicioDaSemanaISO(dataISO: string) {
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  const data = new Date(ano, mes - 1, dia);
  const diaSemana = data.getDay();

  data.setDate(data.getDate() - diaSemana);

  return montarISO(data);
}

function fimDaSemanaISO(dataISO: string) {
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  const data = new Date(ano, mes - 1, dia);
  const diaSemana = data.getDay();

  data.setDate(data.getDate() + (6 - diaSemana));

  return montarISO(data);
}

function montarISO(data: Date) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
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

function tituloTipoParada(tipo?: string | null) {
  const mapa: Record<string, string> = {
    COLETA: "Coleta",
    ENTREGA: "Entrega",
    RETORNO: "Retorno",
    TROCAR: "Trocar",
    ENTREGA_E_COLETA: "Entrega e coleta",
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
  };

  return mapa[status] || "bg-slate-100 text-slate-700";
}
