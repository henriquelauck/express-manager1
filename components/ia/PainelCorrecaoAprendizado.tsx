"use client";

import { useEffect, useState } from "react";

export type ExemploCorrecaoAprendizado = {
  id: string;
  mensagemCliente: string;
  respostaHumana: string | null;
  observacaoHumana: string | null;

  sugestaoIA: {
    respostaAtendimento?: {
      mensagem?: string;
    };
  } | null;
};

type PainelCorrecaoAprendizadoProps = {
  aberto: boolean;

  exemplo: ExemploCorrecaoAprendizado | null;

  salvando: boolean;

  onFechar: () => void;

  onSalvar: (dados: {
    respostaHumana: string;
    observacaoHumana: string;
  }) => Promise<void>;
};

export default function PainelCorrecaoAprendizado({
  aberto,
  exemplo,
  salvando,
  onFechar,
  onSalvar,
}: PainelCorrecaoAprendizadoProps) {
  const [respostaHumana, setRespostaHumana] = useState("");
  const [observacaoHumana, setObservacaoHumana] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!aberto || !exemplo) {
      return;
    }

    setRespostaHumana(exemplo.respostaHumana ?? "");
    setObservacaoHumana(exemplo.observacaoHumana ?? "");
    setErro(null);
  }, [aberto, exemplo]);

  useEffect(() => {
    if (!aberto) {
      return;
    }

    function aoPressionarTecla(evento: KeyboardEvent) {
      if (evento.key === "Escape" && !salvando) {
        onFechar();
      }
    }

    window.addEventListener("keydown", aoPressionarTecla);

    return () => {
      window.removeEventListener("keydown", aoPressionarTecla);
    };
  }, [aberto, onFechar, salvando]);

  if (!aberto || !exemplo) {
    return null;
  }

  const respostaSugerida =
    exemplo.sugestaoIA?.respostaAtendimento?.mensagem ??
    "Nenhuma resposta foi sugerida pela IA.";

  async function salvarCorrecao() {
    const resposta = respostaHumana.trim();
    const observacao = observacaoHumana.trim();

    if (!resposta) {
      setErro("Informe a resposta correta que você enviaria ao cliente.");
      return;
    }

    setErro(null);

    await onSalvar({
      respostaHumana: resposta,
      observacaoHumana: observacao,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/70"
      role="dialog"
      aria-modal="true"
      aria-label="Corrigir exemplo de aprendizado"
    >
      <button
        type="button"
        aria-label="Fechar painel"
        onClick={() => {
          if (!salvando) {
            onFechar();
          }
        }}
        className="absolute inset-0 cursor-default"
      />

      <aside className="relative z-10 flex h-full w-full max-w-xl flex-col border-l border-zinc-800 bg-zinc-950 shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-zinc-800 p-5">
          <div>
            <p className="text-sm font-medium text-amber-400">
              Modo aprendizado
            </p>

            <h2 className="mt-1 text-xl font-bold text-zinc-100">
              Corrigir exemplo
            </h2>

            <p className="mt-1 text-sm text-zinc-400">
              Registre a resposta que você realmente daria ao cliente.
            </p>
          </div>

          <button
            type="button"
            onClick={onFechar}
            disabled={salvando}
            className="rounded-lg border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Fechar
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          <section>
            <h3 className="mb-2 text-sm font-semibold text-zinc-300">
              Mensagem do cliente
            </h3>

            <div className="whitespace-pre-wrap rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-100">
              {exemplo.mensagemCliente}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold text-zinc-300">
              Resposta sugerida pela IA
            </h3>

            <div className="whitespace-pre-wrap rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-300">
              {respostaSugerida}
            </div>
          </section>

          <section>
            <label
              htmlFor="resposta-humana"
              className="mb-2 block text-sm font-semibold text-zinc-300"
            >
              Sua resposta correta
            </label>

            <textarea
              id="resposta-humana"
              value={respostaHumana}
              onChange={(evento) =>
                setRespostaHumana(evento.target.value)
              }
              disabled={salvando}
              rows={8}
              placeholder="Digite exatamente como você responderia ao cliente..."
              className="w-full resize-y rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-amber-500 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </section>

          <section>
            <label
              htmlFor="observacao-humana"
              className="mb-2 block text-sm font-semibold text-zinc-300"
            >
              Observação para o aprendizado
            </label>

            <textarea
              id="observacao-humana"
              value={observacaoHumana}
              onChange={(evento) =>
                setObservacaoHumana(evento.target.value)
              }
              disabled={salvando}
              rows={5}
              placeholder="Exemplo: para a PETEXAME, não pedir confirmação do orçamento."
              className="w-full resize-y rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-amber-500 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </section>

          {erro && (
            <div className="rounded-xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-300">
              {erro}
            </div>
          )}
        </div>

        <footer className="flex flex-col-reverse gap-3 border-t border-zinc-800 p-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onFechar}
            disabled={salvando}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={() => void salvarCorrecao()}
            disabled={salvando}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {salvando ? "Salvando..." : "Salvar correção"}
          </button>
        </footer>
      </aside>
    </div>
  );
}