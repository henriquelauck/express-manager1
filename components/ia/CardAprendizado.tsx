"use client";

export type StatusExemploAprendizado =
  | "PENDENTE_REVISAO"
  | "APROVADO"
  | "CORRIGIDO"
  | "DESCARTADO";

export type ParadaExemploAprendizado = {
  tipo?: string;
  texto?: string;
  cliente?: string | null;
  endereco?: string | null;
};

export type ExemploAprendizadoCard = {
  id: string;

  atendimentoId: string | null;

  teleId: string | null;

  telefoneRemetente: string;

  solicitante: string | null;

  mensagemCliente: string;

  respostaHumana: string | null;

  sugestaoIA: {
    respostaAtendimento?: {
      mensagem?: string;
    };

    propostaOperacional?: {
      status?: string;

      paradas?: ParadaExemploAprendizado[];

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

      paradas?: ParadaExemploAprendizado[];

      teleCriada?: boolean;

      teleId?: string | null;
    };
  } | null;

  status: StatusExemploAprendizado;

  aprovado: boolean;

  corrigido: boolean;

  observacaoHumana: string | null;

  createdAt: string;
};

type CardAprendizadoProps = {
  exemplo: ExemploAprendizadoCard;

  processando: boolean;

  onAprovar: (id: string) => void;

  onCorrigir: (exemplo: ExemploAprendizadoCard) => void;

  onDescartar: (id: string) => void;
};

const rotulosStatus: Record<
  StatusExemploAprendizado,
  string
> = {
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

function obterClasseStatus(
  status: StatusExemploAprendizado
) {
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

export default function CardAprendizado({
  exemplo,

  processando,

  onAprovar,

  onCorrigir,

  onDescartar,
}: CardAprendizadoProps) {
  const paradas =
    exemplo.sugestaoIA?.propostaOperacional?.paradas ??
    exemplo.operacaoFinal?.operacao?.paradas ??
    [];

  const rota = exemplo.operacaoFinal?.operacao?.rota;

  return (
    <article className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900">
      <div className="border-b border-zinc-800 p-5">
        <div className="flex flex-col justify-between gap-3 md:flex-row">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold">
                {exemplo.solicitante ??
                  "Solicitante não identificado"}
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
              Telefone:{" "}
              {exemplo.telefoneRemetente || "Não informado"}
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
            {exemplo.sugestaoIA?.respostaAtendimento
              ?.mensagem ?? "Nenhuma resposta sugerida."}
          </div>
        </section>

        <section>
          <h3 className="mb-3 text-sm font-semibold text-zinc-300">
            Operação montada
          </h3>

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
                    {indice + 1}.{" "}
                    {formatarTipo(parada.tipo)}
                  </div>

                  <div className="mt-2 font-medium">
                    {parada.cliente ??
                      parada.texto ??
                      "Local não identificado"}
                  </div>

                  <div className="mt-1 text-sm text-zinc-400">
                    {parada.endereco ??
                      "Endereço não identificado"}
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
              <strong>
                {formatarTipo(
                  exemplo.operacaoFinal?.estado?.etapa
                )}
              </strong>
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
              Valor:{" "}
              <strong>
                {formatarValor(rota?.valorSugerido)}
              </strong>
            </p>

            <p>
              Tele criada:{" "}
              <strong>
                {exemplo.operacaoFinal?.operacao?.teleCriada
                  ? "Sim"
                  : "Não"}
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
              disabled={processando}
              onClick={() => onAprovar(exemplo.id)}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {processando
                ? "Processando..."
                : "Aprovar"}
            </button>

            <button
              type="button"
              disabled={processando}
              onClick={() => onCorrigir(exemplo)}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Corrigir
            </button>

            <button
              type="button"
              disabled={processando}
              onClick={() => onDescartar(exemplo.id)}
              className="rounded-lg border border-red-800 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-950 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {processando
                ? "Processando..."
                : "Descartar"}
            </button>
          </>
        ) : (
          <div className="text-sm text-zinc-400">
            Este exemplo já foi revisado como{" "}
            <strong className="text-zinc-200">
              {rotulosStatus[exemplo.status]}
            </strong>
            .
          </div>
        )}
      </footer>
    </article>
  );
}