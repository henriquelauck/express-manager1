"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("lauck@expressmanager.com");
  const [senha, setSenha] = useState("123456");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function entrar() {
    setErro("");
    setCarregando(true);

    try {
      const resposta = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        setErro(dados.erro || "Erro ao entrar.");
        return;
      }

      if (dados.usuario.role === "MOTOBOY") {
        router.push("/motoboy");
      } else {
        router.push("/");
      }
    } catch {
      setErro("Erro ao conectar com o servidor.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f8fb] flex items-center justify-center p-6">
      <div className="bg-white w-full max-w-md rounded-3xl p-8 shadow-sm border">
        <h1 className="text-3xl font-bold mb-2">Express Manager</h1>
        <p className="text-slate-500 mb-8">Entre para acessar o sistema.</p>

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
          disabled={carregando}
          className="w-full mt-6 h-14 rounded-2xl bg-emerald-600 text-white font-semibold disabled:opacity-50"
        >
          {carregando ? "Entrando..." : "Entrar"}
        </button>
      </div>
    </main>
  );
}