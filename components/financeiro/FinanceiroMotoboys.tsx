"use client";

import { useMemo, useState } from "react";
import { Bike, Copy, DollarSign, FileText, Plus, X, Trash2 } from "lucide-react";
import { useExpressManager } from "@/context/ExpressManagerContext";

export default function FinanceiroMotoboys() {
  const {
    motoboys,
    teles,
    movimentosFinanceirosMotoboy,
    recarregarDados,
  } = useExpressManager();

  const [motoboySelecionado, setMotoboySelecionado] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  const [modalAberto, setModalAberto] = useState(false);
  const [valorPagamento, setValorPagamento] = useState("");
  const [descricaoPagamento, setDescricaoPagamento] = useState("PIX semanal");
  const [salvando, setSalvando] = useState(false);

async function excluirMovimento(id: string) {
  const confirmar = confirm("Excluir este recebimento?");

  if (!confirmar) return;

  const resposta = await fetch(`/api/movimentos-financeiros-motoboy/${id}`, {
    method: "DELETE",
  });

  if (!resposta.ok) {
    alert("Erro ao excluir recebimento.");
    return;
  }

  await recarregarDados();

  alert("Recebimento excluído.");
}

  function converterValor(valor: any) {
    return Number(String(valor || "0").replace(",", "."));
  }

  function formatarValor(valor: number) {
    return valor.toFixed(2).replace(".", ",");
  }

  function formatarData(data: any) {
  if (!data) return "-";

  return new Date(data).toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });
}

  function dataDaTele(criadoEm: string) {
    return criadoEm.split(",")[0];
  }

  function dataParaComparar(dataBR: string) {
    const [dia, mes, ano] = dataBR.split("/");
    return `${ano}-${mes}-${dia}`;
  }

  function nomeDestino(tele: any) {
    if (tele.paradas?.length > 0) {
      const paradaPrincipal =
        tele.paradas.find((parada: any) => parada.cliente !== tele.solicitante) ||
        tele.paradas[0];

      return paradaPrincipal.cliente || paradaPrincipal.nomeCliente || tele.nomeCliente;
    }

    return tele.nomeCliente;
  }

  const motoboyAtual = motoboys.find(
    (motoboy: any) => motoboy.nome === motoboySelecionado
  );

  const telesDoMotoboy = useMemo(() => {
    return teles.filter((tele: any) => {
      if (!motoboySelecionado) return false;
      if (tele.motoboy !== motoboySelecionado) return false;

      const dataTele = dataParaComparar(dataDaTele(tele.criadoEm));

      if (dataInicio && dataTele < dataInicio) return false;
      if (dataFim && dataTele > dataFim) return false;

      return true;
    });
  }, [teles, motoboySelecionado, dataInicio, dataFim]);

  const movimentosDoMotoboy = useMemo(() => {
    return movimentosFinanceirosMotoboy.filter((movimento: any) => {
      if (!motoboyAtual) return false;
      if (movimento.motoboyId !== motoboyAtual.id) return false;

      const dataMovimento = new Date(movimento.criadoEm)
        .toISOString()
        .slice(0, 10);

      if (dataInicio && dataMovimento < dataInicio) return false;
      if (dataFim && dataMovimento > dataFim) return false;

      return true;
    });
  }, [
    movimentosFinanceirosMotoboy,
    motoboyAtual,
    dataInicio,
    dataFim,
  ]);

  const totalBruto = telesDoMotoboy.reduce(
    (soma: number, tele: any) => soma + converterValor(tele.valor),
    0
  );

  const valorMotoboy = totalBruto * 0.8;

