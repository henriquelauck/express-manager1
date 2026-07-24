"use client";

import { useExpressManager } from "@/context/ExpressManagerContext";
import { Bike, Copy, DollarSign, FileText, Loader2, Plus, Trash2, X } from "lucide-react";
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

function formatarData(valor: unknown) {
  const dataISO = dataLocalISO(valor);

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

export default function FinanceiroMotoboys() {
  const { motoboys, teles, movimentosFinanceirosMotoboy, recarregarDados } = useExpressManager();

  const [motoboyIdSelecionado, setMotoboyIdSelecionado] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const [modalAberto, setModalAberto] = useState(false);
  const [tipoLancamento, setTipoLancamento] = useState<"ESCRITORIO" | "AJUSTE">("ESCRITORIO");
  const [valorLancamento, setValorLancamento] = useState("");
  const [descricaoLancamento, setDescricaoLancamento] = useState("PIX semanal");
  const [dataReferenciaInicio, setDataReferenciaInicio] = useState("");
  const [dataReferenciaFim, setDataReferenciaFim] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [excluindoId, setExcluindoId] = useState("");
  const [erroModal, setErroModal] = useState("");

  const motoboyAtual = motoboys.find((motoboy: any) => motoboy.id === motoboyIdSelecionado);

  const telesDoMotoboy = useMemo(() => {
    if (!motoboyAtual) return [];

    return teles.filter((tele: any) => {
      const pertenceAoMotoboy =
        tele.motoboyId === motoboyAtual.id ||
        tele.motoboyNome === motoboyAtual.nome ||
        tele.motoboy === motoboyAtual.nome;

      if (!pertenceAoMotoboy) return false;

      const dataTele = dataDaTele(tele);

      if (dataInicio && dataTele < dataInicio) return false;
      if (dataFim && dataTele > dataFim) return false;

      return true;
    });
  }, [teles, motoboyAtual, dataInicio, dataFim]);

  const movimentosDoMotoboy = useMemo(() => {
    if (!motoboyAtual) return [];

    return movimentosFinanceirosMotoboy.filter((movimento: any) => {
      if (movimento.motoboyId !== motoboyAtual.id) {
        return false;
      }

      const inicio = dataLocalISO(movimento.dataReferenciaInicio || movimento.criadoEm);
      const fim = dataLocalISO(movimento.dataReferenciaFim || movimento.criadoEm);

      if (dataInicio && fim < dataInicio) return false;
      if (dataFim && inicio > dataFim) return false;

      return true;
    });
  }, [movimentosFinanceirosMotoboy, motoboyAtual, dataInicio, dataFim]);

  const totalBruto = telesDoMotoboy.reduce(
    (soma: number, tele: any) => soma + valorTotalTele(tele),
    0
  );

  const valorMotoboy = totalBruto * 0.8;

  const movimentosCliente = movimentosDoMotoboy.filter(
    (movimento: any) => movimento.tipo === "CLIENTE"
  );

  const telesComMovimento = new Set(
    movimentosCliente.map((movimento: any) => movimento.teleId).filter(Boolean)
  );

  const fechamentosComMovimento = new Set(
    movimentosCliente.map((movimento: any) => movimento.fechamentoId).filter(Boolean)
  );

  const recebimentosAntigos = telesDoMotoboy
    .filter((tele: any) => {
      const recebidoPeloMotoboy = String(tele.recebimento || "").toLowerCase() === "motoboy";

      if (!recebidoPeloMotoboy) return false;
      if (telesComMovimento.has(tele.id)) return false;

      if (tele.fechamentoId && fechamentosComMovimento.has(tele.fechamentoId)) {
        return false;
      }

      const nomeRecebedor = tele.motoboyRecebedor || tele.motoboyNome || tele.motoboy;

      return !nomeRecebedor || nomeRecebedor === motoboyAtual?.nome;
    })
    .map((tele: any) => ({
      id: `legado-${tele.id}`,
      titulo: tele.solicitante || "Cliente",
      descricao: "Recebimento antigo da tele",
      data: tele.dataRecebimento || tele.dataTele || tele.createdAt || tele.criadoEm,
      valor: converterValor(tele.valorRecebido || valorTotalTele(tele)),
      automatico: true,
    }));

  const recebidoClienteMovimentos = movimentosCliente.reduce(
    (soma: number, movimento: any) => soma + converterValor(movimento.valor),
    0
  );

  const recebidoClienteAntigo = recebimentosAntigos.reduce(
    (soma: number, movimento: any) => soma + converterValor(movimento.valor),
    0
  );

  const recebidoCliente = recebidoClienteMovimentos + recebidoClienteAntigo;

  const recebidoEscritorio = movimentosDoMotoboy
    .filter((movimento: any) => movimento.tipo === "ESCRITORIO")
    .reduce((soma: number, movimento: any) => soma + converterValor(movimento.valor), 0);

  const ajustes = movimentosDoMotoboy
    .filter((movimento: any) => movimento.tipo === "AJUSTE")
    .reduce((soma: number, movimento: any) => soma + converterValor(movimento.valor), 0);

  const jaRecebeu = recebidoCliente + recebidoEscritorio + ajustes;
  const saldo = valorMotoboy - jaRecebeu;

  const historicoFinanceiro = useMemo(() => {
    const movimentos = movimentosDoMotoboy.map((movimento: any) => ({
      id: movimento.id,
      titulo:
        movimento.tipo === "CLIENTE"
          ? movimento.clienteNome || "Cliente"
          : movimento.tipo === "ESCRITORIO"
            ? "Escritório"
            : "Ajuste",
      descricao:
        movimento.descricao || (movimento.tipo === "CLIENTE" ? "Recebido direto do cliente" : "-"),
      data: movimento.dataReferenciaFim || movimento.dataReferenciaInicio || movimento.criadoEm,
      valor: converterValor(movimento.valor),
      automatico:
        movimento.tipo === "CLIENTE" ||
        Boolean(movimento.teleId) ||
        Boolean(movimento.fechamentoId),
    }));

    return [...movimentos, ...recebimentosAntigos].sort(
      (a: any, b: any) => new Date(b.data).getTime() - new Date(a.data).getTime()
    );
  }, [movimentosDoMotoboy, recebimentosAntigos]);

  const textoExtrato = useMemo(() => {
    if (!motoboyAtual) return "";

    const agrupado = telesDoMotoboy.reduce((acc: Record<string, any[]>, tele: any) => {
      const data = formatarData(dataDaTele(tele));

      if (!acc[data]) acc[data] = [];
      acc[data].push(tele);

      return acc;
    }, {});

    let texto = `EXTRATO MOTOBOY - ${motoboyAtual.nome.toUpperCase()}\n\n`;

    Object.entries(agrupado).forEach(([data, telesDoDia]) => {
      texto += `${data}\n`;

      telesDoDia.forEach((tele: any) => {
        texto += `- ${tele.solicitante || "Sem cliente"} → ${nomeDestino(
          tele
        )} - R$${formatarValor(valorTotalTele(tele))}\n`;
      });

      texto += "\n";
    });

    texto += `Total de teles - ${telesDoMotoboy.length}\n`;
    texto += `Total bruto - R$${formatarValor(totalBruto)}\n`;
    texto += `Valor do motoboy (80%) - R$${formatarValor(valorMotoboy)}\n`;
    texto += `Recebido de clientes - R$${formatarValor(recebidoCliente)}\n`;
    texto += `Recebido do escritório - R$${formatarValor(recebidoEscritorio)}\n`;
    texto += `Ajustes - R$${formatarValor(ajustes)}\n`;
    texto += `${
      saldo >= 0 ? "Saldo a receber" : "Recebeu a mais"
    } - R$${formatarValor(Math.abs(saldo))}`;

    return texto;
  }, [
    motoboyAtual,
    telesDoMotoboy,
    totalBruto,
    valorMotoboy,
    recebidoCliente,
    recebidoEscritorio,
    ajustes,
    saldo,
  ]);

  function abrirLancamento(tipo: "ESCRITORIO" | "AJUSTE") {
    setTipoLancamento(tipo);
    setErroModal("");
    setValorLancamento(tipo === "ESCRITORIO" && saldo > 0 ? formatarValor(saldo) : "");
    setDescricaoLancamento(tipo === "ESCRITORIO" ? "PIX semanal" : "Ajuste financeiro");
    setDataReferenciaInicio(dataInicio);
    setDataReferenciaFim(dataFim);
    setModalAberto(true);
  }

  function fecharModal() {
    if (salvando) return;

    setModalAberto(false);
    setErroModal("");
  }

  async function registrarLancamento() {
    if (!motoboyAtual || salvando) return;

    const valor = converterValor(valorLancamento);

    setErroModal("");

    if (valor === 0) {
      setErroModal("Informe um valor diferente de zero.");
      return;
    }

    if (tipoLancamento === "ESCRITORIO" && valor < 0) {
      setErroModal("O pagamento do escritório não pode ser negativo.");
      return;
    }

    if (dataReferenciaInicio && dataReferenciaFim && dataReferenciaInicio > dataReferenciaFim) {
      setErroModal("A data inicial não pode ser posterior à data final.");
      return;
    }

    setSalvando(true);

    try {
      const resposta = await fetch("/api/movimentos-financeiros-motoboy", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          motoboyId: motoboyAtual.id,
          tipo: tipoLancamento,
          valor,
          descricao: descricaoLancamento,
          dataReferenciaInicio,
          dataReferenciaFim,
        }),
      });

      if (!resposta.ok) {
        let mensagem = "Não foi possível registrar o lançamento.";

        try {
          const dadosErro = await resposta.json();
          mensagem = dadosErro?.erro || mensagem;
        } catch {}

        throw new Error(mensagem);
      }

      await recarregarDados();
      fecharModal();
    } catch (erro) {
      setErroModal(
        erro instanceof Error ? erro.message : "Não foi possível registrar o lançamento."
      );
    } finally {
      setSalvando(false);
    }
  }

  async function excluirMovimento(id: string) {
    if (excluindoId) return;

    const confirmou = window.confirm("Excluir este lançamento manual?");

    if (!confirmou) return;

    setExcluindoId(id);

    try {
      const resposta = await fetch(`/api/movimentos-financeiros-motoboy/${id}`, {
        method: "DELETE",
      });

      if (!resposta.ok) {
        let mensagem = "Não foi possível excluir o lançamento.";

        try {
          const dadosErro = await resposta.json();
          mensagem = dadosErro?.erro || mensagem;
        } catch {}

        throw new Error(mensagem);
      }

      await recarregarDados();
    } catch (erro) {
      alert(erro instanceof Error ? erro.message : "Não foi possível excluir o lançamento.");
    } finally {
      setExcluindoId("");
    }
  }

  async function copiarExtrato() {
    try {
      await navigator.clipboard.writeText(textoExtrato);
      alert("Extrato copiado!");
    } catch {
      alert("Não foi possível copiar o extrato.");
    }
  }

  return (
    <>
      <div className="mb-8 grid grid-cols-1 gap-5 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm md:grid-cols-3 md:p-8">
        <div>
          <label className="text-sm font-medium text-slate-600">Motoboy</label>

          <select
            value={motoboyIdSelecionado}
            onChange={(evento) => setMotoboyIdSelecionado(evento.target.value)}
            className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 outline-none focus:border-emerald-500"
          >
            <option value="">Selecione</option>

            {motoboys.map((motoboy: any) => (
              <option key={motoboy.id} value={motoboy.id}>
                {motoboy.nome}
              </option>
            ))}
          </select>
        </div>

        <FiltroData label="Data inicial" value={dataInicio} onChange={setDataInicio} />

        <FiltroData label="Data final" value={dataFim} onChange={setDataFim} />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-5">
        <Card titulo="Teles" valor={`${telesDoMotoboy.length}`} icon={<FileText size={24} />} />
        <Card
          titulo="Total bruto"
          valor={`R$ ${formatarValor(totalBruto)}`}
          icon={<DollarSign size={24} />}
        />
        <Card
          titulo="Valor motoboy"
          valor={`R$ ${formatarValor(valorMotoboy)}`}
          icon={<Bike size={24} />}
        />
        <Card
          titulo="Já recebeu"
          valor={`R$ ${formatarValor(jaRecebeu)}`}
          icon={<DollarSign size={24} />}
        />
        <Card
          titulo={saldo >= 0 ? "A receber" : "Recebeu a mais"}
          valor={`R$ ${formatarValor(Math.abs(saldo))}`}
          icon={<DollarSign size={24} />}
          alerta={saldo !== 0}
        />
      </div>

      {motoboyAtual && (
        <div className="mb-8 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Acerto de {motoboyAtual.nome}</h2>

              <p className="mt-1 text-sm text-slate-500">
                Clientes: R$ {formatarValor(recebidoCliente)} • Escritório: R${" "}
                {formatarValor(recebidoEscritorio)} • Ajustes: R$ {formatarValor(ajustes)}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => abrirLancamento("AJUSTE")}
                className="flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 font-semibold text-slate-700"
              >
                <Plus size={18} />
                Registrar ajuste
              </button>

              <button
                type="button"
                onClick={() => abrirLancamento("ESCRITORIO")}
                className="flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 font-semibold text-white"
              >
                <Plus size={18} />
                Registrar pagamento
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8 max-w-5xl rounded-3xl border border-slate-100 bg-white p-5 shadow-sm md:p-8">
        <textarea
          value={textoExtrato}
          readOnly
          className="h-72 w-full rounded-2xl border border-slate-200 bg-slate-50 p-5 outline-none md:h-96"
        />

        <button
          type="button"
          onClick={() => void copiarExtrato()}
          disabled={!textoExtrato}
          className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 text-white disabled:opacity-40 md:w-auto"
        >
          <Copy size={18} />
          Copiar extrato
        </button>
      </div>

      {motoboyAtual && (
        <div className="max-w-5xl rounded-3xl border border-slate-100 bg-white p-5 shadow-sm md:p-8">
          <h2 className="mb-5 text-2xl font-bold text-slate-900">Histórico financeiro</h2>

          {historicoFinanceiro.length === 0 ? (
            <p className="text-slate-500">Nenhum movimento financeiro registrado.</p>
          ) : (
            <div className="space-y-3">
              {historicoFinanceiro.map((movimento: any) => (
                <div
                  key={movimento.id}
                  className="flex flex-col gap-3 rounded-2xl bg-slate-50 p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <strong className="text-slate-900">{movimento.titulo}</strong>

                    <p className="mt-1 text-sm text-slate-500">{formatarData(movimento.data)}</p>

                    <p className="text-sm text-slate-500">{movimento.descricao}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <strong className={movimento.valor >= 0 ? "text-emerald-700" : "text-red-600"}>
                      R$ {formatarValor(movimento.valor)}
                    </strong>

                    {!movimento.automatico && (
                      <button
                        type="button"
                        onClick={() => void excluirMovimento(movimento.id)}
                        disabled={excluindoId === movimento.id}
                        className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50 text-red-600 disabled:opacity-50"
                        title="Excluir lançamento"
                      >
                        {excluindoId === movimento.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Trash2 size={16} />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-50 px-5 py-5 md:px-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-600">
                  Financeiro do motoboy
                </p>

                <h2 className="mt-1 text-2xl font-bold text-slate-900">
                  {tipoLancamento === "ESCRITORIO" ? "Registrar pagamento" : "Registrar ajuste"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">{motoboyAtual?.nome}</p>
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
              {erroModal && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {erroModal}
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-slate-600">Valor</label>

                <input
                  value={valorLancamento}
                  onChange={(evento) => {
                    setValorLancamento(evento.target.value);
                    setErroModal("");
                  }}
                  placeholder={tipoLancamento === "AJUSTE" ? "Use negativo para desconto" : "0,00"}
                  className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-600">Observação</label>

                <input
                  value={descricaoLancamento}
                  onChange={(evento) => setDescricaoLancamento(evento.target.value)}
                  className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FiltroData
                  label="Referente de"
                  value={dataReferenciaInicio}
                  onChange={setDataReferenciaInicio}
                />

                <FiltroData
                  label="Referente até"
                  value={dataReferenciaFim}
                  onChange={setDataReferenciaFim}
                />
              </div>
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
                onClick={() => void registrarLancamento()}
                disabled={salvando}
                className="flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 font-semibold text-white disabled:opacity-60"
              >
                {salvando && <Loader2 size={17} className="animate-spin" />}
                {salvando ? "Salvando..." : "Confirmar"}
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

function Card({
  titulo,
  valor,
  icon,
  alerta = false,
}: {
  titulo: string;
  valor: string;
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
    </div>
  );
}
