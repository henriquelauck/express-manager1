"use client";

import PageContainer from "@/components/ui/PageContainer";
import PageHeader from "@/components/ui/PageHeader";
import {
  AlertCircle,
  ArrowLeft,
  Bike,
  CalendarDays,
  CheckCircle2,
  ClipboardPlus,
  Edit3,
  Loader2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type ResumoMotoboy = {
  id: string;
  nome: string;
  moto?: string | null;
  nota: number;
  saldoPontos: number;
  ocorrencias: number;
  anuladas: number;
};

type Ocorrencia = {
  id: string;
  motoboyId: string;
  teleId?: string | null;
  tipo: string;
  titulo: string;
  descricao: string;
  descricaoOriginal?: string | null;
  pontos: number;
  pontosOriginais?: number | null;
  origem: string;
  status: string;
  ocorridoEm: string;
  editadoEm?: string | null;
  anuladoEm?: string | null;
  motivoAnulacao?: string | null;
  motoboy: { id: string; nome: string };
};

type TipoOcorrencia = {
  tipo: string;
  titulo: string;
  pontosPadrao: number;
  automatico?: boolean;
};

function hojeBrasil() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatarData(valor: string) {
  return new Date(valor).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatarDataCurta(valor: string) {
  const [ano, mes, dia] = valor.split("-");
  return `${dia}/${mes}/${ano}`;
}

function classeNota(nota: number) {
  if (nota >= 90) return "bg-emerald-100 text-emerald-700";
  if (nota >= 75) return "bg-blue-100 text-blue-700";
  if (nota >= 60) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

export default function PontuacaoMotoboysPage() {
  const [dataReferencia, setDataReferencia] = useState(hojeBrasil());
  const [resumo, setResumo] = useState<ResumoMotoboy[]>([]);
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [tipos, setTipos] = useState<TipoOcorrencia[]>([]);
  const [periodo, setPeriodo] = useState({ inicio: "", fim: "" });
  const [regras, setRegras] = useState<any>(null);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [erro, setErro] = useState("");

  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState<Ocorrencia | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [motoboyId, setMotoboyId] = useState("");
  const [tipo, setTipo] = useState("ATRASO_MOTOBOY");
  const [pontos, setPontos] = useState("-5");
  const [descricao, setDescricao] = useState("");
  const [teleId, setTeleId] = useState("");
  const [ocorridoEm, setOcorridoEm] = useState("");

  async function carregar(silencioso = false) {
    if (silencioso) setAtualizando(true);
    else setCarregando(true);
    setErro("");

    try {
      const resposta = await fetch(
        `/api/motoboys/pontuacao?data=${encodeURIComponent(dataReferencia)}`,
        { cache: "no-store" }
      );
      if (!resposta.ok) {
        const dados = await resposta.json().catch(() => ({}));
        throw new Error(dados?.erro || "Não foi possível carregar a pontuação.");
      }

      const dados = await resposta.json();
      setResumo(Array.isArray(dados?.resumo) ? dados.resumo : []);
      setOcorrencias(Array.isArray(dados?.ocorrencias) ? dados.ocorrencias : []);
      setTipos(Array.isArray(dados?.tipos) ? dados.tipos : []);
      setPeriodo(dados?.periodo || { inicio: "", fim: "" });
      setRegras(dados?.regrasAutomaticas || null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível carregar a pontuação.");
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }

  useEffect(() => {
    void carregar();
  }, [dataReferencia]);

  const tiposManuais = useMemo(
    () => tipos.filter((item) => !item.automatico),
    [tipos]
  );

  function abrirNova(id?: string) {
    setEditando(null);
    setMotoboyId(id || resumo[0]?.id || "");
    setTipo(tiposManuais[0]?.tipo || "ATRASO_MOTOBOY");
    setPontos(String(tiposManuais[0]?.pontosPadrao || -5));
    setDescricao("");
    setTeleId("");
    setOcorridoEm("");
    setModalAberto(true);
  }

  function abrirEdicao(item: Ocorrencia) {
    setEditando(item);
    setMotoboyId(item.motoboyId);
    setTipo(item.tipo);
    setPontos(String(item.pontos));
    setDescricao(item.descricao);
    setTeleId(item.teleId || "");
    setOcorridoEm("");
    setModalAberto(true);
  }

  useEffect(() => {
    if (editando) return;
    const atual = tipos.find((item) => item.tipo === tipo);
    if (atual && atual.tipo !== "AJUSTE") setPontos(String(atual.pontosPadrao));
  }, [tipo, tipos, editando]);

  async function salvar() {
    if (salvando) return;
    setSalvando(true);
    setErro("");

    try {
      const resposta = await fetch("/api/motoboys/pontuacao", {
        method: editando ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          editando
            ? { id: editando.id, descricao: descricao.trim(), pontos: Number(pontos) }
            : {
                motoboyId,
                tipo,
                pontos: Number(pontos),
                descricao: descricao.trim(),
                teleId: teleId.trim() || null,
                ocorridoEm: ocorridoEm ? new Date(ocorridoEm).toISOString() : undefined,
              }
        ),
      });

      if (!resposta.ok) {
        const dados = await resposta.json().catch(() => ({}));
        throw new Error(dados?.erro || "Não foi possível salvar.");
      }

      setModalAberto(false);
      await carregar(true);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  async function anular(item: Ocorrencia) {
    const motivo = window.prompt(
      `Motivo para anular "${item.titulo}" de ${item.motoboy.nome}:`
    );
    if (!motivo?.trim()) return;

    const resposta = await fetch("/api/motoboys/pontuacao", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, motivo: motivo.trim() }),
    });

    if (!resposta.ok) {
      const dados = await resposta.json().catch(() => ({}));
      setErro(dados?.erro || "Não foi possível anular.");
      return;
    }

    await carregar(true);
  }

  if (carregando) {
    return (
      <PageContainer>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="animate-spin text-emerald-600" size={30} />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <Link href="/motoboys" className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">
            <ArrowLeft size={17} />
            Voltar para Motoboys
          </Link>
          <PageHeader
            titulo="Pontuação dos motoboys"
            descricao="O sistema registra ocorrências automáticas e você administra as exceções."
          />
        </div>

        <button
          type="button"
          onClick={() => abrirNova()}
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 font-semibold text-white"
        >
          <ClipboardPlus size={19} />
          Registrar ocorrência manual
        </button>
      </div>

      {erro && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          {erro}
        </div>
      )}

      {regras && (
        <section className="mb-6 rounded-3xl border border-emerald-100 bg-emerald-50/60 p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck size={22} className="mt-0.5 shrink-0 text-emerald-700" />
            <div>
              <h2 className="font-bold text-emerald-950">Regras automáticas ativas</h2>
              <p className="mt-2 text-sm leading-6 text-emerald-900/80">
                Atraso online: {regras.atrasoOnline.diasUteis}, tolerância de {regras.atrasoOnline.toleranciaMinutos} min.
                {" "}Offline: {regras.offlineExpediente.diasUteis}.
                {" "}Demora para iniciar: acima de {regras.demoraInicio.limiteMinutos} min quando a tele entrou como primeira da fila.
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <label className="text-sm font-medium text-slate-600">Semana de referência</label>
            <input
              type="date"
              value={dataReferencia}
              onChange={(e) => setDataReferencia(e.target.value)}
              className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4"
            />
            {periodo.inicio && (
              <p className="mt-2 text-xs text-slate-400">
                {formatarDataCurta(periodo.inicio)} até {formatarDataCurta(periodo.fim)}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => void carregar(true)}
            disabled={atualizando}
            className="flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 font-semibold text-slate-700"
          >
            <RefreshCw size={18} className={atualizando ? "animate-spin" : ""} />
            Atualizar
          </button>
        </div>
      </section>

      <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
        {resumo.map((motoboy) => (
          <article key={motoboy.id} className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <Bike size={21} />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900">{motoboy.nome}</h2>
                  <p className="mt-1 text-xs text-slate-500">{motoboy.ocorrencias} ativas • {motoboy.anuladas} anuladas</p>
                </div>
              </div>
              <span className={`flex h-12 min-w-12 items-center justify-center rounded-2xl px-3 text-lg font-black ${classeNota(motoboy.nota)}`}>
                {motoboy.nota}
              </span>
            </div>
            <button
              type="button"
              onClick={() => abrirNova(motoboy.id)}
              className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700"
            >
              <Plus size={16} />
              Ocorrência manual
            </button>
          </article>
        ))}
      </div>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-5">
          <h2 className="text-lg font-bold text-slate-900">Histórico auditável</h2>
          <p className="mt-1 text-sm text-slate-500">Nada some: edições e anulações permanecem registradas.</p>
        </div>

        {ocorrencias.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle2 className="mx-auto text-emerald-600" size={30} />
            <h3 className="mt-3 font-bold">Nenhuma ocorrência nesta semana</h3>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {ocorrencias.map((item) => {
              const anulada = item.status === "ANULADA";
              return (
                <article key={item.id} className={`p-5 ${anulada ? "bg-slate-50 opacity-70" : ""}`}>
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong>{item.motoboy.nome}</strong>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{item.titulo}</span>
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${anulada ? "bg-slate-200 text-slate-500" : item.pontos < 0 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>
                          {anulada ? "0 pts na nota" : `${item.pontos > 0 ? "+" : ""}${item.pontos} pts`}
                        </span>
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
                          {item.origem === "AUTOMATICA" ? "Automática" : "Manual"}
                        </span>
                        {item.status === "EDITADA" && (
                          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">Editada</span>
                        )}
                        {anulada && (
                          <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">Anulada</span>
                        )}
                      </div>

                      <p className="mt-2 text-sm leading-6 text-slate-600">{item.descricao}</p>
                      <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-400">
                        <CalendarDays size={14} />
                        {formatarData(item.ocorridoEm)}
                        {item.teleId ? ` • Tele ${item.teleId}` : ""}
                      </p>

                      {item.status === "EDITADA" && item.pontosOriginais !== null && (
                        <p className="mt-2 text-xs text-amber-700">
                          Original: {item.pontosOriginais} pts
                          {item.descricaoOriginal ? ` • ${item.descricaoOriginal}` : ""}
                        </p>
                      )}

                      {anulada && item.motivoAnulacao && (
                        <p className="mt-2 text-xs text-slate-500">
                          Motivo da anulação: {item.motivoAnulacao}
                        </p>
                      )}
                    </div>

                    {!anulada && (
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => abrirEdicao(item)}
                          className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700"
                        >
                          <Edit3 size={16} />
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => void anular(item)}
                          className="flex h-10 items-center gap-2 rounded-xl border border-red-200 px-3 text-sm font-semibold text-red-600"
                        >
                          <Trash2 size={16} />
                          Anular
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {modalAberto && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-5">
              <div>
                <h2 className="text-xl font-bold">{editando ? "Editar ocorrência" : "Registrar ocorrência manual"}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {editando ? "O valor original continuará no histórico." : "Use para situações que dependem do julgamento do gestor."}
                </p>
              </div>
              <button onClick={() => setModalAberto(false)} className="flex h-10 w-10 items-center justify-center rounded-xl">
                <X size={19} />
              </button>
            </div>

            <div className="space-y-4 p-5">
              {!editando && (
                <>
                  <div>
                    <label className="text-sm font-medium text-slate-600">Motoboy</label>
                    <select value={motoboyId} onChange={(e) => setMotoboyId(e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4">
                      <option value="">Selecione</option>
                      {resumo.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-600">Tipo</label>
                    <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4">
                      {tiposManuais.map((item) => (
                        <option key={item.tipo} value={item.tipo}>
                          {item.titulo} ({item.pontosPadrao || "ajuste"} pts)
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="text-sm font-medium text-slate-600">Pontos</label>
                <input type="number" min="-100" max="100" value={pontos} onChange={(e) => setPontos(e.target.value)} className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4" />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-600">Justificativa</label>
                <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={4} className="mt-2 w-full rounded-xl border border-slate-200 p-4" />
              </div>

              {!editando && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <input value={teleId} onChange={(e) => setTeleId(e.target.value)} placeholder="ID da tele (opcional)" className="h-12 rounded-xl border border-slate-200 px-4" />
                  <input type="datetime-local" value={ocorridoEm} onChange={(e) => setOcorridoEm(e.target.value)} className="h-12 rounded-xl border border-slate-200 px-4" />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t bg-slate-50 px-5 py-4">
              <button onClick={() => setModalAberto(false)} className="h-12 rounded-xl border border-slate-200 bg-white px-5 font-semibold">Cancelar</button>
              <button onClick={() => void salvar()} disabled={salvando} className="flex h-12 items-center gap-2 rounded-xl bg-emerald-600 px-5 font-semibold text-white">
                {salvando ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