const recebidoClienteAntigo = telesDoMotoboy
  .filter((tele: any) => {
    const recebimento = String(tele.recebimento || "").toLowerCase();

    const jaTemMovimento = movimentosDoMotoboy.some(
      (movimento: any) =>
        movimento.tipo === "CLIENTE" &&
        movimento.fechamentoId &&
        movimento.fechamentoId === tele.fechamentoId
    );

    return (
      recebimento === "motoboy" &&
      !jaTemMovimento &&
      (!tele.motoboyRecebedor ||
        tele.motoboyRecebedor === motoboySelecionado)
    );
  })
  .reduce((soma: number, tele: any) => {
    return soma + converterValor(tele.valorRecebido || tele.valor);
  }, 0);
  

  const recebidoCliente =
  recebidoClienteAntigo +
  movimentosDoMotoboy
    .filter((movimento: any) => movimento.tipo === "CLIENTE")
    .reduce(
      (soma: number, movimento: any) => soma + Number(movimento.valor || 0),
      0
    );

  const recebidoEscritorio = movimentosDoMotoboy
    .filter((movimento: any) => movimento.tipo === "ESCRITORIO")
    .reduce((soma: number, movimento: any) => soma + Number(movimento.valor || 0), 0);

  const ajustes = movimentosDoMotoboy
    .filter((movimento: any) => movimento.tipo === "AJUSTE")
    .reduce((soma: number, movimento: any) => soma + Number(movimento.valor || 0), 0);

  const jaRecebeu = recebidoCliente + recebidoEscritorio + ajustes;
  const saldo = valorMotoboy - jaRecebeu;

  const textoExtrato = useMemo(() => {
    if (!motoboySelecionado) return "";

    const agrupado = telesDoMotoboy.reduce((acc: any, tele: any) => {
      const data = dataDaTele(tele.criadoEm);
      if (!acc[data]) acc[data] = [];
      acc[data].push(tele);
      return acc;
    }, {});

    let texto = `EXTRATO MOTOBOY - ${motoboySelecionado.toUpperCase()}\n\n`;

    Object.keys(agrupado).forEach((data) => {
      texto += `${data}\n`;

      agrupado[data].forEach((tele: any) => {
        texto += `- ${tele.solicitante} → ${nomeDestino(tele)} - R$${tele.valor}\n`;
      });

      texto += "\n";
    });

    texto += `Total de teles - ${telesDoMotoboy.length}\n`;
    texto += `Total bruto - R$${formatarValor(totalBruto)}\n`;
    texto += `Valor do motoboy - R$${formatarValor(valorMotoboy)}\n`;
    texto += `Recebido de clientes - R$${formatarValor(recebidoCliente)}\n`;
    texto += `Recebido do escritório - R$${formatarValor(recebidoEscritorio)}\n`;
    texto += `Saldo - R$${formatarValor(saldo)}`;

    return texto;
  }, [
    motoboySelecionado,
    telesDoMotoboy,
    totalBruto,
    valorMotoboy,
    recebidoCliente,
    recebidoEscritorio,
    saldo,
  ]);

