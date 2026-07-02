"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle, MapPin, Phone, MessageCircle, Truck } from "lucide-react";

export default function MotoboyPage() {
  const [usuario, setUsuario] = useState<any>(null);
  const [teles, setTeles] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  async function carregarDados() {
    const usuarioRes = await fetch("/api/auth/me");
    const usuarioDados = await usuarioRes.json();

    const telesRes = await fetch("/api/motoboys/minhas-teles");
    const telesDados = await telesRes.json();

    setUsuario(usuarioDados.usuario);
    setTeles(Array.isArray(telesDados) ? telesDados : []);
    setCarregando(false);
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

  const telesPendentes = useMemo(() => {
    return teles.filter((tele) => tele.status !== "ENTREGUE");
  }, [teles]);

  const proximaTele = telesPendentes[0];
  const primeiraParada = proximaTele?.paradas?.[0];

  const totalHoje = teles.reduce((total, tele) => {
    return total + Number(tele.total || 0);
  }, 0);

  if (carregando) {
    return (
      <main className="min-h-screen bg-[#f7f8fb] flex items-center justify-center">
        <p className="text-slate-500">Carregando...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f8fb] p-5 text-slate-900">
      <div className="max-w-md mx-auto">
        <header className="mb-6">
          <p className="text-slate-500">Painel do motoboy</p>
          <h1 className="text-3xl font-bold">
            Olá, {usuario?.nome || "Motoboy"} 👋
          </h1>
        </header>

        <section className="grid grid-cols-3 gap-3 mb-5">
          <Resumo titulo="Teles" valor={teles.length} />
          <Resumo titulo="Pendentes" valor={telesPendentes.length} />
          <Resumo titulo="Total" valor={`R$ ${totalHoje.toFixed(2)}`} />
        </section>

        {proximaTele ? (
          <section className="bg-white rounded-[28px] p-6 shadow-sm border mb-5">
            <div className="flex items-center gap-2 text-emerald-700 font-semibold mb-4">
              <Truck size={20} />
              Próxima tele
            </div>

            <h2 className="text-2xl font-bold">{proximaTele.solicitante}</h2>

            <p className="text-slate-500 mt-1">
              {primeiraParada?.cliente || "Sem cliente informado"}
            </p>

            <div className="mt-5 space-y-3">
              <Info icon={<MapPin size={18} />} texto={primeiraParada?.endereco} />
              <Info icon={<Phone size={18} />} texto={primeiraParada?.contato || "Sem telefone"} />
            </div>

            <div className="flex items-center justify-between mt-6">
              <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-sm">
                {formatarStatus(proximaTele.status)}
              </span>

              <strong className="text-2xl">
                R$ {Number(proximaTele.total).toFixed(2)}
              </strong>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-6">
              <a
                href={criarLinkMaps(primeiraParada?.endereco)}
                target="_blank"
                className="h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center gap-2 font-semibold"
              >
                <MapPin size={18} />
                Rota
              </a>

              <a
                href={criarLinkWhatsApp(primeiraParada?.contato)}
                target="_blank"
                className="h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center gap-2 font-semibold"
              >
                <MessageCircle size={18} />
                WhatsApp
              </a>

              <button
                onClick={() => atualizarStatus(proximaTele.id, "Em rota")}
                className="h-12 rounded-2xl bg-slate-900 text-white font-semibold"
              >
                Iniciar
              </button>

              <button
                onClick={() => atualizarStatus(proximaTele.id, "Entregue")}
                className="h-12 rounded-2xl bg-green-700 text-white flex items-center justify-center gap-2 font-semibold"
              >
                <CheckCircle size={18} />
                Finalizar
              </button>
            </div>
          </section>
        ) : (
          <section className="bg-white rounded-[28px] p-6 shadow-sm border mb-5 text-center">
            <h2 className="text-2xl font-bold">Tudo certo por aqui ✅</h2>
            <p className="text-slate-500 mt-2">
              Você não possui teles pendentes.
            </p>
          </section>
        )}

        <section className="bg-white rounded-[28px] p-5 shadow-sm border">
          <h2 className="text-xl font-bold mb-4">Próximas da fila</h2>

          {telesPendentes.slice(1).length === 0 ? (
            <p className="text-slate-500 text-sm">
              Nenhuma outra tele pendente.
            </p>
          ) : (
            <div className="space-y-3">
              {telesPendentes.slice(1).map((tele) => {
                const parada = tele.paradas?.[0];

                return (
                  <div key={tele.id} className="border rounded-2xl p-4">
                    <strong>{tele.solicitante}</strong>
                    <p className="text-sm text-slate-500">
                      {parada?.cliente}
                    </p>
                    <p className="text-sm text-slate-500">
                      {parada?.endereco}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function Resumo({ titulo, valor }: any) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border">
      <p className="text-xs text-slate-500">{titulo}</p>
      <strong className="text-lg">{valor}</strong>
    </div>
  );
}

function Info({ icon, texto }: any) {
  return (
    <div className="flex gap-2 text-slate-600">
      <span className="text-slate-400">{icon}</span>
      <span>{texto || "Não informado"}</span>
    </div>
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

function criarLinkMaps(endereco?: string) {
  if (!endereco) return "#";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco)}`;
}

function criarLinkWhatsApp(telefone?: string) {
  if (!telefone) return "#";

  const numero = telefone.replace(/\D/g, "");
  return `https://wa.me/55${numero}`;
}