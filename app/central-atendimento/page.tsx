"use client";

import { criarTeleViaIA, type TeleCriadaPelaIA } from "@/lib/centralAtendimento/criarTeleViaIA";
import {
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type AutorMensagem = "CLIENTE" | "HUMANO" | "IA" | "SISTEMA";

type DirecaoMensagem = "ENTRADA" | "SAIDA" | "INTERNA";

type TipoMensagem = "TEXTO" | "AUDIO" | "IMAGEM" | "DOCUMENTO" | "SISTEMA";

type StatusConversa = "ABERTA" | "AGUARDANDO_CLIENTE" | "AGUARDANDO_EQUIPE" | "ENCERRADA";

type CanalConversa = "INTERNO" | "SIMULADOR" | "WHATSAPP";

type MensagemAtendimento = {
  id: string;
  autor: AutorMensagem;
  direcao: DirecaoMensagem;
  tipo: TipoMensagem;
  conteudo: string | null;
  enviadaEm: string;
};

type UltimaMensagem = {
  id: string;
  autor: AutorMensagem;
  direcao: DirecaoMensagem;
  tipo: string;
  conteudo: string | null;
  enviadaEm: string;
  lidaEm: string | null;
};

type ConversaResumo = {
  id: string;
  canal: CanalConversa;
  telefoneRemetente: string;
  telefoneNormalizado: string;
  nomeExibicao: string | null;
  status: StatusConversa;
  naoLidas: number;
  ativo: boolean;
  ultimaMensagemEm: string;

  cliente: {
    id: string;
    nome: string;
    telefone: string | null;
  } | null;

  ultimaMensagem: UltimaMensagem | null;
};

type ConversaDetalhe = ConversaResumo & {
  mensagens: MensagemAtendimento[];
};

type RespostaListaConversas = {
  sucesso: boolean;
  conversas: ConversaResumo[];
  quantidadeRetornada: number;
  erro?: string;
};

type RespostaConversaDetalhe = {
  sucesso: boolean;
  conversa: ConversaDetalhe;
  erro?: string;
};

type RespostaEnviarMensagem = {
  sucesso: boolean;
  mensagem?: MensagemAtendimento;
  erro?: string;
};

type ParadaAnaliseIA = {
  tipo: string;
  texto?: string;
  textoOriginal?: string | null;
  cliente: string | null;
  endereco: string | null;
  telefone?: string | null;
  confianca: number;
};

type AnaliseAtendimentoIA = {
  solicitante: string | null;

  precisaHumano: boolean;

  informacoesFaltantes: string[];

  respostaAtendimento: {
    tipo: string;
    mensagem: string;
    podeEnviarAutomaticamente: boolean;
    informacoesSolicitadas: string[];
  };

  motoboySugerido: {
    nome: string;
    score: number;
    motivo: string;
  } | null;

  atendimento: {
    id: string;

    operacao: {
      rota: {
        calculada: boolean;
        distanciaKm: number | null;
        duracaoMin: number | null;
        valorSugerido: number | null;
        valorConfirmado: number | null;
      };

      paradas: ParadaAnaliseIA[];

      teleCriada: boolean;

      teleId: string | null;
    };
  };

  propostaOperacional: {
    status: "PRONTA_PARA_REVISAO" | "NECESSITA_CONFIRMACAO" | "DADOS_INSUFICIENTES";

    paradas: ParadaAnaliseIA[];

    pendencias: string[];

    avisos: string[];

    motoboySugerido: {
      nome: string;
      score: number;
      motivo: string;
    } | null;
  };

  erro?: string;
};

function formatarHora(data: string) {
  return new Date(data).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatarDataHora(data: string) {
  return new Date(data).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatarTelefone(telefone: string) {
  const numeros = telefone.replace(/\D/g, "");

  if (numeros.length === 11) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 7)}-${numeros.slice(7)}`;
  }

  if (numeros.length === 10) {
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(6)}`;
  }

  return telefone;
}

function obterIniciais(nome: string) {
  const partes = nome.trim().split(/\s+/).filter(Boolean).slice(0, 2);

  if (partes.length === 0) {
    return "?";
  }

  return partes.map((parte) => parte.charAt(0).toUpperCase()).join("");
}

