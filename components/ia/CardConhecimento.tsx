"use client";

export type StatusConhecimento =
  | "SUGERIDO"
  | "APROVADO"
  | "REJEITADO"
  | "ARQUIVADO";

export type CategoriaConhecimento =
  | "INTERPRETACAO"
  | "REGRA_OPERACIONAL"
  | "RESPOSTA_CLIENTE"
  | "ORCAMENTO"
  | "DESPACHO"
  | "MOTOBOY"
  | "COBRANCA"
  | "OUTRO";

export type OrigemConhecimento =
  | "CORRECAO_HUMANA"
  | "EXEMPLOS_APROVADOS"
  | "ANALISE_IA"
  | "REGRA_MANUAL";

export type ConhecimentoIACard = {
  id: string;

  titulo: string;

  descricao: string;

  categoria: CategoriaConhecimento;

  status: StatusConhecimento;

  origem: OrigemConhecimento;

  solicitante: string | null;

  regra: unknown;

  confianca: number;

  quantidadeExemplos: number;

  exemploIds: string[];

  observacaoHumana: string | null;

  aprovadoPor: string | null;

  aprovadoEm: string | null;

  ativo: boolean;

  createdAt: string;

  updatedAt: string;
};

type AcaoConhecimento =
  | "APROVAR"
  | "REJEITAR"
  | "ARQUIVAR"
  | "REATIVAR";

type CardConhecimentoProps = {
  conhecimento: ConhecimentoIACard;

  processando: boolean;

  onAcao: (
    id: string,
    acao: AcaoConhecimento
  ) => void;
};

const rotulosStatus: Record<StatusConhecimento, string> = {
  SUGERIDO: "Sugerido",

  APROVADO: "Aprovado",

  REJEITADO: "Rejeitado",

  ARQUIVADO: "Arquivado",
};

const rotulosCategoria: Record<
  CategoriaConhecimento,
  string
> = {
  INTERPRETACAO: "Interpretação",

  REGRA_OPERACIONAL: "Regra operacional",

  RESPOSTA_CLIENTE: "Resposta ao cliente",

  ORCAMENTO: "Orçamento",

  DESPACHO: "Despacho",

  MOTOBOY: "Motoboy",

  COBRANCA: "Cobrança",

  OUTRO: "Outro",
};

const rotulosOrigem: Record<OrigemConhecimento, string> = {
  CORRECAO_HUMANA: "Correção humana",

  EXEMPLOS_APROVADOS: "Exemplos aprovados",

  ANALISE_IA: "Análise da IA",

  REGRA_MANUAL: "Regra manual",
};

function formatarData(data: string) {
  return new Date(data).toLocaleString("pt-BR");
}

function formatarConfianca(confianca: number) {
  const valorNormalizado = Math.max(
    0,
    Math.min(1, confianca)
  );

  return `${Math.round(valorNormalizado * 100)}%`;
}

function obterClasseStatus(status: StatusConhecimento) {
  if (status === "APROVADO") {
    return "bg-emerald-500/10 text-emerald-300";
  }

  if (status === "REJEITADO") {
    return "bg-red-500/10 text-red-300";
  }

  if (status === "ARQUIVADO") {
    return "bg-zinc-700/40 text-zinc-300";
  }

  return "bg-amber-500/10 text-amber-300";
}

function formatarRegra(regra: unknown) {
  if (regra === null || regra === undefined) {
    return null;
  }

  if (typeof regra === "string") {
    return regra;
  }

  try {
    return JSON.stringify(regra, null, 2);
  } catch {
    return String(regra);
  }
}

