"use client";

import { useEffect, useState } from "react";

export default function LoginsMotoboysPage() {
  const [motoboys, setMotoboys] = useState<any[]>([]);
  const [motoboyId, setMotoboyId] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  async function carregar() {
    const res = await fetch("/api/configuracoes/logins-motoboys");
    const dados = await res.json();
    setMotoboys(dados);
  }

  useEffect(() => {
    carregar();
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
      body: JSON.stringify({ motoboyId, email, senha }),
    });

    if (!resposta.ok) {
      alert("Erro ao criar login.");
      return;
    }

    setMotoboyId("");
    setEmail("");
    setSenha("");
    carregar();
  }

  async function alterarSenha(userId: string) {
    const novaSenha = prompt("Nova senha:");
    if (!novaSenha) return;

    await fetch("/api/configuracoes/logins-motoboys", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, senha: novaSenha }),
    });

    alert("Senha alterada.");
  }

  return (
    <main className="p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold">Logins dos Motoboys</h1>

        <div className="bg-white rounded-3xl border p-6 mt-8 shadow-sm">
          <h2 className="font-bold text-xl mb-5">Novo login</h2>

          <div className="grid md:grid-cols-3 gap-4">
            <select
              value={motoboyId}
              onChange={(e) => setMotoboyId(e.target.value)}
              className="border rounded-xl p-3"
            >
              <option value="">Selecione o motoboy</option>
              {motoboys.map((motoboy) => (
                <option key={motoboy.id} value={motoboy.id}>
                  {motoboy.nome}
                </option>
              ))}
            </select>

            <input
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="border rounded-xl p-3"
            />

            <input
              placeholder="Senha"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="border rounded-xl p-3"
            />
          </div>

          <button
            onClick={criarLogin}
            className="mt-5 bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold"
          >
            Criar login
          </button>
        </div>

        <div className="bg-white rounded-3xl border shadow-sm mt-8">
          <div className="p-6 border-b">
            <h2 className="font-bold text-xl">Motoboys cadastrados</h2>
          </div>

          {motoboys.map((motoboy) => (
            <div
              key={motoboy.id}
              className="flex justify-between items-center p-6 border-b last:border-b-0"
            >
              <div>
                <h3 className="font-bold text-lg">{motoboy.nome}</h3>
                <p className="text-slate-500">
                  {motoboy.user?.email || "Sem login vinculado"}
                </p>
              </div>

              {motoboy.user ? (
                <button
                  onClick={() => alterarSenha(motoboy.user.id)}
                  className="bg-slate-900 text-white px-5 py-2 rounded-xl"
                >
                  Alterar senha
                </button>
              ) : (
                <span className="text-red-500 font-medium">Sem login</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}