function rotuloStatus(status: StatusConversa) {
  const rotulos: Record<StatusConversa, string> = {
    ABERTA: "Aberta",
    AGUARDANDO_CLIENTE: "Aguardando cliente",
    AGUARDANDO_EQUIPE: "Aguardando equipe",
    ENCERRADA: "Encerrada",
  };

  return rotulos[status];
}

function classeStatus(status: StatusConversa) {
  if (status === "AGUARDANDO_EQUIPE") {
    return "border-amber-800 bg-amber-950/50 text-amber-300";
  }

  if (status === "AGUARDANDO_CLIENTE") {
    return "border-blue-800 bg-blue-950/50 text-blue-300";
  }

  if (status === "ENCERRADA") {
    return "border-zinc-700 bg-zinc-800 text-zinc-400";
  }

  return "border-emerald-800 bg-emerald-950/50 text-emerald-300";
}

function rotuloCanal(canal: CanalConversa) {
  const rotulos: Record<CanalConversa, string> = {
    INTERNO: "Interno",
    SIMULADOR: "Simulador",
    WHATSAPP: "WhatsApp",
  };

  return rotulos[canal];
}

function classeMensagem(autor: AutorMensagem) {
  if (autor === "HUMANO") {
    return "ml-auto rounded-br-md bg-emerald-600 text-white";
  }

  if (autor === "CLIENTE") {
    return "mr-auto rounded-bl-md border border-zinc-700 bg-zinc-800 text-zinc-100";
  }

  if (autor === "IA") {
    return "mx-auto border border-blue-800 bg-blue-950/40 text-blue-100";
  }

  return "mx-auto border border-zinc-700 bg-zinc-900 text-zinc-300";
}

function rotuloAutor(autor: AutorMensagem) {
  const rotulos: Record<AutorMensagem, string> = {
    CLIENTE: "Cliente",
    HUMANO: "Você",
    IA: "IA",
    SISTEMA: "Sistema",
  };

  return rotulos[autor];
}

function obterNomeConversa(conversa: ConversaResumo) {
  return conversa.cliente?.nome ?? conversa.nomeExibicao ?? conversa.telefoneRemetente;
}

