"use client";

import ExtratoFinanceiro from "@/components/financeiro/ExtratoFinanceiro";
import FechamentosFinanceiro from "@/components/financeiro/FechamentosFinanceiro";
import FinanceiroMotoboys from "@/components/financeiro/FinanceiroMotoboys";
import RecebimentosFinanceiro from "@/components/financeiro/RecebimentosFinanceiro";
import ResumoFinanceiro from "@/components/financeiro/ResumoFinanceiro";
import PageContainer from "@/components/ui/PageContainer";
import PageHeader from "@/components/ui/PageHeader";
import { BarChart3, Bike, DollarSign, FileText, ReceiptText, Upload } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

type AbaFinanceiro = "resumo" | "recebimentos" | "fechamentos" | "extrato" | "motoboys";

type ModuloFinanceiro = {
  id: AbaFinanceiro;
  titulo: string;
  descricao: string;
  icon: React.ReactNode;
};

const MODULOS: ModuloFinanceiro[] = [
  {
    id: "resumo",
    titulo: "Resumo",
    descricao: "Visão geral financeira",
    icon: <BarChart3 size={22} />,
  },
  {
    id: "recebimentos",
    titulo: "Recebimentos",
    descricao: "Pendentes, parciais e pagos",
    icon: <DollarSign size={22} />,
  },
  {
    id: "fechamentos",
    titulo: "Fechamentos",
    descricao: "Fechamento de clientes",
    icon: <ReceiptText size={22} />,
  },
  {
    id: "extrato",
    titulo: "Extratos",
    descricao: "Consultas e relatórios",
    icon: <FileText size={22} />,
  },
  {
    id: "motoboys",
    titulo: "Motoboys",
    descricao: "Acertos e pagamentos",
    icon: <Bike size={22} />,
  },
];

export default function FinanceiroPage() {
  const [aba, setAba] = useState<AbaFinanceiro>("resumo");

  const moduloAtual = MODULOS.find((modulo) => modulo.id === aba) || MODULOS[0];

  return (
    <PageContainer>
      <PageHeader titulo="Financeiro" descricao="Central financeira completa do Express Manager." />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-6">
        {MODULOS.map((modulo) => (
          <ModuloButton
            key={modulo.id}
            ativo={aba === modulo.id}
            onClick={() => setAba(modulo.id)}
            icon={modulo.icon}
            titulo={modulo.titulo}
            descricao={modulo.descricao}
          />
        ))}

        <Link href="/financeiro/importar-historico" className="block">
          <div className="h-full rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50">
            <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <Upload size={22} />
            </div>

            <h2 className="text-lg font-bold text-slate-900">Importar histórico</h2>

            <p className="mt-1 text-sm text-slate-500">Planilhas antigas</p>
          </div>
        </Link>
      </div>

      <div className="mb-6 rounded-3xl border border-slate-100 bg-white px-5 py-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            {moduloAtual.icon}
          </div>

          <div>
            <h2 className="font-bold text-slate-900">{moduloAtual.titulo}</h2>

            <p className="text-sm text-slate-500">{moduloAtual.descricao}</p>
          </div>
        </div>
      </div>

      {aba === "resumo" && <ResumoFinanceiro />}
      {aba === "recebimentos" && <RecebimentosFinanceiro />}
      {aba === "fechamentos" && <FechamentosFinanceiro />}
      {aba === "extrato" && <ExtratoFinanceiro />}
      {aba === "motoboys" && <FinanceiroMotoboys />}
    </PageContainer>
  );
}

type ModuloButtonProps = {
  ativo: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  titulo: string;
  descricao: string;
};

function ModuloButton({ ativo, onClick, icon, titulo, descricao }: ModuloButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={`h-full rounded-3xl border p-5 text-left shadow-sm transition ${
        ativo
          ? "border-emerald-600 bg-emerald-600 text-white"
          : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50"
      }`}
    >
      <div
        className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${
          ativo ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-700"
        }`}
      >
        {icon}
      </div>

      <h2 className="text-lg font-bold">{titulo}</h2>

      <p className={`mt-1 text-sm ${ativo ? "text-white/80" : "text-slate-500"}`}>{descricao}</p>
    </button>
  );
}
