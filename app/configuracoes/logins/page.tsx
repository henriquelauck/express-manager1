"use client";

import PageContainer from "@/components/ui/PageContainer";
import PageHeader from "@/components/ui/PageHeader";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type UsuarioMotoboy = {
  id: string;
  nome: string;
  email: string;
  role: string;
  createdAt?: string;
  updatedAt?: string;
};

type Motoboy = {
  id: string;
  nome: string;
  telefone?: string | null;
  moto?: string | null;
  placa?: string | null;
  userId?: string | null;
  user?: UsuarioMotoboy | null;
};

type ModoModal = "criar" | "editar" | "excluir" | null;

export default function LoginsMotoboysPage() {
  const [motoboys, setMotoboys] = useState<Motoboy[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [busca, setBusca] = useState("");
  const [erroPagina, setErroPagina] = useState("");
  const [erroModal, setErroModal] = useState("");
  const [sucessoModal, setSucessoModal] = useState("");
  const [modoModal, setModoModal] = useState<ModoModal>(null);
  const [motoboySelecionado, setMotoboySelecionado] = useState<Motoboy | null>(null);

  const [motoboyId, setMotoboyId] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);

  async function carregar() {
    setErroPagina("");

    try {
      const resposta = await fetch("/api/configuracoes/logins-motoboys", {
        cache: "no-store",
      });

      if (!resposta.ok) {
        let mensagem = "Não foi possível carregar os logins.";

        try {
          const dadosErro = await resposta.json();
          mensagem = dadosErro?.erro || mensagem;
        } catch {}

        throw new Error(mensagem);
      }

      const dados = await resposta.json();
      setMotoboys(Array.isArray(dados) ? dados : []);
    } catch (erro) {
      setErroPagina(erro instanceof Error ? erro.message : "Não foi possível carregar os logins.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void carregar();
  }, []);

  const motoboysFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    if (!termo) return motoboys;

    return motoboys.filter((motoboy) =>
      [motoboy.nome, motoboy.telefone, motoboy.moto, motoboy.placa, motoboy.user?.email]
        .join(" ")
        .toLowerCase()
        .includes(termo)
    );
  }, [motoboys, busca]);

  const motoboysSemLogin = motoboys.filter((motoboy) => !motoboy.user);

  const totalComLogin = motoboys.length - motoboysSemLogin.length;

  function limparModal() {
    setModoModal(null);
    setMotoboySelecionado(null);
    setMotoboyId("");
    setEmail("");
    setSenha("");
    setMostrarSenha(false);
    setErroModal("");
    setSucessoModal("");
  }

  function abrirCriacao() {
    limparModal();
    setModoModal("criar");
  }

  function abrirEdicao(motoboy: Motoboy) {
    setModoModal("editar");
    setMotoboySelecionado(motoboy);
    setMotoboyId(motoboy.id);
    setEmail(motoboy.user?.email || "");
    setSenha("");
    setMostrarSenha(false);
    setErroModal("");
    setSucessoModal("");
  }

  function abrirExclusao(motoboy: Motoboy) {
    setModoModal("excluir");
    setMotoboySelecionado(motoboy);
    setErroModal("");
    setSucessoModal("");
  }

  function fecharModal() {
    if (salvando) return;
    limparModal();
  }

  async function criarLogin() {
    if (salvando) return;

    setErroModal("");
    setSucessoModal("");

    if (!motoboyId || !email.trim() || !senha) {
      setErroModal("Preencha motoboy, e-mail e senha.");
      return;
    }

    if (senha.length < 6) {
      setErroModal("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    setSalvando(true);

    try {
      const resposta = await fetch("/api/configuracoes/logins-motoboys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          motoboyId,
          email,
          senha,
        }),
      });

      if (!resposta.ok) {
        let mensagem = "Não foi possível criar o login.";

        try {
          const dadosErro = await resposta.json();
          mensagem = dadosErro?.erro || mensagem;
        } catch {}

        throw new Error(mensagem);
      }

      await carregar();
      setSucessoModal("Login criado com sucesso.");

      setTimeout(() => {
        limparModal();
      }, 700);
    } catch (erro) {
      setErroModal(erro instanceof Error ? erro.message : "Não foi possível criar o login.");
    } finally {
      setSalvando(false);
    }
  }

  async function salvarEdicao() {
    if (!motoboySelecionado?.user || salvando) return;

    setErroModal("");
    setSucessoModal("");

    const emailAtual = email.trim().toLowerCase();
    const emailOriginal = motoboySelecionado.user.email.toLowerCase();

    if (!emailAtual && !senha) {
      setErroModal("Informe um novo e-mail ou uma nova senha.");
      return;
    }

    if (senha && senha.length < 6) {
      setErroModal("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    const body: {
      userId: string;
      email?: string;
      senha?: string;
    } = {
      userId: motoboySelecionado.user.id,
    };

    if (emailAtual && emailAtual !== emailOriginal) {
      body.email = emailAtual;
    }

    if (senha) {
      body.senha = senha;
    }

    if (!body.email && !body.senha) {
      setErroModal("Nenhuma alteração foi informada.");
      return;
    }

    setSalvando(true);

    try {
      const resposta = await fetch("/api/configuracoes/logins-motoboys", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!resposta.ok) {
        let mensagem = "Não foi possível alterar o login.";

        try {
          const dadosErro = await resposta.json();
          mensagem = dadosErro?.erro || mensagem;
        } catch {}

        throw new Error(mensagem);
      }

      await carregar();
      setSucessoModal("Login atualizado com sucesso.");

      setTimeout(() => {
        limparModal();
      }, 700);
    } catch (erro) {
      setErroModal(erro instanceof Error ? erro.message : "Não foi possível alterar o login.");
    } finally {
      setSalvando(false);
    }
  }

  async function excluirLogin() {
    if (!motoboySelecionado?.user || salvando) return;

    setSalvando(true);
    setErroModal("");

    try {
      const resposta = await fetch("/api/configuracoes/logins-motoboys", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: motoboySelecionado.user.id,
        }),
      });

      if (!resposta.ok) {
        let mensagem = "Não foi possível excluir o login.";

        try {
          const dadosErro = await resposta.json();
          mensagem = dadosErro?.erro || mensagem;
        } catch {}

        throw new Error(mensagem);
      }

      await carregar();
      limparModal();
    } catch (erro) {
      setErroModal(erro instanceof Error ? erro.message : "Não foi possível excluir o login.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <PageContainer>
      <PageHeader
        titulo="Logins dos Motoboys"
        descricao="Crie e gerencie o acesso dos motoboys ao sistema."
      />

      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <CardResumo
          titulo="Motoboys cadastrados"
          valor={motoboys.length}
          icon={<UserRound size={22} />}
        />

        <CardResumo
          titulo="Com login"
          valor={totalComLogin}
          icon={<ShieldCheck size={22} />}
          positivo
        />

        <CardResumo
          titulo="Sem login"
          valor={motoboysSemLogin.length}
          icon={<KeyRound size={22} />}
          alerta={motoboysSemLogin.length > 0}
        />
      </div>

      <div className="mb-8 flex flex-col gap-4 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-md">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

          <input
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder="Buscar por nome, e-mail, moto ou placa"
            className="h-12 w-full rounded-xl border border-slate-200 pl-11 pr-4 outline-none focus:border-emerald-500"
          />
        </div>

        <button
          type="button"
          onClick={abrirCriacao}
          disabled={motoboysSemLogin.length === 0}
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus size={18} />
          Criar login
        </button>
      </div>

      {erroPagina && (
        <div className="mb-8 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          {erroPagina}
        </div>
      )}

      {carregando ? (
        <div className="flex min-h-64 items-center justify-center rounded-3xl border border-slate-100 bg-white">
          <Loader2 size={28} className="animate-spin text-emerald-600" />
        </div>
      ) : motoboysFiltrados.length === 0 ? (
        <div className="rounded-3xl border border-slate-100 bg-white p-10 text-center shadow-sm">
          <KeyRound size={40} className="mx-auto text-slate-300" />
          <h2 className="mt-4 text-lg font-bold text-slate-900">Nenhum motoboy encontrado</h2>
          <p className="mt-1 text-sm text-slate-500">Ajuste a busca ou cadastre um novo motoboy.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {motoboysFiltrados.map((motoboy) => (
            <div
              key={motoboy.id}
              className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                      motoboy.user
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-orange-100 text-orange-700"
                    }`}
                  >
                    {motoboy.user ? <ShieldCheck size={22} /> : <KeyRound size={22} />}
                  </div>

                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-bold text-slate-900">{motoboy.nome}</h2>

                    <p className="mt-1 text-sm text-slate-500">
                      {motoboy.moto || "Moto não informada"}
                      {motoboy.placa ? ` • ${motoboy.placa}` : ""}
                    </p>
                  </div>
                </div>

                <span
                  className={`shrink-0 rounded-xl px-3 py-2 text-xs font-semibold ${
                    motoboy.user
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-orange-100 text-orange-700"
                  }`}
                >
                  {motoboy.user ? "Com login" : "Sem login"}
                </span>
              </div>

              <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                <p className="text-xs text-slate-400">E-mail de acesso</p>

                <p className="mt-1 flex items-center gap-2 font-medium text-slate-700">
                  <Mail size={16} />
                  {motoboy.user?.email || "Nenhum login vinculado"}
                </p>
              </div>

              {motoboy.user ? (
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => abrirEdicao(motoboy)}
                    className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 font-semibold text-white"
                  >
                    <Pencil size={16} />
                    Editar login
                  </button>

                  <button
                    type="button"
                    onClick={() => abrirExclusao(motoboy)}
                    className="flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 font-semibold text-red-600"
                  >
                    <Trash2 size={16} />
                    Excluir
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    abrirCriacao();
                    setMotoboyId(motoboy.id);
                  }}
                  className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 font-semibold text-white"
                >
                  <Plus size={16} />
                  Criar login
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {(modoModal === "criar" || modoModal === "editar") && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-50 px-5 py-5 md:px-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-600">
                  Configurações de acesso
                </p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900">
                  {modoModal === "criar" ? "Criar login" : "Editar login"}
                </h2>
              </div>

              <button
                type="button"
                onClick={fecharModal}
                disabled={salvando}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5 p-5 md:p-6">
              {erroModal && <Mensagem tipo="erro" texto={erroModal} />}

              {sucessoModal && <Mensagem tipo="sucesso" texto={sucessoModal} />}

              {modoModal === "criar" && (
                <div>
                  <label className="text-sm font-medium text-slate-600">Motoboy</label>

                  <select
                    value={motoboyId}
                    disabled={salvando}
                    onChange={(evento) => {
                      setMotoboyId(evento.target.value);
                      setErroModal("");
                    }}
                    className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 outline-none focus:border-emerald-500"
                  >
                    <option value="">Selecione</option>

                    {motoboysSemLogin.map((motoboy) => (
                      <option key={motoboy.id} value={motoboy.id}>
                        {motoboy.nome}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {modoModal === "editar" && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs text-slate-400">Motoboy</p>
                  <strong className="mt-1 block text-slate-900">{motoboySelecionado?.nome}</strong>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-slate-600">E-mail</label>

                <input
                  type="email"
                  value={email}
                  disabled={salvando}
                  onChange={(evento) => {
                    setEmail(evento.target.value);
                    setErroModal("");
                  }}
                  placeholder="motoboy@expressmanager.com"
                  className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-600">
                  {modoModal === "criar" ? "Senha" : "Nova senha"}
                </label>

                <div className="relative mt-2">
                  <input
                    type={mostrarSenha ? "text" : "password"}
                    value={senha}
                    disabled={salvando}
                    onChange={(evento) => {
                      setSenha(evento.target.value);
                      setErroModal("");
                    }}
                    placeholder={
                      modoModal === "editar"
                        ? "Deixe em branco para manter"
                        : "Mínimo de 6 caracteres"
                    }
                    className="h-12 w-full rounded-xl border border-slate-200 px-4 pr-12 outline-none focus:border-emerald-500"
                  />

                  <button
                    type="button"
                    onClick={() => setMostrarSenha((atual) => !atual)}
                    className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500"
                  >
                    {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>

                <p className="mt-2 text-xs text-slate-500">
                  A senha deve ter pelo menos 6 caracteres.
                </p>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end md:px-6">
              <button
                type="button"
                onClick={fecharModal}
                disabled={salvando}
                className="h-12 rounded-xl border border-slate-200 bg-white px-6 font-medium text-slate-700 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => void (modoModal === "criar" ? criarLogin() : salvarEdicao())}
                disabled={salvando}
                className="flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 font-semibold text-white disabled:opacity-60"
              >
                {salvando && <Loader2 size={17} className="animate-spin" />}
                {salvando
                  ? "Salvando..."
                  : modoModal === "criar"
                    ? "Criar login"
                    : "Salvar alterações"}
              </button>
            </div>
          </div>
        </div>
      )}

      {modoModal === "excluir" && motoboySelecionado?.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="border-b border-red-100 bg-red-50 px-5 py-5 md:px-6">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-700">
                  <Trash2 size={22} />
                </div>

                <div>
                  <h2 className="text-xl font-bold text-slate-900">Excluir login?</h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    O motoboy continuará cadastrado, mas perderá o acesso ao sistema.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 p-5 md:p-6">
              {erroModal && <Mensagem tipo="erro" texto={erroModal} />}

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <strong className="text-slate-900">{motoboySelecionado.nome}</strong>
                <p className="mt-1 text-sm text-slate-500">{motoboySelecionado.user.email}</p>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end md:px-6">
              <button
                type="button"
                onClick={fecharModal}
                disabled={salvando}
                className="h-12 rounded-xl border border-slate-200 bg-white px-6 font-medium text-slate-700 disabled:opacity-50"
              >
                Manter login
              </button>

              <button
                type="button"
                onClick={() => void excluirLogin()}
                disabled={salvando}
                className="flex h-12 items-center justify-center gap-2 rounded-xl bg-red-600 px-6 font-semibold text-white disabled:opacity-60"
              >
                {salvando && <Loader2 size={17} className="animate-spin" />}
                {salvando ? "Excluindo..." : "Excluir login"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

function CardResumo({
  titulo,
  valor,
  icon,
  positivo = false,
  alerta = false,
}: {
  titulo: string;
  valor: number;
  icon: React.ReactNode;
  positivo?: boolean;
  alerta?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div
        className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${
          positivo
            ? "bg-emerald-100 text-emerald-700"
            : alerta
              ? "bg-orange-100 text-orange-700"
              : "bg-slate-100 text-slate-700"
        }`}
      >
        {icon}
      </div>

      <p className="text-sm text-slate-500">{titulo}</p>
      <strong className="mt-1 block text-2xl text-slate-900">{valor}</strong>
    </div>
  );
}

function Mensagem({ tipo, texto }: { tipo: "erro" | "sucesso"; texto: string }) {
  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${
        tipo === "erro"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }`}
    >
      {tipo === "erro" ? (
        <AlertCircle size={18} className="mt-0.5 shrink-0" />
      ) : (
        <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
      )}

      {texto}
    </div>
  );
}
