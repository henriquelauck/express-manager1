"use client";

import PageContainer from "@/components/ui/PageContainer";
import PageHeader from "@/components/ui/PageHeader";
import {
  AlarmClock,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Clock3,
  ListTodo,
  Loader2,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

type Tarefa = {
  id: string;
  tipo: string;
  dataReferencia: string;
  titulo: string;
  descricao: string;
  valor: number;
  quantidadeTeles: number;
  concluida: boolean;
};

type Regra = {
  id: string;
  titulo: string;
  descricao: string;
  hora: number;
  minuto: number;
  diasSemana: number[];
  recorrente: boolean;
  dataUnica?: string | null;
  ativa: boolean;
  tipoCondicao: string;
  solicitanteFiltro?: string | null;
  ultimaVerificacaoEm?: string | null;
};

type Filtro = "pendentes" | "concluidas" | "todas";
type Aba = "tarefas" | "agendamentos";

const DIAS = [
  { valor: 0, nome: "Dom" },
  { valor: 1, nome: "Seg" },
  { valor: 2, nome: "Ter" },
  { valor: 3, nome: "Qua" },
  { valor: 4, nome: "Qui" },
  { valor: 5, nome: "Sex" },
  { valor: 6, nome: "Sáb" },
];

function hojeBrasil() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function dataISO(data: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(data));
}

function dataExibicao(data: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date(data));
}

function horario(hora: number, minuto: number) {
  return `${String(hora).padStart(2, "0")}:${String(minuto).padStart(2, "0")}`;
}

