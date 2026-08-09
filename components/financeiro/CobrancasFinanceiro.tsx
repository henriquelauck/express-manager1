"use client";

import FechamentosFinanceiro from "@/components/financeiro/FechamentosFinanceiro";
import RecebimentosFinanceiro from "@/components/financeiro/RecebimentosFinanceiro";
import { ReceiptText, WalletCards } from "lucide-react";
import { useState } from "react";

type ModoCobranca = "teles" | "clientes";

export default function CobrancasFinanceiro() {
  const [modo, setModo] = useState<ModoCobranca>("teles");

  return (
    <div>
      <div className="mb-6 rounded-3xl border border-slate-100 bg-white p-3 shadow-sm">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setModo("teles")}
            className={`flex items-center gap-3 rounded-2xl border px-4 py-4 text-left transition ${
              modo === "teles"
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50"
            }`}
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                modo === "teles" ? "bg-white/20" : "bg-emerald-100 text-emerald-700"
              }`}
            >
              <WalletCards size={20} />
            </div>

            <div>
              <strong className="block">Cobranças por tele</strong>
              <span className={`mt-1 block text-xs ${modo === "teles" ? "text-white/80" : "text-slate-500"}`}>
                Pendentes, parciais e pagamentos individuais
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setModo("clientes")}
            className={`flex items-center gap-3 rounded-2xl border px-4 py-4 text-left transition ${
              modo === "clientes"
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50"
            }`}
          >
            <div
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                modo === "clientes" ? "bg-white/20" : "bg-emerald-100 text-emerald-700"
              }`}
            >
              <ReceiptText size={20} />
            </div>

            <div>
              <strong className="block">Fechamento por cliente</strong>
              <span className={`mt-1 block text-xs ${modo === "clientes" ? "text-white/80" : "text-slate-500"}`}>
                Clientes semanais e demais cobranças periódicas
              </span>
            </div>
          </button>
        </div>
      </div>

      {modo === "teles" ? <RecebimentosFinanceiro /> : <FechamentosFinanceiro />}
    </div>
  );
}
