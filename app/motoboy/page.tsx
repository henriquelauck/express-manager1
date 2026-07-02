"use client";

import { useEffect, useState } from "react";

export default function MotoboyPage() {
  const [usuario, setUsuario] = useState<any>(null);
  const [teles, setTeles] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  async function carregarDados() {
    try {
      const usuarioRes = await fetch("/api/auth/me");
      const usuarioDados = await usuarioRes.json();

      const telesRes = await fetch("/api/motoboys/minhas-teles");

      let telesDados = [];

      if (telesRes.ok) {
        try {
          telesDados = await telesRes.json();
        } catch {
          telesDados = [];
        }
      }

      setUsuario(usuarioDados.usuario);
      setTeles(Array.isArray(telesDados) ? telesDados : []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setCarregando(false);
    }
  }

  async function atualizarStatus(id: string, status: string) {
    await fetch("/api/motoboys/atualizar-tele", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });

    await carregarDados();
  }

  useEffect(() => {
    carregarDados();
  }, []);

  if (carregando) {
    return (
      <main className="min-h-screen bg-[#f7f8fb] flex items-center justify-center">
        <p className="text-slate-500">Carregando...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f8fb] p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold">
          Olá, {usuario?.nome || "Motoboy"} 👋
        </h1>

        <p className="text-slate-500 mt-2">
          Aqui estão suas entregas e coletas.
        </p>

        <div className="bg-white rounded-3xl p-6 mt-8 shadow-sm border">
          <h2 className="text-2xl font-bold mb-6">Minhas teles</h2>

          {teles.length === 0 ? (
            <p className="text-slate-500">Você não possui teles atribuídas.</p>
          ) : (
            <div className="space-y-4">
              {teles.map((tele) => {
                const parada = tele.paradas?.[0];

                return (
                  <div key={tele.id} className="border rounded-2xl p-5">
                    <div className="flex justify-between gap-4">
                      <div>
                        <h3 className="font-bold text-lg">{tele.solicitante}</h3>
                        <p className="text-slate-600">{parada?.cliente}</p>
                        <p className="text-sm text-slate-500">{parada?.endereco}</p>
                      </div>

                      <div className="text-right">
                        <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm">
                          {formatarStatus(tele.status)}
                        </span>

                        <p className="font-bold text-lg mt-3">
                          R$ {Number(tele.total).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                      <button
                        onClick={() => atualizarStatus(tele.id, "Em rota")}
                        className="bg-emerald-600 text-white px-4 py-2 rounded-xl"
                      >
                        Iniciar
                      </button>

                      <button
                        onClick={() => atualizarStatus(tele.id, "Entregue")}
                        className="bg-green-700 text-white px-4 py-2 rounded-xl"
                      >
                        Entregue
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function formatarStatus(status: string) {
  const mapa: any = {
    AGUARDANDO_CLIENTE: "Aguardando cliente",
    AGUARDANDO_MOTOBOY: "Aguardando motoboy",
    EM_ROTA: "Em rota",
    ENTREGUE: "Entregue",
  };

  return mapa[status] || status;
}