export default function CardConhecimento({
  conhecimento,

  processando,

  onAcao,
}: CardConhecimentoProps) {
  const regraFormatada = formatarRegra(
    conhecimento.regra
  );

  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
      <header className="border-b border-zinc-800 p-5">
        <div className="flex flex-col justify-between gap-4 md:flex-row">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-zinc-100">
                {conhecimento.titulo}
              </h2>

              <span
                className={[
                  "rounded-full px-3 py-1 text-xs font-medium",

                  obterClasseStatus(conhecimento.status),
                ].join(" ")}
              >
                {rotulosStatus[conhecimento.status]}
              </span>

              {conhecimento.ativo && (
                <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-300">
                  Ativo
                </span>
              )}
            </div>

            <p className="mt-2 text-sm text-zinc-400">
              {conhecimento.solicitante
                ? `Solicitante: ${conhecimento.solicitante}`
                : "Conhecimento geral"}
            </p>

            <p className="mt-1 text-xs text-zinc-500">
              Criado em{" "}
              {formatarData(conhecimento.createdAt)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-300">
              {rotulosCategoria[conhecimento.categoria]}
            </span>

            <span className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-zinc-300">
              {rotulosOrigem[conhecimento.origem]}
            </span>
          </div>
        </div>
      </header>

      <div className="grid gap-5 p-5 lg:grid-cols-[1fr_280px]">
        <div className="space-y-5">
          <section>
            <h3 className="mb-2 text-sm font-semibold text-zinc-300">
              Descrição
            </h3>

            <div className="whitespace-pre-wrap rounded-xl bg-zinc-950 p-4 text-sm text-zinc-200">
              {conhecimento.descricao}
            </div>
          </section>

          {regraFormatada && (
            <section>
              <h3 className="mb-2 text-sm font-semibold text-zinc-300">
                Regra estruturada
              </h3>

              <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-xs text-zinc-300">
                {regraFormatada}
              </pre>
            </section>
          )}

          {conhecimento.observacaoHumana && (
            <section>
              <h3 className="mb-2 text-sm font-semibold text-zinc-300">
                Observação humana
              </h3>

              <div className="whitespace-pre-wrap rounded-xl border border-blue-900 bg-blue-950/20 p-4 text-sm text-blue-100">
                {conhecimento.observacaoHumana}
              </div>
            </section>
          )}
        </div>

        <aside className="space-y-3">
          <div className="rounded-xl bg-zinc-950 p-4">
            <p className="text-xs text-zinc-500">
              Confiança
            </p>

            <p className="mt-1 text-2xl font-bold text-emerald-400">
              {formatarConfianca(
                conhecimento.confianca
              )}
            </p>

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full bg-emerald-500"
                style={{
                  width: `${Math.max(
                    0,
                    Math.min(
                      100,
                      conhecimento.confianca * 100
                    )
                  )}%`,
                }}
              />
            </div>
          </div>

          <div className="rounded-xl bg-zinc-950 p-4 text-sm">
            <p className="text-zinc-500">
              Exemplos relacionados
            </p>

            <p className="mt-1 text-lg font-semibold text-zinc-100">
              {conhecimento.quantidadeExemplos}
            </p>
          </div>

          <div className="rounded-xl bg-zinc-950 p-4 text-sm">
            <p className="text-zinc-500">
              Estado operacional
            </p>

            <p className="mt-1 font-semibold text-zinc-100">
              {conhecimento.ativo
                ? "Pode influenciar o sistema"
                : "Não interfere no sistema"}
            </p>
          </div>
        </aside>
      </div>

      <footer className="flex flex-wrap gap-3 border-t border-zinc-800 p-5">
        {conhecimento.status === "SUGERIDO" && (
          <>
            <button
              type="button"
              disabled={processando}
              onClick={() =>
                onAcao(
                  conhecimento.id,
                  "APROVAR"
                )
              }
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {processando
                ? "Processando..."
                : "Aprovar e ativar"}
            </button>

            <button
              type="button"
              disabled={processando}
              onClick={() =>
                onAcao(
                  conhecimento.id,
                  "REJEITAR"
                )
              }
              className="rounded-lg border border-red-800 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-950 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Rejeitar
            </button>
          </>
        )}

        {conhecimento.status === "APROVADO" && (
          <button
            type="button"
            disabled={processando}
            onClick={() =>
              onAcao(
                conhecimento.id,
                "ARQUIVAR"
              )
            }
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {processando
              ? "Processando..."
              : "Arquivar e desativar"}
          </button>
        )}

        {(conhecimento.status === "ARQUIVADO" ||
          conhecimento.status === "REJEITADO") && (
          <button
            type="button"
            disabled={processando}
            onClick={() =>
              onAcao(
                conhecimento.id,
                "REATIVAR"
              )
            }
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {processando
              ? "Processando..."
              : "Reativar"}
          </button>
        )}
      </footer>
    </article>
  );
}