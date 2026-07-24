"use client";

import { useExpressManager } from "@/context/ExpressManagerContext";
import { Bike, Building2, CheckCircle2, CircleDollarSign, Clock3, FileText } from "lucide-react";
import { useMemo } from "react";

function converterValor(valor: unknown) {
  const numero = Number(String(valor || "0").replace(",", "."));
  return Number.isFinite(numero) ? numero : 0;
}

function formatarValor(valor: number) {
  return valor.toFixed(2).replace(".", ",");
}

function valorTotalTele(tele: any) {
  return converterValor(tele.total ?? tele.valor);
}

function valorRecebidoTele(tele: any) {
  const total = valorTotalTele(tele);
  const recebido = converterValor(tele.valorRecebido);

  return Math.max(0, Math.min(recebido, total));
}

function saldoTele(tele: any) {
  return Math.max(valorTotalTele(tele) - valorRecebidoTele(tele), 0);
}

export default function ResumoFinanceiro() {
  const { teles } = useExpressManager();

  const dados = useMemo(() => {
    return teles.reduce(
      (resumo: any, tele: any) => {
        const total = valorTotalTele(tele);
        const recebido = valorRecebidoTele(tele);
        const saldo = saldoTele(tele);
        const tipoRecebimento = String(tele.recebimento || "pendente").toLowerCase();

        resumo.totalGeral += total;
        resumo.totalRecebido += recebido;
        resumo.totalPendente += saldo;
        resumo.quantidade += 1;

        if (recebido > 0.009) {
          if (tipoRecebimento === "motoboy") {
            resumo.totalMotoboy += recebido;
          } else {
            resumo.totalEscritorio += recebido;
          }
        }

        if (saldo <= 0.009) {
          resumo.telesQuitadas += 1;
        } else if (recebido > 0.009) {
          resumo.telesParciais += 1;
        } else {
          resumo.telesPendentes += 1;
        }

        return resumo;
      },
      {
        totalGeral: 0,
        totalRecebido: 0,
        totalPendente: 0,
        totalEscritorio: 0,
        totalMotoboy: 0,
        quantidade: 0,
        telesQuitadas: 0,
        telesParciais: 0,
        telesPendentes: 0,
      }
    );
  }, [teles]);

  const ticketMedio = dados.quantidade > 0 ? dados.totalGeral / dados.quantidade : 0;

  return (
    <div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
        <Card
          titulo="Faturamento total"
          valor={`R$ ${formatarValor(dados.totalGeral)}`}
          descricao={`${dados.quantidade} teles no total`}
          icon={<CircleDollarSign size={25} />}
        />

        <Card
          titulo="A receber"
          valor={`R$ ${formatarValor(dados.totalPendente)}`}
          descricao={`${dados.telesPendentes} pendentes e ${dados.telesParciais} parciais`}
          icon={<Clock3 size={25} />}
          destaque={dados.totalPendente > 0}
        />

        <Card
          titulo="Recebido no escritório"
          valor={`R$ ${formatarValor(dados.totalEscritorio)}`}
          descricao="Valores efetivamente recebidos"
          icon={<Building2 size={25} />}
        />

        <Card
          titulo="Em mãos dos motoboys"
          valor={`R$ ${formatarValor(dados.totalMotoboy)}`}
          descricao="Valores recebidos direto dos clientes"
          icon={<Bike size={25} />}
        />

        <Card
          titulo="Total já recebido"
          valor={`R$ ${formatarValor(dados.totalRecebido)}`}
          descricao={`${dados.telesQuitadas} teles quitadas`}
          icon={<CheckCircle2 size={25} />}
        />

        <Card
          titulo="Ticket médio"
          valor={`R$ ${formatarValor(ticketMedio)}`}
          descricao="Média bruta por tele"
          icon={<FileText size={25} />}
        />
      </div>
    </div>
  );
}

type CardProps = {
  titulo: string;
  valor: string;
  descricao: string;
  icon: React.ReactNode;
  destaque?: boolean;
};

function Card({ titulo, valor, descricao, icon, destaque = false }: CardProps) {
  return (
    <div
      className={`rounded-3xl border bg-white p-6 shadow-sm ${
        destaque ? "border-orange-200" : "border-slate-100"
      }`}
    >
      <div
        className={`mb-5 flex h-13 w-13 items-center justify-center rounded-2xl ${
          destaque ? "bg-orange-100 text-orange-700" : "bg-emerald-100 text-emerald-700"
        }`}
      >
        {icon}
      </div>

      <p className="text-sm font-medium text-slate-500">{titulo}</p>

      <h2 className={`mt-2 text-3xl font-bold ${destaque ? "text-orange-600" : "text-slate-900"}`}>
        {valor}
      </h2>

      <p className="mt-2 text-xs leading-5 text-slate-400">{descricao}</p>
    </div>
  );
}
