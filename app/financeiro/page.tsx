"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  Copy,
  MessageCircle,
  Bike,
  Building2,
  CalendarDays,
} from "lucide-react";
import { useExpressManager } from "@/context/ExpressManagerContext";

type AbaFinanceiro =
  | "pendentes"
  | "escritorio"
  | "motoboy"
  | "semanal"
  | "todos"
  | "resumo"
  | "extrato";

export default function FinanceiroPage() {
  const { clientes, teles, setTeles } = useExpressManager();

  const [aba, setAba] = useState<AbaFinanceiro>("pendentes");
  const [clienteExtrato, setClienteExtrato] = useState("");
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
  function ehDoPeriodo(tele: any) {
  const dataTele = dataParaComparar(dataDaTele(tele.criadoEm));

  if (dataInicio && dataTele < dataInicio) return false;
  if (dataFim && dataTele > dataFim) return false;

  return true;
}
const telesPeriodo = useMemo(() => {
  return teles.filter((tele: any) => ehDoPeriodo(tele));
}, [teles, dataInicio, dataFim]);

  function nomeDestino(tele: any) {
  if (tele.paradas?.length > 0) {
    const paradaPrincipal =
      tele.paradas.find((parada: any) => parada.cliente !== tele.solicitante) ||
      tele.paradas[0];

    return (
      paradaPrincipal.cliente ||
      paradaPrincipal.nomeCliente ||
      tele.nomeCliente
    );
  }

  return tele.nomeCliente;
}
  function alterarRecebimento(id: string, recebimento: string) {
    setTeles(
      teles.map((tele: any) =>
        tele.id === id
          ? {
              ...tele,
              recebimento,
              recebido: recebimento !== "pendente",
              valorRecebido: recebimento === "pendente" ? 0 : converterValor(tele.valor),
              dataRecebimento:
                recebimento === "pendente"
                  ? null
                  : new Date().toLocaleString("pt-BR"),
              motoboyRecebedor:
                recebimento === "motoboy" ? tele.motoboy || null : null,
            }
          : tele
      )
    );
  }

  const pendentes = telesPeriodo.filter(
  (tele: any) => (tele.recebimento || "pendente") === "pendente"
);

const recebidosEscritorio = telesPeriodo.filter(
  (tele: any) => tele.recebimento === "escritorio"
);

const recebidosMotoboy = telesPeriodo.filter(
  (tele: any) => tele.recebimento === "motoboy"
);

const fechamentoSemanal = telesPeriodo.filter(
  (tele: any) => tele.formaCobranca === "semanal"
);

const totalPendente = pendentes.reduce(
  (total, tele) => total + converterValor(tele.valor),
  0
);

const totalEscritorio = recebidosEscritorio.reduce(
  (total, tele) => total + converterValor(tele.valor),
  0
);

const totalMotoboy = recebidosMotoboy.reduce(
  (total, tele) => total + converterValor(tele.valor),
  0
);

const totalGeral = telesPeriodo.reduce(
  (total, tele) => total + converterValor(tele.valor),
  0
);

const ticketMedio =
  telesPeriodo.length > 0 ? totalGeral / telesPeriodo.length : 0;

  const saldoCobrarCliente = fechamentoSemanal.reduce((total, tele: any) => {
    if (tele.recebimento === "motoboy" || tele.recebimento === "escritorio") {
      return total;
    }

    return total + converterValor(tele.valor);
  }, 0);

  const resumo = Object.values(
    teles.reduce((acc: any, tele: any) => {
      if (!acc[tele.solicitante]) {
        acc[tele.solicitante] = {
          cliente: tele.solicitante,
          quantidade: 0,
          total: 0,
          escritorio: 0,
          motoboy: 0,
          pendente: 0,
        };
      }

      acc[tele.solicitante].quantidade += 1;
      acc[tele.solicitante].total += converterValor(tele.valor);

      if (tele.recebimento === "escritorio") {
        acc[tele.solicitante].escritorio += converterValor(tele.valor);
      } else if (tele.recebimento === "motoboy") {
        acc[tele.solicitante].motoboy += converterValor(tele.valor);
      } else {
        acc[tele.solicitante].pendente += converterValor(tele.valor);
      }

      return acc;
    }, {})
  ) as any[];

  const listaAtual =
    aba === "pendentes"
      ? pendentes
      : aba === "escritorio"
      ? recebidosEscritorio
      : aba === "motoboy"
      ? recebidosMotoboy
      : aba === "semanal"
      ? fechamentoSemanal
      : teles;

  const telesDoExtrato = useMemo(() => {
    return teles.filter((tele) => {
      if (!clienteExtrato) return false;
      if (tele.solicitante !== clienteExtrato) return false;

      const dataTele = dataParaComparar(dataDaTele(tele.criadoEm));

      if (dataInicio && dataTele < dataInicio) return false;
      if (dataFim && dataTele > dataFim) return false;

      return true;
    });
  }, [teles, clienteExtrato, dataInicio, dataFim]);

  const textoExtrato = useMemo(() => {
    if (!clienteExtrato) return "";

    const agrupado = telesDoExtrato.reduce((acc: any, tele) => {
      const data = dataDaTele(tele.criadoEm);
      if (!acc[data]) acc[data] = [];
      acc[data].push(tele);
      return acc;
    }, {});

    let texto = `EXTRATO ${clienteExtrato.toUpperCase()}\n\n`;

    Object.keys(agrupado).forEach((data) => {
      texto += `${data}\n`;

      agrupado[data].forEach((tele: any) => {
        texto += `- ${nomeDestino(tele)} - R$${tele.valor}\n`;
      });

      texto += "\n";
    });

    const total = telesDoExtrato.reduce(
      (soma, tele) => soma + converterValor(tele.valor),
      0
    );

    texto += `Total - R$${formatarValor(total)}`;

    return texto;
  }, [clienteExtrato, telesDoExtrato]);

  function copiarExtrato() {
    navigator.clipboard.writeText(textoExtrato);
    alert("Extrato copiado!");
  }

  function enviarWhatsApp() {
    const cliente = clientes.find((c) => c.nome === clienteExtrato);
    const telefone = cliente?.telefone?.replace(/\D/g, "");

    if (!telefone) {
      alert("Telefone do cliente não encontrado.");
      return;
    }

    const telefoneFinal = telefone.startsWith("55") ? telefone : `55${telefone}`;

    window.open(
      `https://wa.me/${telefoneFinal}?text=${encodeURIComponent(textoExtrato)}`,
      "_blank"
    );
  }

  return (
    <main className="min-h-screen bg-[#f7f8fb] p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold">Financeiro</h1>
        <p className="text-slate-500 mt-2">
          Controle financeiro completo das teles.
        </p>
      </div>
<div className="grid grid-cols-2 gap-5 mb-8 bg-white rounded-3xl p-6 shadow-sm border border-slate-100 max-w-3xl">
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
        <ResumoCard titulo="A receber" valor={`R$ ${formatarValor(totalPendente)}`} icon={<Clock size={26} />} />
        <ResumoCard titulo="Recebido escritório" valor={`R$ ${formatarValor(totalEscritorio)}`} icon={<Building2 size={26} />} />
        <ResumoCard titulo="Em mãos motoboys" valor={`R$ ${formatarValor(totalMotoboy)}`} icon={<Bike size={26} />} />
        <ResumoCard titulo="Saldo a cobrar" valor={`R$ ${formatarValor(saldoCobrarCliente)}`} icon={<DollarSign size={26} />} />
      </div>

      <div className="grid grid-cols-4 gap-6 mb-8">
        <ResumoCard titulo="Total geral" valor={`R$ ${formatarValor(totalGeral)}`} icon={<DollarSign size={26} />} />
        <ResumoCard titulo="Ticket médio" valor={`R$ ${formatarValor(ticketMedio)}`} icon={<FileText size={26} />} />
        <ResumoCard titulo="Fechamento semanal" valor={`R$ ${formatarValor(fechamentoSemanal.reduce((t, tele) => t + converterValor(tele.valor), 0))}`} icon={<CalendarDays size={26} />} />
        <ResumoCard titulo="Teles" valor={`${teles.length}`} icon={<CheckCircle size={26} />} />
      </div>

      <div className="flex gap-3 mb-8 flex-wrap">
        <TabButton ativo={aba === "pendentes"} onClick={() => setAba("pendentes")}>Pendentes</TabButton>
        <TabButton ativo={aba === "escritorio"} onClick={() => setAba("escritorio")}>Recebido escritório</TabButton>
        <TabButton ativo={aba === "motoboy"} onClick={() => setAba("motoboy")}>Recebido motoboy</TabButton>
        <TabButton ativo={aba === "semanal"} onClick={() => setAba("semanal")}>Fechamento semanal</TabButton>
        <TabButton ativo={aba === "todos"} onClick={() => setAba("todos")}>Todos</TabButton>
        <TabButton ativo={aba === "resumo"} onClick={() => setAba("resumo")}>Resumo</TabButton>
        <TabButton ativo={aba === "extrato"} onClick={() => setAba("extrato")}>Extrato</TabButton>
      </div>

      {aba !== "resumo" && aba !== "extrato" && (
        <div className="grid grid-cols-3 gap-6">
          {listaAtual.map((tele: any) => (
            <div key={tele.id} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h2 className="text-xl font-bold">{tele.solicitante}</h2>
                  <p className="text-sm text-slate-500">{tele.tipoRota}</p>
                  <p className="text-xs text-slate-400">{tele.criadoEm}</p>
                </div>

                <StatusPagamento status={tele.recebimento || "pendente"} />
              </div>

              <div className="bg-slate-50 rounded-2xl p-4 mb-5">
                <div className="flex justify-between text-lg font-bold text-emerald-700">
                  <span>Total</span>
                  <span>R$ {tele.valor}</span>
                </div>
              </div>

              <div className="text-sm text-slate-600 mb-5 space-y-1">
                <p>Destino: {nomeDestino(tele)}</p>
                <p>Motoboy: {tele.motoboy || "Não definido"}</p>
                <p>Status operação: {tele.status}</p>
                <p>Cobrança: {tele.formaCobranca || "semanal"}</p>
              </div>

              <label className="text-sm font-medium text-slate-600">
                Situação do pagamento
              </label>

              <select
                value={tele.recebimento || "pendente"}
                onChange={(e) => alterarRecebimento(tele.id, e.target.value)}
                className="w-full mt-2 h-12 rounded-xl border border-slate-200 px-4 outline-none focus:border-emerald-500"
              >
                <option value="pendente">Pendente</option>
                <option value="escritorio">Recebido pelo escritório</option>
                <option value="motoboy">Recebido pelo motoboy</option>
              </select>
            </div>
          ))}
        </div>
      )}

      {aba === "resumo" && (
        <div className="grid grid-cols-3 gap-6">
          {resumo.map((item) => (
            <div key={item.cliente} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
              <h2 className="text-xl font-bold">{item.cliente}</h2>
              <p className="text-sm text-slate-500 mt-1">{item.quantidade} teles</p>

              <div className="bg-slate-50 rounded-2xl p-4 mt-5">
                <LinhaResumo label="Total" valor={formatarValor(item.total)} />
                <LinhaResumo label="Escritório" valor={formatarValor(item.escritorio)} verde />
                <LinhaResumo label="Motoboy" valor={formatarValor(item.motoboy)} azul />
                <LinhaResumo label="Pendente" valor={formatarValor(item.pendente)} laranja />
              </div>
            </div>
          ))}
        </div>
      )}

      {aba === "extrato" && (
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 max-w-5xl">
          <h2 className="text-2xl font-bold mb-6">Extrato por cliente</h2>

          <div className="grid grid-cols-3 gap-5 mb-6">
            <div>
              <label className="text-sm font-medium text-slate-600">Cliente</label>
              <select
                value={clienteExtrato}
                onChange={(e) => setClienteExtrato(e.target.value)}
                className="w-full mt-2 h-12 rounded-xl border border-slate-200 px-4 outline-none focus:border-emerald-500"
              >
                <option value="">Selecione</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id || cliente.nome} value={cliente.nome}>
                    {cliente.nome}
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

          <textarea
            value={textoExtrato}
            readOnly
            className="w-full h-96 rounded-2xl border border-slate-200 p-5 outline-none bg-slate-50"
          />

          <div className="flex gap-3 mt-5">
            <button
              onClick={copiarExtrato}
              disabled={!textoExtrato}
              className="h-12 px-6 rounded-xl bg-slate-900 text-white flex items-center gap-2 disabled:opacity-40"
            >
              <Copy size={18} />
              Copiar extrato
            </button>

            <button
              onClick={enviarWhatsApp}
              disabled={!textoExtrato}
              className="h-12 px-6 rounded-xl bg-emerald-600 text-white flex items-center gap-2 disabled:opacity-40"
            >
              <MessageCircle size={18} />
              Enviar WhatsApp
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function ResumoCard({ titulo, valor, icon }: any) {
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

function TabButton({ ativo, onClick, children }: any) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-4 rounded-2xl shadow-sm ${
        ativo ? "bg-emerald-600 text-white" : "bg-white text-slate-700"
      }`}
    >
      {children}
    </button>
  );
}

function StatusPagamento({ status }: { status: string }) {
  const mapa: any = {
    pendente: "bg-orange-100 text-orange-700",
    escritorio: "bg-emerald-100 text-emerald-700",
    motoboy: "bg-blue-100 text-blue-700",
  };

  const texto: any = {
    pendente: "Pendente",
    escritorio: "Escritório",
    motoboy: "Motoboy",
  };

  return (
    <span className={`px-3 py-2 rounded-xl text-sm ${mapa[status]}`}>
      {texto[status]}
    </span>
  );
}

function LinhaResumo({ label, valor, verde, azul, laranja }: any) {
  return (
    <div
      className={`flex justify-between text-sm mt-2 ${
        verde
          ? "text-emerald-700"
          : azul
          ? "text-blue-700"
          : laranja
          ? "text-orange-700"
          : ""
      }`}
    >
      <span>{label}</span>
      <strong>R$ {valor}</strong>
    </div>
  );
}