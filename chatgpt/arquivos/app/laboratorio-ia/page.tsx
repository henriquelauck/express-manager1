"use client";

import PageContainer from "@/components/ui/PageContainer";
import PageHeader from "@/components/ui/PageHeader";
import {
  ArrowRight,
  Bot,
  Brain,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  Clock3,
  Loader2,
  MessageCircle,
  Play,
  RotateCcw,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

type ParadaResultadoIA = {
  tipo: string;
  texto: string;
  textoOriginal?: string;
  cliente: string | null;
  confianca: number;
  endereco?: string | null;
  enderecoAlternativo?: string | null;
  telefone?: string | null;
  resolvidaPorContexto?: boolean;
  motivoContexto?: string | null;
};

type MotoboySugerido = {
  nome: string;
  score: number;
  motivo: string;
};

type RespostaAtendimento = {
  tipo: "PEDIDO_COMPREENDIDO" | "SOLICITAR_INFORMACOES" | "NAO_SUPORTADO";

  mensagem: string;
  podeEnviarAutomaticamente: boolean;
  informacoesSolicitadas: string[];
};

type AcaoPlanoAgente = {
  etapa: string;
  status: "CONCLUIDA" | "PENDENTE" | "BLOQUEADA" | "NAO_APLICAVEL";
  motivo: string;
};

type PlanoAgente = {
  objetivo: string;
  estado: string;
  proximaEtapa: string;
  acoes: AcaoPlanoAgente[];
  podeExecutarAcao: boolean;
  requerConfirmacaoHumana: boolean;
};

type ResultadoIA = {
  intencao: string;

  solicitante: string | null;
  confiancaSolicitante?: number;
  origemSolicitante?: string | null;

  paradas: ParadaResultadoIA[];

  motoboySugerido?: MotoboySugerido | null;

  respostaAtendimento?: RespostaAtendimento;

  planoAgente?: PlanoAgente;

  precisaHumano: boolean;
  informacoesFaltantes: string[];
};

type AutorMensagemConversa = "CLIENTE" | "AGENTE";

type MensagemConversa = {
  id: string;
  autor: AutorMensagemConversa;
  conteudo: string;
  telefone?: string;
  tipoResposta?: RespostaAtendimento["tipo"];
  criadaEm: string;
};

function criarIdMensagem() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function LaboratorioIAPage() {
  const router = useRouter();

  const [telefoneRemetente, setTelefoneRemetente] = useState("");

  const [mensagem, setMensagem] = useState("Buscar um celular na SaveCell e entregar na Hardware");

  const [mensagensConversa, setMensagensConversa] = useState<MensagemConversa[]>([]);

  const [resultado, setResultado] = useState<ResultadoIA | null>(null);

  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  const [tempoMs, setTempoMs] = useState<number | null>(null);

  const [mostrarJson, setMostrarJson] = useState(false);

  async function interpretar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();

    const mensagemLimpa = mensagem.trim();
    const telefoneLimpo = telefoneRemetente.trim();

    const mensagemCliente: MensagemConversa = {
      id: criarIdMensagem(),
      autor: "CLIENTE",
      conteudo: mensagemLimpa,
      telefone: telefoneLimpo || "Telefone não informado",
      criadaEm: new Date().toISOString(),
    };

    if (!mensagemLimpa) {
      setErro("Digite uma mensagem para interpretar.");
      return;
    }

    setMensagensConversa((mensagensAtuais) => [...mensagensAtuais, mensagemCliente]);

    setCarregando(true);
    setErro("");
    setResultado(null);
    setTempoMs(null);

    const inicio = performance.now();

    try {
      const resposta = await fetch("/api/ia/interpretar-pedido", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          mensagem: mensagemLimpa,
          telefoneRemetente: telefoneLimpo,
        }),
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(dados.erro || "Erro ao interpretar o pedido.");
      }

      setResultado(dados);

      if (dados.respostaAtendimento?.mensagem) {
        const mensagemAgente: MensagemConversa = {
          id: criarIdMensagem(),
          autor: "AGENTE",
          conteudo: dados.respostaAtendimento.mensagem,
          tipoResposta: dados.respostaAtendimento.tipo,
          criadaEm: new Date().toISOString(),
        };

        setMensagensConversa((mensagensAtuais) => [...mensagensAtuais, mensagemAgente]);
      }

      setTempoMs(Math.round(performance.now() - inicio));
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível interpretar o pedido.");
    } finally {
      setCarregando(false);
    }
  }
  async function limpar() {
    const telefoneLimpo = telefoneRemetente.trim();

    setCarregando(true);
    setErro("");

    try {
      if (telefoneLimpo) {
        const resposta = await fetch("/api/ia/encerrar-atendimento", {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            telefoneRemetente: telefoneLimpo,
          }),
        });

        const textoResposta = await resposta.text();

        let dados: {
          erro?: string;
          ok?: boolean;
          atendimentosEncerrados?: number;
        } = {};

        if (textoResposta) {
          try {
            dados = JSON.parse(textoResposta);
          } catch {
            throw new Error(
              `A rota de encerramento retornou uma resposta inválida. ` +
                `Status HTTP: ${resposta.status}. ` +
                `Verifique se o arquivo está em app/api/ia/encerrar-atendimento/route.ts.`
            );
          }
        }

        if (!resposta.ok) {
          throw new Error(
            dados.erro || `Não foi possível encerrar a sessão. Status HTTP: ${resposta.status}.`
          );
        }
      }

      setTelefoneRemetente("");
      setMensagem("");
      setMensagensConversa([]);
      setResultado(null);
      setTempoMs(null);
      setMostrarJson(false);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível limpar a simulação.");
    } finally {
      setCarregando(false);
    }
  }

  function usarNaNovaTele() {
    if (!resultado) {
      return;
    }

    if (resultado.intencao !== "CRIAR_TELE") {
      setErro("A mensagem interpretada não representa uma criação de tele.");
      return;
    }

    if (!resultado.solicitante) {
      setErro(
        "O solicitante ainda não foi identificado. Informe o telefone do remetente ou revise o pedido."
      );
      return;
    }

    if (resultado.paradas.length === 0) {
      setErro("Nenhuma parada foi identificada na mensagem.");
      return;
    }

    const possuiParadaIncompleta = resultado.paradas.some(
      (parada) => !parada.cliente || !parada.endereco
    );

    if (possuiParadaIncompleta) {
      setErro(
        "Existem paradas sem cliente ou endereço identificado. Revise o pedido antes de usar na Nova Tele."
      );
      return;
    }

    const dadosNovaTele = {
      solicitante: resultado.solicitante,

      observacaoGeral: `Pedido interpretado pelo Agente Operacional: ${mensagensConversa
        .filter((item) => item.autor === "CLIENTE")
        .map((item) => item.conteudo)
        .join(" | ")}`,

      paradas: resultado.paradas.map((parada) => ({
        tipo: parada.tipo,

        cliente: parada.cliente || parada.texto || "",

        endereco: parada.endereco || "",

        contato: parada.telefone || "",

        observacao: "",
      })),
    };

    sessionStorage.setItem("express-manager:nova-tele-ia", JSON.stringify(dadosNovaTele));

    router.push("/nova-tele");
  }

  return (
    <PageContainer>
      <div className="mb-8">
        <PageHeader
          titulo="Simulador de Atendimento"
          descricao="Teste como o Agente Operacional atenderá os clientes e organizará as solicitações."
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <form
          onSubmit={interpretar}
          className="h-fit rounded-3xl border border-slate-100 bg-white p-5 shadow-sm md:p-7"
        >
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <MessageCircle size={24} />
            </div>

            <div>
              <h2 className="text-xl font-bold">Nova mensagem</h2>

              <p className="text-sm text-slate-500">Simule uma mensagem recebida no WhatsApp.</p>
            </div>
          </div>

          <label htmlFor="telefoneRemetente" className="text-sm font-medium text-slate-600">
            Telefone do remetente
          </label>

          <input
            id="telefoneRemetente"
            type="tel"
            value={telefoneRemetente}
            onChange={(event) => setTelefoneRemetente(event.target.value)}
            placeholder="Exemplo: 51 99900-9970"
            autoComplete="tel"
            className="mt-2 h-12 w-full rounded-2xl border border-slate-200 px-4 outline-none transition focus:border-emerald-500"
          />

          <p className="mt-2 text-xs text-slate-500">
            O número será usado para identificar automaticamente o solicitante.
          </p>

          <label htmlFor="mensagem" className="mt-5 block text-sm font-medium text-slate-600">
            Mensagem
          </label>

          <textarea
            id="mensagem"
            value={mensagem}
            onChange={(event) => setMensagem(event.target.value)}
            rows={8}
            placeholder="Exemplo: Buscar um celular na SaveCell e entregar na Hardware."
            className="mt-2 w-full resize-none rounded-2xl border border-slate-200 p-4 outline-none transition focus:border-emerald-500"
          />

          {erro && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {erro}
            </div>
          )}

          <div className="mt-5 flex flex-col gap-3">
            <button
              type="submit"
              disabled={carregando}
              className="flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {carregando ? (
                <>
                  <Loader2 className="animate-spin" size={19} />
                  Agente analisando...
                </>
              ) : (
                <>
                  <Play size={19} />
                  Simular atendimento
                </>
              )}
            </button>

            <button
              type="button"
              onClick={limpar}
              disabled={carregando}
              className="flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RotateCcw size={18} />
              Limpar simulação
            </button>
          </div>
        </form>

        <div className="space-y-6">
          <section className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4 md:px-7">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <MessageCircle size={20} />
                </div>

                <div>
                  <h2 className="font-bold">Conversa simulada</h2>

                  <p className="text-sm text-slate-500">
                    Nenhuma mensagem será enviada nesta tela.
                  </p>
                </div>
              </div>
            </div>

            <div className="min-h-[390px] bg-slate-50 p-5 md:p-7">
              {mensagensConversa.length === 0 && !carregando ? (
                <div className="flex min-h-[330px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-slate-500">
                  Envie uma mensagem para começar a sessão de atendimento.
                </div>
              ) : (
                <div className="space-y-5">
                  {mensagensConversa.map((item) =>
                    item.autor === "CLIENTE" ? (
                      <BalaoCliente
                        key={item.id}
                        mensagem={item.conteudo}
                        telefone={item.telefone || "Telefone não informado"}
                      />
                    ) : (
                      <BalaoAgente
                        key={item.id}
                        resposta={{
                          tipo: item.tipoResposta || "PEDIDO_COMPREENDIDO",

                          mensagem: item.conteudo,

                          podeEnviarAutomaticamente: false,

                          informacoesSolicitadas: [],
                        }}
                      />
                    )
                  )}

                  {carregando && <BalaoCarregando />}
                </div>
              )}
            </div>
          </section>

          {resultado && (
            <>
              <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm md:p-7">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                    <Brain size={22} />
                  </div>

                  <div>
                    <h2 className="text-xl font-bold">Estado do Agente</h2>

                    <p className="text-sm text-slate-500">Plano atual do Agente Operacional.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <Informacao titulo="Objetivo" valor={resultado.planoAgente?.objetivo || "-"} />

                  <Informacao
                    titulo="Estado"
                    valor={formatarCodigo(resultado.planoAgente?.estado)}
                  />

                  <Informacao
                    titulo="Próxima etapa"
                    valor={formatarCodigo(resultado.planoAgente?.proximaEtapa)}
                  />

                  <Informacao
                    titulo="Solicitante"
                    valor={resultado.solicitante || "Não identificado"}
                  />

                  <Informacao
                    titulo="Origem"
                    valor={formatarOrigemSolicitante(resultado.origemSolicitante)}
                  />

                  <Informacao titulo="Tempo" valor={tempoMs !== null ? `${tempoMs} ms` : "-"} />
                </div>

                {resultado.planoAgente && (
                  <div className="mt-5 rounded-2xl border border-slate-200 p-4">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <h3 className="font-bold">Plano operacional</h3>

                      <span
                        className={
                          resultado.planoAgente.podeExecutarAcao
                            ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700"
                            : "rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700"
                        }
                      >
                        {resultado.planoAgente.podeExecutarAcao
                          ? "Próxima ação permitida"
                          : "Aguardando informações"}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {resultado.planoAgente.acoes.map((acao, index) => (
                        <AcaoAgente key={`${acao.etapa}-${index}`} acao={acao} />
                      ))}
                    </div>
                  </div>
                )}
              </section>

              <section className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm md:p-7">
                <div className="mb-5">
                  <h2 className="text-xl font-bold">Dados operacionais</h2>

                  <p className="text-sm text-slate-500">Informações reconhecidas pelo agente.</p>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <h3 className="mb-2 font-bold">Paradas reconhecidas</h3>

                    {resultado.paradas.length === 0 ? (
                      <p className="py-4 text-sm text-slate-500">Nenhuma parada reconhecida.</p>
                    ) : (
                      resultado.paradas.map((parada, index) => (
                        <ParadaReconhecida
                          key={`${parada.tipo}-${parada.texto}-${index}`}
                          parada={parada}
                          index={index}
                        />
                      ))
                    )}
                  </div>

                  {resultado.motoboySugerido && (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                      <p className="text-sm font-medium text-emerald-700">Motoboy sugerido</p>

                      <h3 className="mt-2 text-2xl font-bold text-emerald-900">
                        {resultado.motoboySugerido.nome}
                      </h3>

                      <p className="mt-2 text-sm text-slate-700">
                        Score: <strong>{resultado.motoboySugerido.score}</strong>
                      </p>

                      <p className="mt-1 text-sm text-slate-700">
                        {resultado.motoboySugerido.motivo}
                      </p>
                    </div>
                  )}

                  {resultado.informacoesFaltantes.length > 0 && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                      <h3 className="mb-2 font-bold text-amber-900">Informações pendentes</h3>

                      <ul className="ml-5 list-disc space-y-1 text-sm text-amber-800">
                        {resultado.informacoesFaltantes.map((item, index) => (
                          <li key={`${item}-${index}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={usarNaNovaTele}
                  className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 font-semibold text-white transition hover:bg-emerald-700"
                >
                  Usar na Nova Tele
                  <ArrowRight size={19} />
                </button>
              </section>

              <section className="rounded-3xl border border-slate-100 bg-white shadow-sm">
                <button
                  type="button"
                  onClick={() => setMostrarJson((valorAtual) => !valorAtual)}
                  className="flex w-full items-center justify-between gap-3 p-5 text-left md:p-7"
                >
                  <div>
                    <h2 className="font-bold">JSON técnico</h2>

                    <p className="text-sm text-slate-500">Dados completos retornados pela API.</p>
                  </div>

                  {mostrarJson ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>

                {mostrarJson && (
                  <div className="border-t border-slate-100 p-5 md:p-7">
                    <div className="overflow-x-auto rounded-2xl bg-slate-950 p-5">
                      <pre className="whitespace-pre-wrap break-words text-sm text-emerald-300">
                        {JSON.stringify(resultado, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </PageContainer>
  );
}

function BalaoCliente({ mensagem, telefone }: { mensagem: string; telefone: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[88%]">
        <div className="mb-2 flex items-center justify-end gap-2 text-xs text-slate-500">
          <span>{telefone}</span>
          <UserRound size={14} />
          <span>Cliente</span>
        </div>

        <div className="rounded-3xl rounded-br-md bg-emerald-600 px-5 py-4 text-white shadow-sm">
          <p className="whitespace-pre-wrap text-sm leading-6">{mensagem}</p>
        </div>
      </div>
    </div>
  );
}

function BalaoAgente({ resposta }: { resposta: RespostaAtendimento }) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[88%]">
        <div className="mb-2 flex items-center gap-2 text-xs text-slate-500">
          <Bot size={14} />
          <span>Agente Operacional</span>

          <span className="rounded-full bg-violet-100 px-2 py-0.5 font-medium text-violet-700">
            Sugestão
          </span>
        </div>

        <div className="rounded-3xl rounded-bl-md border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <p className="whitespace-pre-wrap text-sm leading-6 text-slate-800">
            {resposta.mensagem}
          </p>
        </div>

        <p className="mt-2 text-xs text-slate-400">Esta resposta ainda não foi enviada.</p>
      </div>
    </div>
  );
}

function BalaoCarregando() {
  return (
    <div className="flex justify-start">
      <div className="rounded-3xl rounded-bl-md border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="flex items-center gap-3 text-sm text-slate-600">
          <Loader2 className="animate-spin" size={18} />
          Agente analisando a solicitação...
        </div>
      </div>
    </div>
  );
}

function ParadaReconhecida({ parada, index }: { parada: ParadaResultadoIA; index: number }) {
  const textoOriginal = parada.textoOriginal || parada.texto;

  return (
    <div className="border-b py-4 last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">
          {index + 1}. {parada.tipo}
        </p>

        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {Math.round(parada.confianca * 100)}% de confiança
        </span>
      </div>

      {parada.resolvidaPorContexto ? (
        <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50 p-3 text-sm">
          <p>
            <strong>Texto informado:</strong> {textoOriginal}
          </p>

          <p className="mt-1">
            <strong>Interpretado como:</strong> {parada.texto}
          </p>

          <p className="mt-1 text-xs text-violet-700">Resolvido pelo contexto operacional.</p>
        </div>
      ) : (
        <p className="mt-3 text-sm">
          <strong>Texto informado:</strong> {textoOriginal}
        </p>
      )}

      <div className="mt-3 space-y-1 text-sm text-slate-700">
        <p>
          <strong>Cliente:</strong> {parada.cliente || "Não encontrado"}
        </p>

        <p>
          <strong>Endereço:</strong> {parada.endereco || "-"}
        </p>

        {parada.enderecoAlternativo && (
          <p>
            <strong>Endereço alternativo:</strong> {parada.enderecoAlternativo}
          </p>
        )}

        <p>
          <strong>Telefone:</strong> {parada.telefone || "-"}
        </p>
      </div>
    </div>
  );
}

function AcaoAgente({ acao }: { acao: AcaoPlanoAgente }) {
  const concluida = acao.status === "CONCLUIDA";

  const pendente = acao.status === "PENDENTE";

  return (
    <div className="flex gap-3 rounded-xl bg-slate-50 p-3">
      <div
        className={
          concluida
            ? "mt-0.5 text-emerald-600"
            : pendente
              ? "mt-0.5 text-amber-600"
              : "mt-0.5 text-slate-400"
        }
      >
        {concluida ? <CircleCheck size={18} /> : <Clock3 size={18} />}
      </div>

      <div>
        <p className="text-sm font-semibold">{formatarCodigo(acao.etapa)}</p>

        <p className="mt-1 text-xs leading-5 text-slate-500">{acao.motivo}</p>
      </div>
    </div>
  );
}

function Informacao({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase text-slate-500">{titulo}</p>

      <strong className="mt-1 block text-slate-900">{valor}</strong>
    </div>
  );
}

function formatarOrigemSolicitante(origem?: string | null) {
  if (origem === "TELEFONE_REMETENTE") {
    return "Telefone do remetente";
  }

  if (origem === "MENSAGEM") {
    return "Conteúdo da mensagem";
  }

  return "Não identificada";
}

function formatarCodigo(valor?: string | null) {
  if (!valor) {
    return "-";
  }

  return valor
    .toLowerCase()
    .split("_")
    .map((palavra) => palavra.charAt(0).toUpperCase() + palavra.slice(1))
    .join(" ");
}
