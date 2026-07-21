"use client";

import PageContainer from "@/components/ui/PageContainer";
import PageHeader from "@/components/ui/PageHeader";
import { useExpressManager } from "@/context/ExpressManagerContext";
import type { Tele } from "@/types/Tele";
import {
  Bell,
  Calendar,
  ChevronRight,
  CircleAlert,
  FileText,
  Fuel,
  Heart,
  MapPin,
  MessageCircle,
  Package,
  Plus,
  Search,
  Trophy,
  Truck,
  User,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export default function Dashboard() {
  const { teles, motoboys } = useExpressManager();

  function converterValor(valor: string | number) {
    if (typeof valor === "number") {
      return Number.isFinite(valor) ? valor : 0;
    }

    const numero = Number(valor.replace(",", "."));
    return Number.isFinite(numero) ? numero : 0;
  }

  function formatarValor(valor: number) {
    return valor.toFixed(2).replace(".", ",");
  }

  function inicioDoDia(data: Date) {
    const resultado = new Date(data);
    resultado.setHours(0, 0, 0, 0);
    return resultado;
  }

  function dataOperacionalDaTele(tele: Tele) {
    const data = new Date(tele.dataTele);

    if (!Number.isNaN(data.getTime())) {
      return inicioDoDia(data);
    }

    const [dataTexto] = tele.criadoEm.split(",");
    const [dia, mes, ano] = dataTexto.split("/").map(Number);

    return new Date(ano, mes - 1, dia);
  }

  function valorDaTele(tele: Tele) {
    return converterValor(tele.total ?? tele.valor);
  }

  const hoje = inicioDoDia(new Date());
  const inicioDoMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const inicioDosSeteDias = new Date(hoje);
  inicioDosSeteDias.setDate(hoje.getDate() - 6);

  const telesHoje = teles.filter(
    (tele) => dataOperacionalDaTele(tele).getTime() === hoje.getTime()
  );

  const faturamentoHoje = telesHoje.reduce((total, tele) => total + valorDaTele(tele), 0);

  const telesEmAndamento = teles.filter((tele) => tele.status !== "Entregue");

  const entregasMes = teles.filter((tele) => {
    const data = dataOperacionalDaTele(tele);

    return tele.status === "Entregue" && data >= inicioDoMes && data <= hoje;
  });

  const faturamentoSeteDias = Array.from({ length: 7 }, (_, index) => {
    const data = new Date(inicioDosSeteDias);
    data.setDate(inicioDosSeteDias.getDate() + index);

    const total = teles
      .filter((tele) => dataOperacionalDaTele(tele).getTime() === data.getTime())
      .reduce((soma, tele) => soma + valorDaTele(tele), 0);

    return {
      data,
      dia: new Intl.DateTimeFormat("pt-BR", { weekday: "short" })
        .format(data)
        .replace(".", "")
        .slice(0, 3),
      total,
    };
  });

  const totalSeteDias = faturamentoSeteDias.reduce((soma, dia) => soma + dia.total, 0);
  const maiorFaturamentoDiario = Math.max(...faturamentoSeteDias.map((dia) => dia.total), 1);

  const proximasColetas = telesEmAndamento
    .map((tele) => ({
      tele,
      coleta: tele.paradas.find(
        (parada) => parada.tipo === "Coleta" || parada.tipo === "Entrega e coleta"
      ),
    }))
    .filter((item): item is { tele: Tele; coleta: Tele["paradas"][number] } => Boolean(item.coleta))
    .slice(0, 3);

  const topClientes = Object.values(
    teles.reduce<Record<string, { nome: string; quantidade: number; total: number }>>(
      (acc, tele) => {
        if (!acc[tele.solicitante]) {
          acc[tele.solicitante] = {
            nome: tele.solicitante,
            quantidade: 0,
            total: 0,
          };
        }

        acc[tele.solicitante].quantidade += 1;
        acc[tele.solicitante].total += valorDaTele(tele);

        return acc;
      },
      {}
    )
  )
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);

  const contasAReceber = teles
    .filter((tele) => !tele.recebimento || tele.recebimento === "pendente")
    .reduce((total, tele) => total + valorDaTele(tele), 0);

  const telesSemMotoboy = telesEmAndamento.filter((tele) => !tele.motoboy).length;
  const telesAguardandoCliente = telesEmAndamento.filter(
    (tele) => tele.status === "Aguardando cliente"
  ).length;

  return (
    <PageContainer>
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-5 mb-8">
        <PageHeader
          titulo="Olá, Henrique! 👋"
          descricao="Aqui está o resumo da sua operação hoje."
        />

        <div className="hidden md:flex items-center gap-5">
          <div className="w-[330px] h-16 bg-white rounded-2xl shadow-sm flex items-center px-6 gap-3">
            <Search className="text-slate-500" />
            <span className="text-slate-500">Buscar...</span>
          </div>

          <CircleButton icon={<MessageCircle />} />
          <CircleButton icon={<Bell />} alert />
          <div className="w-16 h-16 rounded-full bg-slate-300" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
        <Card
          title="Faturamento hoje"
          value={`R$ ${formatarValor(faturamentoHoje)}`}
          icon={<Truck size={24} />}
          description={`${telesHoje.length} ${
            telesHoje.length === 1 ? "tele registrada" : "teles registradas"
          } hoje`}
          tone="emerald"
        />

        <Card
          title="Teles hoje"
          value={`${telesHoje.length}`}
          icon={<Heart size={24} />}
          description={`${telesEmAndamento.length} em andamento na operação`}
          tone="blue"
        />

        <Card
          title="Motoboys cadastrados"
          value={`${motoboys.length}`}
          icon={<User size={24} />}
          description="Equipe disponível no sistema"
          tone="orange"
        />

        <Card
          title="Entregas no mês"
          value={`${entregasMes.length}`}
          icon={<Package size={24} />}
          description="Teles concluídas neste mês"
          tone="violet"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <Panel title="Teles em andamento" button="Ver todas">
          <div className="space-y-3">
            {telesEmAndamento.slice(0, 5).map((tele) => (
              <TeleEmAndamento
                key={tele.id}
                tele={tele}
                valor={`R$ ${formatarValor(valorDaTele(tele))}`}
              />
            ))}
          </div>

          {telesEmAndamento.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center">
              <Truck className="mx-auto text-slate-300" size={30} />
              <p className="mt-3 font-medium text-slate-700">Nenhuma tele em andamento</p>
              <p className="mt-1 text-sm text-slate-500">
                As novas operações aparecerão aqui automaticamente.
              </p>
            </div>
          )}

          <Link
            href="/teles"
            className="mt-5 flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
          >
            Ver todas as operações
            <ChevronRight size={16} />
          </Link>
        </Panel>

        <Panel title="Faturamento dos últimos 7 dias" button="7 dias">
          <div className="flex flex-col gap-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Total acumulado</p>
                <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
                  R$ {formatarValor(totalSeteDias)}
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Soma das teles registradas nos últimos sete dias.
                </p>
              </div>

              <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-left sm:text-right">
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Média diária
                </p>
                <p className="mt-1 text-lg font-bold text-emerald-800">
                  R$ {formatarValor(totalSeteDias / 7)}
                </p>
              </div>
            </div>

            <div className="relative mt-2 h-64 rounded-2xl border border-slate-100 bg-slate-50/70 px-3 pb-4 pt-6 sm:px-5">
              <div className="pointer-events-none absolute inset-x-3 top-6 bottom-12 flex flex-col justify-between sm:inset-x-5">
                {[0, 1, 2, 3].map((linha) => (
                  <div key={linha} className="border-t border-dashed border-slate-200" />
                ))}
              </div>

              <div className="relative z-10 flex h-full items-end justify-between gap-2">
                {faturamentoSeteDias.map((dia) => {
                  const altura =
                    dia.total === 0
                      ? 4
                      : Math.max(12, Math.round((dia.total / maiorFaturamentoDiario) * 172));

                  const dataFormatada = new Intl.DateTimeFormat("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                  }).format(dia.data);

                  return (
                    <div
                      key={dia.data.toISOString()}
                      className="group flex h-full flex-1 flex-col items-center justify-end gap-2"
                    >
                      <div className="relative flex h-[172px] w-full items-end justify-center">
                        <div className="pointer-events-none absolute -top-1 left-1/2 z-20 hidden -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white shadow-lg group-hover:block">
                          R$ {formatarValor(dia.total)}
                        </div>

                        <div
                          className="w-full max-w-9 rounded-t-xl bg-gradient-to-t from-emerald-600 to-emerald-400 shadow-sm transition duration-200 group-hover:-translate-y-1 group-hover:shadow-md"
                          style={{ height: `${altura}px` }}
                          title={`R$ ${formatarValor(dia.total)}`}
                        />
                      </div>

                      <div className="text-center">
                        <p className="text-xs font-semibold capitalize text-slate-700">{dia.dia}</p>
                        <p className="mt-0.5 text-[11px] text-slate-400">{dataFormatada}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Panel title="Próximas coletas" button="Ver todas">
          <div className="space-y-3">
            {proximasColetas.map(({ tele, coleta }) => (
              <Collect
                key={tele.id}
                teleId={tele.id}
                status={tele.status}
                title={coleta.cliente || tele.solicitante}
                address={coleta.endereco}
                boy={tele.motoboy || "Sem motoboy"}
              />
            ))}
          </div>

          {proximasColetas.length === 0 && (
            <EmptyPanel
              icon={<MapPin size={22} />}
              title="Nenhuma coleta pendente"
              text="As próximas coletas aparecerão aqui."
            />
          )}

          {proximasColetas.length > 0 && (
            <Link
              href="/teles"
              className="mt-4 flex items-center justify-center gap-1 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
            >
              Ver todas as coletas <ChevronRight size={16} />
            </Link>
          )}
        </Panel>

        <Panel title="Top clientes" button="Ranking geral">
          <div className="space-y-2">
            {topClientes.map((cliente, index) => (
              <Client
                key={cliente.nome}
                position={index + 1}
                name={cliente.nome}
                quantity={cliente.quantidade}
                value={`R$ ${formatarValor(cliente.total)}`}
              />
            ))}
          </div>

          {topClientes.length === 0 && (
            <EmptyPanel
              icon={<Trophy size={22} />}
              title="Ranking ainda vazio"
              text="Os clientes com maior faturamento aparecerão aqui."
            />
          )}
        </Panel>

        <Panel title="Avisos importantes" button="Resumo">
          <div className="space-y-3">
            <Notice
              icon={<Calendar size={21} />}
              title="Operação do dia"
              text={`${telesHoje.length} ${
                telesHoje.length === 1 ? "tele registrada" : "teles registradas"
              } hoje.`}
              tone="emerald"
            />

            <Notice
              icon={<CircleAlert size={21} />}
              title="Teles sem motoboy"
              text={
                telesSemMotoboy > 0
                  ? `${telesSemMotoboy} ${
                      telesSemMotoboy === 1 ? "tele precisa" : "teles precisam"
                    } de motoboy.`
                  : "Nenhuma tele aguardando motoboy."
              }
              tone={telesSemMotoboy > 0 ? "orange" : "emerald"}
            />

            <Notice
              icon={<Fuel size={21} />}
              title="Aguardando cliente"
              text={
                telesAguardandoCliente > 0
                  ? `${telesAguardandoCliente} ${
                      telesAguardandoCliente === 1 ? "tele aguarda" : "teles aguardam"
                    } confirmação.`
                  : "Nenhuma confirmação de cliente pendente."
              }
              tone={telesAguardandoCliente > 0 ? "blue" : "emerald"}
            />

            <Notice
              icon={<FileText size={21} />}
              title="Contas a receber"
              text={`R$ ${formatarValor(contasAReceber)} pendentes de recebimento.`}
              tone="violet"
            />
          </div>
        </Panel>
      </div>

      <Link
        href="/nova-tele"
        className="fixed bottom-8 right-8 w-16 h-16 rounded-full bg-emerald-600 text-white shadow-xl flex items-center justify-center"
      >
        <Plus size={34} />
      </Link>
    </PageContainer>
  );
}

function CircleButton({ icon, alert }: any) {
  return (
    <div className="relative w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center">
      {icon}
      {alert && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-6 h-6 rounded-full flex items-center justify-center">
          3
        </span>
      )}
    </div>
  );
}

type CardTone = "emerald" | "blue" | "orange" | "violet";

type CardProps = {
  title: string;
  value: string;
  icon: ReactNode;
  description: string;
  tone: CardTone;
};

const cardToneClasses: Record<
  CardTone,
  {
    icon: string;
    detail: string;
    glow: string;
  }
> = {
  emerald: {
    icon: "bg-emerald-100 text-emerald-700",
    detail: "bg-emerald-500",
    glow: "bg-emerald-100",
  },
  blue: {
    icon: "bg-blue-100 text-blue-700",
    detail: "bg-blue-500",
    glow: "bg-blue-100",
  },
  orange: {
    icon: "bg-orange-100 text-orange-700",
    detail: "bg-orange-500",
    glow: "bg-orange-100",
  },
  violet: {
    icon: "bg-violet-100 text-violet-700",
    detail: "bg-violet-500",
    glow: "bg-violet-100",
  },
};

function Card({ title, value, icon, description, tone }: CardProps) {
  const toneClasses = cardToneClasses[tone];

  return (
    <div className="relative min-h-44 overflow-hidden rounded-3xl border border-slate-100 bg-white p-6 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div
        className={`pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-40 ${toneClasses.glow}`}
      />

      <div className="relative flex h-full flex-col justify-between gap-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">{title}</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</h2>
          </div>

          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${toneClasses.icon}`}
          >
            {icon}
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-500">
          <span className={`h-2 w-2 shrink-0 rounded-full ${toneClasses.detail}`} />
          <span>{description}</span>
        </div>
      </div>
    </div>
  );
}

function Panel({ title, button, children }: any) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-xl font-bold">{title}</h2>
        <button className="border border-slate-200 rounded-xl px-4 py-2 text-sm">{button}</button>
      </div>
      {children}
    </div>
  );
}

type StatusTone = "orange" | "blue" | "emerald" | "slate";

const statusClasses: Record<StatusTone, string> = {
  orange: "bg-orange-50 text-orange-700 ring-orange-200",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  slate: "bg-slate-100 text-slate-600 ring-slate-200",
};

function statusDaTele(status: string): StatusTone {
  if (status === "Aguardando cliente") return "orange";
  if (status === "Aguardando motoboy disponível") return "blue";
  if (status === "Em rota" || status === "Aguardando coleta") return "emerald";
  return "slate";
}

function codigoDaTele(id: string) {
  return `#${id.slice(-6).toUpperCase()}`;
}

function TeleEmAndamento({ tele, valor }: { tele: Tele; valor: string }) {
  const tone = statusDaTele(tele.status);
  const primeiraParada = tele.paradas[0];
  const ultimaParada = tele.paradas[tele.paradas.length - 1];
  const origem = primeiraParada?.cliente || tele.solicitante;
  const destino = ultimaParada?.cliente || tele.nomeCliente || "Destino não informado";
  const motoboy = tele.motoboy || "Sem motoboy";

  return (
    <Link
      href={`/teles/${tele.id}`}
      className="group block rounded-2xl border border-slate-100 bg-white p-4 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
            <Truck size={21} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <strong className="text-sm font-bold text-slate-900">{codigoDaTele(tele.id)}</strong>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${statusClasses[tone]}`}
              >
                {tele.status}
              </span>
            </div>

            <div className="mt-2 flex min-w-0 items-center gap-2 text-sm text-slate-600">
              <MapPin className="shrink-0 text-slate-400" size={15} />
              <span className="truncate">{origem}</span>
              <span className="shrink-0 text-slate-300">→</span>
              <span className="truncate">{destino}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3 sm:flex-col sm:items-end sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
          <div className="text-left sm:text-right">
            <p className="text-xs text-slate-400">Motoboy</p>
            <p
              className={`mt-0.5 text-sm font-semibold ${tele.motoboy ? "text-slate-700" : "text-orange-600"}`}
            >
              {motoboy}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <strong className="text-sm text-slate-900">{valor}</strong>
            <ChevronRight
              size={18}
              className="text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-emerald-600"
            />
          </div>
        </div>
      </div>
    </Link>
  );
}

type CollectProps = {
  teleId: string;
  status: string;
  title: string;
  address: string;
  boy: string;
};

function Collect({ teleId, status, title, address, boy }: CollectProps) {
  const semMotoboy = boy === "Sem motoboy";

  return (
    <Link
      href={`/teles/${teleId}`}
      className="group flex items-start gap-3 rounded-2xl border border-slate-100 p-4 transition hover:border-emerald-200 hover:bg-emerald-50/40"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
        <MapPin size={20} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <strong className="truncate text-sm text-slate-900">{title}</strong>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
            {status}
          </span>
        </div>
        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{address}</p>
        <p
          className={`mt-2 text-xs font-semibold ${
            semMotoboy ? "text-orange-600" : "text-emerald-700"
          }`}
        >
          {boy}
        </p>
      </div>

      <ChevronRight
        size={18}
        className="mt-1 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-emerald-600"
      />
    </Link>
  );
}

type ClientProps = {
  position: number;
  name: string;
  quantity: number;
  value: string;
};

function Client({ position, name, quantity, value }: ClientProps) {
  const destaque = position === 1;

  return (
    <div className="flex items-center gap-3 rounded-2xl px-2 py-3 transition hover:bg-slate-50">
      <span
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold ${
          destaque ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
        }`}
      >
        {position}
      </span>

      <div className="min-w-0 flex-1">
        <strong className="block truncate text-sm text-slate-900">{name}</strong>
        <p className="mt-0.5 text-xs text-slate-500">
          {quantity} {quantity === 1 ? "tele" : "teles"}
        </p>
      </div>

      <div className="text-right">
        <strong className="text-sm text-slate-900">{value}</strong>
        {destaque && <p className="mt-0.5 text-[11px] font-semibold text-amber-600">1º lugar</p>}
      </div>
    </div>
  );
}

type NoticeTone = "emerald" | "orange" | "blue" | "violet";

type NoticeProps = {
  icon: ReactNode;
  title: string;
  text: string;
  tone: NoticeTone;
};

const noticeToneClasses: Record<NoticeTone, string> = {
  emerald: "bg-emerald-100 text-emerald-700",
  orange: "bg-orange-100 text-orange-700",
  blue: "bg-blue-100 text-blue-700",
  violet: "bg-violet-100 text-violet-700",
};

function Notice({ icon, title, text, tone }: NoticeProps) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-100 p-4">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${noticeToneClasses[tone]}`}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <strong className="text-sm text-slate-900">{title}</strong>
        <p className="mt-1 text-xs leading-5 text-slate-500">{text}</p>
      </div>
    </div>
  );
}

function EmptyPanel({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-5 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm">
        {icon}
      </div>
      <strong className="mt-3 text-sm text-slate-700">{title}</strong>
      <p className="mt-1 text-xs leading-5 text-slate-500">{text}</p>
    </div>
  );
}
