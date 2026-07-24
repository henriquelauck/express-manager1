"use client";

import { useExpressManager } from "@/context/ExpressManagerContext";
import {
  Bike,
  Building2,
  CheckCircle2,
  Clock3,
  DollarSign,
  Loader2,
  Pencil,
  Search,
  WalletCards,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

type AbaRecebimento = "pendentes" | "parciais" | "escritorio" | "motoboy" | "semanal" | "todos";

type TipoRecebedor = "pendente" | "escritorio" | "motoboy";

function converterValor(valor: unknown) {
  const numero = Number(String(valor ?? "0").replace(",", "."));
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

function tipoRecebimentoTele(tele: any): TipoRecebedor {
  const recebido = valorRecebidoTele(tele);

  if (recebido <= 0.009) return "pendente";

  const tipo = String(tele.recebimento || "").toLowerCase();

  return tipo === "motoboy" ? "motoboy" : "escritorio";
}

function nomeDestino(tele: any) {
  if (Array.isArray(tele.paradas) && tele.paradas.length > 0) {
    const paradaPrincipal =
      tele.paradas.find((parada: any) => parada.cliente !== tele.solicitante) || tele.paradas[0];

    return (
      paradaPrincipal.cliente || paradaPrincipal.nomeCliente || tele.nomeCliente || "Não informado"
    );
  }

  return tele.nomeCliente || "Não informado";
}

export default function RecebimentosFinanceiro() {
  const { teles, motoboys, recarregarDados } = useExpressManager();

  const [aba, setAba] = useState<AbaRecebimento>("pendentes");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [busca, setBusca] = useState("");

  const [teleSelecionada, setTeleSelecionada] = useState<any>(null);
  const [tipoRecebimento, setTipoRecebimento] = useState<TipoRecebedor>("escritorio");
  const [valorRecebido, setValorRecebido] = useState("");
  const [motoboyRecebedor, setMotoboyRecebedor] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  const telesPeriodo = useMemo(() => {
    const termo = busca.trim().toLowerCase();

    return teles.filter((tele: any) => {
      const dataTele = dataDaTele(tele);

      if (dataInicio && dataTele < dataInicio) return false;
      if (dataFim && dataTele > dataFim) return false;

      if (termo) {
        const conteudo = [tele.solicitante, tele.motoboy, nomeDestino(tele), tele.status]
          .join(" ")
          .toLowerCase();

        if (!conteudo.includes(termo)) return false;
      }

      return true;
    });
  }, [teles, dataInicio, dataFim, busca]);

  const listaAtual = useMemo(() => {
    return telesPeriodo.filter((tele: any) => {
      const total = valorTotalTele(tele);
      const recebido = valorRecebidoTele(tele);
      const saldo = saldoTele(tele);
      const tipo = tipoRecebimentoTele(tele);
      const formaCobranca = String(tele.formaCobranca || "").toLowerCase();

      if (aba === "pendentes") {
        return recebido <= 0.009 && saldo > 0.009;
      }

      if (aba === "parciais") {
        return recebido > 0.009 && recebido < total - 0.009;
      }

      if (aba === "escritorio") {
        return tipo === "escritorio" && recebido > 0.009;
      }

      if (aba === "motoboy") {
        return tipo === "motoboy" && recebido > 0.009;
      }

      if (aba === "semanal") {
        return formaCobranca === "semanal" && saldo > 0.009;
      }

      return true;
    });
  }, [aba, telesPeriodo]);

  const resumo = useMemo(() => {
    return listaAtual.reduce(
      (acc: any, tele: any) => {
        acc.total += valorTotalTele(tele);
        acc.recebido += valorRecebidoTele(tele);
        acc.saldo += saldoTele(tele);
        return acc;
      },
      {
        total: 0,
        recebido: 0,
        saldo: 0,
      }
    );
  }, [listaAtual]);

  function abrirRecebimento(tele: any) {
    const recebidoAtual = valorRecebidoTele(tele);
    const total = valorTotalTele(tele);
    const tipoAtual = tipoRecebimentoTele(tele);

    setErro("");
    setTeleSelecionada(tele);
    setTipoRecebimento(recebidoAtual > 0.009 ? tipoAtual : "escritorio");
    setValorRecebido(formatarValor(recebidoAtual > 0.009 ? recebidoAtual : total));
    setMotoboyRecebedor(tele.motoboyRecebedor || tele.motoboy || "");
  }

  function fecharModal() {
    if (salvando) return;

    setTeleSelecionada(null);
    setErro("");
    setValorRecebido("");
    setMotoboyRecebedor("");
    setTipoRecebimento("escritorio");
  }

  async function salvarRecebimento() {
    if (!teleSelecionada || salvando) return;

    const total = valorTotalTele(teleSelecionada);
    const valor = tipoRecebimento === "pendente" ? 0 : converterValor(valorRecebido);

    setErro("");

    if (valor < 0) {
      setErro("O valor recebido não pode ser negativo.");
      return;
    }

    if (valor > total + 0.009) {
      setErro("O valor recebido não pode ser maior que o total da tele.");
      return;
    }

    if (tipoRecebimento === "motoboy" && !motoboyRecebedor) {
      setErro("Selecione o motoboy que recebeu.");
      return;
    }

    setSalvando(true);

    try {
      const resposta = await fetch("/api/teles/recebimento", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: teleSelecionada.id,
          recebimento: tipoRecebimento,
          valor,
          motoboy: tipoRecebimento === "motoboy" ? motoboyRecebedor : null,
        }),
      });

      if (!resposta.ok) {
        let mensagem = "Não foi possível atualizar o recebimento.";

        try {
          const dadosErro = await resposta.json();
          mensagem = dadosErro?.erro || mensagem;
        } catch {}

        throw new Error(mensagem);
      }

      await recarregarDados();
      fecharModal();
    } catch (erroRecebimento) {
      setErro(
        erroRecebimento instanceof Error
          ? erroRecebimento.message
          : "Não foi possível atualizar o recebimento."
      );
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <div className="mb-8 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm md:p-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <label className="text-sm font-medium text-slate-600">Data inicial</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(evento) => setDataInicio(evento.target.value)}
              className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-600">Data final</label>
            <input
              type="date"
              value={dataFim}
              onChange={(evento) => setDataFim(evento.target.value)}
              className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-slate-600">Buscar</label>

            <div className="relative mt-2">
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={busca}
                onChange={(evento) => setBusca(evento.target.value)}
                placeholder="Cliente, destino ou motoboy"
                className="h-12 w-full rounded-xl border border-slate-200 pl-11 pr-4 outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-3">
        <Tab ativo={aba === "pendentes"} onClick={() => setAba("pendentes")}>
          Pendentes
        </Tab>

        <Tab ativo={aba === "parciais"} onClick={() => setAba("parciais")}>
          Parciais
        </Tab>

        <Tab ativo={aba === "escritorio"} onClick={() => setAba("escritorio")}>
          Escritório
        </Tab>

        <Tab ativo={aba === "motoboy"} onClick={() => setAba("motoboy")}>
          Motoboy
        </Tab>

        <Tab ativo={aba === "semanal"} onClick={() => setAba("semanal")}>
          Fechamento semanal
        </Tab>

        <Tab ativo={aba === "todos"} onClick={() => setAba("todos")}>
          Todos
        </Tab>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <ResumoCard titulo="Valor das teles" valor={resumo.total} icon={<DollarSign size={21} />} />

        <ResumoCard
          titulo="Já recebido"
          valor={resumo.recebido}
          icon={<CheckCircle2 size={21} />}
        />

        <ResumoCard
          titulo="Saldo aberto"
          valor={resumo.saldo}
          icon={<Clock3 size={21} />}
          alerta={resumo.saldo > 0}
        />
      </div>

      {listaAtual.length === 0 ? (
        <div className="rounded-3xl border border-slate-100 bg-white p-10 text-center shadow-sm">
          <WalletCards size={38} className="mx-auto text-slate-300" />
          <h2 className="mt-4 text-lg font-bold text-slate-900">Nenhuma tele encontrada</h2>
          <p className="mt-1 text-sm text-slate-500">
            Ajuste os filtros para consultar outros recebimentos.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {listaAtual.map((tele: any) => {
            const total = valorTotalTele(tele);
            const recebido = valorRecebidoTele(tele);
            const saldo = saldoTele(tele);
            const tipo = tipoRecebimentoTele(tele);

            return (
              <div
                key={tele.id}
                className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="truncate text-xl font-bold text-slate-900">
                      {tele.solicitante || "Sem cliente"}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">{nomeDestino(tele)}</p>

                    <p className="mt-1 text-xs text-slate-400">{formatarData(dataDaTele(tele))}</p>
                  </div>

                  <StatusPagamento tipo={tipo} recebido={recebido} total={total} />
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-4">
                  <Valor titulo="Total" valor={total} />
                  <Valor titulo="Recebido" valor={recebido} />
                  <Valor titulo="Saldo" valor={saldo} alerta={saldo > 0.009} />
                </div>

                <div className="mt-5 space-y-2 text-sm text-slate-600">
                  <p>
                    <strong>Motoboy:</strong> {tele.motoboy || "Não definido"}
                  </p>
                  <p>
                    <strong>Operação:</strong> {tele.status || "-"}
                  </p>
                  <p>
                    <strong>Cobrança:</strong> {tele.formaCobranca || "Não informada"}
                  </p>

                  {tipo === "motoboy" && recebido > 0.009 && (
                    <p>
                      <strong>Quem recebeu:</strong>{" "}
                      {tele.motoboyRecebedor || tele.motoboy || "Motoboy"}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => abrirRecebimento(tele)}
                  className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 font-semibold text-white transition hover:bg-emerald-700"
                >
                  <Pencil size={17} />
                  {recebido > 0.009 ? "Editar recebimento" : "Registrar recebimento"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {teleSelecionada && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-50 px-5 py-5 md:px-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-600">
                  Recebimento
                </p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900">
                  {teleSelecionada.solicitante}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Total da tele: R$ {formatarValor(valorTotalTele(teleSelecionada))}
                </p>
              </div>

              <button
                type="button"
                onClick={fecharModal}
                disabled={salvando}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5 p-5 md:p-6">
              {erro && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {erro}
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-slate-600">Situação</label>

                <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <TipoButton
                    ativo={tipoRecebimento === "pendente"}
                    onClick={() => {
                      setTipoRecebimento("pendente");
                      setValorRecebido("0,00");
                      setErro("");
                    }}
                    icon={<Clock3 size={18} />}
                    label="Pendente"
                  />

                  <TipoButton
                    ativo={tipoRecebimento === "escritorio"}
                    onClick={() => {
                      setTipoRecebimento("escritorio");
                      setErro("");
                    }}
                    icon={<Building2 size={18} />}
                    label="Escritório"
                  />

                  <TipoButton
                    ativo={tipoRecebimento === "motoboy"}
                    onClick={() => {
                      setTipoRecebimento("motoboy");
                      setErro("");
                    }}
                    icon={<Bike size={18} />}
                    label="Motoboy"
                  />
                </div>
              </div>

              {tipoRecebimento !== "pendente" && (
                <div>
                  <label className="text-sm font-medium text-slate-600">Valor recebido</label>

                  <input
                    value={valorRecebido}
                    onChange={(evento) => {
                      setValorRecebido(evento.target.value);
                      setErro("");
                    }}
                    placeholder="0,00"
                    className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-emerald-500"
                  />

                  <p className="mt-2 text-xs text-slate-500">
                    Para pagamento parcial, informe apenas o total já recebido até agora.
                  </p>
                </div>
              )}

              {tipoRecebimento === "motoboy" && (
                <div>
                  <label className="text-sm font-medium text-slate-600">Motoboy que recebeu</label>

                  <select
                    value={motoboyRecebedor}
                    onChange={(evento) => {
                      setMotoboyRecebedor(evento.target.value);
                      setErro("");
                    }}
                    className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 outline-none focus:border-emerald-500"
                  >
                    <option value="">Selecione</option>

                    {motoboys.map((motoboy: any) => (
                      <option key={motoboy.id} value={motoboy.nome}>
                        {motoboy.nome}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {tipoRecebimento !== "pendente" && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Saldo após salvar</span>
                    <strong className="text-orange-600">
                      R${" "}
                      {formatarValor(
                        Math.max(valorTotalTele(teleSelecionada) - converterValor(valorRecebido), 0)
                      )}
                    </strong>
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end md:px-6">
              <button
                type="button"
                onClick={fecharModal}
                disabled={salvando}
                className="h-12 rounded-xl border border-slate-200 bg-white px-6 font-medium text-slate-700 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => void salvarRecebimento()}
                disabled={salvando}
                className="flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 font-semibold text-white disabled:opacity-60"
              >
                {salvando && <Loader2 size={17} className="animate-spin" />}
                {salvando ? "Salvando..." : "Salvar recebimento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Tab({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl px-5 py-3 text-sm font-semibold transition ${
        ativo
          ? "bg-emerald-600 text-white shadow-sm"
          : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function ResumoCard({
  titulo,
  valor,
  icon,
  alerta = false,
}: {
  titulo: string;
  valor: number;
  icon: React.ReactNode;
  alerta?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
            alerta ? "bg-orange-100 text-orange-700" : "bg-emerald-100 text-emerald-700"
          }`}
        >
          {icon}
        </div>

        <div>
          <p className="text-xs text-slate-500">{titulo}</p>
          <strong className={alerta ? "text-orange-600" : "text-slate-900"}>
            R$ {formatarValor(valor)}
          </strong>
        </div>
      </div>
    </div>
  );
}

function Valor({
  titulo,
  valor,
  alerta = false,
}: {
  titulo: string;
  valor: number;
  alerta?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-slate-400">{titulo}</p>
      <strong className={`mt-1 block text-sm ${alerta ? "text-orange-600" : "text-slate-900"}`}>
        R$ {formatarValor(valor)}
      </strong>
    </div>
  );
}

function StatusPagamento({
  tipo,
  recebido,
  total,
}: {
  tipo: TipoRecebedor;
  recebido: number;
  total: number;
}) {
  if (recebido <= 0.009) {
    return (
      <span className="rounded-xl bg-orange-100 px-3 py-2 text-xs font-semibold text-orange-700">
        Pendente
      </span>
    );
  }

  if (recebido < total - 0.009) {
    return (
      <span className="rounded-xl bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-700">
        Parcial
      </span>
    );
  }

  return (
    <span
      className={`rounded-xl px-3 py-2 text-xs font-semibold ${
        tipo === "motoboy" ? "bg-blue-100 text-blue-700" : "bg-emerald-100 text-emerald-700"
      }`}
    >
      {tipo === "motoboy" ? "Motoboy" : "Escritório"}
    </span>
  );
}

function TipoButton({
  ativo,
  onClick,
  icon,
  label,
}: {
  ativo: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-12 items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition ${
        ativo
          ? "border-emerald-600 bg-emerald-50 text-emerald-700"
          : "border-slate-200 bg-white text-slate-600"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