export default function TarefasPage() {
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [regras, setRegras] = useState<Regra[]>([]);
  const [aba, setAba] = useState<Aba>("tarefas");
  const [filtro, setFiltro] = useState<Filtro>("pendentes");
  const [carregando, setCarregando] = useState(true);
  const [processando, setProcessando] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [modal, setModal] = useState(false);
  const [editando, setEditando] = useState<Regra | null>(null);

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [horaValor, setHoraValor] = useState("19:00");
  const [recorrente, setRecorrente] = useState(true);
  const [diasSemana, setDiasSemana] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [dataUnica, setDataUnica] = useState(hojeBrasil());
  const [tipoCondicao, setTipoCondicao] = useState("NENHUMA");
  const [solicitanteFiltro, setSolicitanteFiltro] = useState("");
  const [salvando, setSalvando] = useState(false);

  async function carregar(mostrar = false) {
    if (mostrar) setCarregando(true);

    try {
      const resposta = await fetch(
        `/api/tarefas-gestor?modo=central&filtro=${filtro}`,
        { cache: "no-store" }
      );

      const dados = await resposta.json().catch(() => ({}));

      if (!resposta.ok) {
        throw new Error(dados?.erro || "Não foi possível carregar as tarefas.");
      }

      setTarefas(Array.isArray(dados?.tarefas) ? dados.tarefas : []);
      setRegras(Array.isArray(dados?.regras) ? dados.regras : []);
      setErro("");
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível carregar.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void carregar(true);
  }, [filtro]);

  function abrirNova() {
    setEditando(null);
    setTitulo("");
    setDescricao("");
    setHoraValor("19:00");
    setRecorrente(true);
    setDiasSemana([1, 2, 3, 4, 5, 6]);
    setDataUnica(hojeBrasil());
    setTipoCondicao("NENHUMA");
    setSolicitanteFiltro("");
    setModal(true);
  }

  function abrirEdicao(regra: Regra) {
    setEditando(regra);
    setTitulo(regra.titulo);
    setDescricao(regra.descricao);
    setHoraValor(horario(regra.hora, regra.minuto));
    setRecorrente(regra.recorrente);
    setDiasSemana(regra.diasSemana);
    setDataUnica(regra.dataUnica ? dataISO(regra.dataUnica) : hojeBrasil());
    setTipoCondicao(regra.tipoCondicao || "NENHUMA");
    setSolicitanteFiltro(regra.solicitanteFiltro || "");
    setModal(true);
  }

  function alternarDia(dia: number) {
    setDiasSemana((atuais) =>
      atuais.includes(dia)
        ? atuais.filter((item) => item !== dia)
        : [...atuais, dia].sort()
    );
  }

  async function salvarAgendamento() {
    if (!titulo.trim() || salvando) return;

    const [hora, minuto] = horaValor.split(":").map(Number);
    setSalvando(true);
    setErro("");

    try {
      const resposta = await fetch("/api/tarefas-gestor", {
        method: editando ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          regraId: editando?.id,
          titulo,
          descricao,
          hora,
          minuto,
          recorrente,
          diasSemana,
          dataUnica,
          tipoCondicao,
          solicitanteFiltro,
        }),
      });

      const dados = await resposta.json().catch(() => ({}));

      if (!resposta.ok) {
        throw new Error(dados?.erro || "Não foi possível salvar o agendamento.");
      }

      setModal(false);
      await carregar();
      setAba("agendamentos");
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  async function alterarTarefa(id: string, acao: "concluir" | "reabrir") {
    if (processando) return;
    setProcessando(id);

    try {
      const resposta = await fetch("/api/tarefas-gestor", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tarefaId: id, acao }),
      });

      const dados = await resposta.json().catch(() => ({}));
      if (!resposta.ok) throw new Error(dados?.erro || "Não foi possível atualizar.");

      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível atualizar.");
    } finally {
      setProcessando(null);
    }
  }

  async function alternarRegra(regra: Regra) {
    if (processando) return;
    setProcessando(regra.id);

    try {
      const resposta = await fetch("/api/tarefas-gestor", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          regraId: regra.id,
          acao: regra.ativa ? "desativar" : "ativar",
        }),
      });

      const dados = await resposta.json().catch(() => ({}));
      if (!resposta.ok) throw new Error(dados?.erro || "Não foi possível alterar.");

      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível alterar.");
    } finally {
      setProcessando(null);
    }
  }

  async function excluirRegra(regra: Regra) {
    if (
      processando ||
      !window.confirm(`Excluir o agendamento "${regra.titulo}"?`)
    ) {
      return;
    }

    setProcessando(regra.id);

    try {
      const resposta = await fetch("/api/tarefas-gestor", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regraId: regra.id }),
      });

      const dados = await resposta.json().catch(() => ({}));
      if (!resposta.ok) throw new Error(dados?.erro || "Não foi possível excluir.");

      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível excluir.");
    } finally {
      setProcessando(null);
    }
  }

  const hoje = hojeBrasil();

  return (
    <PageContainer>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <PageHeader
          titulo="Tarefas do Gestor"
          descricao="Agendamentos operacionais que aparecem nos dias e horários definidos."
        />

        <button
          type="button"
          onClick={abrirNova}
          className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 font-semibold text-white hover:bg-emerald-700"
        >
          <Plus size={19} />
          Novo agendamento
        </button>
      </div>

      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setAba("tarefas")}
          className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${
            aba === "tarefas" ? "bg-slate-900 text-white" : "border bg-white text-slate-600"
          }`}
        >
          Tarefas ativas
        </button>
        <button
          onClick={() => setAba("agendamentos")}
          className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${
            aba === "agendamentos" ? "bg-slate-900 text-white" : "border bg-white text-slate-600"
          }`}
        >
          Agendamentos
        </button>
      </div>

      {erro && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </div>
      )}

      {aba === "tarefas" ? (
        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap gap-2 border-b bg-slate-50/70 p-5">
            {(["pendentes", "concluidas", "todas"] as Filtro[]).map((item) => (
              <button
                key={item}
                onClick={() => setFiltro(item)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                  filtro === item ? "bg-slate-900 text-white" : "border bg-white text-slate-600"
                }`}
              >
                {item === "pendentes" ? "Pendentes" : item === "concluidas" ? "Concluídas" : "Todas"}
              </button>
            ))}
          </div>

          <div className="p-5">
            {carregando ? (
              <div className="flex min-h-52 items-center justify-center gap-2 text-slate-500">
                <Loader2 className="animate-spin" size={19} />
                Carregando...
              </div>
            ) : tarefas.length === 0 ? (
              <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed bg-slate-50 text-center">
                <CheckCircle2 className="text-emerald-600" size={28} />
                <strong className="mt-3">Nenhuma tarefa neste filtro</strong>
              </div>
            ) : (
              <div className="space-y-3">
                {tarefas.map((tarefa) => {
                  const atrasada = !tarefa.concluida && dataISO(tarefa.dataReferencia) < hoje;

                  return (
                    <article
                      key={tarefa.id}
                      className={`rounded-2xl border p-4 ${
                        tarefa.concluida
                          ? "bg-slate-50 opacity-80"
                          : atrasada
                            ? "border-red-200 bg-red-50/50"
                            : "border-emerald-200"
                      }`}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <strong>{tarefa.titulo}</strong>
                            {atrasada && (
                              <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
                                Atrasada
                              </span>
                            )}
                          </div>
                          {tarefa.descricao && (
                            <p className="mt-2 text-sm leading-6 text-slate-600">{tarefa.descricao}</p>
                          )}
                          <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <CalendarDays size={14} />
                              {dataExibicao(tarefa.dataReferencia)}
                            </span>
                            {tarefa.quantidadeTeles > 0 && <span>{tarefa.quantidadeTeles} teles</span>}
                            {Number(tarefa.valor) > 0 && (
                              <span className="font-semibold">
                                R$ {Number(tarefa.valor).toFixed(2).replace(".", ",")}
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() =>
                            void alterarTarefa(
                              tarefa.id,
                              tarefa.concluida ? "reabrir" : "concluir"
                            )
                          }
                          disabled={Boolean(processando)}
                          className={`flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white ${
                            tarefa.concluida ? "bg-blue-600" : "bg-emerald-600"
                          } disabled:opacity-50`}
                        >
                          {processando === tarefa.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : tarefa.concluida ? (
                            <RotateCcw size={16} />
                          ) : (
                            <CheckCircle2 size={16} />
                          )}
                          {tarefa.concluida ? "Reabrir" : "Concluir"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      ) : (
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          {carregando ? (
            <div className="flex min-h-52 items-center justify-center gap-2 text-slate-500">
              <Loader2 className="animate-spin" size={19} />
              Carregando...
            </div>
          ) : (
            <div className="space-y-3">
              {regras.map((regra) => (
                <article key={regra.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <strong>{regra.titulo}</strong>
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            regra.ativa
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {regra.ativa ? "Ativo" : "Desativado"}
                        </span>
                        {regra.tipoCondicao !== "NENHUMA" && (
                          <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700">
                            {regra.tipoCondicao === "COBRANCA_NA_HORA_DIA"
                              ? "Cobrança na hora"
                              : `Cliente: ${regra.solicitanteFiltro || "não informado"}`}
                          </span>
                        )}
                      </div>

                      <p className="mt-2 text-sm text-slate-600">{regra.descricao}</p>

                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock3 size={14} />
                          {horario(regra.hora, regra.minuto)}
                        </span>

                        {regra.recorrente ? (
                          <span>
                            {DIAS.filter((dia) => regra.diasSemana.includes(dia.valor))
                              .map((dia) => dia.nome)
                              .join(", ")}
                          </span>
                        ) : (
                          <span>
                            {regra.dataUnica ? dataExibicao(regra.dataUnica) : "Data não definida"}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => abrirEdicao(regra)}
                        className="flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-semibold text-slate-600"
                      >
                        <Pencil size={15} />
                        Editar
                      </button>

                      <button
                        onClick={() => void alternarRegra(regra)}
                        disabled={Boolean(processando)}
                        className="h-10 rounded-xl border px-3 text-sm font-semibold text-slate-600 disabled:opacity-50"
                      >
                        {regra.ativa ? "Desativar" : "Ativar"}
                      </button>

                      <button
                        onClick={() => void excluirRegra(regra)}
                        disabled={Boolean(processando)}
                        className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-200 text-red-600 disabled:opacity-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {modal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b p-5">
              <div>
                <h2 className="text-xl font-bold">
                  {editando ? "Editar agendamento" : "Novo agendamento"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  A tarefa aparece somente a partir do horário definido.
                </p>
              </div>
              <button onClick={() => setModal(false)} className="p-2 text-slate-400">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div>
                <label className="text-sm font-semibold">Título</label>
                <input
                  value={titulo}
                  onChange={(event) => setTitulo(event.target.value)}
                  className="mt-2 h-12 w-full rounded-xl border px-4"
                />
              </div>

              <div>
                <label className="text-sm font-semibold">Descrição</label>
                <textarea
                  value={descricao}
                  onChange={(event) => setDescricao(event.target.value)}
                  rows={3}
                  className="mt-2 w-full rounded-xl border p-4"
                />
              </div>

              <div>
                <label className="text-sm font-semibold">Horário para aparecer</label>
                <input
                  type="time"
                  value={horaValor}
                  onChange={(event) => setHoraValor(event.target.value)}
                  className="mt-2 h-12 w-full rounded-xl border px-4"
                />
              </div>


              <div>
                <label className="text-sm font-semibold">Condição para aparecer</label>
                <select
                  value={tipoCondicao}
                  onChange={(event) => {
                    setTipoCondicao(event.target.value);
                    if (event.target.value !== "TELE_NAO_PAGA_SOLICITANTE") {
                      setSolicitanteFiltro("");
                    }
                  }}
                  className="mt-2 h-12 w-full rounded-xl border bg-white px-4"
                >
                  <option value="NENHUMA">Sem condição — sempre aparece</option>
                  <option value="TELE_NAO_PAGA_SOLICITANTE">
                    Cliente específico com tele não paga
                  </option>
                  <option value="COBRANCA_NA_HORA_DIA">
                    Cobranças na hora pendentes do dia
                  </option>
                </select>

                <p className="mt-2 text-xs leading-5 text-slate-500">
                  A condição é verificada uma única vez no horário. Sem pendência,
                  a ocorrência daquele dia é descartada.
                </p>
              </div>

              {tipoCondicao === "TELE_NAO_PAGA_SOLICITANTE" && (
                <div>
                  <label className="text-sm font-semibold">Nome do cliente</label>
                  <input
                    value={solicitanteFiltro}
                    onChange={(event) => setSolicitanteFiltro(event.target.value)}
                    placeholder="Ex.: Marcos Moto Peças"
                    className="mt-2 h-12 w-full rounded-xl border px-4"
                  />
                </div>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setRecorrente(true)}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                    recorrente ? "bg-slate-900 text-white" : "border"
                  }`}
                >
                  Recorrente
                </button>
                <button
                  onClick={() => setRecorrente(false)}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold ${
                    !recorrente ? "bg-slate-900 text-white" : "border"
                  }`}
                >
                  Uma vez
                </button>
              </div>

              {recorrente ? (
                <div>
                  <label className="text-sm font-semibold">Dias da semana</label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {DIAS.map((dia) => (
                      <button
                        key={dia.valor}
                        onClick={() => alternarDia(dia.valor)}
                        className={`h-10 rounded-xl px-3 text-sm font-semibold ${
                          diasSemana.includes(dia.valor)
                            ? "bg-emerald-600 text-white"
                            : "border text-slate-600"
                        }`}
                      >
                        {dia.nome}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-sm font-semibold">Data</label>
                  <input
                    type="date"
                    value={dataUnica}
                    onChange={(event) => setDataUnica(event.target.value)}
                    className="mt-2 h-12 w-full rounded-xl border px-4"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t p-5">
              <button
                onClick={() => setModal(false)}
                className="h-11 rounded-xl border px-4 font-semibold text-slate-600"
              >
                Cancelar
              </button>
              <button
                onClick={() => void salvarAgendamento()}
                disabled={
                  salvando ||
                  !titulo.trim() ||
                  (tipoCondicao === "TELE_NAO_PAGA_SOLICITANTE" &&
                    !solicitanteFiltro.trim())
                }
                className="flex h-11 items-center gap-2 rounded-xl bg-emerald-600 px-5 font-semibold text-white disabled:opacity-50"
              >
                {salvando && <Loader2 size={16} className="animate-spin" />}
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