const historicoFinanceiro = [
  ...movimentosDoMotoboy.map((movimento: any) => ({
    id: movimento.id,
    titulo:
      movimento.tipo === "CLIENTE"
        ? movimento.clienteNome || "Cliente"
        : movimento.tipo === "ESCRITORIO"
        ? "Escritório"
        : "Ajuste",
    descricao:
      movimento.tipo === "CLIENTE"
        ? movimento.descricao || "Recebido direto do cliente"
        : movimento.descricao || "-",
    data: movimento.criadoEm,
    valor: Number(movimento.valor || 0),
  })),

 ...telesDoMotoboy
  .filter((tele: any) => {
    const recebimento = String(tele.recebimento || "").toLowerCase();

    const jaTemMovimento = movimentosDoMotoboy.some(
      (movimento: any) =>
        movimento.tipo === "CLIENTE" &&
        movimento.fechamentoId &&
        movimento.fechamentoId === tele.fechamentoId
    );

    return (
      recebimento === "motoboy" &&
      !jaTemMovimento &&
      (!tele.motoboyRecebedor ||
        tele.motoboyRecebedor === motoboySelecionado)
    );
  })
    .map((tele: any) => ({
      id: `tele-${tele.id}`,
      titulo: tele.solicitante,
      descricao: "Recebido direto do cliente",
      data: tele.dataRecebimento || tele.dataTele || tele.criadoEm,
      valor: converterValor(tele.valorRecebido || tele.valor),
    })),
].sort(
  (a: any, b: any) =>
    new Date(b.data).getTime() - new Date(a.data).getTime()
);

  function copiarExtrato() {
    navigator.clipboard.writeText(textoExtrato);
    alert("Extrato copiado!");
  }

  function abrirPagamento() {
    setValorPagamento(saldo > 0 ? formatarValor(saldo) : "");
    setDescricaoPagamento("PIX semanal");
    setModalAberto(true);
  }

  async function registrarPagamento() {
    if (!motoboyAtual) return;

    const valor = converterValor(valorPagamento);

    if (valor <= 0) {
      alert("Informe um valor válido.");
      return;
    }

    setSalvando(true);

    const resposta = await fetch("/api/movimentos-financeiros-motoboy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        motoboyId: motoboyAtual.id,
        tipo: "ESCRITORIO",
        valor,
        descricao: descricaoPagamento || "Pagamento escritório",
      }),
    });

    if (!resposta.ok) {
      alert("Erro ao registrar pagamento.");
      setSalvando(false);
      return;
    }

    await recarregarDados();

    setModalAberto(false);
    setValorPagamento("");
    setDescricaoPagamento("PIX semanal");
    setSalvando(false);

    alert("Pagamento registrado com sucesso!");
  }

  return (
  <>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8 bg-white rounded-3xl p-5 md:p-8 shadow-sm border border-slate-100">
        <div>
          <label className="text-sm font-medium text-slate-600">Motoboy</label>
          <select
            value={motoboySelecionado}
            onChange={(e) => setMotoboySelecionado(e.target.value)}
            className="w-full mt-2 h-12 rounded-xl border border-slate-200 px-4 outline-none focus:border-emerald-500"
          >
            <option value="">Selecione</option>
            {motoboys.map((motoboy: any) => (
              <option key={motoboy.id || motoboy.nome} value={motoboy.nome}>
                {motoboy.nome}
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

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-6 mb-8">
        <Card titulo="Teles" valor={`${telesDoMotoboy.length}`} icon={<FileText size={26} />} />
        <Card titulo="Total bruto" valor={`R$ ${formatarValor(totalBruto)}`} icon={<DollarSign size={26} />} />
        <Card titulo="Valor motoboy" valor={`R$ ${formatarValor(valorMotoboy)}`} icon={<Bike size={26} />} />
        <Card titulo="Já recebeu" valor={`R$ ${formatarValor(jaRecebeu)}`} icon={<DollarSign size={26} />} />
        <Card
          titulo={saldo >= 0 ? "A receber" : "Recebeu a mais"}
          valor={`R$ ${formatarValor(Math.abs(saldo))}`}
          icon={<DollarSign size={26} />}
        />
      </div>

      {motoboySelecionado && (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">Acerto do motoboy</h2>
              <p className="text-slate-500 mt-1">
                Cliente: R$ {formatarValor(recebidoCliente)} • Escritório: R$ {formatarValor(recebidoEscritorio)}
              </p>
            </div>

            <button
              onClick={abrirPagamento}
              disabled={!motoboyAtual}
              className="w-full md:w-auto h-12 px-6 rounded-xl bg-emerald-600 text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <Plus size={18} />
              Registrar pagamento
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl p-5 md:p-8 shadow-sm border border-slate-100 max-w-5xl mb-8">
        <textarea
          value={textoExtrato}
          readOnly
          className="w-full h-72 md:h-96 rounded-2xl border border-slate-200 p-5 outline-none bg-slate-50"
        />

        <button
          onClick={copiarExtrato}
          disabled={!textoExtrato}
          className="w-full md:w-auto h-12 px-6 mt-5 rounded-xl bg-slate-900 text-white flex items-center justify-center gap-2 disabled:opacity-40"
        >
          <Copy size={18} />
          Copiar extrato
        </button>
      </div>

      {motoboySelecionado && (
        <div className="bg-white rounded-3xl p-5 md:p-8 shadow-sm border border-slate-100 max-w-5xl">
          <h2 className="text-2xl font-bold mb-5">Histórico financeiro</h2>

         {historicoFinanceiro.length === 0 ? (
            <p className="text-slate-500">Nenhum movimento financeiro registrado.</p>
          ) : (
            <div className="space-y-3">
              {historicoFinanceiro.map((movimento: any) => (
                <div
  key={movimento.id}
  className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-slate-50 rounded-2xl p-4"
>
  <div>
    <strong>{movimento.titulo}</strong>

    <p className="text-sm text-slate-500">
      {formatarData(movimento.data)}
    </p>

    <p className="text-sm text-slate-500">
      {movimento.descricao}
    </p>
  </div>

  <div className="flex items-center gap-3">
  <strong className="text-emerald-700">
    R$ {formatarValor(Number(movimento.valor || 0))}
  </strong>

  {!String(movimento.id).startsWith("tele-") && (
    <button
      onClick={() => excluirMovimento(movimento.id)}
      className="w-9 h-9 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 flex items-center justify-center"
      title="Excluir recebimento"
    >
      <Trash2 size={16} />
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
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-2xl font-bold">Registrar pagamento</h2>

              <button
                onClick={() => setModalAberto(false)}
                className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-slate-500 mb-5">
              Saldo atual:{" "}
              <strong className={saldo > 0 ? "text-orange-600" : "text-emerald-700"}>
                R$ {formatarValor(saldo)}
              </strong>
            </p>

            <div>
              <label className="text-sm font-medium text-slate-600">
                Valor pago
              </label>
              <input
                value={valorPagamento}
                onChange={(e) => setValorPagamento(e.target.value)}
                placeholder="0,00"
                className="w-full mt-2 h-12 rounded-xl border border-slate-200 px-4 outline-none focus:border-emerald-500"
              />
            </div>

            <div className="mt-4">
              <label className="text-sm font-medium text-slate-600">
                Observação
              </label>
              <input
                value={descricaoPagamento}
                onChange={(e) => setDescricaoPagamento(e.target.value)}
                className="w-full mt-2 h-12 rounded-xl border border-slate-200 px-4 outline-none focus:border-emerald-500"
              />
            </div>

            <button
              onClick={registrarPagamento}
              disabled={salvando}
              className="w-full h-12 rounded-xl bg-emerald-600 text-white font-semibold mt-6 disabled:opacity-50"
            >
              {salvando ? "Salvando..." : "Confirmar pagamento"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function Card({ titulo, valor, icon }: any) {
  return (
    <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
      <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mb-5">
        {icon}
      </div>
      <p className="text-sm text-slate-500">{titulo}</p>
      <h2 className="text-2xl font-bold mt-2">{valor}</h2>
    </div>
  );
}