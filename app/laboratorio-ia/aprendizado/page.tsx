"use client";

import { useCallback, useEffect, useState } from "react";
import CardAprendizado, {
  type ExemploAprendizadoCard,
} from "@/components/ia/CardAprendizado";
import PainelCorrecaoAprendizado, {
  type ExemploCorrecaoAprendizado,
} from "@/components/ia/PainelCorrecaoAprendizado";

type StatusExemplo = "PENDENTE_REVISAO" | "APROVADO" | "CORRIGIDO" | "DESCARTADO";

type AcaoRevisao = "APROVAR" | "DESCARTAR";

type ParadaExemplo = {
  tipo?: string;
  texto?: string;
  cliente?: string | null;
  endereco?: string | null;
};

type ExemploAprendizado = {
  id: string;
  atendimentoId: string | null;
  teleId: string | null;
  telefoneRemetente: string;
  solicitante: string | null;
  mensagemCliente: string;
  respostaHumana: string | null;

  interpretacaoIA: {
    intencao?: string;

    paradasInterpretadas?: Array<{
      tipo?: string;
      texto?: string;
    }>;
  } | null;

  sugestaoIA: {
    respostaAtendimento?: {
      mensagem?: string;
    };

    propostaOperacional?: {
      status?: string;

      paradas?: ParadaExemplo[];

      pendencias?: string[];

      avisos?: string[];

      motoboySugerido?: {
        nome?: string;
        motivo?: string;
      } | null;
    };
  } | null;

  operacaoFinal: {
    status?: string;

    estado?: {
      etapa?: string;
    };

    operacao?: {
      rota?: {
        distanciaKm?: number | null;
        duracaoMin?: number | null;
        valorSugerido?: number | null;
      };

      paradas?: ParadaExemplo[];

      teleCriada?: boolean;

      teleId?: string | null;
    };
  } | null;

  status: StatusExemplo;
  aprovado: boolean;
  corrigido: boolean;
  observacaoHumana: string | null;
  createdAt: string;
};

type RespostaAPI = {
  sucesso: boolean;
  exemplos: ExemploAprendizado[];
  totais: Record<StatusExemplo, number>;
  quantidadeRetornada: number;
  erro?: string;
};

type RespostaRevisaoAPI = {
  sucesso: boolean;
  exemplo?: ExemploAprendizado;
  erro?: string;
};

const rotulosStatus: Record<StatusExemplo, string> = {
  PENDENTE_REVISAO: "Pendentes",
  APROVADO: "Aprovados",
  CORRIGIDO: "Corrigidos",
  DESCARTADO: "Descartados",
};

function formatarData(data: string) {
  return new Date(data).toLocaleString("pt-BR");
}

function formatarValor(valor?: number | null) {
  if (typeof valor !== "number") {
    return "Não calculado";
  }

  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarTipo(tipo?: string) {
  const texto = String(tipo ?? "").trim();

  if (!texto) {
    return "Não identificado";
  }

  return texto
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/(^|\s)\S/g, (letra) => letra.toUpperCase());
}

function obterClasseStatus(status: StatusExemplo) {
  if (status === "APROVADO") {
    return "bg-emerald-500/10 text-emerald-300";
  }

  if (status === "CORRIGIDO") {
    return "bg-blue-500/10 text-blue-300";
  }

  if (status === "DESCARTADO") {
    return "bg-red-500/10 text-red-300";
  }

  return "bg-amber-500/10 text-amber-300";
}

