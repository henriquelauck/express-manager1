"use client";

import PageContainer from "@/components/ui/PageContainer";
import PageHeader from "@/components/ui/PageHeader";
import { useExpressManager } from "@/context/ExpressManagerContext";
import { avaliarMotoboys } from "@/core/distribuicao";
import { Bike, CheckCircle, Clock } from "lucide-react";

export default function DiagnosticoCorePage() {
  const { motoboys, teles } = useExpressManager();

  const ranking = avaliarMotoboys(motoboys, teles);
  const melhorMotoboy = ranking[0] || null;

  return (
    <PageContainer>
      <div className="mb-8">
        <PageHeader
          titulo="Diagnóstico do Core"
          descricao="Validação interna das regras de distribuição."
        />
      </div>

      {melhorMotoboy && (
        <div className="mb-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <CheckCircle size={24} />
            </div>

            <div>
              <p className="text-sm text-emerald-700">Motoboy sugerido pelo Core</p>

              <h2 className="text-2xl font-bold text-emerald-900">{melhorMotoboy.motoboy.nome}</h2>

              <p className="text-sm text-emerald-700">
                {melhorMotoboy.quantidadeTelesAtivas} tele(s) ativa(s)
              </p>
            </div>
          </div>
        </div>
      )}

      {ranking.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center">
          <p className="text-slate-500">Nenhum motoboy cadastrado para avaliar.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {ranking.map((item, index) => (
            <div
              key={item.motoboy.id}
              className="flex items-center justify-between rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-700">
                  {index + 1}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <Bike size={18} className="text-emerald-600" />

                    <h3 className="text-lg font-bold">{item.motoboy.nome}</h3>
                  </div>

                  <p className="mt-1 text-sm text-slate-500">
                    {item.motoboy.moto || "Moto não informada"}
                    {item.motoboy.placa ? ` • ${item.motoboy.placa}` : ""}
                  </p>

                  <p className="mt-1 text-sm font-semibold text-emerald-600">Score: {item.score}</p>
                </div>
              </div>

              <div className="text-right">
                <div className="flex items-center justify-end gap-2 text-slate-500">
                  <Clock size={17} />

                  <span className="text-sm">Teles ativas</span>
                </div>

                <strong className="mt-1 block text-2xl text-slate-900">
                  {item.quantidadeTelesAtivas}
                </strong>

                <p className="mt-1 text-sm font-semibold text-emerald-600">Score: {item.score}</p>

                <div className="mt-3 space-y-1">
                  {item.motivos.map((motivo, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between text-xs text-slate-500"
                    >
                      <span>{motivo.descricao}</span>

                      <strong className={motivo.pontos >= 0 ? "text-emerald-600" : "text-red-500"}>
                        {motivo.pontos > 0 ? "+" : ""}
                        {motivo.pontos}
                      </strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
