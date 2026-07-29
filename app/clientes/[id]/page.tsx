"use client";

import PageContainer from "@/components/ui/PageContainer";
import PageHeader from "@/components/ui/PageHeader";
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  Clock3,
  Loader2,
  ReceiptText,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type MesPerformance = {
  chave: string;
  ano: number;
  mes: number;
  total: number;
  quantidade: number;
};

type AnoPerformance = {
  ano: number;
  total: number;
  quantidade: number;
};

type PerformanceCliente = {
  cliente: {
    id: string;
    nome: string;
    telefone?: string | null;
    endereco1?: string | null;
    endereco2?: string | null;
    formaCobranca: string;
    createdAt: string;
  };
  resumo: {
    primeiroRegistro: string | null;
    ultimoRegistro: string | null;
    totalDesdeSempre: number;
    quantidadeRegistros: number;
    quantidadeMesesAtivos: number;
    mediaMensal: number;
    ticketMedio: number;
    melhorMes: MesPerformance | null;
    melhorAno: AnoPerformance | null;
  };
  anos: AnoPerformance[];
  meses: MesPerformance[];
  fontes: {
    quantidadeDiasImportados: number;
    quantidadeDiasSistema: number;
    regraMesclagem: string;
  };
};

function formatarDinheiro(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarData(data: string | null) {
  if (!data) return "Sem registro";

  const [ano, mes, dia] = data.split("-");
  return `${dia}/${mes}/${ano}`;
}

function nomeMes(mes: number) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "long",
  }).format(new Date(2026, mes - 1, 1));
}

