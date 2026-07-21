"use client";

import { formatarValor } from "@/lib/services/tele.service";
import { BadgeDollarSign, Clock3, RefreshCw, Route, WalletCards } from "lucide-react";

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
  const possuiRetorno = retorno > 0;
  const possuiEspera = espera > 0;

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm md:col-span-2">
      <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/70 px-5 py-5 md:flex-row md:items-center md:justify-between md:px-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <WalletCards size={22} />
          </div>

          <div>
            <h3 className="text-lg font-bold text-slate-900">Resumo financeiro</h3>

            <p className="mt-1 text-sm text-slate-500">Confira os valores antes de criar a tele.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start rounded-full bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm md:self-auto">
          <Route size={16} className="text-emerald-600" />
          {tipoRota}
        </div>
      </div>

      <div className="space-y-1 p-5 md:p-6">
        <LinhaResumo
          icon={<BadgeDollarSign size={18} />}
          titulo="Valor base"
          descricao="Valor principal da rota"
          valor={valorBase}
        />

        <LinhaResumo
          icon={<RefreshCw size={18} />}
          titulo="Retorno"
          descricao={
            possuiRetorno ? "Acréscimo automático da operação" : "Nenhum retorno adicionado"
          }
          valor={retorno}
          destaque={possuiRetorno}
        />

        <LinhaResumo
          icon={<Clock3 size={18} />}
          titulo="Espera"
          descricao={possuiEspera ? "Tempo de espera acrescentado" : "Nenhum tempo de espera"}
          valor={espera}
          destaque={possuiEspera}
        />

        <div className="mt-5 rounded-2xl bg-slate-900 p-5 text-white">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-300">Total da tele</p>

              <p className="mt-1 text-sm text-slate-400">Valor final que será salvo.</p>
            </div>

            <h2 className="text-3xl font-bold tracking-tight text-emerald-400">
              R$ {formatarValor(total)}
            </h2>
          </div>
        </div>
      </div>
    </div>
  );
}

type LinhaResumoProps = {
  icon: React.ReactNode;
  titulo: string;
  descricao: string;
  valor: number;
  destaque?: boolean;
};

function LinhaResumo({ icon, titulo, descricao, valor, destaque = false }: LinhaResumoProps) {
  return (
    <div className="flex items-center gap-4 rounded-2xl px-3 py-4 transition hover:bg-slate-50">
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
          destaque ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
        }`}
      >
        {icon}
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-medium text-slate-800">{titulo}</p>
        <p className="mt-0.5 text-xs text-slate-500">{descricao}</p>
      </div>

      <strong className={destaque ? "text-emerald-700" : "text-slate-900"}>
        R$ {formatarValor(valor)}
      </strong>
    </div>
  );
}
