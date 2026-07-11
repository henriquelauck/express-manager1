"use client";

import { useEffect, useState } from "react";

export default function LoginsMotoboysPage() {
  const [motoboys, setMotoboys] = useState<any[]>([]);
  const [motoboyId, setMotoboyId] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  async function carregar() {
    const resposta = await fetch("/api/configuracoes/logins-motoboys");

    if (!resposta.ok) {
      throw new Error("Erro ao carregar motoboys.");
    }

    const dados = await resposta.json();
    setMotoboys(Array.isArray(dados) ? dados : []);
  }

  useEffect(() => {
    let componenteAtivo = true;

    async function carregarInicial() {
      try {
        const resposta = await fetch("/api/configuracoes/logins-motoboys");

        if (!resposta.ok) {
          throw new Error("Erro ao carregar motoboys.");
        }

        const dados = await resposta.json();

        if (componenteAtivo) {
          setMotoboys(Array.isArray(dados) ? dados : []);
        }
      } catch (error) {
        console.error("ERRO AO CARREGAR LOGINS:", error);
      }
    }

    void carregarInicial();

    return () => {
      componenteAtivo = false;
    };
  }, []);

  async function criarLogin() {
    if (!motoboyId || !email || !senha) {
      alert("Preencha motoboy, e-mail e senha.");
      return;
    }

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
      alert("Erro ao criar login.");
      return;
    }

    setMotoboyId("");
    setEmail("");
    setSenha("");

    await carregar();
  }

  async function alterarSenha(userId: string) {
    const novaSenha = prompt("Nova senha:");

    if (!novaSenha) return;

    const resposta = await fetch("/api/configuracoes/logins-motoboys", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId,
        senha: novaSenha,
      }),
    });

    if (!resposta.ok) {
      alert("Erro ao alterar senha.");
      return;
    }

    alert("Senha alterada.");
  }

  return (
    <main className="p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-3xl font-bold">Logins dos Motoboys</h1>

        <div className="mt-8 rounded-3xl border bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-bold">Novo login</h2>

          <div className="grid gap-4 md:grid-cols-3">
            <select
              value={motoboyId}
              onChange={(event) => setMotoboyId(event.target.value)}
              className="rounded-xl border p-3"
            >
              <option value="">Selecione o motoboy</option>

              {motoboys.map((motoboy) => (
                <option key={motoboy.id} value={motoboy.id}>
                  {motoboy.nome}
                </option>
              ))}
            </select>

            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="rounded-xl border p-3"
            />

            <input
              type="password"
              placeholder="Senha"
              value={senha}
              onChange={(event) => setSenha(event.target.value)}
              className="rounded-xl border p-3"
            />
          </div>

          <button
            type="button"
            onClick={criarLogin}
            className="mt-5 rounded-xl bg-emerald-600 px-6 py-3 font-semibold text-white"
          >
            Criar login
          </button>
        </div>

        <div className="mt-8 rounded-3xl border bg-white shadow-sm">
          <div className="border-b p-6">
            <h2 className="text-xl font-bold">Motoboys cadastrados</h2>
          </div>

          {motoboys.map((motoboy) => (
            <div
              key={motoboy.id}
              className="flex items-center justify-between border-b p-6 last:border-b-0"
            >
              <div>
                <h3 className="text-lg font-bold">{motoboy.nome}</h3>

                <p className="text-slate-500">{motoboy.user?.email || "Sem login vinculado"}</p>
              </div>

              {motoboy.user ? (
                <button
                  type="button"
                  onClick={() => alterarSenha(motoboy.user.id)}
                  className="rounded-xl bg-slate-900 px-5 py-2 text-white"
                >
                  Alterar senha
                </button>
              ) : (
                <span className="font-medium text-red-500">Sem login</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
