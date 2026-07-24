"use client";

import { Capacitor, registerPlugin } from "@capacitor/core";
import { useRouter } from "next/navigation";
import { useState } from "react";

type CredenciaisNativasPlugin = {
  salvarToken(opcoes: { token: string }): Promise<{ salvo: boolean }>;
};

const CredenciaisNativas = registerPlugin<CredenciaisNativasPlugin>("CredenciaisNativas");

function executandoNoAppAndroid() {
  return (
    typeof window !== "undefined" &&
    Capacitor.isNativePlatform() &&
    Capacitor.getPlatform() === "android"
  );
}

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function entrar() {
    if (carregando) return;

    setErro("");
    setCarregando(true);

    try {
      const acessoAndroid = executandoNoAppAndroid();

      const resposta = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(acessoAndroid
            ? {
                "x-express-app": "android",
              }
            : {}),
        },
        body: JSON.stringify({
          email: email.trim(),
          senha,
        }),
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        setErro(dados.erro || "Erro ao entrar.");
        return;
      }

      if (
        acessoAndroid &&
        dados.usuario?.role === "MOTOBOY" &&
        typeof dados.appToken === "string" &&
        dados.appToken
      ) {
        await CredenciaisNativas.salvarToken({
          token: dados.appToken,
        });
      }

      if (dados.usuario?.role === "MOTOBOY") {
        router.push("/motoboy");
      } else {
        router.push("/");
      }

      router.refresh();
    } catch (erroLogin) {
      console.error("Erro no login:", erroLogin);
      setErro("Erro ao conectar com o servidor.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f8fb] p-6">
      <div className="w-full max-w-md rounded-3xl border bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-3xl font-bold">Express Manager</h1>
        <p className="mb-8 text-slate-500">Entre para acessar o sistema.</p>

        <input
          type="email"
          value={email}
          autoComplete="email"
          onChange={(evento) => setEmail(evento.target.value)}
          onKeyDown={(evento) => {
            if (evento.key === "Enter") {
              void entrar();
            }
          }}
          className="mb-4 h-12 w-full rounded-xl border px-4"
          placeholder="E-mail"
        />

        <input
          type="password"
          value={senha}
          autoComplete="current-password"
          onChange={(evento) => setSenha(evento.target.value)}
          onKeyDown={(evento) => {
            if (evento.key === "Enter") {
              void entrar();
            }
          }}
          className="h-12 w-full rounded-xl border px-4"
          placeholder="Senha"
        />

        {erro && <p className="mt-4 text-sm text-red-600">{erro}</p>}

        <button
          type="button"
          onClick={() => void entrar()}
          disabled={carregando}
          className="mt-6 h-14 w-full rounded-2xl bg-emerald-600 font-semibold text-white disabled:opacity-50"
        >
          {carregando ? "Entrando..." : "Entrar"}
        </button>
      </div>
    </main>
  );
}
