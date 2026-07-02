"use client";

import { useMemo, useState } from "react";
import { Bike, Copy, DollarSign, FileText } from "lucide-react";
import { useExpressManager } from "@/context/ExpressManagerContext";

export default function ExtratoMotoboyPage() {
  const { motoboys, teles } = useExpressManager();

  const [motoboySelecionado, setMotoboySelecionado] = useState("");
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

  function nomeDestino(tele: any) {
    if (tele.paradas?.length > 0) {
      const paradaPrincipal =
        tele.paradas.find((parada: any) => parada.cliente !== tele.solicitante) ||
        tele.paradas[0];

      return paradaPrincipal.cliente || paradaPrincipal.nomeCliente || tele.nomeCliente;
    }

    return tele.nomeCliente;
  }

  const telesDoMotoboy = useMemo(() => {
    return teles.filter((tele: any) => {
      if (!motoboySelecionado) return false;
      if (tele.motoboy !== motoboySelecionado) return false;

      const dataTele = dataParaComparar(dataDaTele(tele.criadoEm));

      if (dataInicio && dataTele < dataInicio) return false;
      if (dataFim && dataTele > dataFim) return false;

      return true;
    });
  }, [teles, motoboySelecionado, dataInicio, dataFim]);

  const total = telesDoMotoboy.reduce(
  (soma: number, tele: any) => soma + converterValor(tele.valor),
  0
);

const recebidoMotoboy = telesDoMotoboy
  .filter((tele: any) => tele.recebimento === "motoboy")
  .reduce((soma: number, tele: any) => soma + converterValor(tele.valor), 0);

const valorMotoboy = total * 0.8;
const jaRecebeu = recebidoMotoboy * 0.8;
const aReceber = valorMotoboy - jaRecebeu;

  const textoExtrato = useMemo(() => {
    if (!motoboySelecionado) return "";

    const agrupado = telesDoMotoboy.reduce((acc: any, tele: any) => {
      const data = dataDaTele(tele.criadoEm);
      if (!acc[data]) acc[data] = [];
      acc[data].push(tele);
      return acc;
    }, {});

    let texto = `EXTRATO MOTOBOY - ${motoboySelecionado.toUpperCase()}\n\n`;

    Object.keys(agrupado).forEach((data) => {
      texto += `${data}\n`;

      agrupado[data].forEach((tele: any) => {
        texto += `- ${tele.solicitante} → ${nomeDestino(tele)} - R$${tele.valor}\n`;
      });

      texto += "\n";
    });

    texto += `Total de teles - ${telesDoMotoboy.length}\n`;
    texto += `Total bruto - R$${formatarValor(total)}\n`;
    texto += `Valor do motoboy - R$${formatarValor(valorMotoboy)}\n`;
    texto += `Já recebeu - R$${formatarValor(jaRecebeu)}\n`;
    texto += `A receber - R$${formatarValor(aReceber)}`;

    return texto;
  }, [
  motoboySelecionado,
  telesDoMotoboy,
  total,
  valorMotoboy,
  jaRecebeu,
  aReceber,
]);

  function copiarExtrato() {
    navigator.clipboard.writeText(textoExtrato);
    alert("Extrato copiado!");
  }

  return (
    <main className="min-h-screen bg-[#f7f8fb] p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold">Extrato dos Motoboys</h1>
        <p className="text-slate-500 mt-2">
          Gere o relatório por motoboy e período.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-5 mb-8 bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
        <div>
          <label className="text-sm font-medium text-slate-600">Motoboy</label>
          <select
            value={motoboySelecionado}
            onChange={(e) => setMotoboySelecionado(e.target.value)}
            className="w-full mt-2 h-12 rounded-xl border border-slate-200 px-4 outline-none focus:border-emerald-500"
          >
            <option value="">Selecione</option>
            {motoboys.map((motoboy: any) => (
              <option key={motoboy.id || motoboy.nome} value={motoboy.nome}>
                {motoboy.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-600">Data inicial</label>
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="w-full mt-2 h-12 rounded-xl border border-slate-200 px-4 outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-600">Data final</label>
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="w-full mt-2 h-12 rounded-xl border border-slate-200 px-4 outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6 mb-8">
  <Card titulo="Teles realizadas" valor={`${telesDoMotoboy.length}`} icon={<FileText size={26} />} />

  <Card titulo="Total bruto" valor={`R$ ${formatarValor(total)}`} icon={<DollarSign size={26} />} />

  <Card titulo="Valor motoboy" valor={`R$ ${formatarValor(valorMotoboy)}`} icon={<Bike size={26} />} />

  <Card titulo="Já recebeu" valor={`R$ ${formatarValor(jaRecebeu)}`} icon={<DollarSign size={26} />} />
</div>

      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 max-w-5xl">
        <textarea
          value={textoExtrato}
          readOnly
          className="w-full h-96 rounded-2xl border border-slate-200 p-5 outline-none bg-slate-50"
        />

        <button
          onClick={copiarExtrato}
          disabled={!textoExtrato}
          className="h-12 px-6 mt-5 rounded-xl bg-slate-900 text-white flex items-center gap-2 disabled:opacity-40"
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