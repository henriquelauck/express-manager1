"use client";

import { formatarValor } from "@/lib/services/tele.service";

type ResumoFinanceiroProps = {
  valorBase: number;
  retorno: number;
  espera: number;
  total: number;
  tipoRota: string;
};

export default function ResumoFinanceiro({
  valorBase,
  retorno,
  espera,
  total,
  tipoRota,
}: ResumoFinanceiroProps) {
  return (
    <div className="rounded-2xl bg-slate-50 p-5 md:col-span-2">
      <div className="mb-2 flex justify-between text-sm">
        <span>Valor base</span>
        <strong>R$ {formatarValor(valorBase)}</strong>
      </div>

      <div className="mb-2 flex justify-between text-sm">
        <span>Retorno</span>
        <strong>R$ {formatarValor(retorno)}</strong>
      </div>

      <div className="mb-4 flex justify-between text-sm">
        <span>Espera</span>
        <strong>R$ {formatarValor(espera)}</strong>
      </div>

      <div className="flex items-center justify-between border-t border-slate-200 pt-4">
        <span className="font-bold">Total</span>

        <h2 className="text-3xl font-bold text-emerald-700">R$ {formatarValor(total)}</h2>
      </div>

      <p className="mt-2 text-sm text-slate-500">Tipo: {tipoRota}</p>
    </div>
  );
}
