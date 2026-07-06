"use client";

import { useMemo, useState } from "react";
import { CheckCircle, DollarSign } from "lucide-react";
import PageContainer from "@/components/ui/PageContainer";
import PageHeader from "@/components/ui/PageHeader";
import { useExpressManager } from "@/context/ExpressManagerContext";

export default function FechamentosPage() {
  const { clientes, motoboys, teles, recarregarDados } = useExpressManager();

  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [clienteSelecionado, setClienteSelecionado] = useState<any>(null);
  const [distribuicoes, setDistribuicoes] = useState<any[]>([]);
  const [fechando, setFechando] = useState(false);

  function converterValor(valor: any) {
    return Number(String(valor || "0").replace(",", "."));
  }

  function formatarValor(valor: number) {
    return valor.toFixed(2).replace(".", ",");
  }

  function dataDaTele(tele: any) {
    if (tele.dataTele) {
      return new Date(tele.dataTele).toISOString().slice(0, 10);
    }

    return "";
  }

  function saldoTele(tele: any) {
    const total = converterValor(tele.total || tele.valor);
    const recebido = converterValor(tele.valorRecebido || 0);
    return Math.max(total - recebido, 0);
  }

  const clientesComFechamento = useMemo(() => {
    return clientes
      .filter((cliente: any) => String(cliente.formaCobranca).toUpperCase() !== "NA_HORA")
      .map((cliente: any) => {
        const telesCliente = teles.filter((tele: any) => {
          if (tele.solicitante !== cliente.nome) return false;
          if (saldoTele(tele) <= 0) return false;

          const dataTele = dataDaTele(tele);

          if (dataInicio && dataTele < dataInicio) return false;
          if (dataFim && dataTele > dataFim) return false;

          return true;
        });

        const total = telesCliente.reduce(
          (soma: number, tele: any) => soma + saldoTele(tele),
          0
        );

        return {
          ...cliente,
          teles: telesCliente,
          total,
        };
      })
      .filter((cliente: any) => cliente.teles.length > 0);
  }, [clientes, teles, dataInicio, dataFim]);

  function abrirFechamento(cliente: any) {
    const grupos = Object.values(
      cliente.teles.reduce((acc: any, tele: any) => {
        const nome = tele.motoboy || tele.motoboyNome || "Sem motoboy";

        if (!acc[nome]) {
          const motoboy = motoboys.find((m: any) => m.nome === nome);

          acc[nome] = {
            motoboyNome: nome,
            motoboyId: motoboy?.id || null,
            total: 0,
            quantidade: 0,
            recebedorTipo: "ESCRITORIO",
            valorRecebido: "0",
          };
        }

        acc[nome].total += saldoTele(tele);
        acc[nome].quantidade += 1;

        return acc;
      }, {})
    ) as any[];

    setDistribuicoes(grupos);
    setClienteSelecionado(cliente);
  }

  function atualizarDistribuicao(index: number, campo: string, valor: any) {
    const novas = [...distribuicoes];
    novas[index] = {
      ...novas[index],
      [campo]: valor,
    };
    setDistribuicoes(novas);
  }

  async function confirmarFechamento() {
    if (!clienteSelecionado) return;

    if (!dataInicio || !dataFim) {
      alert("Selecione o período do fechamento.");
      return;
    }

    const invalida = distribuicoes.some((item) => {
      const valorRecebido = converterValor(item.valorRecebido);

      if (item.recebedorTipo === "MOTOBOY" && !item.motoboyId) return true;
      if (valorRecebido < 0) return true;
      if (valorRecebido > item.total) return true;

      return false;
    });

    if (invalida) {
      alert("Verifique os valores recebidos. Não pode ser maior que o saldo aberto.");
      return;
    }

    setFechando(true);

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
      }),
    });

    if (!resposta.ok) {
      const erro = await resposta.json();
      alert(erro.erro || "Erro ao fechar cliente.");
      setFechando(false);
      return;
    }

    await recarregarDados();

    setClienteSelecionado(null);
    setDistribuicoes([]);
    setFechando(false);

    alert("Fechamento realizado com sucesso!");
  }

  return (
    <PageContainer>
      <PageHeader
        titulo="Fechamentos Financeiros"
        descricao="Feche clientes por período e mantenha pendente o que foi pago parcialmente."
      />

      <div className="bg-white rounded-3xl p-5 md:p-6 shadow-sm border border-slate-100 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
      </div>

      {clientesComFechamento.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 text-center text-slate-500">
          Nenhum cliente com fechamento aberto nesse período.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {clientesComFechamento.map((cliente: any) => (
            <div
              key={cliente.id || cliente.nome}
              className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100"
            >
              <h2 className="text-xl font-bold">{cliente.nome}</h2>
              <p className="text-sm text-slate-500 mt-1">{cliente.formaCobranca}</p>

              <div className="bg-slate-50 rounded-2xl p-4 mt-5">
                <p className="text-sm text-slate-500">Teles em aberto</p>
                <h3 className="text-2xl font-bold">{cliente.teles.length}</h3>

                <p className="text-sm text-slate-500 mt-4">Saldo aberto</p>
                <h3 className="text-2xl font-bold text-orange-600">
                  R$ {formatarValor(cliente.total)}
                </h3>
              </div>

              <button
                onClick={() => abrirFechamento(cliente)}
                className="w-full h-12 rounded-2xl bg-emerald-600 text-white font-semibold mt-5 flex items-center justify-center gap-2"
              >
                <DollarSign size={18} />
                Fechar cliente
              </button>
            </div>
          ))}
        </div>
      )}

      {clienteSelecionado && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold">Fechar {clienteSelecionado.nome}</h2>

            <p className="text-slate-500 mt-2">
              {clienteSelecionado.teles.length} teles abertas • R${" "}
              {formatarValor(clienteSelecionado.total)}
            </p>

            <div className="mt-6 space-y-4">
              <h3 className="font-bold text-lg">Distribuição do pagamento</h3>

              {distribuicoes.map((item, index) => {
                const valorRecebido = converterValor(item.valorRecebido);
                const falta = item.total - valorRecebido;

                return (
                  <div
                    key={item.motoboyNome}
                    className="bg-slate-50 rounded-2xl p-4 border border-slate-100"
                  >
                    <div className="flex justify-between gap-4 mb-3">
                      <div>
                        <strong>{item.motoboyNome}</strong>
                        <p className="text-sm text-slate-500">{item.quantidade} teles</p>
                      </div>

                      <strong className="text-orange-600">
                        R$ {formatarValor(item.total)}
                      </strong>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-slate-600">
                          Quem recebeu?
                        </label>

                        <select
                          value={item.recebedorTipo}
                          onChange={(e) => {
                            const tipo = e.target.value;
                            const novas = [...distribuicoes];

                            const jaDigitou =
                              Number(
                                String(novas[index].valorRecebido || "0").replace(",", ".")
                              ) > 0;

                            novas[index] = {
                              ...novas[index],
                              recebedorTipo: tipo,
                              valorRecebido: jaDigitou
                                ? novas[index].valorRecebido
                                : String(novas[index].total).replace(".", ","),
                            };

                            setDistribuicoes(novas);
                          }}
                          className="w-full mt-2 h-12 rounded-xl border border-slate-200 px-4 outline-none focus:border-emerald-500 bg-white"
                        >
                          <option value="ESCRITORIO">Escritório</option>
                          <option value="MOTOBOY">Próprio motoboy</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-sm font-medium text-slate-600">
                          Valor recebido agora
                        </label>

                        <input
                          value={item.valorRecebido}
                          onChange={(e) =>
                            atualizarDistribuicao(index, "valorRecebido", e.target.value)
                          }
                          placeholder="0,00"
                          className="w-full mt-2 h-12 rounded-xl border border-slate-200 px-4 outline-none focus:border-emerald-500 bg-white"
                        />
                      </div>
                    </div>

                    <div className="mt-4 bg-white rounded-xl p-3 text-sm">
                      <div className="flex justify-between">
                        <span>Recebeu agora</span>
                        <strong>R$ {formatarValor(valorRecebido)}</strong>
                      </div>

                      <div className="flex justify-between mt-1">
                        <span>Vai continuar pendente</span>
                        <strong className={falta > 0 ? "text-orange-600" : "text-emerald-700"}>
                          R$ {formatarValor(Math.max(falta, 0))}
                        </strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-col md:flex-row gap-3 mt-8">
              <button
                onClick={() => {
                  setClienteSelecionado(null);
                  setDistribuicoes([]);
                }}
                className="w-full h-12 rounded-xl border border-slate-200"
              >
                Cancelar
              </button>

              <button
                onClick={confirmarFechamento}
                disabled={fechando}
                className="w-full h-12 rounded-xl bg-emerald-600 text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <CheckCircle size={18} />
                {fechando ? "Fechando..." : "Confirmar fechamento"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}