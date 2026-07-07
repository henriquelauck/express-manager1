"use client";

import { useState } from "react";
import PageContainer from "@/components/ui/PageContainer";
import PageHeader from "@/components/ui/PageHeader";
import {
  BarChart3,
  DollarSign,
  ReceiptText,
  FileText,
  Bike,
} from "lucide-react";

import ResumoFinanceiro from "@/components/financeiro/ResumoFinanceiro";
import RecebimentosFinanceiro from "@/components/financeiro/RecebimentosFinanceiro";
import FechamentosFinanceiro from "@/components/financeiro/FechamentosFinanceiro";
import ExtratoFinanceiro from "@/components/financeiro/ExtratoFinanceiro";
import FinanceiroMotoboys from "@/components/financeiro/FinanceiroMotoboys";

type AbaFinanceiro =
  | "resumo"
  | "recebimentos"
  | "fechamentos"
  | "extrato"
  | "motoboys";

export default function FinanceiroPage() {
  const [aba, setAba] = useState<AbaFinanceiro>("resumo");

  return (
    <PageContainer>
      <PageHeader
        titulo="Financeiro"
        descricao="Central financeira completa do Express Manager."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4 mb-8">
        <ModuloButton
          ativo={aba === "resumo"}
          onClick={() => setAba("resumo")}
          icon={<BarChart3 size={22} />}
          titulo="Resumo"
          descricao="Visão geral"
        />

        <ModuloButton
          ativo={aba === "recebimentos"}
          onClick={() => setAba("recebimentos")}
          icon={<DollarSign size={22} />}
          titulo="Recebimentos"
          descricao="Pendentes e pagos"
        />

        <ModuloButton
          ativo={aba === "fechamentos"}
          onClick={() => setAba("fechamentos")}
          icon={<ReceiptText size={22} />}
          titulo="Fechamentos"
          descricao="Fechar clientes"
        />

        <ModuloButton
          ativo={aba === "extrato"}
          onClick={() => setAba("extrato")}
          icon={<FileText size={22} />}
          titulo="Extratos"
          descricao="Relatórios"
        />

        <ModuloButton
          ativo={aba === "motoboys"}
          onClick={() => setAba("motoboys")}
          icon={<Bike size={22} />}
          titulo="Motoboys"
          descricao="Acertos"
        />
      </div>

      {aba === "resumo" && <ResumoFinanceiro />}
      {aba === "recebimentos" && <RecebimentosFinanceiro />}
      {aba === "fechamentos" && <FechamentosFinanceiro />}
      {aba === "extrato" && <ExtratoFinanceiro />}
      {aba === "motoboys" && <FinanceiroMotoboys />}
    </PageContainer>
  );
}

function ModuloButton({ ativo, onClick, icon, titulo, descricao }: any) {
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-3xl p-5 border shadow-sm transition ${
        ativo
          ? "bg-emerald-600 text-white border-emerald-600"
          : "bg-white text-slate-700 border-slate-100 hover:border-emerald-200 hover:bg-emerald-50"
      }`}
    >
      <div
        className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-4 ${
          ativo ? "bg-white/20" : "bg-emerald-100 text-emerald-700"
        }`}
      >
        {icon}
      </div>

      <h2 className="font-bold text-lg">{titulo}</h2>
      <p className={`text-sm mt-1 ${ativo ? "text-white/80" : "text-slate-500"}`}>
        {descricao}
      </p>
    </button>
  );
}