"use client";

import PageContainer from "@/components/ui/PageContainer";
import PageHeader from "@/components/ui/PageHeader";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Loader2, Save, Upload } from "lucide-react";
import { type FormEvent, useState } from "react";

type RegistroPreview = {
  aba: string;
  data: string;
  clienteNomeOriginal: string;
  clienteId: string | null;
  clienteNomeSistema: string | null;
  valor: number;
};

type ResultadoPreview = {
  arquivo: string;
  ano: number;
  abasEncontradas: string[];
  abasProcessadas: string[];
  quantidadeRegistros: number;
  quantidadeClientes: number;
  quantidadeVinculados: number;
  quantidadeNaoVinculados: number;
  total: number;

  clientesSistema: {
    id: string;
    nome: string;
  }[];

  totaisPorMes: {
    mes: string;
    quantidade: number;
    total: number;
  }[];

  clientesNaoVinculados: {
    nomePlanilha: string;
  }[];

  avisos: string[];

  registros: RegistroPreview[];
  amostra: RegistroPreview[];
};

type AssociacaoCliente = {
  nomePlanilha: string;
  acao: "VINCULAR" | "CRIAR" | "";
  clienteId: string;
};

function formatarDinheiro(valor: number) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarData(data: string) {
  const [ano, mes, dia] = data.split("-");

  return `${dia}/${mes}/${ano}`;
}

