"use client";
import { useMemo, useState } from "react";
import { Copy, DollarSign, FileText, Bike, Users } from "lucide-react";
import { useExpressManager } from "@/context/ExpressManagerContext";

export default function ExtratoFinanceiro() {
  const { teles, clientes, motoboys } = useExpressManager();

  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [clienteFiltro, setClienteFiltro] = useState("todos");
  const [motoboyFiltro, setMotoboyFiltro] = useState("todos");
  const [recebimentoFiltro, setRecebimentoFiltro] = useState("todos");

  function converterValor(valor: any) {
    return Number(String(valor || "0").replace(",", "."));
  }

  function formatarValor(valor: number) {
    return valor.toFixed(2).replace(".", ",");
  }

  function dataDaTele(tele: any) {
    if (tele.dataTele) {
      return new Date(tele.dataTele).toISOString().slice(0, 10);
    }

    if (tele.criadoEm) {
      const dataBR = tele.criadoEm.split(",")[0];
      const [dia, mes, ano] = dataBR.split("/");
      return `${ano}-${mes}-${dia}`;
    }

    return "";
  }

  const telesFiltradas = useMemo(() => {
    return teles.filter((tele: any) => {
      const dataTele = dataDaTele(tele);

      if (dataInicio && dataTele < dataInicio) return false;
      if (dataFim && dataTele > dataFim) return false;

      if (clienteFiltro !== "todos" && tele.solicitante !== clienteFiltro) {
        return false;
      }

      if (motoboyFiltro !== "todos") {
        if (motoboyFiltro === "sem-motoboy" && tele.motoboy) return false;
        if (motoboyFiltro !== "sem-motoboy" && tele.motoboy !== motoboyFiltro) {
          return false;
        }
      }

      if (recebimentoFiltro !== "todos") {
        const recebimento = tele.recebimento || "pendente";
        if (recebimento !== recebimentoFiltro) return false;
      }

      return true;
    });
  }, [
    teles,
    dataInicio,
    dataFim,
    clienteFiltro,
    motoboyFiltro,
    recebimentoFiltro,
  ]);

  const total = telesFiltradas.reduce(
    (soma: number, tele: any) => soma + converterValor(tele.valor),
    0
  );

  const recebidoEscritorio = telesFiltradas
    .filter((tele: any) => tele.recebimento === "escritorio")
    .reduce((soma: number, tele: any) => soma + converterValor(tele.valor), 0);

  const recebidoMotoboy = telesFiltradas
    .filter((tele: any) => tele.recebimento === "motoboy")
    .reduce((soma: number, tele: any) => soma + converterValor(tele.valor), 0);

  const pendente = telesFiltradas
    .filter((tele: any) => !tele.recebimento || tele.recebimento === "pendente")
    .reduce((soma: number, tele: any) => soma + converterValor(tele.valor), 0);

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

  const textoExtrato = useMemo(() => {
    let texto = `EXTRATO GERAL\n\n`;

    texto += `Teles: ${telesFiltradas.length}\n`;
    texto += `Faturamento: R$ ${formatarValor(total)}\n`;
    texto += `Recebido escritório: R$ ${formatarValor(recebidoEscritorio)}\n`;
    texto += `Recebido motoboy: R$ ${formatarValor(recebidoMotoboy)}\n`;
    texto += `Pendente: R$ ${formatarValor(pendente)}\n\n`;

    texto += `DETALHADO\n`;

    telesFiltradas.forEach((tele: any) => {
      texto += `\n${formatarData(dataDaTele(tele))}`;
      texto += `\nCliente: ${tele.solicitante}`;
      texto += `\nMotoboy: ${tele.motoboy || "Sem motoboy"}`;
      texto += `\nStatus: ${tele.status}`;
      texto += `\nRecebimento: ${tele.recebimento || "pendente"}`;
      texto += `\nValor: R$ ${tele.valor}`;
      texto += `\n-------------------------\n`;
    });

    return texto;
  }, [telesFiltradas, total, recebidoEscritorio, recebidoMotoboy, pendente]);
  const textoPorDia = useMemo(() => {
  const grupos: Record<string, any[]> = {};

  const telesOrdenadas = [...telesFiltradas].sort((a: any, b: any) => {
    const dataA = dataDaTele(a);
    const dataB = dataDaTele(b);

    return dataA.localeCompare(dataB);
  });

  telesOrdenadas.forEach((tele: any) => {
    const dataISO = dataDaTele(tele);
    const dataFormatada = formatarData(dataISO);

    if (!grupos[dataFormatada]) {
      grupos[dataFormatada] = [];
    }

    grupos[dataFormatada].push(tele);
  });

  let texto = "";

  Object.entries(grupos).forEach(([data, telesDoDia]) => {
    texto += `${data}\n`;

    telesDoDia.forEach((tele: any) => {
  const parada =
    tele.paradas?.find((p: any) => p.cliente !== tele.solicitante) ||
    tele.paradas?.[0];

  const nomeLinha =
    parada?.cliente ||
    tele.nomeCliente ||
    tele.solicitante;

  texto += `- ${nomeLinha} - R$${tele.valor}\n`;
});
    texto += `\n`;
  });

  texto += `Total - R$${formatarValor(total)}`;

  return texto;
}, [telesFiltradas, total]);
  function copiarExtrato() {
    navigator.clipboard.writeText(textoExtrato);
    alert("Extrato copiado!");
  }
  
  return (
  <>

      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5">
          <FiltroData label="Data inicial" value={dataInicio} onChange={setDataInicio} />
          <FiltroData label="Data final" value={dataFim} onChange={setDataFim} />

          <FiltroSelect
            label="Cliente"
            value={clienteFiltro}
            onChange={setClienteFiltro}
            options={[
              { value: "todos", label: "Todos" },
              ...clientes.map((c: any) => ({
                value: c.nome,
                label: c.nome,
              })),
            ]}
          />

          <FiltroSelect
            label="Motoboy"
            value={motoboyFiltro}
            onChange={setMotoboyFiltro}
            options={[
              { value: "todos", label: "Todos" },
              { value: "sem-motoboy", label: "Sem motoboy" },
              ...motoboys.map((m: any) => ({
                value: m.nome,
                label: m.nome,
              })),
            ]}
          />

          <FiltroSelect
            label="Recebimento"
            value={recebimentoFiltro}
            onChange={setRecebimentoFiltro}
            options={[
              { value: "todos", label: "Todos" },
              { value: "pendente", label: "Pendente" },
              { value: "escritorio", label: "Escritório" },
              { value: "motoboy", label: "Motoboy" },
            ]}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
        <Card titulo="Teles" valor={`${telesFiltradas.length}`} icon={<FileText size={26} />} />
        <Card titulo="Faturamento" valor={`R$ ${formatarValor(total)}`} icon={<DollarSign size={26} />} />
        <Card titulo="Escritório" valor={`R$ ${formatarValor(recebidoEscritorio)}`} icon={<DollarSign size={26} />} />
        <Card titulo="Motoboy" valor={`R$ ${formatarValor(recebidoMotoboy)}`} icon={<Bike size={26} />} />
        <Card titulo="Pendente" valor={`R$ ${formatarValor(pendente)}`} icon={<Users size={26} />} />
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-8">
        <h2 className="text-2xl font-bold mb-5">Detalhamento das teles</h2>

        {telesFiltradas.length === 0 ? (
          <p className="text-slate-500">Nenhuma tele encontrada.</p>
        ) : (
          <div className="space-y-4">
            {telesFiltradas.map((tele: any) => (
              <div
                key={tele.id}
                className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4 items-center bg-slate-50 rounded-2xl p-4"
              >
                <div>
                  <p className="text-xs text-slate-500">Data</p>
                  <strong>{formatarData(dataDaTele(tele))}</strong>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Cliente</p>
                  <strong>{tele.solicitante}</strong>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Motoboy</p>
                  <strong>{tele.motoboy || "Sem motoboy"}</strong>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Status</p>
                  <strong>{tele.status}</strong>
                </div>

                <div>
                  <p className="text-xs text-slate-500">Recebimento</p>
                  <strong>{tele.recebimento || "pendente"}</strong>
                </div>

                <div className="md:text-right">
                  <p className="text-xs text-slate-500">Valor</p>
                  <strong>R$ {tele.valor}</strong>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-8">
        <Resumo titulo="Resumo por cliente" itens={resumoClientes} formatarValor={formatarValor} />
        <Resumo titulo="Resumo por motoboy" itens={resumoMotoboys} formatarValor={formatarValor} />
      </div>
<div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-8">
  <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-5">
    <h2 className="text-2xl font-bold">Extrato por dia</h2>

    <button
      onClick={() => {
        navigator.clipboard.writeText(textoPorDia);
        alert("Extrato por dia copiado!");
      }}
      className="w-full md:w-auto h-12 px-6 rounded-xl bg-emerald-600 text-white flex items-center gap-2"
    >
      <Copy size={18} />
      Copiar extrato por dia
    </button>
  </div>

  <textarea
    value={textoPorDia}
    readOnly
    className="w-full h-72 md:h-96 rounded-2xl border border-slate-200 p-5 outline-none bg-slate-50 whitespace-pre-wrap"
  />
</div>
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 max-w-5xl">
        <textarea
          value={textoExtrato}
          readOnly
          className="w-full h-96 rounded-2xl border border-slate-200 p-5 outline-none bg-slate-50"
        />

        <button
          onClick={copiarExtrato}
          className="w-full md:w-auto h-12 px-6 mt-5 rounded-xl bg-slate-900 text-white flex items-center gap-2"
        >
          <Copy size={18} />
          Copiar extrato
        </button>
      </div>
      </>
);
}

function FiltroData({ label, value, onChange }: any) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-600">{label}</label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-2 h-12 rounded-xl border border-slate-200 px-4 outline-none focus:border-emerald-500"
      />
    </div>
  );
}

function FiltroSelect({ label, value, onChange, options }: any) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-600">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-2 h-12 rounded-xl border border-slate-200 px-4 outline-none focus:border-emerald-500"
      >
        {options.map((option: any) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
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
      <h2 className="text-2xl font-bold mt-2">{valor}</h2>
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

function formatarData(dataISO: string) {
  if (!dataISO) return "-";

  const [ano, mes, dia] = dataISO.split("-");
  return `${dia}/${mes}/${ano}`;
}