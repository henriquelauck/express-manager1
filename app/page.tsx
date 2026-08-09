"use client";

import PageContainer from "@/components/ui/PageContainer";
import NotificacoesGestor from "@/components/notificacoes/NotificacoesGestor";
import PageHeader from "@/components/ui/PageHeader";
import { useExpressManager } from "@/context/ExpressManagerContext";
import type { Tele } from "@/types/Tele";
import {
  Bike,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  ExternalLink,
  FileText,
  Fuel,
  Heart,
  ListTodo,
  Loader2,
  MapPin,
  Package,
  Plus,
  Trophy,
  Truck,
  User,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";

type TarefaGestor = {
  id: string;
  tipo: "MARCOS_MANUTENCOES" | "SAVECELL_PENDENCIAS";
  dataReferencia: string;
  titulo: string;
  descricao: string;
  valor: number;
  quantidadeTeles: number;
  teleIds: string[];
  concluida: boolean;
  concluidaEm?: string | null;
  createdAt: string;
  updatedAt: string;
};

type MotoboyOnline = {
  id: string;
  nome: string;
  telefone?: string | null;
  moto?: string | null;
  placa?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  precisao?: number | null;
  onlineDesde?: string | null;
  localizacaoAtualizadaEm?: string | null;
  segundosSemAtualizar?: number | null;
  localizacaoRecente: boolean;
  telesEmAndamento: number;
};

type CustosApis = {
  atualizadoEm: string;
  usoInterno: Array<{
    servico: string;
    sku?: string | null;
    quantidade: number;
  }>;
  billing: {
    configurado: boolean;
    erro?: string;
    total: number | null;
    moeda: string | null;
    itens: Array<{
      servico: string;
      sku: string;
      moeda: string;
      custo: number;
    }>;
  };
};


export default function Dashboard() {
  const { teles, motoboys } = useExpressManager();
  const [motoboysOnline, setMotoboysOnline] = useState<MotoboyOnline[]>([]);
  const [carregandoMotoboysOnline, setCarregandoMotoboysOnline] = useState(true);
  const [erroMotoboysOnline, setErroMotoboysOnline] = useState("");
  const [tarefasGestor, setTarefasGestor] = useState<TarefaGestor[]>([]);
  const [carregandoTarefas, setCarregandoTarefas] = useState(true);
  const [erroTarefas, setErroTarefas] = useState("");
  const [tarefaConcluindo, setTarefaConcluindo] = useState<string | null>(null);
  const [custosApis, setCustosApis] = useState<CustosApis | null>(null);
  const [carregandoCustosApis, setCarregandoCustosApis] = useState(true);


  async function carregarCustosApis() {
    try {
      const resposta = await fetch("/api/custos-apis", { cache: "no-store" });
      if (!resposta.ok) return;

      setCustosApis((await resposta.json()) as CustosApis);
    } catch (erro) {
      console.error("Falha ao carregar custos de APIs:", erro);
    } finally {
      setCarregandoCustosApis(false);
    }
  }

  async function carregarTarefasGestor(mostrarCarregamento = false) {
    if (mostrarCarregamento) {
      setCarregandoTarefas(true);
    }

    try {
      const resposta = await fetch("/api/tarefas-gestor", {
        cache: "no-store",
      });

      if (!resposta.ok) {
        let mensagem = "Não foi possível carregar as tarefas do gestor.";

        try {
          const dadosErro = await resposta.json();
          mensagem = dadosErro?.erro || mensagem;
        } catch {}

        throw new Error(mensagem);
      }

      const dados = await resposta.json();

      setTarefasGestor(Array.isArray(dados) ? dados : []);
      setErroTarefas("");
    } catch (erro) {
      setErroTarefas(
        erro instanceof Error ? erro.message : "Não foi possível carregar as tarefas do gestor."
      );
    } finally {
      setCarregandoTarefas(false);
    }
  }

  async function concluirTarefaGestor(tarefaId: string) {
    if (tarefaConcluindo) {
      return;
    }

    setTarefaConcluindo(tarefaId);
    setErroTarefas("");

    try {
      const resposta = await fetch("/api/tarefas-gestor", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tarefaId,
        }),
      });

      if (!resposta.ok) {
        let mensagem = "Não foi possível concluir a tarefa.";

        try {
          const dadosErro = await resposta.json();
          mensagem = dadosErro?.erro || mensagem;
        } catch {}

        throw new Error(mensagem);
      }

      setTarefasGestor((atuais) => atuais.filter((tarefa) => tarefa.id !== tarefaId));
    } catch (erro) {
      setErroTarefas(erro instanceof Error ? erro.message : "Não foi possível concluir a tarefa.");
    } finally {
      setTarefaConcluindo(null);
    }
  }

  useEffect(() => {
    void carregarCustosApis();

    const intervaloCustos = window.setInterval(() => {
      void carregarCustosApis();
    }, 5 * 60 * 1000);

    return () => window.clearInterval(intervaloCustos);
  }, []);

  useEffect(() => {
    void carregarTarefasGestor(true);

    const intervaloTarefas = window.setInterval(() => {
      void carregarTarefasGestor();
    }, 60000);

    return () => {
      window.clearInterval(intervaloTarefas);
    };
  }, []);

  useEffect(() => {
    let ativo = true;

    async function carregarMotoboysOnline() {
      try {
        const resposta = await fetch("/api/motoboys/online", {
          cache: "no-store",
        });

        if (!resposta.ok) {
          throw new Error("Não foi possível carregar os motoboys online.");
        }

        const dados = await resposta.json();

        if (ativo) {
          setMotoboysOnline(Array.isArray(dados) ? dados : []);
          setErroMotoboysOnline("");
        }
      } catch (erro) {
        if (ativo) {
          setErroMotoboysOnline(
            erro instanceof Error ? erro.message : "Não foi possível carregar os motoboys online."
          );
        }
      } finally {
        if (ativo) {
          setCarregandoMotoboysOnline(false);
        }
      }
    }

    void carregarMotoboysOnline();

    const intervalo = window.setInterval(() => {
      void carregarMotoboysOnline();
    }, 15000);

    return () => {
      ativo = false;
      window.clearInterval(intervalo);
    };
  }, []);

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

  const telesOperacionais = teles.filter((tele) => !tele.orcamento);

  const hoje = inicioDoDia(new Date());
  const inicioDoMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const inicioDosSeteDias = new Date(hoje);
  inicioDosSeteDias.setDate(hoje.getDate() - 6);

  const inicioDaSemana = new Date(hoje);
  inicioDaSemana.setDate(hoje.getDate() - hoje.getDay());

  const fimDaSemana = new Date(inicioDaSemana);
  fimDaSemana.setDate(inicioDaSemana.getDate() + 6);

  const telesHoje = telesOperacionais.filter(
    (tele) => dataOperacionalDaTele(tele).getTime() === hoje.getTime()
  );

  const faturamentoHoje = telesHoje.reduce((total, tele) => total + valorDaTele(tele), 0);
  const faturamentoEscritorioHoje = faturamentoHoje * 0.2;

  const telesEmAndamento = telesOperacionais.filter((tele) => tele.status !== "Entregue");

  const entregasMes = telesOperacionais.filter((tele) => {
    const data = dataOperacionalDaTele(tele);

    return tele.status === "Entregue" && data >= inicioDoMes && data <= hoje;
  });

  const faturamentoSeteDias = Array.from({ length: 7 }, (_, index) => {
    const data = new Date(inicioDosSeteDias);
    data.setDate(inicioDosSeteDias.getDate() + index);

    const total = telesOperacionais
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
    telesOperacionais.reduce<Record<string, { nome: string; quantidade: number; total: number }>>(
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
    .slice(0, 10);

  const rankingMotoboysSemana = Object.values(
    telesOperacionais
      .filter((tele) => {
        const data = dataOperacionalDaTele(tele);

        return Boolean(tele.motoboy) && data >= inicioDaSemana && data <= fimDaSemana;
      })
      .reduce<
        Record<
          string,
          {
            nome: string;
            quantidade: number;
            totalBruto: number;
            totalLiquido: number;
          }
        >
      >((acc, tele) => {
        const nome = String(tele.motoboy || "").trim();

        if (!nome) {
          return acc;
        }

        if (!acc[nome]) {
          acc[nome] = {
            nome,
            quantidade: 0,
            totalBruto: 0,
            totalLiquido: 0,
          };
        }

        const valor = valorDaTele(tele);

        acc[nome].quantidade += 1;
        acc[nome].totalBruto += valor;
        acc[nome].totalLiquido += valor * 0.8;

        return acc;
      }, {})
  ).sort((a, b) => b.totalBruto - a.totalBruto);

  const contasAReceber = telesOperacionais.reduce((total, tele) => {
    const valorTotal = valorDaTele(tele);
    const valorRecebido = Math.max(0, converterValor(tele.valorRecebido || 0));
    const saldoPendente = Math.max(0, valorTotal - valorRecebido);

    return total + saldoPendente;
  }, 0);

  const telesSemMotoboy = telesEmAndamento.filter((tele) => !tele.motoboy).length;
  const telesAguardandoCliente = telesEmAndamento.filter(
    (tele) => tele.status === "Aguardando cliente"
  ).length;

  const motoboysRealmenteOnline = motoboysOnline.filter(
    (motoboy) => motoboy.localizacaoRecente
  );

  const motoboysComConexaoInterrompida = motoboysOnline.filter(
    (motoboy) => !motoboy.localizacaoRecente
  );

  return (
    <PageContainer>
      <div className="mb-8 flex items-start justify-between gap-4">
        <PageHeader
          titulo="Olá, Henrique! 👋"
          descricao="Aqui está o resumo da sua operação hoje."
        />

        <NotificacoesGestor />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-6 mb-6">
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
          title="Escritório hoje"
          value={`R$ ${formatarValor(faturamentoEscritorioHoje)}`}
          icon={<Building2 size={24} />}
          description="20% do faturamento de hoje"
          tone="violet"
        />

        <Card
          title="Teles hoje"
          value={`${telesHoje.length}`}
          icon={<Heart size={24} />}
          description={`${telesEmAndamento.length} em andamento na operação`}
          tone="blue"
        />

        <Card
          title="Motoboys online"
          value={`${motoboysRealmenteOnline.length}`}
          icon={<User size={24} />}
          description={
            motoboysComConexaoInterrompida.length > 0
              ? `${motoboysComConexaoInterrompida.length} com conexão interrompida`
              : `${motoboys.length} cadastrados no sistema`
          }
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

      <div className="mb-6">
        <Panel title="Custos de APIs hoje">
          {carregandoCustosApis ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 size={18} className="animate-spin" />
              Carregando custos...
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Google faturado hoje
                  </p>
                  <strong className="mt-2 block text-2xl text-slate-900">
                    {custosApis?.billing?.total !== null &&
                    custosApis?.billing?.total !== undefined
                      ? `${custosApis.billing.moeda === "BRL" ? "R$" : custosApis.billing.moeda || ""} ${custosApis.billing.total.toFixed(2).replace(".", ",")}`
                      : "Aguardando"}
                  </strong>
                  <p className="mt-1 text-xs text-slate-500">
                    Valor oficial do Cloud Billing Export.
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Chamadas registradas
                  </p>
                  <strong className="mt-2 block text-2xl text-slate-900">
                    {custosApis?.usoInterno?.reduce(
                      (total, item) => total + item.quantidade,
                      0
                    ) || 0}
                  </strong>
                  <p className="mt-1 text-xs text-slate-500">
                    Contador interno do Express Manager.
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Billing
                  </p>
                  <strong className="mt-2 block text-lg text-slate-900">
                    {custosApis?.billing?.configurado ? "Conectado" : "Configurar"}
                  </strong>
                  <p className="mt-1 text-xs text-slate-500">
                    {custosApis?.billing?.erro ||
                      (custosApis?.billing?.configurado
                        ? "Exportação oficial disponível."
                        : "Falta ligar Cloud Billing Export + BigQuery.")}
                  </p>
                </div>
              </div>

              {custosApis?.usoInterno && custosApis.usoInterno.length > 0 && (
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
                  {custosApis.usoInterno.map((item) => (
                    <div
                      key={`${item.servico}-${item.sku || ""}`}
                      className="rounded-xl border border-slate-100 px-3 py-2"
                    >
                      <p className="text-xs font-semibold text-slate-700">
                        {item.sku || item.servico}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {item.quantidade} chamada{item.quantidade === 1 ? "" : "s"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Panel>
      </div>

      <div className="mb-6">
        <Panel title="Tarefas do gestor">
          {carregandoTarefas ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-sm text-slate-500">
              <Loader2 size={18} className="animate-spin" />
              Carregando tarefas...
            </div>
          ) : erroTarefas ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
              {erroTarefas}
            </div>
          ) : tarefasGestor.length === 0 ? (
            <div className="flex min-h-36 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-5 text-center">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
                <CheckCircle2 size={22} />
              </div>
              <strong className="mt-3 text-sm text-slate-700">Nenhuma tarefa pendente</strong>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Após as 19h, as tarefas do Marcos Moto Peças e da SaveCell aparecerão aqui quando
                forem necessárias.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {tarefasGestor.map((tarefa) => (
                <TarefaGestorCard
                  key={tarefa.id}
                  tarefa={tarefa}
                  concluindo={tarefaConcluindo === tarefa.id}
                  bloqueado={Boolean(tarefaConcluindo)}
                  onConcluir={() => void concluirTarefaGestor(tarefa.id)}
                />
              ))}
            </div>
          )}
        </Panel>
      </div>

      <div className="mb-6">
        <Panel
          title={`Motoboys online (${motoboysRealmenteOnline.length})${
            motoboysComConexaoInterrompida.length > 0
              ? ` • ${motoboysComConexaoInterrompida.length} com conexão interrompida`
              : ""
          }`}
        >
          {carregandoMotoboysOnline ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
              Carregando posições dos motoboys...
            </div>
          ) : erroMotoboysOnline ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
              {erroMotoboysOnline}
            </div>
          ) : motoboysOnline.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center">
              <Bike className="mx-auto text-slate-300" size={30} />
              <p className="mt-3 font-medium text-slate-700">Nenhum motoboy online</p>
              <p className="mt-1 text-sm text-slate-500">
                Quando um motoboy ficar online pelo aplicativo, ele aparecerá aqui.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {motoboysOnline.map((motoboy) => (
                <MotoboyOnlineCard key={motoboy.id} motoboy={motoboy} />
              ))}
            </div>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <Panel title="Teles em andamento">
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

        <Panel title="Faturamento dos últimos 7 dias">
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

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Panel title="Próximas coletas">
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

        <Panel title="Top 10 clientes">
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

        <Panel title="Ranking semanal dos motoboys">
          <div className="space-y-2">
            {rankingMotoboysSemana.map((motoboy, index) => (
              <MotoboyRanking
                key={motoboy.nome}
                position={index + 1}
                name={motoboy.nome}
                quantity={motoboy.quantidade}
                gross={`R$ ${formatarValor(motoboy.totalBruto)}`}
                net={`R$ ${formatarValor(motoboy.totalLiquido)}`}
              />
            ))}
          </div>

          {rankingMotoboysSemana.length === 0 && (
            <EmptyPanel
              icon={<Bike size={22} />}
              title="Ranking semanal vazio"
              text="Os motoboys com teles nesta semana aparecerão aqui."
            />
          )}
        </Panel>

        <Panel title="Avisos importantes">
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

function TarefaGestorCard({
  tarefa,
  concluindo,
  bloqueado,
  onConcluir,
}: {
  tarefa: TarefaGestor;
  concluindo: boolean;
  bloqueado: boolean;
  onConcluir: () => void;
}) {
  const dataTarefa = new Date(tarefa.dataReferencia);
  const hoje = new Date();

  const dataTarefaBrasil = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(dataTarefa);

  const hojeBrasil = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(hoje);

  const atrasada = dataTarefaBrasil < hojeBrasil;

  const estilo =
    tarefa.tipo === "MARCOS_MANUTENCOES"
      ? {
          icone: "bg-blue-100 text-blue-700",
          borda: "border-blue-200",
          fundo: "bg-blue-50/40",
        }
      : {
          icone: "bg-violet-100 text-violet-700",
          borda: "border-violet-200",
          fundo: "bg-violet-50/40",
        };

  return (
    <article className={`rounded-2xl border p-5 ${estilo.borda} ${estilo.fundo}`}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${estilo.icone}`}
          >
            <ListTodo size={21} />
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <strong className="text-sm text-slate-900">{tarefa.titulo}</strong>

              {atrasada && (
                <span className="rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-semibold text-red-700">
                  Atrasada
                </span>
              )}
            </div>

            <p className="mt-2 text-sm leading-6 text-slate-600">{tarefa.descricao}</p>

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
              <span>
                {tarefa.quantidadeTeles} {tarefa.quantidadeTeles === 1 ? "tele" : "teles"}
              </span>
              <span>
                Referência:{" "}
                {dataTarefa.toLocaleDateString("pt-BR", {
                  timeZone: "America/Sao_Paulo",
                })}
              </span>
              <span className="font-semibold text-slate-700">
                R${" "}
                {Number(tarefa.valor || 0)
                  .toFixed(2)
                  .replace(".", ",")}
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onConcluir}
          disabled={bloqueado}
          className="flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60"
        >
          {concluindo ? (
            <>
              <Loader2 size={17} className="animate-spin" />
              Concluindo...
            </>
          ) : (
            <>
              <CheckCircle2 size={17} />
              Marcar como concluída
            </>
          )}
        </button>
      </div>
    </article>
  );
}

function MotoboyOnlineCard({ motoboy }: { motoboy: MotoboyOnline }) {
  const temCoordenadas =
    typeof motoboy.latitude === "number" && typeof motoboy.longitude === "number";

  const linkMaps = temCoordenadas
    ? `https://www.google.com/maps/search/?api=1&query=${motoboy.latitude},${motoboy.longitude}`
    : "";

  return (
    <article
      className={`rounded-2xl border p-4 shadow-sm ${
        motoboy.localizacaoRecente
          ? "border-emerald-100 bg-white"
          : "border-amber-200 bg-amber-50/60"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
            motoboy.localizacaoRecente
              ? "bg-emerald-100 text-emerald-700"
              : "bg-amber-100 text-amber-700"
          }`}
        >
          <Bike size={21} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="truncate text-sm text-slate-900">{motoboy.nome}</strong>

            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                motoboy.localizacaoRecente
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {motoboy.localizacaoRecente ? "Online" : "Conexão interrompida"}
            </span>
          </div>

          <p className="mt-1 text-xs text-slate-500">
            {motoboy.moto || "Moto não informada"}
            {motoboy.placa ? ` • ${motoboy.placa}` : ""}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-50 px-3 py-3">
          <p className="text-[11px] font-medium text-slate-400">Última atualização</p>
          <p className="mt-1 text-sm font-semibold text-slate-700">
            {formatarAtualizacaoMotoboy(motoboy)}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 px-3 py-3">
          <p className="text-[11px] font-medium text-slate-400">Teles em andamento</p>
          <p className="mt-1 text-sm font-semibold text-slate-700">{motoboy.telesEmAndamento}</p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
        <span>
          {typeof motoboy.precisao === "number"
            ? `Precisão aproximada: ${Math.round(motoboy.precisao)} m`
            : "Precisão não informada"}
        </span>

        {temCoordenadas ? (
          <a
            href={linkMaps}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 hover:text-emerald-800"
          >
            Abrir no mapa
            <ExternalLink size={14} />
          </a>
        ) : (
          <span className="font-medium text-slate-400">Sem coordenadas</span>
        )}
      </div>
    </article>
  );
}

function formatarAtualizacaoMotoboy(motoboy: MotoboyOnline) {
  const segundos = motoboy.segundosSemAtualizar;

  if (segundos === null || segundos === undefined) {
    return "Sem atualização";
  }

  if (segundos < 10) {
    return "Agora";
  }

  if (segundos < 60) {
    return `Há ${segundos}s`;
  }

  const minutos = Math.floor(segundos / 60);

  if (minutos < 60) {
    return `Há ${minutos} min`;
  }

  if (!motoboy.localizacaoAtualizadaEm) {
    return "Sem atualização";
  }

  return new Date(motoboy.localizacaoAtualizadaEm).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
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

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-xl font-bold">{title}</h2>
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

type MotoboyRankingProps = {
  position: number;
  name: string;
  quantity: number;
  gross: string;
  net: string;
};

function MotoboyRanking({ position, name, quantity, gross, net }: MotoboyRankingProps) {
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
          {quantity} {quantity === 1 ? "tele" : "teles"} na semana
        </p>
      </div>

      <div className="text-right">
        <strong className="block text-sm text-slate-900">{gross}</strong>
        <p className="mt-0.5 text-[11px] font-semibold text-emerald-700">Líquido {net}</p>
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