export default function ImportarHistoricoPage() {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [ano, setAno] = useState(new Date().getFullYear());

  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  const [resultado, setResultado] = useState<ResultadoPreview | null>(null);

  const [associacoes, setAssociacoes] = useState<AssociacaoCliente[]>([]);

  async function visualizar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    if (!arquivo) {
      setErro("Selecione uma planilha.");
      return;
    }

    setCarregando(true);
    setErro("");
    setSucesso("");
    setResultado(null);
    setAssociacoes([]);

    try {
      const formData = new FormData();

      formData.append("arquivo", arquivo);
      formData.append("ano", String(ano));

      const resposta = await fetch("/api/importacoes/planilha/preview", {
        method: "POST",
        body: formData,
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(dados.erro || "Erro ao processar planilha.");
      }

      const resultadoRecebido = dados as ResultadoPreview;

      setResultado(resultadoRecebido);

      setAssociacoes(
        resultadoRecebido.clientesNaoVinculados.map((cliente) => ({
          nomePlanilha: cliente.nomePlanilha,
          acao: "",
          clienteId: "",
        }))
      );
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao processar planilha.");
    } finally {
      setCarregando(false);
    }
  }

  function atualizarAssociacao(nomePlanilha: string, dados: Partial<AssociacaoCliente>) {
    setAssociacoes((atuais) =>
      atuais.map((associacao) =>
        associacao.nomePlanilha === nomePlanilha
          ? {
              ...associacao,
              ...dados,
            }
          : associacao
      )
    );
  }

  async function salvarHistorico() {
    if (!resultado) return;

    if (!Array.isArray(resultado.registros) || resultado.registros.length === 0) {
      setErro("A prévia não contém os registros completos. Visualize a planilha novamente.");
      return;
    }

    const associacaoInvalida = associacoes.find(
      (associacao) => associacao.acao === "VINCULAR" && !associacao.clienteId
    );

    if (associacaoInvalida) {
      setErro(`Selecione o cliente para vincular "${associacaoInvalida.nomePlanilha}".`);
      return;
    }

    const confirmou = window.confirm(
      `Deseja importar ${resultado.quantidadeRegistros} registros?\n\n` +
        "Os clientes que ainda não estiverem vinculados serão criados automaticamente."
    );

    if (!confirmou) return;

    setSalvando(true);
    setErro("");
    setSucesso("");

    try {
      const resposta = await fetch("/api/importacoes/planilha/confirmar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nomeArquivo: resultado.arquivo,
          ano: resultado.ano,
          registros: resultado.registros,

          associacoes: associacoes.map((associacao) => ({
            nomePlanilha: associacao.nomePlanilha,

            clienteId: associacao.acao === "VINCULAR" ? associacao.clienteId : null,
          })),
        }),
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(dados.erro || "Erro ao salvar o histórico.");
      }

      setSucesso(
        `${dados.quantidadeRegistros} registros foram importados com sucesso. ` +
          `${dados.clientesCriados} clientes novos foram criados.`
      );
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao salvar o histórico.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <PageContainer>
      <PageHeader
        titulo="Importar histórico"
        descricao="Importe o faturamento antigo das suas planilhas para o Express Manager."
      />

      <form
        onSubmit={visualizar}
        className="mt-8 max-w-4xl rounded-3xl border border-slate-100 bg-white p-5 shadow-sm md:p-7"
      >
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium text-slate-600">Planilha</label>

            <label className="mt-2 flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 p-5 text-center hover:border-emerald-400">
              <FileSpreadsheet size={34} className="text-emerald-600" />

              <strong className="mt-3">{arquivo ? arquivo.name : "Selecionar arquivo"}</strong>

              <span className="mt-1 text-sm text-slate-500">Formatos aceitos: .xlsx e .xls</span>

              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(evento) => {
                  setArquivo(evento.target.files?.[0] ?? null);

                  setResultado(null);
                  setErro("");
                  setSucesso("");
                  setAssociacoes([]);
                }}
              />
            </label>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-600">Ano dos dados</label>

            <input
              type="number"
              min={2000}
              max={2100}
              value={ano}
              onChange={(evento) => {
                setAno(Number(evento.target.value));

                setResultado(null);
                setErro("");
                setSucesso("");
                setAssociacoes([]);
              }}
              className="mt-2 h-14 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-emerald-500"
            />

            <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
              Primeiro você poderá conferir os clientes, datas e valores. O histórico só será salvo
              quando clicar no botão final.
            </div>
          </div>
        </div>

        {erro && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            {erro}
          </div>
        )}

        <button
          type="submit"
          disabled={!arquivo || carregando || salvando}
          className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {carregando ? (
            <>
              <Loader2 size={20} className="animate-spin" />
              Lendo planilha...
            </>
          ) : (
            <>
              <Upload size={20} />
              Visualizar importação
            </>
          )}
        </button>
      </form>

      {resultado && (
        <div className="mt-8 space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <CardResumo titulo="Registros" valor={String(resultado.quantidadeRegistros)} />

            <CardResumo titulo="Clientes" valor={String(resultado.quantidadeClientes)} />

            <CardResumo titulo="Vinculados" valor={String(resultado.quantidadeVinculados)} />

            <CardResumo titulo="Total" valor={formatarDinheiro(resultado.total)} />
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm md:p-7">
            <h2 className="text-xl font-bold">Totais por mês</h2>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="border-b text-left text-sm text-slate-500">
                    <th className="p-3">Mês</th>
                    <th className="p-3">Registros</th>
                    <th className="p-3 text-right">Total</th>
                  </tr>
                </thead>

                <tbody>
                  {resultado.totaisPorMes.map((mes) => (
                    <tr key={mes.mes} className="border-b last:border-b-0">
                      <td className="p-3 font-semibold">{mes.mes}</td>

                      <td className="p-3">{mes.quantidade}</td>

                      <td className="p-3 text-right font-semibold">
                        {formatarDinheiro(mes.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {resultado.clientesNaoVinculados.length > 0 ? (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 md:p-7">
              <div className="flex items-center gap-3">
                <AlertTriangle className="text-amber-700" />

                <div>
                  <h2 className="text-xl font-bold text-amber-900">Clientes não vinculados</h2>

                  <p className="text-sm text-amber-800">
                    Você pode vincular nomes antigos a clientes existentes. Os demais serão criados
                    automaticamente.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
                {resultado.clientesNaoVinculados.map((cliente) => {
                  const associacao = associacoes.find(
                    (item) => item.nomePlanilha === cliente.nomePlanilha
                  );

                  return (
                    <div
                      key={cliente.nomePlanilha}
                      className="rounded-2xl border border-amber-200 bg-white p-4"
                    >
                      <strong className="block text-slate-900">{cliente.nomePlanilha}</strong>

                      <select
                        value={associacao?.acao || ""}
                        onChange={(evento) => {
                          const acao = evento.target.value as "VINCULAR" | "CRIAR" | "";

                          atualizarAssociacao(cliente.nomePlanilha, {
                            acao,
                            clienteId: "",
                          });
                        }}
                        className="mt-3 h-11 w-full rounded-xl border border-slate-200 bg-white px-3"
                      >
                        <option value="">Criar automaticamente</option>

                        <option value="VINCULAR">Vincular a cliente existente</option>

                        <option value="CRIAR">Criar novo cliente</option>
                      </select>

                      {associacao?.acao === "VINCULAR" && (
                        <select
                          value={associacao.clienteId}
                          onChange={(evento) =>
                            atualizarAssociacao(cliente.nomePlanilha, {
                              clienteId: evento.target.value,
                            })
                          }
                          className="mt-3 h-11 w-full rounded-xl border border-slate-200 bg-white px-3"
                        >
                          <option value="">Selecione o cliente</option>

                          {resultado.clientesSistema.map((clienteSistema) => (
                            <option key={clienteSistema.id} value={clienteSistema.id}>
                              {clienteSistema.nome}
                            </option>
                          ))}
                        </select>
                      )}

                      {associacao?.acao === "CRIAR" && (
                        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                          Será criado um novo cliente chamado{" "}
                          <strong>{cliente.nomePlanilha}</strong>.
                        </div>
                      )}

                      {!associacao?.acao && (
                        <div className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                          Será criado automaticamente como <strong>{cliente.nomePlanilha}</strong>.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800">
              <CheckCircle2 />
              Todos os clientes foram vinculados automaticamente.
            </div>
          )}

          <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm md:p-7">
            <h2 className="text-xl font-bold">Amostra dos registros</h2>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b text-left text-sm text-slate-500">
                    <th className="p-3">Data</th>
                    <th className="p-3">Mês</th>
                    <th className="p-3">Nome da planilha</th>
                    <th className="p-3">Cliente no sistema</th>
                    <th className="p-3 text-right">Valor</th>
                  </tr>
                </thead>

                <tbody>
                  {resultado.amostra.map((registro, index) => (
                    <tr
                      key={`${registro.data}-${registro.clienteNomeOriginal}-${index}`}
                      className="border-b last:border-b-0"
                    >
                      <td className="p-3">{formatarData(registro.data)}</td>

                      <td className="p-3">{registro.aba}</td>

                      <td className="p-3 font-medium">{registro.clienteNomeOriginal}</td>

                      <td className="p-3">
                        {registro.clienteNomeSistema ?? "Será criado ou vinculado"}
                      </td>

                      <td className="p-3 text-right font-semibold">
                        {formatarDinheiro(registro.valor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {erro && (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-red-700">
              {erro}
            </div>
          )}

          {sucesso && (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-800">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 shrink-0" />

                <div>
                  <strong>Importação concluída!</strong>

                  <p className="mt-1">{sucesso}</p>
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={salvarHistorico}
            disabled={salvando || Boolean(sucesso)}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {salvando ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Salvando histórico...
              </>
            ) : sucesso ? (
              <>
                <CheckCircle2 size={20} />
                Histórico já importado
              </>
            ) : (
              <>
                <Save size={20} />
                Salvar histórico
              </>
            )}
          </button>
        </div>
      )}
    </PageContainer>
  );
}

function CardResumo({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{titulo}</p>

      <h2 className="mt-2 text-2xl font-bold">{valor}</h2>
    </div>
  );
}
