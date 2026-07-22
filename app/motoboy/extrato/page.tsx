"use client";

import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  PackageCheck,
  ReceiptText,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

export default function ExtratoMotoboyPage() {
  const [teles, setTeles] = useState<any[]>([]);
  const [movimentos, setMovimentos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        const resposta = await fetch("/api/motoboys/minhas-teles");
        const dados = await resposta.json();

        const financeiroRes = await fetch("/api/motoboys/meu-financeiro");
        const financeiroDados = await financeiroRes.json();

        if (!ativo) return;

        setTeles(Array.isArray(dados) ? dados : []);
        setMovimentos(Array.isArray(financeiroDados) ? financeiroDados : []);
      } catch (error) {
        console.error(error);
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    void carregar();

    return () => {
      ativo = false;
    };
  }, []);

  function dataLocalISO() {
    const agora = new Date();

    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, "0");
    const dia = String(agora.getDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
  }

  function dataNoFusoBrasil(data: string | Date) {
    const partes = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date(data));

    const ano = partes.find((parte) => parte.type === "year")?.value;
    const mes = partes.find((parte) => parte.type === "month")?.value;
    const dia = partes.find((parte) => parte.type === "day")?.value;

    return `${ano}-${mes}-${dia}`;
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

  function formatarData(data: any) {
    if (!data) return "-";

    return new Date(data).toLocaleDateString("pt-BR", {
      timeZone: "America/Sao_Paulo",
    });
  }

  function formatarValor(valor: number) {
    return valor.toFixed(2).replace(".", ",");
  }

  const telesFiltradas = useMemo(() => {
    return teles.filter((tele: any) => {
      const dataTele = dataDaTele(tele);

      if (dataInicio && dataTele < dataInicio) return false;

      const dataFinalFiltro = dataFim || dataInicio || dataLocalISO();

      if (dataTele > dataFinalFiltro) return false;

      return true;
    });
  }, [teles, dataInicio, dataFim]);

  const movimentosFiltrados = useMemo(() => {
    return movimentos.filter((movimento: any) => {
      const dataCriacao = dataNoFusoBrasil(movimento.criadoEm);

      const inicio = movimento.dataReferenciaInicio
        ? dataNoFusoBrasil(movimento.dataReferenciaInicio)
        : dataCriacao;

      const fim = movimento.dataReferenciaFim
        ? dataNoFusoBrasil(movimento.dataReferenciaFim)
        : inicio;

      if (dataInicio && fim < dataInicio) return false;
      if (dataFim && inicio > dataFim) return false;

      return true;
    });
  }, [movimentos, dataInicio, dataFim]);

  const bruto = telesFiltradas.reduce((total, tele) => total + Number(tele.total || 0), 0);

  const liquido = bruto * 0.8;

  const recebido = movimentosFiltrados.reduce(
    (total, movimento) => total + Number(movimento.valor || 0),
    0
  );

  const aReceber = liquido - recebido;

  if (carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm font-medium text-slate-500">Carregando extrato...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto w-full max-w-6xl">
        <Link
          href="/motoboy"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <ArrowLeft size={17} />
          Voltar
        </Link>

        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600">
            Área do motoboy
          </p>

          <h1 className="mt-1 text-3xl font-bold text-slate-900">Extrato detalhado</h1>

          <p className="mt-2 text-sm text-slate-500">
            Consulte suas entregas e recebimentos por período.
          </p>
        </div>

        <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-4 md:px-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <CalendarDays size={19} />
            </div>

            <div>
              <h2 className="font-bold text-slate-900">Filtrar período</h2>
              <p className="text-xs text-slate-500">Escolha uma data inicial e final.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-2 md:p-6">
            <div>
              <label className="text-sm font-medium text-slate-600">Data inicial</label>
              <input
                type="date"
                value={dataInicio}
                onChange={(event) => setDataInicio(event.target.value)}
                className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-600">Data final</label>
              <input
                type="date"
                value={dataFim}
                onChange={(event) => setDataFim(event.target.value)}
                className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
            </div>
          </div>
        </section>

        <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
          <Resumo
            titulo="Entregas"
            valor={String(telesFiltradas.length)}
            icone={<PackageCheck size={20} />}
          />

          <Resumo
            titulo="Bruto"
            valor={`R$ ${formatarValor(bruto)}`}
            icone={<ReceiptText size={20} />}
          />

          <Resumo
            titulo="Líquido"
            valor={`R$ ${formatarValor(liquido)}`}
            icone={<WalletCards size={20} />}
          />

          <Resumo
            titulo="Recebido"
            valor={`R$ ${formatarValor(recebido)}`}
            icone={<CheckCircle2 size={20} />}
          />

          <Resumo
            titulo="A receber"
            valor={`R$ ${formatarValor(aReceber)}`}
            icone={<CircleDollarSign size={20} />}
            destaque
          />
        </div>

        <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-5 md:px-6">
            <h2 className="text-xl font-bold text-slate-900">Histórico financeiro</h2>
            <p className="mt-1 text-sm text-slate-500">
              Valores que você já recebeu no período filtrado.
            </p>
          </div>

          {movimentosFiltrados.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Nenhum recebimento encontrado nesse período.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {movimentosFiltrados.map((movimento) => (
                <article
                  key={movimento.id}
                  className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between md:p-6"
                >
                  <div className="min-w-0">
                    <strong className="text-slate-900">
                      {movimento.tipo === "CLIENTE"
                        ? movimento.clienteNome || "Cliente"
                        : movimento.tipo === "ESCRITORIO"
                          ? "Escritório"
                          : "Ajuste"}
                    </strong>

                    <p className="mt-1 text-sm text-slate-500">
                      {formatarData(movimento.criadoEm)}
                    </p>

                    {movimento.dataReferenciaInicio && (
                      <p className="mt-1 text-xs text-slate-400">
                        Referente a {formatarData(movimento.dataReferenciaInicio)}
                        {movimento.dataReferenciaFim &&
                          ` até ${formatarData(movimento.dataReferenciaFim)}`}
                      </p>
                    )}

                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {movimento.descricao || "Recebimento"}
                    </p>
                  </div>

                  <strong className="shrink-0 whitespace-nowrap text-emerald-700">
                    R$ {formatarValor(Number(movimento.valor || 0))}
                  </strong>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-5 md:px-6">
            <h2 className="text-xl font-bold text-slate-900">Entregas</h2>
            <p className="mt-1 text-sm text-slate-500">
              Histórico de teles dentro do período selecionado.
            </p>
          </div>

          {telesFiltradas.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Nenhuma entrega encontrada.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {telesFiltradas.map((tele) => {
                const primeiraParada = tele.paradas?.[0];
                const ultimaParada = tele.paradas?.[tele.paradas.length - 1];

                return (
                  <article
                    key={tele.id}
                    className="flex flex-col gap-5 p-5 md:flex-row md:items-start md:justify-between md:p-6"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <strong className="text-slate-900">{tele.solicitante}</strong>

                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                          {formatarStatus(tele.status)}
                        </span>
                      </div>

                      <p className="mt-2 text-sm text-slate-500">{formatarData(tele.dataTele)}</p>

                      <div className="mt-4 space-y-2">
                        <p className="font-medium text-slate-800">
                          {primeiraParada?.cliente || "Origem não informada"}
                          {ultimaParada &&
                            ultimaParada !== primeiraParada &&
                            ` → ${ultimaParada.cliente || "Destino não informado"}`}
                        </p>

                        <p className="text-sm leading-6 text-slate-500">
                          {primeiraParada?.endereco || "Endereço não informado"}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 md:text-right">
                      <p className="text-lg font-bold text-slate-900">
                        R$ {formatarValor(Number(tele.total || 0))}
                      </p>

                      <p className="mt-1 font-semibold text-emerald-700">
                        Líquido R$ {formatarValor(Number(tele.total || 0) * 0.8)}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

type ResumoProps = {
  titulo: string;
  valor: string;
  icone: React.ReactNode;
  destaque?: boolean;
};

function Resumo({ titulo, valor, icone, destaque = false }: ResumoProps) {
  return (
    <div
      className={`rounded-2xl border bg-white p-5 shadow-sm ${
        destaque ? "border-emerald-200" : "border-slate-100"
      }`}
    >
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
          destaque ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
        }`}
      >
        {icone}
      </div>

      <p className="mt-4 text-sm font-medium text-slate-500">{titulo}</p>

      <strong
        className={`mt-2 block text-xl font-bold md:text-2xl ${
          destaque ? "text-emerald-700" : "text-slate-900"
        }`}
      >
        {valor}
      </strong>
    </div>
  );
}

function formatarStatus(status: string) {
  const mapa: Record<string, string> = {
    AGUARDANDO_CLIENTE: "Aguardando cliente",
    AGUARDANDO_MOTOBOY: "Aguardando motoboy",
    AGUARDANDO_COLETA: "Aguardando coleta",
    EM_ROTA: "Em rota",
    ENTREGUE: "Entregue",
  };

  return mapa[status] || status;
}
