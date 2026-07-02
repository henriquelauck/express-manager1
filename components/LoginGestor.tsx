"use client";

import { useState } from "react";

export default function LoginGestor({ onEntrar }: { onEntrar: () => void }) {
  const [email, setEmail] = useState("lauck@expressmanager.com");
  const [senha, setSenha] = useState("123456");
  const [erro, setErro] = useState("");

  function entrar() {
    if (email === "lauck@expressmanager.com" && senha === "123456") {
      localStorage.setItem("express_tipo_login", "gestor");
      onEntrar();
      return;
    }

    setErro("E-mail ou senha inválidos.");
  }

  return (
    <main className="min-h-screen bg-[#f7f8fb] flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-sm border">
        <h1 className="text-3xl font-bold mb-2">Express Manager</h1>
        <p className="text-slate-500 mb-8">Login do gestor</p>

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full h-12 border rounded-xl px-4 mb-4"
          placeholder="E-mail"
        />

        <input
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="w-full h-12 border rounded-xl px-4"
          placeholder="Senha"
        />

        {erro && <p className="text-red-600 text-sm mt-4">{erro}</p>}

        <button
          onClick={entrar}
          className="w-full mt-6 h-14 rounded-2xl bg-emerald-600 text-white font-semibold"
        >
          Entrar
        </button>
      </div>
    </main>
  );
}