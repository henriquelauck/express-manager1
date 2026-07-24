"use client";

import { useCallback, useEffect, useState } from "react";

import CardAprendizado, { type ExemploAprendizadoCard } from "@/components/ia/CardAprendizado";

import PainelCorrecaoAprendizado, {
  type ExemploCorrecaoAprendizado,
} from "@/components/ia/PainelCorrecaoAprendizado";

type StatusExemplo = "PENDENTE_REVISAO" | "APROVADO" | "CORRIGIDO" | "DESCARTADO";

type AcaoRevisao = "APROVAR" | "DESCARTAR";

type ExemploAprendizado = ExemploAprendizadoCard & {
  interpretacaoIA: {
    intencao?: string;

    paradasInterpretadas?: Array<{
      tipo?: string;
      texto?: string;
    }>;
  } | null;
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
            {exemplos.map((exemplo) => (
              <CardAprendizado
                key={exemplo.id}
                exemplo={exemplo}
                processando={processandoId === exemplo.id}
                onAprovar={(id) => {
                  void revisarExemplo({
                    id,
                    acao: "APROVAR",
                  });
                }}
                onCorrigir={(exemploSelecionado) => {
                  setExemploCorrecao({
                    id: exemploSelecionado.id,

                    mensagemCliente: exemploSelecionado.mensagemCliente,

                    respostaHumana: exemploSelecionado.respostaHumana,

                    observacaoHumana: exemploSelecionado.observacaoHumana,

                    sugestaoIA: exemploSelecionado.sugestaoIA,
                  });
                }}
                onDescartar={(id) => {
                  void revisarExemplo({
                    id,
                    acao: "DESCARTAR",
                  });
                }}
              />
            ))}
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
