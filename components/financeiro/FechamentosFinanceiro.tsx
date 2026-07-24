"use client";

import { useExpressManager } from "@/context/ExpressManagerContext";
import {
  AlertCircle,
  Bike,
  CheckCircle2,
  DollarSign,
  Loader2,
  Plus,
  ReceiptText,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

type RecebedorTipo = "ESCRITORIO" | "MOTOBOY";

type Recebimento = {
  recebedorTipo: RecebedorTipo;
  motoboyId: string | null;
  motoboyNome: string;
  valorRecebido: string;
};

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

  if (Number.isNaN(data.getTime())) return "";

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

export default function FechamentosFinanceiro() {
  const { clientes, motoboys, teles, recarregarDados } = useExpressManager();

  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [clienteSelecionado, setClienteSelecionado] = useState<any>(null);
  const [distribuicoes, setDistribuicoes] = useState<any[]>([]);
  const [recebimentos, setRecebimentos] = useState<Recebimento[]>([]);
  const [fechando, setFechando] = useState(false);
  const [erro, setErro] = useState("");

  const periodoInvalido = Boolean(dataInicio && dataFim) && dataInicio > dataFim;

  const clientesComFechamento = useMemo(() => {
    if (periodoInvalido) return [];

    return clientes
      .filter((cliente: any) => String(cliente.formaCobranca || "").toUpperCase() !== "NA_HORA")
      .map((cliente: any) => {
        const telesCliente = teles.filter((tele: any) => {
          if (tele.solicitante !== cliente.nome) return false;
          if (saldoTele(tele) <= 0.009) return false;

          const dataTele = dataDaTele(tele);

          if (dataInicio && dataTele < dataInicio) return false;
          if (dataFim && dataTele > dataFim) return false;

          return true;
        });

        const total = telesCliente.reduce((soma: number, tele: any) => soma + saldoTele(tele), 0);

        return {
          ...cliente,
          teles: telesCliente,
          total,
        };
      })
      .filter((cliente: any) => cliente.teles.length > 0);
  }, [clientes, teles, dataInicio, dataFim, periodoInvalido]);

  const totalRecebidoAgora = useMemo(() => {
    return recebimentos.reduce((soma, item) => soma + converterValor(item.valorRecebido), 0);
  }, [recebimentos]);

  const saldoDepoisFechamento = clienteSelecionado
    ? Math.max(converterValor(clienteSelecionado.total) - totalRecebidoAgora, 0)
    : 0;

  function abrirFechamento(cliente: any) {
    const grupos = Object.values(
      cliente.teles.reduce((acc: any, tele: any) => {
        const nome = tele.motoboyNome || tele.motoboy || "Sem motoboy";

        if (!acc[nome]) {
          const motoboy = motoboys.find(
            (item: any) => item.id === tele.motoboyId || item.nome === nome
          );

          acc[nome] = {
            motoboyNome: nome,
            motoboyId: motoboy?.id || null,
            total: 0,
            quantidade: 0,
          };
        }

        acc[nome].total += saldoTele(tele);
        acc[nome].quantidade += 1;

        return acc;
      }, {})
    ) as any[];

    setErro("");
    setDistribuicoes(grupos);
    setRecebimentos([
      {
        recebedorTipo: "ESCRITORIO",
        motoboyId: null,
        motoboyNome: "",
        valorRecebido: formatarValor(cliente.total),
      },
    ]);
    setClienteSelecionado(cliente);
  }

  function fecharModal() {
    if (fechando) return;

    setClienteSelecionado(null);
    setDistribuicoes([]);
    setRecebimentos([]);
    setErro("");
  }

  function adicionarRecebimento() {
    setRecebimentos((atuais) => [
      ...atuais,
      {
        recebedorTipo: "ESCRITORIO",
        motoboyId: null,
        motoboyNome: "",
        valorRecebido: "0,00",
      },
    ]);
  }

  function removerRecebimento(index: number) {
    if (recebimentos.length === 1) return;

    setRecebimentos((atuais) => atuais.filter((_, itemIndex) => itemIndex !== index));
  }

  function atualizarRecebimento(index: number, atualizacao: Partial<Recebimento>) {
    setErro("");

    setRecebimentos((atuais) =>
      atuais.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              ...atualizacao,
            }
          : item
      )
    );
  }

  async function confirmarFechamento() {
    if (!clienteSelecionado || fechando) return;

    setErro("");

    if (!dataInicio || !dataFim) {
      setErro("Selecione o período do fechamento.");
      return;
    }

    if (dataInicio > dataFim) {
      setErro("A data inicial não pode ser posterior à data final.");
      return;
    }

    if (totalRecebidoAgora <= 0.009) {
      setErro("Informe ao menos um valor recebido para realizar o fechamento.");
      return;
    }

    if (totalRecebidoAgora > converterValor(clienteSelecionado.total) + 0.009) {
      setErro("O valor recebido não pode ser maior que o saldo aberto.");
      return;
    }

    const recebimentoInvalido = recebimentos.some((item) => {
      const valor = converterValor(item.valorRecebido);

      if (valor < 0) return true;

      if (valor > 0.009 && item.recebedorTipo === "MOTOBOY" && !item.motoboyId) {
        return true;
      }

      return false;
    });

    if (recebimentoInvalido) {
      setErro("Revise os valores e selecione o motoboy em todos os recebimentos correspondentes.");
      return;
    }

    setFechando(true);

    try {
      const resposta = await fetch("/api/fechamentos-financeiros", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clienteNome: clienteSelecionado.nome,
          dataInicio,
          dataFim,
          distribuicoes,
          recebimentos,
        }),
      });

      if (!resposta.ok) {
        let mensagem = "Não foi possível concluir o fechamento.";

        try {
          const dadosErro = await resposta.json();
          mensagem = dadosErro?.erro || mensagem;
        } catch {}

        throw new Error(mensagem);
      }

      await recarregarDados();
      fecharModal();
      alert("Fechamento realizado com sucesso!");
    } catch (erroFechamento) {
      setErro(
        erroFechamento instanceof Error
          ? erroFechamento.message
          : "Não foi possível concluir o fechamento."
      );
    } finally {
      setFechando(false);
    }
  }

  return (
    <>
      <div className="mb-8 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm md:p-6">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <FiltroData
            label="Data inicial"
            value={dataInicio}
            onChange={(valor) => {
              setDataInicio(valor);
              setErro("");
            }}
          />

          <FiltroData
            label="Data final"
            value={dataFim}
            onChange={(valor) => {
              setDataFim(valor);
              setErro("");
            }}
          />
        </div>

        {periodoInvalido && (
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />A data inicial não pode ser
            posterior à data final.
          </div>
        )}
      </div>

      {clientesComFechamento.length === 0 ? (
        <div className="rounded-3xl border border-slate-100 bg-white p-10 text-center shadow-sm">
          <ReceiptText size={40} className="mx-auto text-slate-300" />
          <h2 className="mt-4 text-lg font-bold text-slate-900">Nenhum fechamento disponível</h2>
          <p className="mt-1 text-sm text-slate-500">
            Selecione um período com teles ainda em aberto.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {clientesComFechamento.map((cliente: any) => (
            <div
              key={cliente.id || cliente.nome}
              className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm"
            >
              <h2 className="text-xl font-bold text-slate-900">{cliente.nome}</h2>

              <p className="mt-1 text-sm text-slate-500">
                {cliente.formaCobranca || "Cobrança periódica"}
              </p>

              <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Teles em aberto</p>
                <h3 className="text-2xl font-bold text-slate-900">{cliente.teles.length}</h3>

                <p className="mt-4 text-sm text-slate-500">Saldo aberto</p>
                <h3 className="text-2xl font-bold text-orange-600">
                  R$ {formatarValor(cliente.total)}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => abrirFechamento(cliente)}
                className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 font-semibold text-white transition hover:bg-emerald-700"
              >
                <DollarSign size={18} />
                Registrar fechamento
              </button>
            </div>
          ))}
        </div>
      )}

      {clienteSelecionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white px-5 py-5 md:px-7">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-600">
                  Fechamento financeiro
                </p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900">
                  {clienteSelecionado.nome}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {clienteSelecionado.teles.length} teles • R${" "}
                  {formatarValor(clienteSelecionado.total)} em aberto
                </p>
              </div>

              <button
                type="button"
                onClick={fecharModal}
                disabled={fechando}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-7 p-5 md:p-7">
              {erro && (
                <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <span>{erro}</span>
                </div>
              )}

              <section>
                <h3 className="text-lg font-bold text-slate-900">Produção por motoboy</h3>

                <div className="mt-3 space-y-3">
                  {distribuicoes.map((item) => (
                    <div
                      key={item.motoboyNome}
                      className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                          <Bike size={19} />
                        </div>

                        <div>
                          <strong className="text-slate-900">{item.motoboyNome}</strong>
                          <p className="text-sm text-slate-500">{item.quantidade} teles</p>
                        </div>
                      </div>

                      <strong className="text-orange-600">R$ {formatarValor(item.total)}</strong>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Recebimentos</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Informe quanto cada pessoa recebeu.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={adicionarRecebimento}
                    disabled={fechando}
                    className="flex h-10 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    <Plus size={16} />
                    Adicionar
                  </button>
                </div>

                <div className="mt-4 space-y-4">
                  {recebimentos.map((item, index) => (
                    <div
                      key={index}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_1fr_auto]">
                        <div>
                          <label className="text-sm font-medium text-slate-600">
                            Quem recebeu?
                          </label>

                          <select
                            value={item.recebedorTipo}
                            disabled={fechando}
                            onChange={(evento) =>
                              atualizarRecebimento(index, {
                                recebedorTipo: evento.target.value as RecebedorTipo,
                                motoboyId: null,
                                motoboyNome: "",
                              })
                            }
                            className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4"
                          >
                            <option value="ESCRITORIO">Escritório</option>
                            <option value="MOTOBOY">Motoboy</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-slate-600">Motoboy</label>

                          <select
                            value={item.motoboyId || ""}
                            disabled={fechando || item.recebedorTipo !== "MOTOBOY"}
                            onChange={(evento) => {
                              const motoboy = motoboys.find(
                                (registro: any) => registro.id === evento.target.value
                              );

                              atualizarRecebimento(index, {
                                motoboyId: motoboy?.id || null,
                                motoboyNome: motoboy?.nome || "",
                              });
                            }}
                            className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 disabled:bg-slate-100"
                          >
                            <option value="">
                              {item.recebedorTipo === "MOTOBOY" ? "Selecione" : "Não se aplica"}
                            </option>

                            {motoboys.map((motoboy: any) => (
                              <option key={motoboy.id} value={motoboy.id}>
                                {motoboy.nome}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-sm font-medium text-slate-600">
                            Valor recebido
                          </label>

                          <input
                            value={item.valorRecebido}
                            disabled={fechando}
                            onChange={(evento) =>
                              atualizarRecebimento(index, {
                                valorRecebido: evento.target.value,
                              })
                            }
                            placeholder="0,00"
                            className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4"
                          />
                        </div>

                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() => removerRecebimento(index)}
                            disabled={fechando || recebimentos.length === 1}
                            className="flex h-12 w-12 items-center justify-center rounded-xl border border-red-200 bg-red-50 text-red-600 disabled:opacity-30"
                            title="Remover recebimento"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-3">
                <Resumo titulo="Saldo aberto" valor={clienteSelecionado.total} />
                <Resumo titulo="Recebido agora" valor={totalRecebidoAgora} positivo />
                <Resumo
                  titulo="Restará aberto"
                  valor={saldoDepoisFechamento}
                  alerta={saldoDepoisFechamento > 0.009}
                />
              </div>
            </div>

            <div className="sticky bottom-0 flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:justify-end md:px-7">
              <button
                type="button"
                onClick={fecharModal}
                disabled={fechando}
                className="h-12 rounded-xl border border-slate-200 px-6 font-medium text-slate-700 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => void confirmarFechamento()}
                disabled={fechando}
                className="flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 font-semibold text-white disabled:opacity-60"
              >
                {fechando ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={18} />
                )}

                {fechando ? "Processando..." : "Confirmar fechamento"}
              </button>
            </div>
          </div>
        </div>
      )}
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

function Resumo({
  titulo,
  valor,
  positivo = false,
  alerta = false,
}: {
  titulo: string;
  valor: number;
  positivo?: boolean;
  alerta?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-slate-500">{titulo}</p>
      <strong
        className={`mt-1 block ${
          positivo ? "text-emerald-700" : alerta ? "text-orange-600" : "text-slate-900"
        }`}
      >
        R$ {formatarValor(valor)}
      </strong>
    </div>
  );
}
