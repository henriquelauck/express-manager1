"use client";

import PageContainer from "@/components/ui/PageContainer";
import PageHeader from "@/components/ui/PageHeader";
import { useExpressManager } from "@/context/ExpressManagerContext";
import type { Motoboy } from "@/types/Motoboy";
import {
  AlertCircle,
  AlertTriangle,
  Bike,
  CheckCircle2,
  ClipboardList,
  DollarSign,
  Loader2,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

export default function MotoboysPage() {
  const { motoboys, setMotoboys, teles } = useExpressManager();

  const [modalAberto, setModalAberto] = useState(false);
  const [editandoIndex, setEditandoIndex] = useState<number | null>(null);
  const [busca, setBusca] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erroFormulario, setErroFormulario] = useState("");
  const [sucessoFormulario, setSucessoFormulario] = useState("");
  const [motoboyParaExcluir, setMotoboyParaExcluir] = useState<Motoboy | null>(null);
  const [excluindoMotoboy, setExcluindoMotoboy] = useState(false);
  const [erroExclusao, setErroExclusao] = useState("");

  const [form, setForm] = useState({
    nome: "",
    telefone: "",
    moto: "",
    placa: "",
  });

  const motoboysFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    if (!termo) return motoboys;

    return motoboys.filter((motoboy) => {
      const conteudo = [motoboy.nome, motoboy.telefone, motoboy.moto, motoboy.placa]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return conteudo.includes(termo);
    });
  }, [busca, motoboys]);

  const motoboysComPlaca = motoboys.filter((motoboy) => Boolean(motoboy.placa)).length;

  function limparFormulario() {
    setForm({ nome: "", telefone: "", moto: "", placa: "" });
    setEditandoIndex(null);
    setErroFormulario("");
    setSucessoFormulario("");
  }

  function abrirCadastro() {
    limparFormulario();
    setModalAberto(true);
  }

  function abrirEdicao(index: number) {
    setErroFormulario("");
    setSucessoFormulario("");
    setEditandoIndex(index);
    setForm({
      nome: motoboys[index].nome || "",
      telefone: motoboys[index].telefone || "",
      moto: motoboys[index].moto || "",
      placa: motoboys[index].placa || "",
    });
    setModalAberto(true);
  }

  function fecharModal() {
    if (salvando) return;

    limparFormulario();
    setModalAberto(false);
  }

  async function salvarMotoboy() {
    if (salvando) return;

    const nome = form.nome.trim();
    const telefone = form.telefone.trim();
    const moto = form.moto.trim();
    const placa = form.placa.trim().toUpperCase();

    setErroFormulario("");
    setSucessoFormulario("");

    if (!nome || !telefone || !moto || !placa) {
      setErroFormulario("Preencha todos os campos obrigatórios.");
      return;
    }

    setSalvando(true);

    try {
      const editando = editandoIndex !== null;
      const motoboyAtual = editando ? motoboys[editandoIndex] : null;

      const resposta = await fetch("/api/motoboys", {
        method: editando ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: motoboyAtual?.id,
          nome,
          telefone,
          moto,
          placa,
        }),
      });

      if (!resposta.ok) {
        let mensagem = "Não foi possível salvar o motoboy.";

        try {
          const dadosErro = await resposta.json();
          mensagem = dadosErro?.erro || dadosErro?.message || mensagem;
        } catch {
          const textoErro = await resposta.text();
          if (textoErro) mensagem = textoErro;
        }

        throw new Error(mensagem);
      }

      const respostaLista = await fetch("/api/motoboys");
      const motoboysAtualizados = await respostaLista.json();

      setMotoboys(Array.isArray(motoboysAtualizados) ? motoboysAtualizados : []);

      setSucessoFormulario(
        editando ? "Motoboy atualizado com sucesso." : "Motoboy cadastrado com sucesso."
      );

      setTimeout(() => {
        limparFormulario();
        setModalAberto(false);
      }, 700);
    } catch (erro) {
      setErroFormulario(
        erro instanceof Error ? erro.message : "Não foi possível salvar o motoboy."
      );
    } finally {
      setSalvando(false);
    }
  }

  function solicitarExclusao(motoboy: Motoboy) {
    setErroExclusao("");
    setMotoboyParaExcluir(motoboy);
  }

  function cancelarExclusao() {
    if (excluindoMotoboy) return;

    setErroExclusao("");
    setMotoboyParaExcluir(null);
  }

  async function confirmarExclusaoMotoboy() {
    if (!motoboyParaExcluir?.id || excluindoMotoboy) return;

    setExcluindoMotoboy(true);
    setErroExclusao("");

    try {
      const resposta = await fetch("/api/motoboys", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: motoboyParaExcluir.id,
        }),
      });

      if (!resposta.ok) {
        let mensagem = "Não foi possível excluir o motoboy.";

        try {
          const dadosErro = await resposta.json();
          mensagem = dadosErro?.erro || dadosErro?.message || mensagem;
        } catch {
          const textoErro = await resposta.text();
          if (textoErro) mensagem = textoErro;
        }

        throw new Error(mensagem);
      }

      const respostaLista = await fetch("/api/motoboys");
      const motoboysAtualizados = await respostaLista.json();

      setMotoboys(Array.isArray(motoboysAtualizados) ? motoboysAtualizados : []);

      setMotoboyParaExcluir(null);
    } catch (erro) {
      setErroExclusao(erro instanceof Error ? erro.message : "Não foi possível excluir o motoboy.");
    } finally {
      setExcluindoMotoboy(false);
    }
  }

  function converterValor(valor: string) {
    return Number(valor.replace(",", "."));
  }

  function formatarValor(valor: number) {
    return valor.toFixed(2).replace(".", ",");
  }

  function dataDaTele(criadoEm: string) {
    return criadoEm.split(",")[0];
  }

  function resumoMotoboy(nome: string, periodo: "hoje" | "semana" | "mes") {
    const hoje = new Date();
    const hojeBR = hoje.toLocaleDateString("pt-BR");

    const primeiroDiaSemana = new Date(hoje);
    primeiroDiaSemana.setDate(hoje.getDate() - hoje.getDay());
    primeiroDiaSemana.setHours(0, 0, 0, 0);

    const telesFiltradas = teles.filter((tele: any) => {
      if (tele.motoboy !== nome) return false;

      const dataBR = dataDaTele(tele.criadoEm);
      const [dia, mes, ano] = dataBR.split("/");
      const dataTele = new Date(Number(ano), Number(mes) - 1, Number(dia));

      if (periodo === "hoje") return dataBR === hojeBR;

      if (periodo === "semana") return dataTele >= primeiroDiaSemana;

      return (
        dataTele.getMonth() === hoje.getMonth() && dataTele.getFullYear() === hoje.getFullYear()
      );
    });

    const total = telesFiltradas.reduce(
      (soma: number, tele: any) => soma + converterValor(tele.valor),
      0
    );

    return {
      entregas: telesFiltradas.length,
      valor: `R$ ${formatarValor(total)}`,
    };
  }

  return (
    <PageContainer>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <PageHeader titulo="Motoboys" descricao="Cadastre e acompanhe o desempenho dos motoboys." />

                <a
          href="/motoboys/pontuacao"
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-6 py-4 font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100 lg:w-auto"
        >
          <ClipboardList size={21} />
          PontuaÃ§Ã£o
        </a>
<button
          type="button"
          onClick={abrirCadastro}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-4 font-semibold text-white shadow-sm transition hover:bg-emerald-700 lg:w-auto"
        >
          <Plus size={22} />
          Cadastrar motoboy
        </button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <ResumoGeral
          titulo="Motoboys cadastrados"
          valor={String(motoboys.length)}
          descricao="Total disponível na operação"
          icone={<Users size={20} />}
        />

        <ResumoGeral
          titulo="Com veículo identificado"
          valor={String(motoboysComPlaca)}
          descricao="Possuem placa cadastrada"
          icone={<Bike size={20} />}
        />

        <ResumoGeral
          titulo="Resultados exibidos"
          valor={String(motoboysFiltrados.length)}
          descricao={busca ? "Conforme a busca atual" : "Todos os motoboys"}
          icone={<Search size={20} />}
        />
      </div>

      <section className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <label className="text-sm font-medium text-slate-600">Buscar motoboy</label>

        <div className="relative mt-2">
          <Search
            size={19}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
            placeholder="Nome, telefone, moto ou placa"
            className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {motoboysFiltrados.map((motoboy) => {
          const indexOriginal = motoboys.findIndex((item) => item.id === motoboy.id);

          const resumoHoje = resumoMotoboy(motoboy.nome, "hoje");
          const resumoSemana = resumoMotoboy(motoboy.nome, "semana");
          const resumoMes = resumoMotoboy(motoboy.nome, "mes");

          return (
            <article
              key={motoboy.id}
              className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-50/70 p-5">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                    <Bike size={27} />
                  </div>

                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-bold text-slate-900">{motoboy.nome}</h2>
                    <p className="mt-1 truncate text-sm text-slate-500">
                      {motoboy.moto || "Moto não informada"}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => abrirEdicao(indexOriginal)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
                    aria-label={`Editar ${motoboy.nome}`}
                  >
                    <Pencil size={18} />
                  </button>

                  <button
                    type="button"
                    onClick={() => solicitarExclusao(motoboy)}
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-200 bg-white text-red-600 transition hover:bg-red-50"
                    aria-label={`Excluir ${motoboy.nome}`}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="space-y-3 border-b border-slate-100 p-5 text-sm text-slate-600">
                <div className="flex items-center gap-3">
                  <Phone size={16} className="shrink-0 text-slate-400" />
                  <span>{motoboy.telefone || "Telefone não informado"}</span>
                </div>

                <div className="flex items-center gap-3">
                  <MapPin size={16} className="shrink-0 text-slate-400" />
                  <span>{motoboy.placa || "Placa não informada"}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-3">
                <Resumo titulo="Hoje" entregas={resumoHoje.entregas} valor={resumoHoje.valor} />

                <Resumo
                  titulo="Semana"
                  entregas={resumoSemana.entregas}
                  valor={resumoSemana.valor}
                />

                <Resumo titulo="Mês" entregas={resumoMes.entregas} valor={resumoMes.valor} />
              </div>
            </article>
          );
        })}

        {motoboys.length === 0 && (
          <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Nenhum motoboy cadastrado</h2>
            <p className="mt-2 text-slate-500">
              Cadastre o primeiro motoboy para iniciar a operação.
            </p>
          </div>
        )}

        {motoboys.length > 0 && motoboysFiltrados.length === 0 && (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center md:col-span-2 xl:col-span-3">
            <h2 className="text-xl font-bold text-slate-900">Nenhum motoboy encontrado</h2>
            <p className="mt-2 text-slate-500">
              Revise o nome, telefone, moto ou placa pesquisada.
            </p>

            <button
              type="button"
              onClick={() => setBusca("")}
              className="mt-5 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Limpar busca
            </button>
          </div>
        )}
      </div>

      {motoboyParaExcluir && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-excluir-motoboy"
            className="w-full max-w-lg overflow-hidden rounded-3xl border border-red-100 bg-white shadow-2xl"
          >
            <div className="flex items-start gap-4 border-b border-red-100 bg-red-50 px-5 py-5 md:px-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-700">
                <AlertTriangle size={23} />
              </div>

              <div className="min-w-0 flex-1">
                <h2 id="titulo-excluir-motoboy" className="text-xl font-bold text-slate-900">
                  Excluir este motoboy?
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-600">
                  A exclusão só será permitida quando não existirem login, teles ou movimentos
                  financeiros vinculados.
                </p>
              </div>

              <button
                type="button"
                onClick={cancelarExclusao}
                disabled={excluindoMotoboy}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-white disabled:cursor-wait disabled:opacity-50"
                aria-label="Fechar confirmação"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 p-5 md:p-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Motoboy selecionado
                </p>

                <div className="mt-3 flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                    <Bike size={23} />
                  </div>

                  <div className="min-w-0">
                    <p className="text-lg font-bold text-slate-900">{motoboyParaExcluir.nome}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {motoboyParaExcluir.moto || "Moto não informada"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-sm text-slate-600">
                  <p className="flex items-center gap-2">
                    <Phone size={15} />
                    {motoboyParaExcluir.telefone || "Telefone não informado"}
                  </p>

                  <p className="flex items-center gap-2">
                    <MapPin size={15} />
                    {motoboyParaExcluir.placa || "Placa não informada"}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                Motoboys com histórico operacional, financeiro ou acesso ao sistema não podem ser
                excluídos para preservar os registros.
              </div>

              {erroExclusao && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                  {erroExclusao}
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end md:px-6">
              <button
                type="button"
                onClick={cancelarExclusao}
                disabled={excluindoMotoboy}
                className="h-12 rounded-xl border border-slate-200 bg-white px-6 font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-50"
              >
                Manter motoboy
              </button>

              <button
                type="button"
                onClick={() => void confirmarExclusaoMotoboy()}
                disabled={excluindoMotoboy}
                className="flex h-12 items-center justify-center gap-2 rounded-xl bg-red-600 px-6 font-semibold text-white transition hover:bg-red-700 disabled:cursor-wait disabled:opacity-60"
              >
                {excluindoMotoboy ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <Trash2 size={17} />
                    Excluir motoboy
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-white/20 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-50/70 px-5 py-5 md:px-7">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600">
                  Cadastro de motoboys
                </p>

                <h2 className="mt-1 text-2xl font-bold text-slate-900">
                  {editandoIndex !== null ? "Editar motoboy" : "Cadastrar motoboy"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Os campos com asterisco são obrigatórios.
                </p>
              </div>

              <button
                type="button"
                onClick={fecharModal}
                disabled={salvando}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-50"
                aria-label="Fechar formulário"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5 p-5 md:p-7">
              {erroFormulario && (
                <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <span>{erroFormulario}</span>
                </div>
              )}

              {sucessoFormulario && (
                <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                  <span>{sucessoFormulario}</span>
                </div>
              )}

              <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5">
                <h3 className="font-bold text-slate-900">Dados pessoais</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Informações usadas para identificar e contatar o motoboy.
                </p>

                <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                  <Input
                    label="Nome do motoboy"
                    value={form.nome}
                    required
                    disabled={salvando}
                    onChange={(value) => {
                      setErroFormulario("");
                      setForm({ ...form, nome: value });
                    }}
                  />

                  <Input
                    label="Telefone"
                    value={form.telefone}
                    required
                    disabled={salvando}
                    placeholder="(51) 99999-9999"
                    onChange={(value) => {
                      setErroFormulario("");
                      setForm({ ...form, telefone: value });
                    }}
                  />
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50/60 p-5">
                <h3 className="font-bold text-slate-900">Veículo</h3>
                <p className="mt-1 text-xs text-slate-500">Dados da moto usada nas entregas.</p>

                <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                  <Input
                    label="Modelo da moto"
                    value={form.moto}
                    required
                    disabled={salvando}
                    placeholder="Ex.: Honda CG 160"
                    onChange={(value) => {
                      setErroFormulario("");
                      setForm({ ...form, moto: value });
                    }}
                  />

                  <Input
                    label="Placa"
                    value={form.placa}
                    required
                    disabled={salvando}
                    placeholder="ABC1D23"
                    onChange={(value) => {
                      setErroFormulario("");
                      setForm({
                        ...form,
                        placa: value.toUpperCase(),
                      });
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end md:px-7">
              <button
                type="button"
                onClick={fecharModal}
                disabled={salvando}
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-6 font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-50 sm:w-auto"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => void salvarMotoboy()}
                disabled={salvando}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60 sm:w-auto"
              >
                {salvando && <Loader2 size={17} className="animate-spin" />}

                {salvando
                  ? "Salvando..."
                  : editandoIndex !== null
                    ? "Salvar alterações"
                    : "Salvar motoboy"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

type InputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
};

function Input({
  label,
  value,
  onChange,
  required = false,
  disabled = false,
  placeholder = "",
}: InputProps) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-600">
        {label}
        {required && <span className="ml-1 text-red-500">*</span>}
      </label>
      <input
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:cursor-wait disabled:bg-slate-100"
      />
    </div>
  );
}

type ResumoProps = {
  titulo: string;
  entregas: number;
  valor: string;
};

function Resumo({ titulo, entregas, valor }: ResumoProps) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="mb-2 text-xs text-slate-500">{titulo}</p>
      <p className="flex items-center gap-1 text-sm font-bold">
        <ClipboardList size={14} />
        {entregas}
      </p>
      <p className="mt-1 flex items-center gap-1 text-sm font-bold text-emerald-700">
        <DollarSign size={14} />
        {valor}
      </p>
    </div>
  );
}

type ResumoGeralProps = {
  titulo: string;
  valor: string;
  descricao: string;
  icone: React.ReactNode;
};

function ResumoGeral({ titulo, valor, descricao, icone }: ResumoGeralProps) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{titulo}</p>
          <strong className="mt-2 block text-2xl font-bold text-slate-900">{valor}</strong>
          <p className="mt-1 text-xs text-slate-400">{descricao}</p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
          {icone}
        </div>
      </div>
    </div>
  );
}
