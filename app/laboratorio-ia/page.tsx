"use client";

import PageContainer from "@/components/ui/PageContainer";
import PageHeader from "@/components/ui/PageHeader";
import {
  ArrowRight,
  Brain,
  Loader2,
  Play,
  RotateCcw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

type ResultadoIA = {
  intencao: string;

  solicitante: string | null;
  confiancaSolicitante?: number;

  paradas: {
    tipo: string;
    texto: string;
    cliente: string | null;
    confianca: number;
    endereco?: string | null;
    enderecoAlternativo?: string | null;
    telefone?: string | null;
  }[];

  motoboySugerido?: {
    nome: string;
    score: number;
    motivo: string;
  } | null;

  precisaHumano: boolean;
  informacoesFaltantes: string[];
};

export default function LaboratorioIAPage() {
  const router = useRouter();

  const [mensagem, setMensagem] = useState(
    "Buscar um celular na SaveCell e entregar na Hardware"
  );

  const [resultado, setResultado] =
    useState<ResultadoIA | null>(null);

  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [tempoMs, setTempoMs] = useState<number | null>(null);

  async function interpretar(
    evento: FormEvent<HTMLFormElement>
  ) {
    evento.preventDefault();

    const mensagemLimpa = mensagem.trim();

    if (!mensagemLimpa) {
      setErro("Digite uma mensagem para interpretar.");
      return;
    }

    setCarregando(true);
    setErro("");
    setResultado(null);
    setTempoMs(null);

    const inicio = performance.now();

    try {
      const resposta = await fetch(
        "/api/ia/interpretar-pedido",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mensagem: mensagemLimpa,
          }),
        }
      );

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(
          dados.erro || "Erro ao interpretar o pedido."
        );
      }

      setResultado(dados);
      setTempoMs(
        Math.round(performance.now() - inicio)
      );
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível interpretar o pedido."
      );
    } finally {
      setCarregando(false);
    }
  }

  function limpar() {
    setMensagem("");
    setResultado(null);
    setErro("");
    setTempoMs(null);
  }

  function usarNaNovaTele() {
    if (!resultado) return;

    if (resultado.intencao !== "CRIAR_TELE") {
      setErro(
        "A mensagem interpretada não representa uma criação de tele."
      );
      return;
    }

    if (!resultado.solicitante) {
      setErro(
        "O solicitante ainda não foi identificado. Informe quem está solicitando a tele."
      );
      return;
    }

    if (resultado.paradas.length === 0) {
      setErro(
        "Nenhuma parada foi identificada na mensagem."
      );
      return;
    }

    const possuiParadaIncompleta =
      resultado.paradas.some(
        (parada) =>
          !parada.cliente || !parada.endereco
      );

    if (possuiParadaIncompleta) {
      setErro(
        "Existem paradas sem cliente ou endereço identificado. Revise o pedido antes de usar na Nova Tele."
      );
      return;
    }

    const dadosNovaTele = {
      solicitante: resultado.solicitante,

      observacaoGeral:
        `Pedido interpretado pela IA: ${mensagem.trim()}`,

      paradas: resultado.paradas.map((parada) => ({
        tipo: parada.tipo,

        cliente:
          parada.cliente || parada.texto || "",

        endereco: parada.endereco || "",

        contato: parada.telefone || "",

        observacao: "",
      })),
    };

    sessionStorage.setItem(
      "express-manager:nova-tele-ia",
      JSON.stringify(dadosNovaTele)
    );

    router.push("/nova-tele");
  }

  return (
    <PageContainer>
      <div className="mb-8">
        <PageHeader
          titulo="Laboratório da IA"
          descricao="Teste a interpretação de pedidos antes de permitir ações reais."
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <form
          onSubmit={interpretar}
          className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm md:p-7"
        >
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <Brain size={24} />
            </div>

            <div>
              <h2 className="text-xl font-bold">
                Mensagem do cliente
              </h2>

              <p className="text-sm text-slate-500">
                A IA apenas interpretará o pedido.
              </p>
            </div>
          </div>

          <label className="text-sm font-medium text-slate-600">
            Mensagem
          </label>

          <textarea
            value={mensagem}
            onChange={(event) =>
              setMensagem(event.target.value)
            }
            rows={8}
            placeholder="Exemplo: A SaveCell precisa coletar no Shopping Campina e entregar na loja."
            className="mt-2 w-full resize-none rounded-2xl border border-slate-200 p-4 outline-none focus:border-emerald-500"
          />

          {erro && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {erro}
            </div>
          )}

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={carregando}
              className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {carregando ? (
                <>
                  <Loader2
                    className="animate-spin"
                    size={19}
                  />

                  Interpretando...
                </>
              ) : (
                <>
                  <Play size={19} />
                  Interpretar pedido
                </>
              )}
            </button>

            <button
              type="button"
              onClick={limpar}
              disabled={carregando}
              className="flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 font-semibold text-slate-700 disabled:opacity-50"
            >
              <RotateCcw size={18} />
              Limpar
            </button>
          </div>
        </form>

        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm md:p-7">
          <div className="mb-5">
            <h2 className="text-xl font-bold">
              Resultado estruturado
            </h2>

            <p className="text-sm text-slate-500">
              Nenhuma tele será criada por esta tela.
            </p>
          </div>

          {!resultado ? (
            <div className="flex min-h-[330px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-500">
              O resultado da interpretação aparecerá
              aqui.
            </div>
          ) : (
            <>
              <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
  <Informacao
    titulo="Intenção"
    valor={resultado.intencao}
  />

  <Informacao
    titulo="Solicitante"
    valor={resultado.solicitante || "Não identificado"}
  />

  <Informacao
    titulo="Precisa de humano"
    valor={resultado.precisaHumano ? "Sim" : "Não"}
  />

  <Informacao
    titulo="Tempo da requisição"
    valor={tempoMs !== null ? `${tempoMs} ms` : "-"}
  />
</div>

{resultado.motoboySugerido && (
  <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
    <p className="text-sm font-medium text-emerald-700">
      🤖 Motoboy sugerido pela IA
    </p>

    <h2 className="mt-2 text-2xl font-bold text-emerald-900">
      {resultado.motoboySugerido.nome}
    </h2>

    <p className="mt-2">
      Score:{" "}
      <strong>{resultado.motoboySugerido.score}</strong>
    </p>

    <p className="mt-1 text-sm text-slate-700">
      {resultado.motoboySugerido.motivo}
    </p>
  </div>
)}

              <div className="mb-6 space-y-4">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <h3 className="mb-2 font-bold">
                    Paradas reconhecidas
                  </h3>

                  {resultado.paradas.map(
                    (parada, index) => (
                      <div
                        key={`${parada.tipo}-${parada.texto}-${index}`}
                        className="border-b py-3 last:border-b-0"
                      >
                        <p>
                          <strong>
                            {index + 1}. {parada.tipo}
                          </strong>
                        </p>

                        <p className="mt-2">
                          Texto informado:{" "}
                          {parada.texto}
                        </p>

                        <p>
                          Cliente:{" "}
                          {parada.cliente ??
                            "Não encontrado"}
                        </p>

                        <p>
                          Confiança:{" "}
                          {Math.round(
                            parada.confianca * 100
                          )}
                          %
                        </p>

                        <p>
                          Endereço:{" "}
                          {parada.endereco ?? "-"}
                        </p>

                        {parada.enderecoAlternativo && (
                          <p>
                            Endereço alternativo:{" "}
                            {
                              parada.enderecoAlternativo
                            }
                          </p>
                        )}

                        <p>
                          Telefone:{" "}
                          {parada.telefone ?? "-"}
                        </p>
                      </div>
                    )
                  )}
                </div>

                {resultado.informacoesFaltantes
                  .length > 0 && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <h3 className="mb-2 font-bold">
                      Atenção
                    </h3>

                    <ul className="ml-5 list-disc space-y-1">
                      {resultado.informacoesFaltantes.map(
                        (item, index) => (
                          <li
                            key={`${item}-${index}`}
                          >
                            {item}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={usarNaNovaTele}
                className="mb-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 font-semibold text-white hover:bg-emerald-700"
              >
                Usar na Nova Tele
                <ArrowRight size={19} />
              </button>

              <div className="overflow-x-auto rounded-2xl bg-slate-950 p-5">
                <pre className="whitespace-pre-wrap break-words text-sm text-emerald-300">
                  {JSON.stringify(
                    resultado,
                    null,
                    2
                  )}
                </pre>
              </div>
            </>
          )}
        </div>
      </div>
    </PageContainer>
  );
}

function Informacao({
  titulo,
  valor,
}: {
  titulo: string;
  valor: string;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase text-slate-500">
        {titulo}
      </p>

      <strong className="mt-1 block text-slate-900">
        {valor}
      </strong>
    </div>
  );
}