export default function CentralAtendimentoPage() {
  const [conversas, setConversas] = useState<ConversaResumo[]>([]);

  const [conversaSelecionadaId, setConversaSelecionadaId] = useState<string | null>(null);

  const [conversaAtual, setConversaAtual] = useState<ConversaDetalhe | null>(null);

  const [carregandoConversas, setCarregandoConversas] = useState(true);

  const [criandoTele, setCriandoTele] = useState(false);

  const [teleCriada, setTeleCriada] = useState<TeleCriadaPelaIA | null>(null);

  const [erroCriarTele, setErroCriarTele] = useState<string | null>(null);

  const [carregandoConversa, setCarregandoConversa] = useState(false);

  const [enviando, setEnviando] = useState(false);

  const [mensagem, setMensagem] = useState("");

  const [analiseIA, setAnaliseIA] = useState<AnaliseAtendimentoIA | null>(null);

  const [analisandoIA, setAnalisandoIA] = useState(false);

  const [erroIA, setErroIA] = useState<string | null>(null);

  const [mensagemClienteAnalisadaId, setMensagemClienteAnalisadaId] = useState<string | null>(null);

  const [busca, setBusca] = useState("");

  const [erro, setErro] = useState<string | null>(null);

  const finalMensagensRef = useRef<HTMLDivElement | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const carregarConversas = useCallback(async () => {
    try {
      setCarregandoConversas(true);
      setErro(null);

      const resposta = await fetch("/api/central-atendimento/conversas?ativo=true", {
        cache: "no-store",
      });

      const dados: RespostaListaConversas = await resposta.json();

      if (!resposta.ok || !dados.sucesso) {
        throw new Error(dados.erro ?? "Não foi possível carregar as conversas.");
      }

      setConversas(dados.conversas);

      setConversaSelecionadaId((idAtual) => {
        if (idAtual) {
          const aindaExiste = dados.conversas.some((conversa) => conversa.id === idAtual);

          if (aindaExiste) {
            return idAtual;
          }
        }

        return dados.conversas[0]?.id ?? null;
      });
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao carregar as conversas.");
    } finally {
      setCarregandoConversas(false);
    }
  }, []);

  const carregarConversa = useCallback(async (id: string) => {
    try {
      setCarregandoConversa(true);
      setErro(null);

      const resposta = await fetch(`/api/central-atendimento/conversas/${id}`, {
        cache: "no-store",
      });

      const dados: RespostaConversaDetalhe = await resposta.json();

      if (!resposta.ok || !dados.sucesso) {
        throw new Error(dados.erro ?? "Não foi possível abrir a conversa.");
      }

      setConversaAtual(dados.conversa);

      setConversas((atuais) =>
        atuais.map((conversa) =>
          conversa.id === id
            ? {
                ...conversa,
                naoLidas: 0,
              }
            : conversa
        )
      );
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao abrir a conversa.");
    } finally {
      setCarregandoConversa(false);
    }
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void carregarConversas();
    }, 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [carregarConversas]);

  useEffect(() => {
    if (!conversaSelecionadaId) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void carregarConversa(conversaSelecionadaId);
    }, 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [carregarConversa, conversaSelecionadaId]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      finalMensagensRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }, 50);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [conversaAtual?.id, conversaAtual?.mensagens.length, carregandoConversa]);

  const analisarUltimaMensagemCliente = useCallback(
    async (conversa: ConversaDetalhe) => {
      const ultimaMensagemCliente = [...conversa.mensagens]
        .reverse()
        .find(
          (item) =>
            item.autor === "CLIENTE" && item.tipo === "TEXTO" && Boolean(item.conteudo?.trim())
        );

      if (!ultimaMensagemCliente?.conteudo) {
        setAnaliseIA(null);
        setErroIA(null);
        setMensagemClienteAnalisadaId(null);
        return;
      }

      if (mensagemClienteAnalisadaId === ultimaMensagemCliente.id && analiseIA) {
        return;
      }

      try {
        setAnalisandoIA(true);
        setErroIA(null);

        const resposta = await fetch("/api/ia/interpretar-pedido", {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            mensagem: ultimaMensagemCliente.conteudo,

            telefoneRemetente: conversa.telefoneRemetente,
          }),
        });

        const dados = (await resposta.json()) as AnaliseAtendimentoIA;

        if (!resposta.ok) {
          throw new Error(dados.erro ?? "Não foi possível analisar a mensagem.");
        }

        setAnaliseIA(dados);

        setMensagemClienteAnalisadaId(ultimaMensagemCliente.id);
      } catch (error) {
        setAnaliseIA(null);

        setErroIA(error instanceof Error ? error.message : "Erro ao analisar a mensagem.");
      } finally {
        setAnalisandoIA(false);
      }
    },
    [analiseIA, mensagemClienteAnalisadaId]
  );

  useEffect(() => {
    if (!conversaAtual || carregandoConversa) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void analisarUltimaMensagemCliente(conversaAtual);
    }, 100);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [conversaAtual, carregandoConversa, analisarUltimaMensagemCliente]);

  async function criarTeleDaAnalise() {
    if (!analiseIA || criandoTele || !conversaAtual) {
      return;
    }

    try {
      setCriandoTele(true);
      setErroCriarTele(null);

      const criada = await criarTeleViaIA(analiseIA);

      const motoboySugerido = analiseIA.motoboySugerido?.nome ?? "Nenhum";

      const valorFormatado = criada.total.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
      });

      const conteudoEvento = [
        "Tele criada com sucesso.",
        "",
        `ID: ${criada.id}`,
        `Valor: ${valorFormatado}`,
        `Motoboy sugerido: ${motoboySugerido}`,
      ].join("\n");

      const respostaMensagem = await fetch(
        `/api/central-atendimento/conversas/${conversaAtual.id}/mensagens`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            autor: "SISTEMA",
            tipo: "SISTEMA",
            conteudo: conteudoEvento,
            teleId: criada.id,
            atendimentoId: analiseIA.atendimento.id,
            metadata: {
              evento: "TELE_CRIADA",
              teleId: criada.id,
              valor: criada.total,
              motoboySugerido: analiseIA.motoboySugerido?.nome ?? null,
            },
          }),
        }
      );

      const dadosMensagem = (await respostaMensagem.json()) as RespostaEnviarMensagem;

      if (!respostaMensagem.ok || !dadosMensagem.sucesso || !dadosMensagem.mensagem) {
        throw new Error(
          dadosMensagem.erro ??
            "A Tele foi criada, mas não foi possível registrar o evento na conversa."
        );
      }

      const mensagemSistema = dadosMensagem.mensagem;

      setTeleCriada(criada);

      setAnaliseIA((atual) =>
        atual
          ? {
              ...atual,

              atendimento: {
                ...atual.atendimento,

                operacao: {
                  ...atual.atendimento.operacao,

                  teleCriada: true,

                  teleId: criada.id,
                },
              },
            }
          : atual
      );

      setConversaAtual((atual) =>
        atual
          ? {
              ...atual,

              ultimaMensagemEm: mensagemSistema.enviadaEm,

              mensagens: [...atual.mensagens, mensagemSistema],
            }
          : atual
      );

      setConversas((atuais) => {
        const atualizadas = atuais.map((conversa) =>
          conversa.id === conversaAtual.id
            ? {
                ...conversa,

                ultimaMensagemEm: mensagemSistema.enviadaEm,

                ultimaMensagem: {
                  id: mensagemSistema.id,

                  autor: mensagemSistema.autor,

                  direcao: mensagemSistema.direcao,

                  tipo: mensagemSistema.tipo,

                  conteudo: mensagemSistema.conteudo,

                  enviadaEm: mensagemSistema.enviadaEm,

                  lidaEm: mensagemSistema.enviadaEm,
                },
              }
            : conversa
        );

        return atualizadas.sort(
          (a, b) => new Date(b.ultimaMensagemEm).getTime() - new Date(a.ultimaMensagemEm).getTime()
        );
      });
    } catch (error) {
      setErroCriarTele(error instanceof Error ? error.message : "Erro ao criar a Tele.");
    } finally {
      setCriandoTele(false);
    }
  }

  async function enviarMensagem(evento?: FormEvent<HTMLFormElement>) {
    evento?.preventDefault();

    const conteudo = mensagem.trim();

    if (!conversaAtual || !conteudo || enviando) {
      return;
    }

    try {
      setEnviando(true);
      setErro(null);

      const resposta = await fetch(
        `/api/central-atendimento/conversas/${conversaAtual.id}/mensagens`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            conteudo,
            autor: "HUMANO",
            tipo: "TEXTO",
          }),
        }
      );

      const dados: RespostaEnviarMensagem = await resposta.json();

      if (!resposta.ok || !dados.sucesso || !dados.mensagem) {
        throw new Error(dados.erro ?? "Não foi possível enviar a mensagem.");
      }

      const mensagemEnviada = dados.mensagem;

      setConversaAtual((atual) =>
        atual
          ? {
              ...atual,

              status: "AGUARDANDO_CLIENTE",

              ultimaMensagemEm: mensagemEnviada.enviadaEm,

              mensagens: [...atual.mensagens, mensagemEnviada],
            }
          : atual
      );

      setConversas((atuais) => {
        const atualizadas = atuais.map((conversa) =>
          conversa.id === conversaAtual.id
            ? {
                ...conversa,

                status: "AGUARDANDO_CLIENTE" as const,

                ultimaMensagemEm: mensagemEnviada.enviadaEm,

                ultimaMensagem: {
                  id: mensagemEnviada.id,

                  autor: mensagemEnviada.autor,

                  direcao: mensagemEnviada.direcao,

                  tipo: mensagemEnviada.tipo,

                  conteudo: mensagemEnviada.conteudo,

                  enviadaEm: mensagemEnviada.enviadaEm,

                  lidaEm: mensagemEnviada.enviadaEm,
                },
              }
            : conversa
        );

        return atualizadas.sort(
          (a, b) => new Date(b.ultimaMensagemEm).getTime() - new Date(a.ultimaMensagemEm).getTime()
        );
      });

      setMensagem("");

      window.setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao enviar a mensagem.");
    } finally {
      setEnviando(false);
    }
  }

  function aoPressionarTecla(evento: KeyboardEvent<HTMLTextAreaElement>) {
    if (evento.key === "Enter" && !evento.shiftKey && !evento.nativeEvent.isComposing) {
      evento.preventDefault();

      void enviarMensagem();
    }
  }

  const conversasFiltradas = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");

    if (!termo) {
      return conversas;
    }

    return conversas.filter((conversa) => {
      const nome = obterNomeConversa(conversa).toLocaleLowerCase("pt-BR");

      const telefone = conversa.telefoneRemetente.toLocaleLowerCase("pt-BR");

      const ultimaMensagem = conversa.ultimaMensagem?.conteudo?.toLocaleLowerCase("pt-BR") ?? "";

      return nome.includes(termo) || telefone.includes(termo) || ultimaMensagem.includes(termo);
    });
  }, [busca, conversas]);

  const nomeConversaAtual = useMemo(() => {
    if (!conversaAtual) {
      return "Nenhuma conversa selecionada";
    }

    return obterNomeConversa(conversaAtual);
  }, [conversaAtual]);

  const quantidadeAguardandoEquipe = useMemo(
    () => conversas.filter((conversa) => conversa.status === "AGUARDANDO_EQUIPE").length,
    [conversas]
  );

  const quantidadeNaoLidas = useMemo(
    () => conversas.reduce((total, conversa) => total + conversa.naoLidas, 0),
    [conversas]
  );

  return (
    <main className="h-screen overflow-hidden bg-zinc-950 p-3 text-zinc-100 md:p-5">
      <div className="mx-auto flex h-full max-w-[1700px] overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
        <aside className="flex w-[340px] shrink-0 flex-col border-r border-zinc-800">
          <header className="border-b border-zinc-800 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-400">
                  Express Manager
                </p>

                <h1 className="mt-1 text-xl font-bold">Central de Atendimento</h1>
              </div>

              <button
                type="button"
                onClick={() => void carregarConversas()}
                disabled={carregandoConversas}
                title="Atualizar conversas"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-700 bg-zinc-950 text-lg hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ↻
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                <p className="text-xs text-zinc-500">Aguardando equipe</p>

                <p className="mt-1 text-lg font-bold text-amber-300">
                  {quantidadeAguardandoEquipe}
                </p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
                <p className="text-xs text-zinc-500">Não lidas</p>

                <p className="mt-1 text-lg font-bold text-emerald-300">{quantidadeNaoLidas}</p>
              </div>
            </div>

            <div className="relative mt-4">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
                ⌕
              </span>

              <input
                value={busca}
                onChange={(evento) => setBusca(evento.target.value)}
                placeholder="Buscar conversa..."
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 py-3 pl-10 pr-4 text-sm outline-none placeholder:text-zinc-600 focus:border-emerald-500"
              />
            </div>
          </header>

          <div className="flex-1 overflow-y-auto">
            {carregandoConversas && conversas.length === 0 ? (
              <div className="p-5 text-sm text-zinc-500">Carregando conversas...</div>
            ) : conversasFiltradas.length === 0 ? (
              <div className="p-5 text-sm text-zinc-500">Nenhuma conversa encontrada.</div>
            ) : (
              conversasFiltradas.map((conversa) => {
                const selecionada = conversa.id === conversaSelecionadaId;

                const nome = obterNomeConversa(conversa);

                return (
                  <button
                    key={conversa.id}
                    type="button"
                    onClick={() => {
                      setConversaSelecionadaId(conversa.id);

                      setAnaliseIA(null);

                      setErroIA(null);

                      setMensagemClienteAnalisadaId(null);

                      setTeleCriada(null);

                      setErroCriarTele(null);
                    }}
                    className={[
                      "relative w-full border-b border-zinc-800 p-4 text-left transition",

                      selecionada ? "bg-zinc-800" : "hover:bg-zinc-900/70",
                    ].join(" ")}
                  >
                    {selecionada && (
                      <span className="absolute bottom-0 left-0 top-0 w-1 bg-emerald-500" />
                    )}

                    <div className="flex gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-700 text-sm font-bold text-zinc-100">
                        {obterIniciais(nome)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className="truncate font-semibold">{nome}</p>

                          <p className="shrink-0 text-[11px] text-zinc-500">
                            {formatarHora(conversa.ultimaMensagemEm)}
                          </p>
                        </div>

                        <div className="mt-1 flex items-center gap-2">
                          <p className="min-w-0 flex-1 truncate text-sm text-zinc-400">
                            {conversa.ultimaMensagem?.autor === "HUMANO" ? "Você: " : ""}

                            {conversa.ultimaMensagem?.conteudo ?? "Sem mensagens"}
                          </p>

                          {conversa.naoLidas > 0 && (
                            <span className="inline-flex min-w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 px-2 py-1 text-xs font-bold text-zinc-950">
                              {conversa.naoLidas}
                            </span>
                          )}
                        </div>

                        <div className="mt-2 flex items-center justify-between gap-2">
                          <span
                            className={[
                              "rounded-full border px-2 py-1 text-[10px] font-medium",

                              classeStatus(conversa.status),
                            ].join(" ")}
                          >
                            {rotuloStatus(conversa.status)}
                          </span>

                          <span className="text-[10px] text-zinc-600">
                            {rotuloCanal(conversa.canal)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-[82px] shrink-0 items-center justify-between gap-4 border-b border-zinc-800 bg-zinc-900 px-5">
            <div className="flex min-w-0 items-center gap-3">
              {conversaAtual && (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-900/60 text-sm font-bold text-emerald-200">
                  {obterIniciais(nomeConversaAtual)}
                </div>
              )}

              <div className="min-w-0">
                <h2 className="truncate font-semibold">{nomeConversaAtual}</h2>

                {conversaAtual && (
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                    <span>{formatarTelefone(conversaAtual.telefoneRemetente)}</span>

                    <span>•</span>

                    <span
                      className={[
                        "rounded-full border px-2 py-0.5",

                        classeStatus(conversaAtual.status),
                      ].join(" ")}
                    >
                      {rotuloStatus(conversaAtual.status)}
                    </span>

                    <span>•</span>

                    <span>{rotuloCanal(conversaAtual.canal)}</span>
                  </div>
                )}
              </div>
            </div>

            {conversaAtual && (
              <button
                type="button"
                onClick={() => void carregarConversa(conversaAtual.id)}
                disabled={carregandoConversa}
                className="rounded-xl border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
              >
                Atualizar chat
              </button>
            )}
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto scroll-smooth bg-zinc-950/60 p-5">
            {!conversaSelecionadaId ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-800 text-2xl">
                  💬
                </div>

                <p className="mt-4 font-medium">Selecione uma conversa</p>

                <p className="mt-1 text-sm text-zinc-500">
                  Escolha um atendimento na lista ao lado.
                </p>
              </div>
            ) : carregandoConversa ? (
              <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                Carregando conversa...
              </div>
            ) : !conversaAtual ? (
              <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                Conversa indisponível.
              </div>
            ) : conversaAtual.mensagens.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-zinc-500">
                Nenhuma mensagem nesta conversa.
              </div>
            ) : (
              <div className="mx-auto max-w-4xl space-y-3">
                {conversaAtual.mensagens.map((mensagemAtual) => (
                  <div
                    key={mensagemAtual.id}
                    className={[
                      "max-w-[85%] rounded-2xl px-4 py-3 shadow-md md:max-w-[72%]",

                      classeMensagem(mensagemAtual.autor),
                    ].join(" ")}
                  >
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <span className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
                        {rotuloAutor(mensagemAtual.autor)}
                      </span>
                    </div>

                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                      {mensagemAtual.conteudo ?? "Mensagem sem conteúdo textual."}
                    </p>

                    <p className="mt-2 text-right text-[10px] opacity-60">
                      {formatarDataHora(mensagemAtual.enviadaEm)}
                    </p>
                  </div>
                ))}

                <div ref={finalMensagensRef} />
              </div>
            )}
          </div>

          <form
            onSubmit={enviarMensagem}
            className="shrink-0 border-t border-zinc-800 bg-zinc-900 p-4"
          >
            <div className="mx-auto max-w-4xl">
              <div className="flex items-end gap-3">
                <textarea
                  ref={textareaRef}
                  value={mensagem}
                  onChange={(evento) => setMensagem(evento.target.value)}
                  onKeyDown={aoPressionarTecla}
                  disabled={!conversaAtual || enviando}
                  rows={2}
                  placeholder={
                    conversaAtual
                      ? "Digite sua resposta..."
                      : "Selecione uma conversa para responder"
                  }
                  className="max-h-40 min-h-14 flex-1 resize-none rounded-2xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm leading-relaxed outline-none placeholder:text-zinc-600 focus:border-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                />

                <button
                  type="submit"
                  disabled={!conversaAtual || !mensagem.trim() || enviando}
                  className="flex h-14 min-w-24 items-center justify-center rounded-2xl bg-emerald-600 px-5 text-sm font-semibold hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {enviando ? "Enviando..." : "Enviar"}
                </button>
              </div>

              <p className="mt-2 text-xs text-zinc-600">
                Enter envia • Shift + Enter quebra a linha
              </p>
            </div>
          </form>
        </section>

        <aside className="hidden w-[350px] shrink-0 overflow-y-auto border-l border-zinc-800 bg-zinc-900 p-5 xl:block">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-400">
                Assistente da IA
              </p>
              <h2 className="mt-1 text-lg font-bold">Análise do atendimento</h2>
            </div>

            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-950 text-lg">
              🧠
            </span>
          </div>

          {!conversaAtual ? (
            <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-500">
              Selecione uma conversa para iniciar a análise.
            </div>
          ) : analisandoIA ? (
            <div className="mt-5 rounded-xl border border-blue-900 bg-blue-950/30 p-4">
              <p className="text-sm font-semibold text-blue-200">Analisando atendimento...</p>
              <p className="mt-2 text-sm text-zinc-400">
                Identificando cliente, paradas, valor e motoboy.
              </p>
            </div>
          ) : erroIA ? (
            <div className="mt-5 rounded-xl border border-red-900 bg-red-950/40 p-4 text-sm text-red-300">
              <p>{erroIA}</p>
              <button
                type="button"
                onClick={() => void analisarUltimaMensagemCliente(conversaAtual)}
                className="mt-3 rounded-lg border border-red-800 px-3 py-2 text-xs font-semibold hover:bg-red-950"
              >
                Tentar novamente
              </button>
            </div>
          ) : !analiseIA ? (
            <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-500">
              Nenhuma mensagem do cliente disponível para análise.
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-xs font-semibold text-zinc-500">Solicitante</p>
                <p className="mt-1 font-semibold">{analiseIA.solicitante ?? "Não identificado"}</p>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-xs font-semibold text-zinc-500">Rota</p>
                <div className="mt-3 space-y-3">
                  {analiseIA.propostaOperacional.paradas.length === 0 ? (
                    <p className="text-sm text-zinc-500">Nenhuma parada identificada.</p>
                  ) : (
                    analiseIA.propostaOperacional.paradas.map((parada, indice) => (
                      <div
                        key={`${parada.tipo}-${indice}`}
                        className="rounded-lg border border-zinc-800 bg-zinc-900 p-3"
                      >
                        <p className="text-xs font-semibold uppercase text-emerald-300">
                          {indice + 1}. {parada.tipo}
                        </p>
                        <p className="mt-1 text-sm font-medium">
                          {parada.cliente ??
                            parada.texto ??
                            parada.textoOriginal ??
                            "Local não identificado"}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {parada.endereco ?? "Endereço não identificado"}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-xs font-semibold text-zinc-500">Operação sugerida</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                    <p className="text-[11px] text-zinc-500">Distância</p>
                    <p className="mt-1 text-sm font-semibold">
                      {analiseIA.atendimento.operacao.rota.distanciaKm === null
                        ? "Não calculada"
                        : `${analiseIA.atendimento.operacao.rota.distanciaKm.toFixed(1)} km`}
                    </p>
                  </div>
                  <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                    <p className="text-[11px] text-zinc-500">Valor</p>
                    <p className="mt-1 text-sm font-semibold">
                      {(analiseIA.atendimento.operacao.rota.valorConfirmado ??
                        analiseIA.atendimento.operacao.rota.valorSugerido) === null
                        ? "Não calculado"
                        : (analiseIA.atendimento.operacao.rota.valorConfirmado ??
                            analiseIA.atendimento.operacao.rota.valorSugerido)!.toLocaleString(
                            "pt-BR",
                            { style: "currency", currency: "BRL" }
                          )}
                    </p>
                  </div>
                </div>
                <div className="mt-2 rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                  <p className="text-[11px] text-zinc-500">Motoboy sugerido</p>
                  <p className="mt-1 text-sm font-semibold">
                    {analiseIA.motoboySugerido?.nome ?? "Nenhum"}
                  </p>
                  {analiseIA.motoboySugerido?.motivo && (
                    <p className="mt-1 text-xs text-zinc-500">{analiseIA.motoboySugerido.motivo}</p>
                  )}
                </div>
              </div>

              {analiseIA.propostaOperacional.pendencias.length > 0 && (
                <div className="rounded-xl border border-amber-900 bg-amber-950/20 p-4">
                  <p className="text-xs font-semibold text-amber-300">Pendências</p>
                  <div className="mt-2 space-y-1">
                    {analiseIA.propostaOperacional.pendencias.map((pendencia) => (
                      <p key={pendencia} className="text-sm text-amber-200">
                        • {pendencia}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-blue-900 bg-blue-950/20 p-4">
                <p className="text-xs font-semibold text-blue-300">Resposta sugerida</p>
                <div className="mt-3 whitespace-pre-wrap rounded-lg border border-blue-900/60 bg-zinc-950 p-3 text-sm leading-relaxed text-zinc-200">
                  {analiseIA.respostaAtendimento.mensagem}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMensagem(analiseIA.respostaAtendimento.mensagem);
                    window.setTimeout(() => {
                      textareaRef.current?.focus();
                      textareaRef.current?.setSelectionRange(
                        analiseIA.respostaAtendimento.mensagem.length,
                        analiseIA.respostaAtendimento.mensagem.length
                      );
                    }, 0);
                  }}
                  className="mt-3 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold hover:bg-blue-500"
                >
                  Usar resposta da IA
                </button>
              </div>

              <div className="rounded-xl border border-emerald-900 bg-emerald-950/20 p-4">
                <p className="text-xs font-semibold text-emerald-300">Operação</p>
                {teleCriada ? (
                  <div className="mt-3">
                    <div className="rounded-lg border border-emerald-800 bg-emerald-950/40 p-3">
                      <p className="text-sm font-semibold text-emerald-200">
                        Tele criada com sucesso
                      </p>
                      <p className="mt-1 break-all text-xs text-zinc-400">ID: {teleCriada.id}</p>
                      <p className="mt-2 text-sm text-zinc-300">
                        Valor:{" "}
                        <strong>
                          {teleCriada.total.toLocaleString("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          })}
                        </strong>
                      </p>
                      <p className="mt-1 text-sm text-zinc-300">
                        Status: <strong>{teleCriada.status}</strong>
                      </p>
                    </div>
                    <a
                      href={`/teles/${teleCriada.id}`}
                      className="mt-3 block w-full rounded-lg border border-emerald-700 px-4 py-2 text-center text-sm font-semibold text-emerald-300 hover:bg-emerald-950"
                    >
                      Abrir Tele
                    </a>
                  </div>
                ) : (
                  <>
                    <p className="mt-2 text-sm text-zinc-400">
                      Crie a Tele com os dados interpretados pela IA.
                    </p>
                    {erroCriarTele && (
                      <div className="mt-3 rounded-lg border border-red-900 bg-red-950/40 p-3 text-xs text-red-300">
                        {erroCriarTele}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => void criarTeleDaAnalise()}
                      disabled={
                        criandoTele ||
                        analiseIA.propostaOperacional.status !== "PRONTA_PARA_REVISAO" ||
                        analiseIA.propostaOperacional.pendencias.length > 0 ||
                        analiseIA.atendimento.operacao.teleCriada ||
                        Boolean(analiseIA.atendimento.operacao.teleId)
                      }
                      className="mt-3 w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {criandoTele
                        ? "Criando Tele..."
                        : analiseIA.atendimento.operacao.teleCriada ||
                            analiseIA.atendimento.operacao.teleId
                          ? "Tele já criada"
                          : "Criar Tele"}
                    </button>
                    {analiseIA.propostaOperacional.status !== "PRONTA_PARA_REVISAO" && (
                      <p className="mt-2 text-xs text-amber-300">
                        Resolva as pendências antes de criar a Tele.
                      </p>
                    )}
                  </>
                )}
              </div>

              <div className="rounded-xl border border-emerald-900/50 bg-emerald-950/20 p-4">
                <p className="text-xs font-medium text-emerald-300">Aprendizado ativo</p>
                <p className="mt-2 text-sm text-zinc-400">
                  A sugestão da IA será comparada com a resposta que você realmente enviar.
                </p>
              </div>
            </div>
          )}
        </aside>
      </div>

      {erro && (
        <div className="fixed bottom-5 left-1/2 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 rounded-xl border border-red-900 bg-red-950 p-4 text-sm text-red-300 shadow-2xl">
          {erro}
        </div>
      )}
    </main>
  );
}
