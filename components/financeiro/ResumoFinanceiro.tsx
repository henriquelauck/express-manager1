"use client";

import { useMemo } from "react";
import { Bike, Building2, CheckCircle, Clock, DollarSign, FileText } from "lucide-react";
import { useExpressManager } from "@/context/ExpressManagerContext";

export default function ResumoFinanceiro() {
  const { teles } = useExpressManager();

  function converterValor(valor: any) {
    return Number(String(valor || "0").replace(",", "."));
  }

  function formatarValor(valor: number) {
    return valor.toFixed(2).replace(".", ",");
  }

  const dados = useMemo(() => {
    const pendentes = teles.filter((tele: any) => (tele.recebimento || "pendente") === "pendente");
    const escritorio = teles.filter((tele: any) => tele.recebimento === "escritorio");
    const motoboy = teles.filter((tele: any) => tele.recebimento === "motoboy");

    const totalGeral = teles.reduce((soma: number, tele: any) => soma + converterValor(tele.valor), 0);
    const totalPendente = pendentes.reduce((soma: number, tele: any) => soma + converterValor(tele.valor), 0);
    const totalEscritorio = escritorio.reduce((soma: number, tele: any) => soma + converterValor(tele.valor), 0);
    const totalMotoboy = motoboy.reduce((soma: number, tele: any) => soma + converterValor(tele.valor), 0);

    return {
      totalGeral,
      totalPendente,
      totalEscritorio,
      totalMotoboy,
      ticketMedio: teles.length > 0 ? totalGeral / teles.length : 0,
      quantidade: teles.length,
    };
  }, [teles]);

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
        <Card titulo="Faturamento total" valor={`R$ ${formatarValor(dados.totalGeral)}`} icon={<DollarSign size={26} />} />
        <Card titulo="A receber" valor={`R$ ${formatarValor(dados.totalPendente)}`} icon={<Clock size={26} />} />
        <Card titulo="Recebido escritório" valor={`R$ ${formatarValor(dados.totalEscritorio)}`} icon={<Building2 size={26} />} />
        <Card titulo="Em mãos motoboys" valor={`R$ ${formatarValor(dados.totalMotoboy)}`} icon={<Bike size={26} />} />
        <Card titulo="Ticket médio" valor={`R$ ${formatarValor(dados.ticketMedio)}`} icon={<FileText size={26} />} />
        <Card titulo="Total de teles" valor={`${dados.quantidade}`} icon={<CheckCircle size={26} />} />
      </div>
    </div>
  );
}

function Card({ titulo, valor, icon }: any) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
      <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-5">
        {icon}
      </div>
      <p className="text-sm text-slate-500">{titulo}</p>
      <h2 className="text-3xl font-bold mt-2">{valor}</h2>
    </div>
  );
}