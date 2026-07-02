"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function ExtratoMotoboyPage() {
  const [teles, setTeles] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  useEffect(() => {
    async function carregar() {
      const resposta = await fetch("/api/motoboys/minhas-teles");
      const dados = await resposta.json();

      setTeles(Array.isArray(dados) ? dados : []);
      setCarregando(false);
    }

    carregar();
  }, []);

  function dataDaTele(tele: any) {
    if (tele.dataTele) {
      return new Date(tele.dataTele).toISOString().slice(0, 10);
    }

    if (tele.criadoEm) {
      const dataBR = tele.criadoEm.split(",")[0];
      const [dia, mes, ano] = dataBR.split("/");
      return `${ano}-${mes}-${dia}`;
    }

    return "";
  }

  const telesFiltradas = useMemo(() => {
    return teles.filter((tele: any) => {
      const dataTele = dataDaTele(tele);

      if (dataInicio && dataTele < dataInicio) return false;
      if (dataFim && dataTele > dataFim) return false;

      return true;
    });
  }, [teles, dataInicio, dataFim]);

  const bruto = telesFiltradas.reduce(
    (total, tele) => total + Number(tele.total || 0),
    0
  );

  const liquido = bruto * 0.8;

  const recebido = telesFiltradas
    .filter((tele) => String(tele.recebimento || "").toLowerCase() === "motoboy")
    .reduce((total, tele) => total + Number(tele.total || 0), 0);

  const aReceber = liquido - recebido;

  if (carregando) {
    return (
      <main className="min-h-screen bg-[#f7f8fb] flex items-center justify-center">
        Carregando...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f8fb] p-5">
      <div className="max-w-5xl mx-auto">
        <Link href="/motoboy" className="text-emerald-700 font-semibold">
          ← Voltar
        </Link>

        <h1 className="text-3xl font-bold mt-5">Extrato Detalhado</h1>

        <p className="text-slate-500 mt-2">
          Consulte suas entregas por período.
        </p>

        <div className="bg-white rounded-3xl border p-6 mt-6 shadow-sm">
          <h2 className="font-bold text-lg mb-4">Filtrar período</h2>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-500">Data inicial</label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full mt-2 border rounded-xl p-3"
              />
            </div>

            <div>
              <label className="text-sm text-slate-500">Data final</label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-full mt-2 border rounded-xl p-3"
              />
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-5 gap-4 mt-6">
          <Resumo titulo="Entregas" valor={telesFiltradas.length} />
          <Resumo titulo="Bruto" valor={`R$ ${bruto.toFixed(2)}`} />
          <Resumo titulo="Líquido" valor={`R$ ${liquido.toFixed(2)}`} />
          <Resumo titulo="Recebido" valor={`R$ ${recebido.toFixed(2)}`} />
          <Resumo titulo="A receber" valor={`R$ ${aReceber.toFixed(2)}`} />
        </div>

        <section className="bg-white rounded-3xl border mt-8 shadow-sm">
          <div className="p-6 border-b">
            <h2 className="font-bold text-xl">Entregas</h2>
          </div>

          {telesFiltradas.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              Nenhuma entrega encontrada.
            </div>
          ) : (
            telesFiltradas.map((tele) => {
              const parada = tele.paradas?.[0];

              return (
                <div key={tele.id} className="border-b last:border-b-0 p-5">
                  <div className="flex justify-between">
                    <div>
                      <strong>{tele.solicitante}</strong>

                      <p className="text-sm text-slate-500 mt-1">
                        {new Date(tele.dataTele).toLocaleDateString("pt-BR")}
                      </p>

                      <p className="mt-3">{parada?.cliente}</p>

                      <p className="text-sm text-slate-500">
                        {parada?.endereco}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="bg-slate-100 rounded-full px-3 py-1 text-sm">
                        {formatarStatus(tele.status)}
                      </span>

                      <p className="font-bold text-lg mt-4">
                        R$ {Number(tele.total).toFixed(2)}
                      </p>

                      <p className="text-emerald-700 font-semibold">
                        Líquido R$ {(Number(tele.total) * 0.8).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}

function Resumo({
  titulo,
  valor,
}: {
  titulo: string;
  valor: string | number;
}) {
  return (
    <div className="bg-white rounded-3xl border p-5 shadow-sm">
      <p className="text-slate-500">{titulo}</p>
      <h2 className="text-3xl font-bold mt-2">{valor}</h2>
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