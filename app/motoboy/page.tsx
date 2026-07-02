"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

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

  useEffect(() => {
    carregarDados();
  }, []);

  const telesHoje = useMemo(() => {
    const hoje = new Date();

    return teles.filter((tele) =>
      mesmaData(new Date(tele.dataTele), hoje)
    );
  }, [teles]);

  const entregasAndamento = telesHoje.filter(
    (tele) => tele.status !== "ENTREGUE"
  );

  const entregasConcluidas = telesHoje.filter(
    (tele) => tele.status === "ENTREGUE"
  );

  const financeiro = useMemo(() => {
    return calcularValores(telesHoje);
  }, [telesHoje]);

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
        <h1 className="text-3xl font-bold">
          Olá, {usuario?.nome || "Motoboy"} 👋
        </h1>

        <p className="text-slate-500 mt-2">
          Resumo das suas entregas de hoje.
        </p>

        <div className="mt-5">
          <Link
            href="/motoboy/extrato"
            className="block w-full bg-slate-900 text-white text-center py-4 rounded-2xl font-semibold hover:bg-slate-800 transition"
          >
            📄 Ver extrato detalhado
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <CardFinanceiro titulo="Hoje" dados={financeiro} />
        </div>

        <section className="bg-white rounded-3xl p-6 mt-8 shadow-sm border">
          <h2 className="text-2xl font-bold mb-4">
            Entregas em andamento hoje
          </h2>

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
          <h2 className="text-2xl font-bold mb-4">
            Entregas concluídas hoje
          </h2>

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

function CardFinanceiro({ titulo, dados }: any) {
  return (
    <div className="bg-white rounded-3xl p-5 border shadow-sm">
      <p className="text-sm text-slate-500 mt-2">
  Líquido:
  <strong className="text-emerald-700">
    R$ {dados.liquido.toFixed(2)}
  </strong>
</p>

<p className="text-sm text-slate-500">
  Já recebeu:
  <strong className="text-blue-600">
    R$ {dados.recebido.toFixed(2)}
  </strong>
</p>

<p className="text-sm text-slate-500">
  A receber:
  <strong className="text-orange-600">
    R$ {dados.aReceber.toFixed(2)}
  </strong>
</p>
    </div>
  );
}

function CardTele({ tele, concluida = false }: any) {
  const parada = tele.paradas?.[0];

  return (
    <div className="border rounded-2xl p-4">
      <div className="flex justify-between gap-4">
        <div>
          <strong>{tele.solicitante}</strong>
          <p className="text-slate-600">{parada?.cliente}</p>
          <p className="text-sm text-slate-500">{parada?.endereco}</p>
        </div>

        <div className="text-right">
          <span
            className={`px-3 py-1 rounded-full text-sm ${
              concluida
                ? "bg-green-100 text-green-700"
                : "bg-orange-100 text-orange-700"
            }`}
          >
            {formatarStatus(tele.status)}
          </span>

          <p className="font-bold mt-3">
            R$ {Number(tele.total || 0).toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
}

function calcularValores(teles: any[]) {
  const bruto = teles.reduce(
    (total, tele) => total + Number(tele.total || 0),
    0
  );

  const valorMotoboy = bruto * 0.8;

  const jaRecebeu = teles
    .filter((tele) => tele.recebimento === "motoboy")
    .reduce((total, tele) => total + Number(tele.total || 0), 0);

  return {
    bruto,
    liquido: valorMotoboy,
    recebido: jaRecebeu,
    aReceber: valorMotoboy - jaRecebeu,
    quantidade: teles.length,
  };
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