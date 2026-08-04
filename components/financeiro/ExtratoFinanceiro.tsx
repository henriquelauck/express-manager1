"use client";

import { useExpressManager } from "@/context/ExpressManagerContext";
import { Bike, Building2, Copy, DollarSign, FileText, Users } from "lucide-react";
import { useMemo, useState } from "react";

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

function totaisRecebedoresTele(tele: any) {
  const historico = Array.isArray(tele.recebimentosHistorico)
    ? tele.recebimentosHistorico
    : [];

  if (historico.length > 0) {
    return historico.reduce(
      (totais: { escritorio: number; motoboy: number }, item: any) => {
        const valor = Math.max(0, converterValor(item.valor));
        const recebedor = String(item.recebedor || "").toLowerCase();

        if (recebedor === "motoboy") {
          totais.motoboy += valor;
        } else if (recebedor === "escritorio") {
          totais.escritorio += valor;
        }

        return totais;
      },
      { escritorio: 0, motoboy: 0 }
    );
  }

  const recebido = valorRecebidoTele(tele);
  const tipo = String(tele.recebimento || "pendente").toLowerCase();

  return tipo === "motoboy"
    ? { escritorio: 0, motoboy: recebido }
    : { escritorio: recebido, motoboy: 0 };
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

  if (Number.isNaN(data.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(data);
}

function dataDaTele(tele: any) {
  return dataLocalISO(tele.dataTele || tele.createdAt || tele.criadoEm);
}

function formatarData(dataISO: string) {
  if (!dataISO) return "-";

  const [ano, mes, dia] = dataISO.split("-");
  return `${dia}/${mes}/${ano}`;
}

function statusFinanceiro(tele: any) {
  const total = valorTotalTele(tele);
  const recebido = valorRecebidoTele(tele);

  if (recebido <= 0.009) return "Pendente";
  if (recebido >= total - 0.009) return "Quitado";
  return "Parcial";
}

function recebedorFinanceiro(tele: any) {
  const recebido = valorRecebidoTele(tele);

  if (recebido <= 0.009) return "Pendente";

  const totais = totaisRecebedoresTele(tele);
  const temEscritorio = totais.escritorio > 0.009;
  const temMotoboy = totais.motoboy > 0.009;

  if (temEscritorio && temMotoboy) return "Misto";
  if (temMotoboy) return "Motoboy";
  return "Escritório";
}

function clienteResponsavelCobranca(tele: any) {
  const paradas = Array.isArray(tele.paradas) ? tele.paradas : [];
  const solicitante = String(tele.solicitante || "")
    .trim()
    .toLowerCase();

  const paradaComCobranca = paradas.find((parada: any) =>
    String(parada.observacao || "")
      .toLowerCase()
      .includes("cobrar")
  );

  if (paradaComCobranca) {
    return (
      paradaComCobranca.cliente ||
      paradaComCobranca.nomeCliente ||
      tele.nomeCliente ||
      tele.solicitante ||
      "Sem cliente"
    );
  }

  const paradaDestino = paradas.find((parada: any) => {
    const nome = String(parada.cliente || parada.nomeCliente || "")
      .trim()
      .toLowerCase();

    return nome && nome !== solicitante;
  });

  return (
    paradaDestino?.cliente ||
    paradaDestino?.nomeCliente ||
    tele.nomeCliente ||
    tele.solicitante ||
    "Sem cliente"
  );
}

export default function ExtratoFinanceiro() {
  const { teles, clientes, motoboys } = useExpressManager();

  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [clienteFiltro, setClienteFiltro] = useState("todos");
  const [motoboyFiltro, setMotoboyFiltro] = useState("todos");
  const [recebimentoFiltro, setRecebimentoFiltro] = useState("todos");

  const telesFiltradas = useMemo(() => {
    return teles.filter((tele: any) => {
      const dataTele = dataDaTele(tele);

      if (dataInicio && dataTele < dataInicio) return false;
      if (dataFim && dataTele > dataFim) return false;

      if (clienteFiltro !== "todos" && tele.solicitante !== clienteFiltro) {
        return false;
      }

      if (motoboyFiltro !== "todos") {
        if (motoboyFiltro === "sem-motoboy" && tele.motoboy) {
          return false;
        }

        if (motoboyFiltro !== "sem-motoboy" && tele.motoboy !== motoboyFiltro) {
          return false;
        }
      }

      if (recebimentoFiltro !== "todos") {
        const recebedor = recebedorFinanceiro(tele).toLowerCase();
        const status = statusFinanceiro(tele).toLowerCase();

        if (recebimentoFiltro === "pendente" && status !== "pendente") {
          return false;
        }

        if (recebimentoFiltro === "parcial" && status !== "parcial") {
          return false;
        }

        const totaisRecebedores = totaisRecebedoresTele(tele);

        if (recebimentoFiltro === "escritorio" && totaisRecebedores.escritorio <= 0.009) {
          return false;
        }

        if (recebimentoFiltro === "motoboy" && totaisRecebedores.motoboy <= 0.009) {
          return false;
        }
      }

      return true;
    });
  }, [teles, dataInicio, dataFim, clienteFiltro, motoboyFiltro, recebimentoFiltro]);

  const resumo = useMemo(() => {
    return telesFiltradas.reduce(
      (acc: any, tele: any) => {
        const total = valorTotalTele(tele);
        const recebido = valorRecebidoTele(tele);
        const saldo = saldoTele(tele);
        const totaisRecebedores = totaisRecebedoresTele(tele);

        acc.total += total;
        acc.recebido += recebido;
        acc.pendente += saldo;
        acc.recebidoEscritorio += totaisRecebedores.escritorio;
        acc.recebidoMotoboy += totaisRecebedores.motoboy;

        return acc;
      },
      {
        total: 0,
        recebido: 0,
        pendente: 0,
        recebidoEscritorio: 0,
        recebidoMotoboy: 0,
      }
    );
  }, [telesFiltradas]);

  const resumoClientes = useMemo(() => {
    return Object.values(
      telesFiltradas.reduce((acc: any, tele: any) => {
        const nome = tele.solicitante || "Sem cliente";

        if (!acc[nome]) {
          acc[nome] = {
            nome,
            quantidade: 0,
            total: 0,
            recebido: 0,
            saldo: 0,
          };
        }

        acc[nome].quantidade += 1;
        acc[nome].total += valorTotalTele(tele);
        acc[nome].recebido += valorRecebidoTele(tele);
        acc[nome].saldo += saldoTele(tele);

        return acc;
      }, {})
    ) as any[];
  }, [telesFiltradas]);

  const resumoMotoboys = useMemo(() => {
    return Object.values(
      telesFiltradas.reduce((acc: any, tele: any) => {
        const nome = tele.motoboy || "Sem motoboy";

        if (!acc[nome]) {
          acc[nome] = {
            nome,
            quantidade: 0,
            total: 0,
            recebido: 0,
            saldo: 0,
          };
        }

        acc[nome].quantidade += 1;
        acc[nome].total += valorTotalTele(tele);
        acc[nome].recebido += valorRecebidoTele(tele);
        acc[nome].saldo += saldoTele(tele);

        return acc;
      }, {})
    ) as any[];
  }, [telesFiltradas]);

  const textoExtrato = useMemo(() => {
    let texto = "EXTRATO GERAL\n\n";

    texto += `Teles: ${telesFiltradas.length}\n`;
    texto += `Faturamento: R$ ${formatarValor(resumo.total)}\n`;
    texto += `Já recebido: R$ ${formatarValor(resumo.recebido)}\n`;
    texto += `Recebido escritório: R$ ${formatarValor(resumo.recebidoEscritorio)}\n`;
    texto += `Recebido motoboy: R$ ${formatarValor(resumo.recebidoMotoboy)}\n`;
    texto += `A receber: R$ ${formatarValor(resumo.pendente)}\n\n`;

    texto += "DETALHADO\n";

    telesFiltradas.forEach((tele: any) => {
      texto += `\n${formatarData(dataDaTele(tele))}`;
      texto += `\nCliente: ${tele.solicitante || "Sem cliente"}`;
      texto += `\nMotoboy: ${tele.motoboy || "Sem motoboy"}`;
      texto += `\nStatus operação: ${tele.status || "-"}`;
      texto += `\nStatus financeiro: ${statusFinanceiro(tele)}`;
      texto += `\nRecebedor: ${recebedorFinanceiro(tele)}`;
      texto += `\nTotal: R$ ${formatarValor(valorTotalTele(tele))}`;
      texto += `\nRecebido: R$ ${formatarValor(valorRecebidoTele(tele))}`;
      texto += `\nSaldo: R$ ${formatarValor(saldoTele(tele))}`;
      texto += "\n-------------------------\n";
    });

    return texto;
  }, [telesFiltradas, resumo]);

  const textoPorDia = useMemo(() => {
    const grupos: Record<string, any[]> = {};

    const ordenadas = [...telesFiltradas].sort((a: any, b: any) =>
      dataDaTele(a).localeCompare(dataDaTele(b))
    );

    ordenadas.forEach((tele: any) => {
      const data = formatarData(dataDaTele(tele));

      if (!grupos[data]) {
        grupos[data] = [];
      }

      grupos[data].push(tele);
    });

    let texto = "";

    Object.entries(grupos).forEach(([data, telesDoDia]) => {
      const emAberto = telesDoDia.filter((tele: any) => saldoTele(tele) > 0.009);

      if (emAberto.length === 0) return;

      texto += `${data}\n`;

      emAberto.forEach((tele: any) => {
        texto += `- ${clienteResponsavelCobranca(tele)} - R$${formatarValor(saldoTele(tele))}\n`;
      });

      texto += "\n";
    });

    texto += `Total - R$${formatarValor(resumo.pendente)}`;

    return texto;
  }, [telesFiltradas, resumo.pendente]);

  async function copiarTexto(texto: string, mensagem: string) {
    try {
      await navigator.clipboard.writeText(texto);
      alert(mensagem);
    } catch {
      alert("Não foi possível copiar o texto.");
    }
  }

  return (
    <>
      <div className="mb-8 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm md:p-8">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-5">
          <FiltroData label="Data inicial" value={dataInicio} onChange={setDataInicio} />

          <FiltroData label="Data final" value={dataFim} onChange={setDataFim} />

          <FiltroSelect
            label="Cliente"
            value={clienteFiltro}
            onChange={setClienteFiltro}
            options={[
              { value: "todos", label: "Todos" },
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
              { value: "todos", label: "Todos" },
              { value: "sem-motoboy", label: "Sem motoboy" },
              ...motoboys.map((motoboy: any) => ({
                value: motoboy.nome,
                label: motoboy.nome,
              })),
            ]}
          />

          <FiltroSelect
            label="Financeiro"
            value={recebimentoFiltro}
            onChange={setRecebimentoFiltro}
            options={[
              { value: "todos", label: "Todos" },
              { value: "pendente", label: "Pendente" },
              { value: "parcial", label: "Pagamento parcial" },
              { value: "escritorio", label: "Recebido escritório" },
              { value: "motoboy", label: "Recebido motoboy" },
            ]}
          />
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-6">
        <Card titulo="Teles" valor={`${telesFiltradas.length}`} icon={<FileText size={24} />} />

        <Card
          titulo="Faturamento"
          valor={`R$ ${formatarValor(resumo.total)}`}
          icon={<DollarSign size={24} />}
        />

        <Card
          titulo="Já recebido"
          valor={`R$ ${formatarValor(resumo.recebido)}`}
          icon={<DollarSign size={24} />}
        />

        <Card
          titulo="Escritório"
          valor={`R$ ${formatarValor(resumo.recebidoEscritorio)}`}
          icon={<Building2 size={24} />}
        />

        <Card
          titulo="Motoboys"
          valor={`R$ ${formatarValor(resumo.recebidoMotoboy)}`}
          icon={<Bike size={24} />}
        />

        <Card
          titulo="A receber"
          valor={`R$ ${formatarValor(resumo.pendente)}`}
          icon={<Users size={24} />}
        />
      </div>

      <div className="mb-8 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm md:p-6">
        <h2 className="mb-5 text-2xl font-bold text-slate-900">Detalhamento das teles</h2>

        {telesFiltradas.length === 0 ? (
          <p className="text-slate-500">Nenhuma tele encontrada.</p>
        ) : (
          <div className="space-y-4">
            {telesFiltradas.map((tele: any) => (
              <div
                key={tele.id}
                className="grid grid-cols-1 gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 md:grid-cols-3 xl:grid-cols-8"
              >
                <Campo titulo="Data" valor={formatarData(dataDaTele(tele))} />

                <Campo titulo="Cliente" valor={tele.solicitante || "Sem cliente"} />

                <Campo titulo="Motoboy" valor={tele.motoboy || "Sem motoboy"} />

                <Campo titulo="Operação" valor={tele.status || "-"} />

                <Campo titulo="Financeiro" valor={statusFinanceiro(tele)} />

                <Campo titulo="Recebedor" valor={recebedorFinanceiro(tele)} />

                <Campo titulo="Recebido" valor={`R$ ${formatarValor(valorRecebidoTele(tele))}`} />

                <Campo titulo="Saldo" valor={`R$ ${formatarValor(saldoTele(tele))}`} direita />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Resumo titulo="Resumo por cliente" itens={resumoClientes} />

        <Resumo titulo="Resumo por motoboy" itens={resumoMotoboys} />
      </div>

      <div className="mb-8 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm md:p-6">
        <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Extrato por dia</h2>

          <button
            type="button"
            onClick={() => void copiarTexto(textoPorDia, "Extrato por dia copiado!")}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 font-semibold text-white md:w-auto"
          >
            <Copy size={18} />
            Copiar extrato por dia
          </button>
        </div>

        <textarea
          value={textoPorDia}
          readOnly
          className="h-72 w-full whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 p-5 outline-none md:h-96"
        />
      </div>

      <div className="max-w-5xl rounded-3xl border border-slate-100 bg-white p-5 shadow-sm md:p-8">
        <textarea
          value={textoExtrato}
          readOnly
          className="h-96 w-full rounded-2xl border border-slate-200 bg-slate-50 p-5 outline-none"
        />

        <button
          type="button"
          onClick={() => void copiarTexto(textoExtrato, "Extrato copiado!")}
          className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 text-white md:w-auto"
        >
          <Copy size={18} />
          Copiar extrato completo
        </button>
      </div>
    </>
  );
}

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

type Opcao = {
  value: string;
  label: string;
};

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
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Card({ titulo, valor, icon }: { titulo: string; valor: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
        {icon}
      </div>

      <p className="text-sm text-slate-500">{titulo}</p>
      <h2 className="mt-2 text-2xl font-bold text-slate-900">{valor}</h2>
    </div>
  );
}

function Campo({
  titulo,
  valor,
  direita = false,
}: {
  titulo: string;
  valor: string;
  direita?: boolean;
}) {
  return (
    <div className={direita ? "xl:text-right" : ""}>
      <p className="text-xs text-slate-500">{titulo}</p>
      <strong className="text-sm text-slate-900">{valor}</strong>
    </div>
  );
}

function Resumo({ titulo, itens }: { titulo: string; itens: any[] }) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
      <h2 className="mb-5 text-xl font-bold text-slate-900">{titulo}</h2>

      {itens.length === 0 ? (
        <p className="text-sm text-slate-500">Nenhum registro encontrado.</p>
      ) : (
        <div className="space-y-3">
          {itens.map((item: any) => (
            <div key={item.nome} className="rounded-2xl bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <strong className="text-slate-900">{item.nome}</strong>

                  <p className="mt-1 text-sm text-slate-500">{item.quantidade} teles</p>
                </div>

                <strong className="text-slate-900">R$ {formatarValor(item.total)}</strong>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-white px-3 py-2">
                  <p className="text-xs text-slate-400">Recebido</p>
                  <strong className="text-emerald-700">R$ {formatarValor(item.recebido)}</strong>
                </div>

                <div className="rounded-xl bg-white px-3 py-2">
                  <p className="text-xs text-slate-400">Saldo</p>
                  <strong className="text-orange-600">R$ {formatarValor(item.saldo)}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
