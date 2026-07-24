"use client";

import { useCallback, useEffect, useState } from "react";

import CardConhecimento, {
  type ConhecimentoIACard,
  type StatusConhecimento,
} from "@/components/ia/CardConhecimento";

type RespostaConhecimentosAPI = {
  sucesso: boolean;
  conhecimentos: ConhecimentoIACard[];
  totais: Record<StatusConhecimento, number>;
  quantidadeRetornada: number;
  erro?: string;
};

type RespostaAcaoAPI = {
  sucesso: boolean;
  conhecimento?: ConhecimentoIACard;
  erro?: string;
};

type AcaoConhecimento = "APROVAR" | "REJEITAR" | "ARQUIVAR" | "REATIVAR";

const rotulosStatus: Record<StatusConhecimento, string> = {
  SUGERIDO: "Sugeridos",
  APROVADO: "Aprovados",
  REJEITADO: "Rejeitados",
  ARQUIVADO: "Arquivados",
};

export default function ConhecimentosIAPage() {
  const [conhecimentos, setConhecimentos] = useState<ConhecimentoIACard[]>([]);

  const [totais, setTotais] = useState<Record<StatusConhecimento, number>>({
    SUGERIDO: 0,
    APROVADO: 0,
    REJEITADO: 0,
    ARQUIVADO: 0,
  });

  const [filtro, setFiltro] = useState<StatusConhecimento>("SUGERIDO");

  const [carregando, setCarregando] = useState(true);

  const [processandoId, setProcessandoId] = useState<string | null>(null);

  const [erro, setErro] = useState<string | null>(null);

  const [mensagemAcao, setMensagemAcao] = useState<string | null>(null);

  const [mensagemAcaoErro, setMensagemAcaoErro] = useState(false);

  const carregarConhecimentos = useCallback(async () => {
    try {
      setCarregando(true);
      setErro(null);

      const resposta = await fetch(`/api/ia/conhecimentos?status=${filtro}`, {
        cache: "no-store",
      });

      const dados: RespostaConhecimentosAPI = await resposta.json();

      if (!resposta.ok || !dados.sucesso) {
        throw new Error(dados.erro ?? "Não foi possível carregar os conhecimentos.");
      }

      setConhecimentos(dados.conhecimentos);
      setTotais(dados.totais);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao carregar os conhecimentos.");
    } finally {
      setCarregando(false);
    }
  }, [filtro]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void carregarConhecimentos();
    }, 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [carregarConhecimentos]);

  async function executarAcaoConhecimento(id: string, acao: AcaoConhecimento) {
    try {
      setProcessandoId(id);
      setMensagemAcao(null);
      setMensagemAcaoErro(false);

      const resposta = await fetch(`/api/ia/conhecimentos/${id}`, {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          acao,
        }),
      });

      const dados: RespostaAcaoAPI = await resposta.json();

      if (!resposta.ok || !dados.sucesso) {
        throw new Error(dados.erro ?? "Não foi possível atualizar o conhecimento.");
      }

      const mensagens: Record<AcaoConhecimento, string> = {
        APROVAR: "Conhecimento aprovado e ativado com sucesso.",

        REJEITAR: "Conhecimento rejeitado com sucesso.",

        ARQUIVAR: "Conhecimento arquivado e desativado.",

        REATIVAR: "Conhecimento reativado com sucesso.",
      };

      setMensagemAcao(mensagens[acao]);

      await carregarConhecimentos();
    } catch (error) {
      setMensagemAcaoErro(true);

      setMensagemAcao(error instanceof Error ? error.message : "Erro ao atualizar o conhecimento.");
    } finally {
      setProcessandoId(null);
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-6 text-zinc-100 md:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6">
          <p className="mb-2 text-sm font-medium text-blue-400">Inteligência operacional</p>

          <h1 className="text-2xl font-bold md:text-3xl">Conhecimentos da IA</h1>

          <p className="mt-2 max-w-3xl text-sm text-zinc-400">
            Revise regras, padrões e comportamentos descobertos pelo Express Manager antes que eles
            passem a influenciar o sistema.
          </p>
        </header>

        <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          {(Object.keys(rotulosStatus) as StatusConhecimento[]).map((status) => {
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
                    ? "border-blue-500 bg-blue-500/10"
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
            onClick={() => void carregarConhecimentos()}
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
            Carregando conhecimentos...
          </div>
        ) : conhecimentos.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-8 text-center">
            <p className="font-medium">Nenhum conhecimento encontrado neste status.</p>

            <p className="mt-2 text-sm text-zinc-400">
              Novos conhecimentos poderão ser criados a partir das correções e exemplos aprovados.
            </p>
          </div>
        ) : (
          <section className="space-y-5">
            {conhecimentos.map((conhecimento) => (
              <CardConhecimento
                key={conhecimento.id}
                conhecimento={conhecimento}
                processando={processandoId === conhecimento.id}
                onAcao={(id, acao) => {
                  void executarAcaoConhecimento(id, acao);
                }}
              />
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
