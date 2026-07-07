"use client";

import { useMemo, useState } from "react";
import { useExpressManager } from "@/context/ExpressManagerContext";

type AbaRecebimento = "pendentes" | "escritorio" | "motoboy" | "semanal" | "todos";

export default function RecebimentosFinanceiro() {
  const { teles, setTeles } = useExpressManager();

  const [aba, setAba] = useState<AbaRecebimento>("pendentes");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  function converterValor(valor: any) {
    return Number(String(valor || "0").replace(",", "."));
  }

  function dataDaTele(criadoEm: string) {
    return criadoEm.split(",")[0];
  }

  function dataParaComparar(dataBR: string) {
    const [dia, mes, ano] = dataBR.split("/");
    return `${ano}-${mes}-${dia}`;
  }

  function nomeDestino(tele: any) {
    if (tele.paradas?.length > 0) {
      const paradaPrincipal =
        tele.paradas.find((parada: any) => parada.cliente !== tele.solicitante) ||
        tele.paradas[0];

      return paradaPrincipal.cliente || paradaPrincipal.nomeCliente || tele.nomeCliente;
    }

    return tele.nomeCliente;
  }

  const telesPeriodo = useMemo(() => {
    return teles.filter((tele: any) => {
      const dataTele = dataParaComparar(dataDaTele(tele.criadoEm));

      if (dataInicio && dataTele < dataInicio) return false;
      if (dataFim && dataTele > dataFim) return false;

      return true;
    });
  }, [teles, dataInicio, dataFim]);

  const listaAtual = useMemo(() => {
    if (aba === "pendentes") {
      return telesPeriodo.filter((tele: any) => (tele.recebimento || "pendente") === "pendente");
    }

    if (aba === "escritorio") {
      return telesPeriodo.filter((tele: any) => tele.recebimento === "escritorio");
    }

    if (aba === "motoboy") {
      return telesPeriodo.filter((tele: any) => tele.recebimento === "motoboy");
    }

    if (aba === "semanal") {
      return telesPeriodo.filter((tele: any) => tele.formaCobranca === "semanal");
    }

    return telesPeriodo;
  }, [aba, telesPeriodo]);

  async function alterarRecebimento(id: string, recebimento: string) {
    const tele = teles.find((item: any) => item.id === id);
    if (!tele) return;

    const resposta = await fetch("/api/teles/recebimento", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: tele.id,
        valor: tele.valor,
        recebimento,
        motoboy: tele.motoboy,
      }),
    });

    if (!resposta.ok) {
      alert("Erro ao salvar recebimento.");
      return;
    }

    setTeles(
      teles.map((item: any) =>
        item.id === id
          ? {
              ...item,
              recebimento,
              recebido: recebimento !== "pendente",
              valorRecebido: recebimento === "pendente" ? 0 : converterValor(tele.valor),
              dataRecebimento: recebimento === "pendente" ? null : new Date().toISOString(),
              motoboyRecebedor: recebimento === "motoboy" ? tele.motoboy || null : null,
            }
          : item
      )
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8 bg-white rounded-3xl p-6 shadow-sm border border-slate-100 max-w-3xl">
        <div>
          <label className="text-sm font-medium text-slate-600">Data inicial</label>
          <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="w-full mt-2 h-12 rounded-xl border border-slate-200 px-4 outline-none focus:border-emerald-500" />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-600">Data final</label>
          <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="w-full mt-2 h-12 rounded-xl border border-slate-200 px-4 outline-none focus:border-emerald-500" />
        </div>
      </div>

      <div className="flex gap-3 mb-8 flex-wrap">
        <Tab ativo={aba === "pendentes"} onClick={() => setAba("pendentes")}>Pendentes</Tab>
        <Tab ativo={aba === "escritorio"} onClick={() => setAba("escritorio")}>Recebido escritório</Tab>
        <Tab ativo={aba === "motoboy"} onClick={() => setAba("motoboy")}>Recebido motoboy</Tab>
        <Tab ativo={aba === "semanal"} onClick={() => setAba("semanal")}>Fechamento semanal</Tab>
        <Tab ativo={aba === "todos"} onClick={() => setAba("todos")}>Todos</Tab>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {listaAtual.map((tele: any) => (
          <div key={tele.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-xl font-bold">{tele.solicitante}</h2>
                <p className="text-sm text-slate-500">{tele.tipoRota}</p>
                <p className="text-xs text-slate-400">{tele.criadoEm}</p>
              </div>

              <StatusPagamento status={tele.recebimento || "pendente"} />
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 mb-5">
              <div className="flex justify-between text-lg font-bold text-emerald-700">
                <span>Total</span>
                <span>R$ {tele.valor}</span>
              </div>
            </div>

            <div className="text-sm text-slate-600 mb-5 space-y-1">
              <p>Destino: {nomeDestino(tele)}</p>
              <p>Motoboy: {tele.motoboy || "Não definido"}</p>
              <p>Status operação: {tele.status}</p>
              <p>Cobrança: {tele.formaCobranca || "semanal"}</p>
            </div>

            <label className="text-sm font-medium text-slate-600">Situação do pagamento</label>

            <select
              value={tele.recebimento || "pendente"}
              onChange={(e) => alterarRecebimento(tele.id, e.target.value)}
              className="w-full mt-2 h-12 rounded-xl border border-slate-200 px-4 outline-none focus:border-emerald-500"
            >
              <option value="pendente">Pendente</option>
              <option value="escritorio">Recebido pelo escritório</option>
              <option value="motoboy">Recebido pelo motoboy</option>
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

function Tab({ ativo, onClick, children }: any) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-4 rounded-2xl shadow-sm ${
        ativo ? "bg-emerald-600 text-white" : "bg-white text-slate-700"
      }`}
    >
      {children}
    </button>
  );
}

function StatusPagamento({ status }: { status: string }) {
  const mapa: any = {
    pendente: "bg-orange-100 text-orange-700",
    escritorio: "bg-emerald-100 text-emerald-700",
    motoboy: "bg-blue-100 text-blue-700",
  };

  const texto: any = {
    pendente: "Pendente",
    escritorio: "Escritório",
    motoboy: "Motoboy",
  };

  return <span className={`px-3 py-2 rounded-xl text-sm ${mapa[status]}`}>{texto[status]}</span>;
}