export default function ClientePerformancePage() {
  const params = useParams<{ id: string }>();
  const clienteId = params?.id;

  const [dados, setDados] = useState<PerformanceCliente | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [anoSelecionado, setAnoSelecionado] = useState<string>("todos");

  useEffect(() => {
    let ativo = true;

    async function carregarPerformance() {
      if (!clienteId) return;

      try {
        setCarregando(true);
        setErro("");

        const resposta = await fetch(`/api/clientes/${clienteId}/performance`, {
          cache: "no-store",
        });

        const retorno = await resposta.json();

        if (!resposta.ok) {
          throw new Error(retorno.erro || "Não foi possível carregar o cliente.");
        }

        if (ativo) {
          setDados(retorno);
        }
      } catch (error) {
        if (ativo) {
          setErro(
            error instanceof Error
              ? error.message
              : "Não foi possível carregar o histórico do cliente."
          );
        }
      } finally {
        if (ativo) {
          setCarregando(false);
        }
      }
    }

    void carregarPerformance();

    return () => {
      ativo = false;
    };
  }, [clienteId]);

  const mesesFiltrados = useMemo(() => {
    if (!dados) return [];

    if (anoSelecionado === "todos") {
      return [...dados.meses].reverse();
    }

    return dados.meses.filter((item) => String(item.ano) === anoSelecionado).reverse();
  }, [anoSelecionado, dados]);

  if (carregando) {
    return (
      <PageContainer>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="flex items-center gap-3 text-slate-500">
            <Loader2 size={22} className="animate-spin" />
            Carregando desempenho do cliente...
          </div>
        </div>
      </PageContainer>
    );
  }

  if (erro || !dados) {
    return (
      <PageContainer>
        <Link
          href="/clientes"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700"
        >
          <ArrowLeft size={17} />
          Voltar para clientes
        </Link>

        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700">
          {erro || "Cliente não encontrado."}
        </div>
      </PageContainer>
    );
  }

  const { cliente, resumo, anos, fontes } = dados;

  return (
    <PageContainer>
      <div className="mb-6">
        <Link
          href="/clientes"
          className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
        >
          <ArrowLeft size={17} />
          Voltar para clientes
        </Link>
      </div>

      <PageHeader
        titulo={cliente.nome}
        descricao="Histórico completo e desempenho financeiro do cliente."
      />

      <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <CardResumo
          titulo="Total desde sempre"
          valor={formatarDinheiro(resumo.totalDesdeSempre)}
          descricao={`${resumo.quantidadeRegistros} registros considerados`}
          icon={<CircleDollarSign size={22} />}
        />

        <CardResumo
          titulo="Primeiro registro"
          valor={formatarData(resumo.primeiroRegistro)}
          descricao="Início do relacionamento"
          icon={<CalendarDays size={22} />}
        />

        <CardResumo
          titulo="Média mensal"
          valor={formatarDinheiro(resumo.mediaMensal)}
          descricao={`${resumo.quantidadeMesesAtivos} meses com movimento`}
          icon={<BarChart3 size={22} />}
        />

        <CardResumo
          titulo="Ticket médio"
          valor={formatarDinheiro(resumo.ticketMedio)}
          descricao="Média por registro"
          icon={<ReceiptText size={22} />}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm md:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <Trophy size={21} />
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900">Melhores resultados</h2>
              <p className="mt-1 text-sm text-slate-500">
                Maior desempenho encontrado no histórico.
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Destaque
              titulo="Melhor mês"
              valor={
                resumo.melhorMes
                  ? `${nomeMes(resumo.melhorMes.mes)} de ${resumo.melhorMes.ano}`
                  : "Sem dados"
              }
              descricao={
                resumo.melhorMes ? formatarDinheiro(resumo.melhorMes.total) : formatarDinheiro(0)
              }
            />

            <Destaque
              titulo="Melhor ano"
              valor={resumo.melhorAno ? String(resumo.melhorAno.ano) : "Sem dados"}
              descricao={
                resumo.melhorAno ? formatarDinheiro(resumo.melhorAno.total) : formatarDinheiro(0)
              }
            />
          </div>
        </section>

        <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm md:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <Clock3 size={21} />
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900">Linha do tempo</h2>
              <p className="mt-1 text-sm text-slate-500">
                Período coberto pelos dados disponíveis.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <LinhaInfo label="Primeiro registro" valor={formatarData(resumo.primeiroRegistro)} />
            <LinhaInfo label="Último registro" valor={formatarData(resumo.ultimoRegistro)} />
            <LinhaInfo label="Dias importados" valor={String(fontes.quantidadeDiasImportados)} />
            <LinhaInfo label="Dias pelo sistema" valor={String(fontes.quantidadeDiasSistema)} />
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm md:p-6">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Desempenho anual</h2>
            <p className="mt-1 text-sm text-slate-500">Faturamento acumulado por ano.</p>
          </div>
        </div>

        {anos.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum dado anual encontrado.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {[...anos].reverse().map((ano) => (
              <div key={ano.ano} className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
                <p className="text-sm font-medium text-slate-500">{ano.ano}</p>
                <strong className="mt-2 block text-2xl text-slate-900">
                  {formatarDinheiro(ano.total)}
                </strong>
                <p className="mt-2 text-xs text-slate-500">
                  {ano.quantidade} {ano.quantidade === 1 ? "registro" : "registros"}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-6 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm md:p-6">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Desempenho mensal</h2>
            <p className="mt-1 text-sm text-slate-500">Histórico mês a mês do cliente.</p>
          </div>

          <select
            value={anoSelecionado}
            onChange={(event) => setAnoSelecionado(event.target.value)}
            className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-emerald-500"
          >
            <option value="todos">Todos os anos</option>
            {[...anos].reverse().map((ano) => (
              <option key={ano.ano} value={String(ano.ano)}>
                {ano.ano}
              </option>
            ))}
          </select>
        </div>

        {mesesFiltrados.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum mês encontrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px]">
              <thead>
                <tr className="border-b text-left text-sm text-slate-500">
                  <th className="p-3">Mês</th>
                  <th className="p-3">Ano</th>
                  <th className="p-3">Registros</th>
                  <th className="p-3 text-right">Faturamento</th>
                </tr>
              </thead>

              <tbody>
                {mesesFiltrados.map((mes) => (
                  <tr key={mes.chave} className="border-b last:border-b-0">
                    <td className="p-3 font-semibold capitalize text-slate-900">
                      {nomeMes(mes.mes)}
                    </td>
                    <td className="p-3 text-slate-600">{mes.ano}</td>
                    <td className="p-3 text-slate-600">{mes.quantidade}</td>
                    <td className="p-3 text-right font-semibold text-emerald-700">
                      {formatarDinheiro(mes.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-6 rounded-3xl border border-blue-200 bg-blue-50 p-5 text-sm leading-6 text-blue-800">
        <strong>Como os dados são combinados:</strong> {fontes.regraMesclagem}
      </section>
    </PageContainer>
  );
}

function CardResumo({
  titulo,
  valor,
  descricao,
  icon,
}: {
  titulo: string;
  valor: string;
  descricao: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{titulo}</p>
          <strong className="mt-2 block text-2xl text-slate-900">{valor}</strong>
          <p className="mt-2 text-xs text-slate-400">{descricao}</p>
        </div>

        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
          {icon}
        </div>
      </div>
    </div>
  );
}

function Destaque({
  titulo,
  valor,
  descricao,
}: {
  titulo: string;
  valor: string;
  descricao: string;
}) {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">{titulo}</p>
      <strong className="mt-2 block capitalize text-slate-900">{valor}</strong>
      <p className="mt-1 text-sm font-semibold text-amber-800">{descricao}</p>
    </div>
  );
}

function LinhaInfo({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3">
      <span className="text-sm text-slate-500">{label}</span>
      <strong className="text-sm text-slate-900">{valor}</strong>
    </div>
  );
}