export default function AprendizadoIAPage() {
  const [exemplos, setExemplos] = useState<ExemploAprendizado[]>([]);

  const [totais, setTotais] = useState<Record<StatusExemplo, number>>({
    PENDENTE_REVISAO: 0,
    APROVADO: 0,
    CORRIGIDO: 0,
    DESCARTADO: 0,
  });

  const [filtro, setFiltro] = useState<StatusExemplo>("PENDENTE_REVISAO");

  const [exemploCorrecao, setExemploCorrecao] = useState<ExemploCorrecaoAprendizado | null>(null);

  const [salvandoCorrecao, setSalvandoCorrecao] = useState(false);

  const [processandoId, setProcessandoId] = useState<string | null>(null);

  const [mensagemAcao, setMensagemAcao] = useState<string | null>(null);

  const [mensagemAcaoErro, setMensagemAcaoErro] = useState(false);

  const [carregando, setCarregando] = useState(true);

  const [erro, setErro] = useState<string | null>(null);

  const carregarExemplos = useCallback(async () => {
    try {
      setCarregando(true);
      setErro(null);

      const resposta = await fetch(`/api/ia/aprendizado/exemplos?status=${filtro}`, {
        cache: "no-store",
      });

      const dados: RespostaAPI = await resposta.json();

      if (!resposta.ok || !dados.sucesso) {
        throw new Error(dados.erro ?? "Não foi possível carregar os exemplos.");
      }

      setExemplos(dados.exemplos);
      setTotais(dados.totais);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao carregar exemplos.");
    } finally {
      setCarregando(false);
    }
  }, [filtro]);

  useEffect(() => {
    void carregarExemplos();
  }, [carregarExemplos]);

  async function revisarExemplo({ id, acao }: { id: string; acao: AcaoRevisao }) {
    try {
      setProcessandoId(id);
      setMensagemAcao(null);
      setMensagemAcaoErro(false);

      const resposta = await fetch(`/api/ia/aprendizado/exemplos/${id}`, {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          acao,
        }),
      });

      const dados: RespostaRevisaoAPI = await resposta.json();

      if (!resposta.ok || !dados.sucesso) {
        throw new Error(dados.erro ?? "Não foi possível revisar o exemplo.");
      }

      setMensagemAcao(
        acao === "APROVAR" ? "Exemplo aprovado com sucesso." : "Exemplo descartado com sucesso."
      );

      await carregarExemplos();
    } catch (error) {
      setMensagemAcaoErro(true);

      setMensagemAcao(error instanceof Error ? error.message : "Erro ao revisar o exemplo.");
    } finally {
      setProcessandoId(null);
    }
  }

  async function salvarCorrecao(dados: { respostaHumana: string; observacaoHumana: string }) {
    if (!exemploCorrecao) {
      return;
    }

    try {
      setSalvandoCorrecao(true);
      setMensagemAcao(null);
      setMensagemAcaoErro(false);

      const resposta = await fetch(`/api/ia/aprendizado/exemplos/${exemploCorrecao.id}`, {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          acao: "CORRIGIR",

          respostaHumana: dados.respostaHumana,

          observacaoHumana: dados.observacaoHumana || null,
        }),
      });

      const resultado = await resposta.json();

      if (!resposta.ok || !resultado.sucesso) {
        throw new Error(resultado.erro ?? "Não foi possível salvar a correção.");
      }

      setExemploCorrecao(null);

      setMensagemAcao("Correção salva com sucesso.");

      await carregarExemplos();
    } catch (error) {
      setMensagemAcaoErro(true);

      setMensagemAcao(error instanceof Error ? error.message : "Erro ao salvar a correção.");
    } finally {
      setSalvandoCorrecao(false);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-6 text-zinc-100 md:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6">
          <p className="mb-2 text-sm font-medium text-emerald-400">Modo aprendizado</p>

          <h1 className="text-2xl font-bold md:text-3xl">Central de Aprendizado da IA</h1>

          <p className="mt-2 max-w-3xl text-sm text-zinc-400">
            Revise o que a IA interpretou, a operação sugerida e o resultado final registrado pelo
            Express Manager.
          </p>
        </header>

        <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {(Object.keys(rotulosStatus) as StatusExemplo[]).map((status) => {
            const ativo = filtro === status;

            return (
              <button
                key={status}
                type="button"
                onClick={() => {
                  setFiltro(status);
                  setMensagemAcao(null);
                  setMensagemAcaoErro(false);
                }}
                className={[
                  "rounded-xl border p-4 text-left transition",
                  ativo
                    ? "border-emerald-500 bg-emerald-500/10"
                    : "border-zinc-800 bg-zinc-900 hover:border-zinc-700",
                ].join(" ")}
              >
                <div className="text-2xl font-bold">{totais[status]}</div>

                <div className="mt-1 text-sm text-zinc-400">{rotulosStatus[status]}</div>
              </button>
            );
          })}
        </section>

        <div className="mb-5 flex justify-end">
          <button
            type="button"
            onClick={() => void carregarExemplos()}
            disabled={carregando}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {carregando ? "Atualizando..." : "Atualizar"}
          </button>
        </div>

        {erro && (
          <div className="mb-5 rounded-xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-300">
            {erro}
          </div>
        )}

        {mensagemAcao && (
          <div
            className={[
              "mb-5 rounded-xl border p-4 text-sm",
              mensagemAcaoErro
                ? "border-red-900 bg-red-950/40 text-red-300"
                : "border-emerald-900 bg-emerald-950/40 text-emerald-300",
            ].join(" ")}
          >
            {mensagemAcao}
          </div>
        )}

        {carregando ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center text-zinc-400">
            Carregando exemplos...
          </div>
        ) : exemplos.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
            <p className="font-medium">Nenhum exemplo encontrado neste status.</p>

            <p className="mt-2 text-sm text-zinc-400">
              Continue usando o laboratório com o modo Observação ativo.
            </p>
          </div>
        ) : (
          <section className="space-y-5">
            {exemplos.map((exemplo) => {
              const paradas =
                exemplo.sugestaoIA?.propostaOperacional?.paradas ??
                exemplo.operacaoFinal?.operacao?.paradas ??
                [];

              const rota = exemplo.operacaoFinal?.operacao?.rota;

              const estaProcessando = processandoId === exemplo.id;

              return (
                <article
                  key={exemplo.id}
                  className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900"
                >
                  <div className="border-b border-zinc-800 p-5">
                    <div className="flex flex-col justify-between gap-3 md:flex-row">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-lg font-semibold">
                            {exemplo.solicitante ?? "Solicitante não identificado"}
                          </h2>

                          <span
                            className={[
                              "rounded-full px-3 py-1 text-xs font-medium",
                              obterClasseStatus(exemplo.status),
                            ].join(" ")}
                          >
                            {rotulosStatus[exemplo.status]}
                          </span>
                        </div>

                        <p className="mt-1 text-xs text-zinc-500">
                          {formatarData(exemplo.createdAt)}
                        </p>

                        <p className="mt-1 text-xs text-zinc-500">
                          Telefone: {exemplo.telefoneRemetente || "Não informado"}
                        </p>
                      </div>

                      <div className="text-sm text-zinc-400">
                        Tele:{" "}
                        <span className="text-zinc-200">
                          {exemplo.teleId ??
                            exemplo.operacaoFinal?.operacao?.teleId ??
                            "Ainda não criada"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-5 p-5 lg:grid-cols-2">
                    <section>
                      <h3 className="mb-2 text-sm font-semibold text-zinc-300">
                        Mensagem do cliente
                      </h3>

                      <div className="whitespace-pre-wrap rounded-xl bg-zinc-950 p-4 text-sm">
                        {exemplo.mensagemCliente}
                      </div>
                    </section>

                    <section>
                      <h3 className="mb-2 text-sm font-semibold text-zinc-300">
                        Resposta sugerida
                      </h3>

                      <div className="whitespace-pre-wrap rounded-xl bg-zinc-950 p-4 text-sm">
                        {exemplo.sugestaoIA?.respostaAtendimento?.mensagem ??
                          "Nenhuma resposta sugerida."}
                      </div>
                    </section>

                    <section>
                      <h3 className="mb-3 text-sm font-semibold text-zinc-300">Operação montada</h3>

                      <div className="space-y-3">
                        {paradas.length === 0 ? (
                          <div className="rounded-xl bg-zinc-950 p-4 text-sm text-zinc-500">
                            Nenhuma parada registrada.
                          </div>
                        ) : (
                          paradas.map((parada, indice) => (
                            <div
                              key={`${exemplo.id}-${indice}`}
                              className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"
                            >
                              <div className="text-xs font-bold text-emerald-400">
                                {indice + 1}. {formatarTipo(parada.tipo)}
                              </div>

                              <div className="mt-2 font-medium">
                                {parada.cliente ?? parada.texto ?? "Local não identificado"}
                              </div>

                              <div className="mt-1 text-sm text-zinc-400">
                                {parada.endereco ?? "Endereço não identificado"}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </section>

                    <section>
                      <h3 className="mb-3 text-sm font-semibold text-zinc-300">
                        Resultado operacional
                      </h3>

                      <div className="space-y-2 rounded-xl bg-zinc-950 p-4 text-sm">
                        <p>
                          Etapa:{" "}
                          <strong>{formatarTipo(exemplo.operacaoFinal?.estado?.etapa)}</strong>
                        </p>

                        <p>
                          Distância:{" "}
                          <strong>
                            {typeof rota?.distanciaKm === "number"
                              ? `${rota.distanciaKm.toFixed(1)} km`
                              : "Não calculada"}
                          </strong>
                        </p>

                        <p>
                          Tempo:{" "}
                          <strong>
                            {typeof rota?.duracaoMin === "number"
                              ? `${rota.duracaoMin} min`
                              : "Não calculado"}
                          </strong>
                        </p>

                        <p>
                          Valor: <strong>{formatarValor(rota?.valorSugerido)}</strong>
                        </p>

                        <p>
                          Tele criada:{" "}
                          <strong>
                            {exemplo.operacaoFinal?.operacao?.teleCriada ? "Sim" : "Não"}
                          </strong>
                        </p>
                      </div>
                    </section>

                    {exemplo.respostaHumana && (
                      <section className="lg:col-span-2">
                        <h3 className="mb-2 text-sm font-semibold text-zinc-300">
                          Resposta humana
                        </h3>

                        <div className="whitespace-pre-wrap rounded-xl border border-blue-900 bg-blue-950/20 p-4 text-sm text-blue-100">
                          {exemplo.respostaHumana}
                        </div>
                      </section>
                    )}

                    {exemplo.observacaoHumana && (
                      <section className="lg:col-span-2">
                        <h3 className="mb-2 text-sm font-semibold text-zinc-300">
                          Observação humana
                        </h3>

                        <div className="whitespace-pre-wrap rounded-xl border border-zinc-700 bg-zinc-950 p-4 text-sm text-zinc-300">
                          {exemplo.observacaoHumana}
                        </div>
                      </section>
                    )}
                  </div>

                  <footer className="flex flex-wrap gap-3 border-t border-zinc-800 p-5">
                    {exemplo.status === "PENDENTE_REVISAO" ? (
                      <>
                        <button
                          type="button"
                          disabled={estaProcessando}
                          onClick={() =>
                            void revisarExemplo({
                              id: exemplo.id,
                              acao: "APROVAR",
                            })
                          }
                          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {estaProcessando ? "Processando..." : "Aprovar"}
                        </button>

                        <button
                          type="button"
                          disabled={estaProcessando}
                          onClick={() =>
                            setExemploCorrecao({
                              id: exemplo.id,

                              mensagemCliente: exemplo.mensagemCliente,

                              respostaHumana: exemplo.respostaHumana,

                              observacaoHumana: exemplo.observacaoHumana,

                              sugestaoIA: exemplo.sugestaoIA,
                            })
                          }
                          className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Corrigir
                        </button>

                        <button
                          type="button"
                          disabled={estaProcessando}
                          onClick={() =>
                            void revisarExemplo({
                              id: exemplo.id,
                              acao: "DESCARTAR",
                            })
                          }
                          className="rounded-lg border border-red-800 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-950 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {estaProcessando ? "Processando..." : "Descartar"}
                        </button>
                      </>
                    ) : (
                      <div className="text-sm text-zinc-400">
                        Este exemplo já foi revisado como{" "}
                        <strong className="text-zinc-200">{rotulosStatus[exemplo.status]}</strong>.
                      </div>
                    )}
                  </footer>
                </article>
              );
            })}
          </section>
        )}
      </div>

      <PainelCorrecaoAprendizado
        aberto={Boolean(exemploCorrecao)}
        exemplo={exemploCorrecao}
        salvando={salvandoCorrecao}
        onFechar={() => {
          if (!salvandoCorrecao) {
            setExemploCorrecao(null);
          }
        }}
        onSalvar={salvarCorrecao}
      />
    </main>
  );
}
