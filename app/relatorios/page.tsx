"use client";

import PageContainer from "@/components/ui/PageContainer";
import PageHeader from "@/components/ui/PageHeader";
import { useExpressManager } from "@/context/ExpressManagerContext";
import {
  BarChart3,
  Bike,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Copy,
  DollarSign,
  FileText,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";

function converterValor(valor: unknown) {
  const numero = Number(String(valor ?? "0").replace(",", "."));
  return Number.isFinite(numero) ? numero : 0;
}

function formatarValor(valor: number) {
  return valor.toFixed(2).replace(".", ",");
}

function dataLocalISO(valor: unknown) {
  if (!valor) return "";

  if (typeof valor === "string") {
    const texto = valor.trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
      return texto;
    }

    const dataBr = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})/);

    if (dataBr) {
      return `${dataBr[3]}-${dataBr[2]}-${dataBr[1]}`;
    }
  }

  const data = new Date(String(valor));

  if (Number.isNaN(data.getTime())) return "";

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(data);
}

function formatarData(dataISO: string) {
  if (!dataISO) return "-";

  const [ano, mes, dia] = dataISO.split("-");
  return `${dia}/${mes}/${ano}`;
}

function dataDaTele(tele: any) {
  return dataLocalISO(tele.dataTele || tele.createdAt || tele.criadoEm);
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

function statusFinanceiro(tele: any) {
  const total = valorTotalTele(tele);
  const recebido = valorRecebidoTele(tele);

  if (recebido <= 0.009) return "PENDENTE";
  if (recebido >= total - 0.009) return "QUITADO";
  return "PARCIAL";
}

export default function RelatoriosPage() {
  const { teles, clientes, motoboys } = useExpressManager();

  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [clienteFiltro, setClienteFiltro] = useState("todos");
  const [motoboyFiltro, setMotoboyFiltro] = useState("todos");

  const periodoInvalido = Boolean(dataInicio && dataFim) && dataInicio > dataFim;

  const telesFiltradas = useMemo(() => {
    if (periodoInvalido) return [];

    return teles.filter((tele: any) => {
      const dataTele = dataDaTele(tele);

      if (dataInicio && dataTele < dataInicio) return false;
      if (dataFim && dataTele > dataFim) return false;

      if (clienteFiltro !== "todos" && tele.solicitante !== clienteFiltro) {
        return false;
      }

      if (motoboyFiltro !== "todos") {
        if (motoboyFiltro === "sem-motoboy" && (tele.motoboy || tele.motoboyNome)) {
          return false;
        }

        const nomeMotoboy = tele.motoboyNome || tele.motoboy || "";

        if (motoboyFiltro !== "sem-motoboy" && nomeMotoboy !== motoboyFiltro) {
          return false;
        }
      }

      return true;
    });
  }, [teles, dataInicio, dataFim, clienteFiltro, motoboyFiltro, periodoInvalido]);

  const resumo = useMemo(() => {
    return telesFiltradas.reduce(
      (acc: any, tele: any) => {
        const total = valorTotalTele(tele);
        const recebido = valorRecebidoTele(tele);
        const saldo = saldoTele(tele);
        const status = statusFinanceiro(tele);

        acc.quantidade += 1;
        acc.faturamento += total;
        acc.recebido += recebido;
        acc.saldo += saldo;

        if (status === "QUITADO") acc.quitadas += 1;
        if (status === "PARCIAL") acc.parciais += 1;
        if (status === "PENDENTE") acc.pendentes += 1;

        return acc;
      },
      {
        quantidade: 0,
        faturamento: 0,
        recebido: 0,
        saldo: 0,
        quitadas: 0,
        parciais: 0,
        pendentes: 0,
      }
    );
  }, [telesFiltradas]);

  const ticketMedio = resumo.quantidade > 0 ? resumo.faturamento / resumo.quantidade : 0;

  const resumoClientes = useMemo(() => {
    return Object.values(
      telesFiltradas.reduce((acc: any, tele: any) => {
        const nome = tele.solicitante || "Sem cliente";

        if (!acc[nome]) {
          acc[nome] = {
            nome,
            quantidade: 0,
            faturamento: 0,
            recebido: 0,
            saldo: 0,
          };
        }

        acc[nome].quantidade += 1;
        acc[nome].faturamento += valorTotalTele(tele);
        acc[nome].recebido += valorRecebidoTele(tele);
        acc[nome].saldo += saldoTele(tele);

        return acc;
      }, {})
    )
      .sort((a: any, b: any) => b.faturamento - a.faturamento)
      .slice(0, 10) as any[];
  }, [telesFiltradas]);

  const resumoMotoboys = useMemo(() => {
    return Object.values(
      telesFiltradas.reduce((acc: any, tele: any) => {
        const nome = tele.motoboyNome || tele.motoboy || "Sem motoboy";

        if (!acc[nome]) {
          acc[nome] = {
            nome,
            quantidade: 0,
            faturamento: 0,
          };
        }

        acc[nome].quantidade += 1;
        acc[nome].faturamento += valorTotalTele(tele);

        return acc;
      }, {})
    )
      .sort((a: any, b: any) => b.faturamento - a.faturamento)
      .slice(0, 10) as any[];
  }, [telesFiltradas]);

  const resumoPorDia = useMemo(() => {
    return Object.values(
      telesFiltradas.reduce((acc: any, tele: any) => {
        const data = dataDaTele(tele);

        if (!acc[data]) {
          acc[data] = {
            data,
            quantidade: 0,
            faturamento: 0,
          };
        }

        acc[data].quantidade += 1;
        acc[data].faturamento += valorTotalTele(tele);

        return acc;
      }, {})
    )
      .sort((a: any, b: any) => a.data.localeCompare(b.data))
      .slice(-14) as any[];
  }, [telesFiltradas]);

  const maiorFaturamentoDia = Math.max(...resumoPorDia.map((item: any) => item.faturamento), 1);

  const textoRelatorio = useMemo(() => {
    let texto = "RELATÓRIO OPERACIONAL E FINANCEIRO\n\n";

    if (dataInicio || dataFim) {
      texto += `Período: ${dataInicio ? formatarData(dataInicio) : "Início"} até ${
        dataFim ? formatarData(dataFim) : "Hoje"
      }\n`;
    }

    if (clienteFiltro !== "todos") {
      texto += `Cliente: ${clienteFiltro}\n`;
    }

    if (motoboyFiltro !== "todos") {
      texto += `Motoboy: ${motoboyFiltro === "sem-motoboy" ? "Sem motoboy" : motoboyFiltro}\n`;
    }

    texto += "\nRESUMO\n";
    texto += `Teles: ${resumo.quantidade}\n`;
    texto += `Faturamento: R$ ${formatarValor(resumo.faturamento)}\n`;
    texto += `Recebido: R$ ${formatarValor(resumo.recebido)}\n`;
    texto += `A receber: R$ ${formatarValor(resumo.saldo)}\n`;
    texto += `Ticket médio: R$ ${formatarValor(ticketMedio)}\n`;
    texto += `Quitadas: ${resumo.quitadas}\n`;
    texto += `Parciais: ${resumo.parciais}\n`;
    texto += `Pendentes: ${resumo.pendentes}\n`;

    texto += "\nTOP CLIENTES\n";

    resumoClientes.forEach((cliente: any, index: number) => {
      texto += `${index + 1}. ${cliente.nome} - ${cliente.quantidade} teles - R$ ${formatarValor(
        cliente.faturamento
      )}\n`;
    });

    texto += "\nPRODUÇÃO DOS MOTOBOYS\n";

    resumoMotoboys.forEach((motoboy: any, index: number) => {
      texto += `${index + 1}. ${motoboy.nome} - ${motoboy.quantidade} teles - R$ ${formatarValor(
        motoboy.faturamento
      )}\n`;
    });

    return texto;
  }, [
    dataInicio,
    dataFim,
    clienteFiltro,
    motoboyFiltro,
    resumo,
    ticketMedio,
    resumoClientes,
    resumoMotoboys,
  ]);

  async function copiarRelatorio() {
    try {
      await navigator.clipboard.writeText(textoRelatorio);
      alert("Relatório copiado!");
    } catch {
      alert("Não foi possível copiar o relatório.");
    }
  }

  return (
    <PageContainer>
      <PageHeader
        titulo="Relatórios"
        descricao="Acompanhe produção, faturamento, clientes e motoboys."
      />

      <div className="mb-8 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm md:p-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          <FiltroData label="Data inicial" value={dataInicio} onChange={setDataInicio} />

          <FiltroData label="Data final" value={dataFim} onChange={setDataFim} />

          <FiltroSelect
            label="Cliente"
            value={clienteFiltro}
            onChange={setClienteFiltro}
            options={[
              { value: "todos", label: "Todos os clientes" },
              ...clientes.map((cliente: any) => ({
                value: cliente.nome,
                label: cliente.nome,
              })),
            ]}
          />

          <FiltroSelect
            label="Motoboy"
            value={motoboyFiltro}
            onChange={setMotoboyFiltro}
            options={[
              { value: "todos", label: "Todos os motoboys" },
              { value: "sem-motoboy", label: "Sem motoboy" },
              ...motoboys.map((motoboy: any) => ({
                value: motoboy.nome,
                label: motoboy.nome,
              })),
            ]}
          />
        </div>

        {periodoInvalido && (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            A data inicial não pode ser posterior à data final.
          </div>
        )}
      </div>

      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <Card
          titulo="Total de teles"
          valor={`${resumo.quantidade}`}
          descricao="Operações no período"
          icon={<FileText size={23} />}
        />

        <Card
          titulo="Faturamento"
          valor={`R$ ${formatarValor(resumo.faturamento)}`}
          descricao="Valor bruto das teles"
          icon={<DollarSign size={23} />}
        />

        <Card
          titulo="Ticket médio"
          valor={`R$ ${formatarValor(ticketMedio)}`}
          descricao="Média por tele"
          icon={<TrendingUp size={23} />}
        />

        <Card
          titulo="A receber"
          valor={`R$ ${formatarValor(resumo.saldo)}`}
          descricao="Saldo ainda em aberto"
          icon={<Clock3 size={23} />}
          alerta={resumo.saldo > 0}
        />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <MiniCard
          titulo="Quitadas"
          valor={resumo.quitadas}
          icon={<CheckCircle2 size={20} />}
          tipo="positivo"
        />

        <MiniCard
          titulo="Parciais"
          valor={resumo.parciais}
          icon={<CalendarDays size={20} />}
          tipo="alerta"
        />

        <MiniCard
          titulo="Pendentes"
          valor={resumo.pendentes}
          icon={<Clock3 size={20} />}
          tipo="erro"
        />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Ranking
          titulo="Top clientes"
          descricao="Maiores faturamentos do período"
          itens={resumoClientes}
          icon={<Building2 size={21} />}
        />

        <Ranking
          titulo="Produção dos motoboys"
          descricao="Faturamento gerado por motoboy"
          itens={resumoMotoboys}
          icon={<Bike size={21} />}
        />
      </div>

      <div className="mb-8 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm md:p-6">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <BarChart3 size={22} />
          </div>

          <div>
            <h2 className="text-xl font-bold text-slate-900">Evolução diária</h2>
            <p className="text-sm text-slate-500">Últimos 14 dias encontrados no filtro</p>
          </div>
        </div>

        {resumoPorDia.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma tele encontrada no período.</p>
        ) : (
          <div className="space-y-4">
            {resumoPorDia.map((item: any) => {
              const percentual = (item.faturamento / maiorFaturamentoDia) * 100;

              return (
                <div key={item.data}>
                  <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                    <div>
                      <strong className="text-slate-900">{formatarData(item.data)}</strong>
                      <span className="ml-2 text-slate-400">{item.quantidade} teles</span>
                    </div>

                    <strong className="text-emerald-700">
                      R$ {formatarValor(item.faturamento)}
                    </strong>
                  </div>

                  <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{
                        width: `${Math.max(percentual, 3)}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm md:p-6">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Relatório para copiar</h2>
            <p className="mt-1 text-sm text-slate-500">Resumo pronto para WhatsApp ou arquivo.</p>
          </div>

          <button
            type="button"
            onClick={() => void copiarRelatorio()}
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 font-semibold text-white"
          >
            <Copy size={18} />
            Copiar relatório
          </button>
        </div>

        <textarea
          value={textoRelatorio}
          readOnly
          className="h-96 w-full rounded-2xl border border-slate-200 bg-slate-50 p-5 outline-none"
        />
      </div>
    </PageContainer>
  );
}

type Opcao = {
  value: string;
  label: string;
};

function FiltroData({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-600">{label}</label>

      <input
        type="date"
        value={value}
        onChange={(evento) => onChange(evento.target.value)}
        className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-emerald-500"
      />
    </div>
  );
}

function FiltroSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Opcao[];
}) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-600">{label}</label>

      <select
        value={value}
        onChange={(evento) => onChange(evento.target.value)}
        className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 outline-none focus:border-emerald-500"
      >
        {options.map((opcao) => (
          <option key={opcao.value} value={opcao.value}>
            {opcao.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Card({
  titulo,
  valor,
  descricao,
  icon,
  alerta = false,
}: {
  titulo: string;
  valor: string;
  descricao: string;
  icon: React.ReactNode;
  alerta?: boolean;
}) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div
        className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${
          alerta ? "bg-orange-100 text-orange-700" : "bg-emerald-100 text-emerald-700"
        }`}
      >
        {icon}
      </div>

      <p className="text-sm text-slate-500">{titulo}</p>

      <h2 className={`mt-2 text-2xl font-bold ${alerta ? "text-orange-600" : "text-slate-900"}`}>
        {valor}
      </h2>

      <p className="mt-2 text-xs text-slate-400">{descricao}</p>
    </div>
  );
}

function MiniCard({
  titulo,
  valor,
  icon,
  tipo,
}: {
  titulo: string;
  valor: number;
  icon: React.ReactNode;
  tipo: "positivo" | "alerta" | "erro";
}) {
  const classes = {
    positivo: "bg-emerald-100 text-emerald-700",
    alerta: "bg-amber-100 text-amber-700",
    erro: "bg-red-100 text-red-700",
  };

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${classes[tipo]}`}>
        {icon}
      </div>

      <div>
        <p className="text-sm text-slate-500">{titulo}</p>
        <strong className="text-2xl text-slate-900">{valor}</strong>
      </div>
    </div>
  );
}

function Ranking({
  titulo,
  descricao,
  itens,
  icon,
}: {
  titulo: string;
  descricao: string;
  itens: any[];
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm md:p-6">
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
          {icon}
        </div>

        <div>
          <h2 className="text-xl font-bold text-slate-900">{titulo}</h2>
          <p className="text-sm text-slate-500">{descricao}</p>
        </div>
      </div>

      {itens.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum registro encontrado.</p>
      ) : (
        <div className="space-y-3">
          {itens.map((item: any, index: number) => (
            <div
              key={item.nome}
              className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sm font-bold text-slate-500">
                  {index + 1}
                </div>

                <div>
                  <strong className="text-slate-900">{item.nome}</strong>

                  <p className="text-sm text-slate-500">{item.quantidade} teles</p>
                </div>
              </div>

              <strong className="text-emerald-700">R$ {formatarValor(item.faturamento)}</strong>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
