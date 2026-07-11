"use client";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function MotoboyPage() {
  const [usuario, setUsuario] = useState<any>(null);
  const META_TROCA_OLEO = 1500;
  const [teles, setTeles] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  async function sair() {
    await fetch("/api/auth/logout", {
      method: "POST",
    });

    window.location.href = "/login";
  }

  async function carregarDados() {
    const usuarioRes = await fetch("/api/auth/me");
    const usuarioDados = await usuarioRes.json();

    const telesRes = await fetch("/api/motoboys/minhas-teles");
    const telesDados = await telesRes.json();

    setUsuario(usuarioDados.usuario);
    setTeles(Array.isArray(telesDados) ? telesDados : []);
    setCarregando(false);
  }

  useEffect(() => {
    let ativo = true;

    async function carregarInicial() {
      try {
        const usuarioRes = await fetch("/api/auth/me");
        const usuarioDados = await usuarioRes.json();

        const telesRes = await fetch("/api/motoboys/minhas-teles");
        const telesDados = await telesRes.json();

        if (!ativo) return;

        setUsuario(usuarioDados.usuario);
        setTeles(Array.isArray(telesDados) ? telesDados : []);
        setCarregando(false);
      } catch (error) {
        console.error(error);

        if (ativo) {
          setCarregando(false);
        }
      }
    }

    void carregarInicial();

    return () => {
      ativo = false;
    };
  }, []);

  const telesHoje = useMemo(() => {
    const hoje = new Date();

    return teles.filter((tele) => mesmaData(new Date(tele.dataTele), hoje));
  }, [teles]);

  const telesSemana = useMemo(() => {
    const hoje = new Date();

    const inicioSemana = new Date(hoje);
    inicioSemana.setDate(hoje.getDate() - hoje.getDay());
    inicioSemana.setHours(0, 0, 0, 0);

    const fimSemana = new Date(inicioSemana);
    fimSemana.setDate(inicioSemana.getDate() + 6);
    fimSemana.setHours(23, 59, 59, 999);

    return teles.filter((tele) => {
      const dataTele = new Date(tele.dataTele);
      return dataTele >= inicioSemana && dataTele <= fimSemana;
    });
  }, [teles]);

  const brutoSemana = telesSemana.reduce((total, tele) => total + Number(tele.total || 0), 0);

  const progressoMeta = Math.min((brutoSemana / META_TROCA_OLEO) * 100, 100);

  const ganhouTrocaOleo = brutoSemana >= META_TROCA_OLEO;

  const entregasAndamento = telesHoje.filter((tele) => tele.status !== "ENTREGUE");

  const entregasConcluidas = telesHoje.filter((tele) => tele.status === "ENTREGUE");

  if (carregando) {
    return (
      <main className="min-h-screen bg-[#f7f8fb] flex items-center justify-center">
        <p className="text-slate-500">Carregando...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f8fb] p-5">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold">Olá, {usuario?.nome || "Motoboy"} 👋</h1>

        <p className="text-slate-500 mt-2">Resumo das suas entregas de hoje.</p>

        <div className="mt-5">
          <Link
            href="/motoboy/extrato"
            className="block w-full bg-slate-900 text-white text-center py-4 rounded-2xl font-semibold hover:bg-slate-800 transition"
          >
            📄 Ver extrato detalhado
          </Link>
        </div>

        <div className="mt-4">
          <button
            onClick={sair}
            className="w-full border border-red-200 text-red-600 rounded-2xl py-3 font-semibold flex items-center justify-center gap-2 hover:bg-red-50 transition"
          >
            <LogOut size={18} />
            Sair
          </button>
        </div>

        <div
          className={`mt-6 rounded-3xl p-5 border shadow-sm ${
            ganhouTrocaOleo
              ? "bg-emerald-600 text-white border-emerald-600"
              : "bg-white border-slate-100"
          }`}
        >
          {ganhouTrocaOleo ? (
            <>
              <h2 className="text-2xl font-bold">🎉 Parabéns!</h2>
              <p className="mt-2">
                Você atingiu R$ {META_TROCA_OLEO.toFixed(2).replace(".", ",")} de bruto na semana.
              </p>
              <p className="font-bold mt-3">🏍️ Você ganhou uma troca de óleo grátis!</p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-bold">🎯 Meta da semana</h2>

              <p className="text-slate-500 mt-2">
                R$ {brutoSemana.toFixed(2).replace(".", ",")} / R${" "}
                {META_TROCA_OLEO.toFixed(2).replace(".", ",")}
              </p>

              <div className="w-full h-3 bg-slate-100 rounded-full mt-4 overflow-hidden">
                <div
                  className="h-3 bg-emerald-600 rounded-full"
                  style={{ width: `${progressoMeta}%` }}
                />
              </div>

              <p className="text-sm text-slate-500 mt-3">
                Faltam R$ {(META_TROCA_OLEO - brutoSemana).toFixed(2).replace(".", ",")} para ganhar
                uma troca de óleo grátis.
              </p>
            </>
          )}
        </div>

        <section className="bg-white rounded-3xl p-5 md:p-6 mt-8 shadow-sm border">
          <h2 className="text-2xl font-bold mb-4">Entregas em andamento hoje</h2>

          {entregasAndamento.length === 0 ? (
            <p className="text-slate-500">Nenhuma entrega em andamento hoje.</p>
          ) : (
            <div className="space-y-4">
              {entregasAndamento.map((tele) => (
                <CardTele key={tele.id} tele={tele} />
              ))}
            </div>
          )}
        </section>

        <section className="bg-white rounded-3xl p-6 mt-8 shadow-sm border">
          <h2 className="text-2xl font-bold mb-4">Entregas concluídas hoje</h2>

          {entregasConcluidas.length === 0 ? (
            <p className="text-slate-500">Nenhuma entrega concluída hoje.</p>
          ) : (
            <div className="space-y-4">
              {entregasConcluidas.map((tele) => (
                <CardTele key={tele.id} tele={tele} concluida />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function CardTele({ tele, concluida = false }: any) {
  const parada = tele.paradas?.[0];

  return (
    <div className="border rounded-2xl p-4">
      <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
        <div>
          <strong>{tele.solicitante}</strong>
          <p className="text-slate-600">{parada?.cliente}</p>
          <p className="text-sm text-slate-500">{parada?.endereco}</p>
        </div>

        <div className="sm:text-right">
          <span
            className={`px-3 py-1 rounded-full text-sm ${
              concluida ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
            }`}
          >
            {formatarStatus(tele.status)}
          </span>

          <p className="font-bold mt-3">R$ {Number(tele.total || 0).toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}

function mesmaData(data1: Date, data2: Date) {
  return data1.toDateString() === data2.toDateString();
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
