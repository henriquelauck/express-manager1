"use client";

import { useMemo, useState } from "react";
import { Copy, DollarSign, FileText, Bike, Users } from "lucide-react";
import { useExpressManager } from "@/context/ExpressManagerContext";

export default function ExtratoGeralPage() {
  const { teles } = useExpressManager();

  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  function converterValor(valor: string) {
    return Number(valor.replace(",", "."));
  }

  function formatarValor(valor: number) {
    return valor.toFixed(2).replace(".", ",");
  }

  function dataDaTele(criadoEm: string) {
    return criadoEm.split(",")[0];
  }

  function dataParaComparar(dataBR: string) {
    const [dia, mes, ano] = dataBR.split("/");
    return `${ano}-${mes}-${dia}`;
  }

  const telesFiltradas = useMemo(() => {
    return teles.filter((tele) => {
      const dataTele = dataParaComparar(dataDaTele(tele.criadoEm));

      if (dataInicio && dataTele < dataInicio) return false;
      if (dataFim && dataTele > dataFim) return false;

      return true;
    });
  }, [teles, dataInicio, dataFim]);

  const total = telesFiltradas.reduce(
    (soma, tele) => soma + converterValor(tele.valor),
    0
  );

  const recebidoEscritorio = telesFiltradas
    .filter((tele: any) => tele.recebimento === "escritorio")
    .reduce((soma, tele) => soma + converterValor(tele.valor), 0);

  const recebidoMotoboy = telesFiltradas
    .filter((tele: any) => tele.recebimento === "motoboy")
    .reduce((soma, tele) => soma + converterValor(tele.valor), 0);

  const pendente = telesFiltradas
    .filter((tele: any) => !tele.recebimento || tele.recebimento === "pendente")
    .reduce((soma, tele) => soma + converterValor(tele.valor), 0);

  const resumoMotoboys = Object.values(
    telesFiltradas.reduce((acc: any, tele: any) => {
      const nome = tele.motoboy || "Sem motoboy";

      if (!acc[nome]) {
        acc[nome] = { nome, quantidade: 0, total: 0 };
      }

      acc[nome].quantidade += 1;
      acc[nome].total += converterValor(tele.valor);

      return acc;
    }, {})
  ) as any[];

  const resumoClientes = Object.values(
    telesFiltradas.reduce((acc: any, tele: any) => {
      const nome = tele.solicitante || "Sem cliente";

      if (!acc[nome]) {
        acc[nome] = { nome, quantidade: 0, total: 0 };
      }

      acc[nome].quantidade += 1;
      acc[nome].total += converterValor(tele.valor);

      return acc;
    }, {})
  ) as any[];

  const textoExtrato = useMemo(() => {
    let texto = `EXTRATO GERAL\n\n`;

    texto += `Teles realizadas: ${telesFiltradas.length}\n`;
    texto += `Faturamento total: R$${formatarValor(total)}\n`;
    texto += `Recebido escritório: R$${formatarValor(recebidoEscritorio)}\n`;
    texto += `Recebido motoboy: R$${formatarValor(recebidoMotoboy)}\n`;
    texto += `Pendente: R$${formatarValor(pendente)}\n\n`;

    texto += `POR MOTOBOY\n`;
    resumoMotoboys.forEach((item) => {
      texto += `- ${item.nome}: ${item.quantidade} teles - R$${formatarValor(
        item.total
      )}\n`;
    });

    texto += `\nPOR CLIENTE\n`;
    resumoClientes.forEach((item) => {
      texto += `- ${item.nome}: ${item.quantidade} teles - R$${formatarValor(
        item.total
      )}\n`;
    });

    return texto;
  }, [
    telesFiltradas,
    total,
    recebidoEscritorio,
    recebidoMotoboy,
    pendente,
    resumoMotoboys,
    resumoClientes,
  ]);

  function copiarExtrato() {
    navigator.clipboard.writeText(textoExtrato);
    alert("Extrato geral copiado!");
  }

  return (
    <main className="min-h-screen bg-[#f7f8fb] p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold">Extrato Geral</h1>
        <p className="text-slate-500 mt-2">
          Resumo geral da operação por período.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-5 mb-8 bg-white rounded-3xl p-8 shadow-sm border border-slate-100 max-w-4xl">
        <div>
          <label className="text-sm font-medium text-slate-600">
            Data inicial
          </label>
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="w-full mt-2 h-12 rounded-xl border border-slate-200 px-4 outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-600">
            Data final
          </label>
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="w-full mt-2 h-12 rounded-xl border border-slate-200 px-4 outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6 mb-8">
        <Card titulo="Teles" valor={`${telesFiltradas.length}`} icon={<FileText size={26} />} />
        <Card titulo="Faturamento" valor={`R$ ${formatarValor(total)}`} icon={<DollarSign size={26} />} />
        <Card titulo="Motoboy" valor={`R$ ${formatarValor(recebidoMotoboy)}`} icon={<Bike size={26} />} />
        <Card titulo="Pendente" valor={`R$ ${formatarValor(pendente)}`} icon={<Users size={26} />} />
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        <Resumo titulo="Por motoboy" itens={resumoMotoboys} formatarValor={formatarValor} />
        <Resumo titulo="Por cliente" itens={resumoClientes} formatarValor={formatarValor} />
      </div>

      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 max-w-5xl">
        <textarea
          value={textoExtrato}
          readOnly
          className="w-full h-96 rounded-2xl border border-slate-200 p-5 outline-none bg-slate-50"
        />

        <button
          onClick={copiarExtrato}
          className="h-12 px-6 mt-5 rounded-xl bg-slate-900 text-white flex items-center gap-2"
        >
          <Copy size={18} />
          Copiar extrato
        </button>
      </div>
    </main>
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

function Resumo({ titulo, itens, formatarValor }: any) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
      <h2 className="text-xl font-bold mb-5">{titulo}</h2>

      <div className="space-y-3">
        {itens.map((item: any) => (
          <div
            key={item.nome}
            className="flex justify-between bg-slate-50 rounded-2xl p-4"
          >
            <div>
              <strong>{item.nome}</strong>
              <p className="text-sm text-slate-500">{item.quantidade} teles</p>
            </div>

            <strong>R$ {formatarValor(item.total)}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}