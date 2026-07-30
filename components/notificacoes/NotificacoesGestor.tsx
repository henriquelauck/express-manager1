"use client";

import { Bell, BellOff, BellRing, CheckCheck, Loader2, Smartphone, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type NotificacaoGestor = {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string;
  teleId?: string | null;
  motoboyId?: string | null;
  lida: boolean;
  lidaEm?: string | null;
  createdAt: string;
  tele?: {
    id: string;
    solicitante: string;
    status: string;
    etapaMotoboy?: string | null;
    dataTele: string;
  } | null;
  motoboy?: {
    id: string;
    nome: string;
  } | null;
};

type RespostaNotificacoes = {
  notificacoes: NotificacaoGestor[];
  quantidadeNaoLidas: number;
};


type EstadoPush =
  | "verificando"
  | "indisponivel"
  | "instalar"
  | "bloqueado"
  | "inativo"
  | "ativo"
  | "erro";

type NavigatorComStandalone = Navigator & {
  standalone?: boolean;
};

function converterChaveVapid(chaveBase64: string) {
  const preenchimento = "=".repeat((4 - (chaveBase64.length % 4)) % 4);
  const base64 = (chaveBase64 + preenchimento)
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const bruto = window.atob(base64);
  const resultado = new Uint8Array(bruto.length);

  for (let indice = 0; indice < bruto.length; indice += 1) {
    resultado[indice] = bruto.charCodeAt(indice);
  }

  return resultado;
}

function estaEmModoAplicativo() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as NavigatorComStandalone).standalone === true
  );
}

function ehIphoneOuIpad() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function formatarHorario(data: string) {
  const dataConvertida = new Date(data);

  if (Number.isNaN(dataConvertida.getTime())) {
    return "";
  }

  const hojeBrasil = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const dataBrasil = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(dataConvertida);

  if (hojeBrasil === dataBrasil) {
    return dataConvertida.toLocaleTimeString("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return dataConvertida.toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function estiloNotificacao(tipo: string) {
  if (tipo.includes("RECUSADA")) {
    return "border-red-200 bg-red-50";
  }

  if (tipo.includes("PAGAMENTO")) {
    return "border-emerald-200 bg-emerald-50";
  }

  if (tipo.includes("CONCLUIDA")) {
    return "border-blue-200 bg-blue-50";
  }

  if (tipo.includes("CHEGOU")) {
    return "border-violet-200 bg-violet-50";
  }

  return "border-slate-200 bg-white";
}

export default function NotificacoesGestor() {
  const [aberto, setAberto] = useState(false);
  const [notificacoes, setNotificacoes] = useState<NotificacaoGestor[]>([]);
  const [quantidadeNaoLidas, setQuantidadeNaoLidas] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [marcandoTodas, setMarcandoTodas] = useState(false);
  const [estadoPush, setEstadoPush] = useState<EstadoPush>("verificando");
  const [mensagemPush, setMensagemPush] = useState("");
  const [processandoPush, setProcessandoPush] = useState(false);
  const painelRef = useRef<HTMLDivElement | null>(null);
  const carregandoRef = useRef(false);

  const carregarNotificacoes = useCallback(async () => {
    if (carregandoRef.current) {
      return;
    }

    carregandoRef.current = true;

    try {
      const resposta = await fetch("/api/notificacoes-gestor?limite=30", {
        cache: "no-store",
      });

      if (!resposta.ok) {
        let mensagem = "Não foi possível carregar as notificações.";

        try {
          const dadosErro = await resposta.json();
          mensagem = dadosErro?.erro || mensagem;
        } catch {}

        throw new Error(mensagem);
      }

      const dados = (await resposta.json()) as RespostaNotificacoes;

      setNotificacoes(Array.isArray(dados.notificacoes) ? dados.notificacoes : []);
      setQuantidadeNaoLidas(Number(dados.quantidadeNaoLidas || 0));
      setErro("");
    } catch (erroCarregamento) {
      setErro(
        erroCarregamento instanceof Error
          ? erroCarregamento.message
          : "Não foi possível carregar as notificações."
      );
    } finally {
      carregandoRef.current = false;
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregarNotificacoes();

    const intervalo = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void carregarNotificacoes();
      }
    }, 15000);

    return () => {
      window.clearInterval(intervalo);
    };
  }, [carregarNotificacoes]);

  useEffect(() => {
    function aoClicarFora(event: MouseEvent) {
      if (painelRef.current && !painelRef.current.contains(event.target as Node)) {
        setAberto(false);
      }
    }

    document.addEventListener("mousedown", aoClicarFora);

    return () => {
      document.removeEventListener("mousedown", aoClicarFora);
    };
  }, []);

  const verificarEstadoPush = useCallback(async () => {
    if (
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      setEstadoPush("indisponivel");
      setMensagemPush("Este navegador não oferece suporte a notificações push.");
      return;
    }

    if (ehIphoneOuIpad() && !estaEmModoAplicativo()) {
      setEstadoPush("instalar");
      setMensagemPush(
        "No iPhone, adicione o Express Manager à Tela de Início e abra pelo ícone."
      );
      return;
    }

    if (Notification.permission === "denied") {
      setEstadoPush("bloqueado");
      setMensagemPush(
        "As notificações estão bloqueadas nos ajustes deste aparelho."
      );
      return;
    }

    try {
      const registro = await navigator.serviceWorker.ready;
      const inscricao = await registro.pushManager.getSubscription();

      if (inscricao) {
        setEstadoPush("ativo");
        setMensagemPush("Este aparelho está autorizado a receber notificações.");
      } else {
        setEstadoPush("inativo");
        setMensagemPush("Ative para receber alertas mesmo com o sistema fechado.");
      }
    } catch (erroVerificacao) {
      console.error("Erro ao verificar notificações push:", erroVerificacao);
      setEstadoPush("erro");
      setMensagemPush("Não foi possível verificar este aparelho.");
    }
  }, []);

  useEffect(() => {
    void verificarEstadoPush();
  }, [verificarEstadoPush]);

  async function ativarNotificacoesPush() {
    if (processandoPush) {
      return;
    }

    setProcessandoPush(true);
    setMensagemPush("");

    try {
      if (
        !("serviceWorker" in navigator) ||
        !("PushManager" in window) ||
        !("Notification" in window)
      ) {
        throw new Error("Este navegador não oferece suporte a notificações push.");
      }

      if (ehIphoneOuIpad() && !estaEmModoAplicativo()) {
        setEstadoPush("instalar");
        setMensagemPush(
          "Abra pelo ícone da Tela de Início para ativar as notificações no iPhone."
        );
        return;
      }

      const permissao = await Notification.requestPermission();

      if (permissao !== "granted") {
        setEstadoPush(permissao === "denied" ? "bloqueado" : "inativo");
        setMensagemPush(
          permissao === "denied"
            ? "A permissão foi bloqueada. Libere-a nos Ajustes do iPhone."
            : "A permissão de notificações não foi concedida."
        );
        return;
      }

      const respostaConfiguracao = await fetch(
        "/api/notificacoes-gestor/inscricao-push",
        {
          cache: "no-store",
        }
      );

      if (!respostaConfiguracao.ok) {
        throw new Error("Não foi possível carregar a chave de notificações.");
      }

      const configuracao = await respostaConfiguracao.json();
      const chavePublica = String(configuracao?.chavePublica || "").trim();

      if (!chavePublica) {
        throw new Error("A chave pública VAPID não está configurada.");
      }

      const registro = await navigator.serviceWorker.ready;
      let inscricao = await registro.pushManager.getSubscription();

      if (!inscricao) {
        inscricao = await registro.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: converterChaveVapid(chavePublica),
        });
      }

      const respostaSalvar = await fetch(
        "/api/notificacoes-gestor/inscricao-push",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inscricao: inscricao.toJSON(),
          }),
        }
      );

      if (!respostaSalvar.ok) {
        let mensagem = "Não foi possível registrar este aparelho.";

        try {
          const dadosErro = await respostaSalvar.json();
          mensagem = dadosErro?.erro || mensagem;
        } catch {}

        throw new Error(mensagem);
      }

      setEstadoPush("ativo");
      setMensagemPush("Notificações ativadas neste aparelho.");
    } catch (erroAtivacao) {
      console.error("Erro ao ativar notificações push:", erroAtivacao);
      setEstadoPush("erro");
      setMensagemPush(
        erroAtivacao instanceof Error
          ? erroAtivacao.message
          : "Não foi possível ativar as notificações."
      );
    } finally {
      setProcessandoPush(false);
    }
  }

  async function desativarNotificacoesPush() {
    if (processandoPush) {
      return;
    }

    setProcessandoPush(true);
    setMensagemPush("");

    try {
      const registro = await navigator.serviceWorker.ready;
      const inscricao = await registro.pushManager.getSubscription();

      if (inscricao) {
        const resposta = await fetch(
          "/api/notificacoes-gestor/inscricao-push",
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              endpoint: inscricao.endpoint,
            }),
          }
        );

        if (!resposta.ok) {
          throw new Error("Não foi possível desativar este aparelho no servidor.");
        }

        await inscricao.unsubscribe();
      }

      setEstadoPush("inativo");
      setMensagemPush("Notificações desativadas neste aparelho.");
    } catch (erroDesativacao) {
      console.error("Erro ao desativar notificações push:", erroDesativacao);
      setEstadoPush("erro");
      setMensagemPush(
        erroDesativacao instanceof Error
          ? erroDesativacao.message
          : "Não foi possível desativar as notificações."
      );
    } finally {
      setProcessandoPush(false);
    }
  }

  async function marcarComoLida(notificacao: NotificacaoGestor) {
    if (notificacao.lida) {
      return;
    }

    setNotificacoes((atuais) =>
      atuais.map((item) =>
        item.id === notificacao.id
          ? {
              ...item,
              lida: true,
              lidaEm: new Date().toISOString(),
            }
          : item
      )
    );
    setQuantidadeNaoLidas((atual) => Math.max(0, atual - 1));

    const resposta = await fetch("/api/notificacoes-gestor", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        notificacaoId: notificacao.id,
      }),
    });

    if (!resposta.ok) {
      await carregarNotificacoes();
    }
  }

  async function marcarTodasComoLidas() {
    if (marcandoTodas || quantidadeNaoLidas === 0) {
      return;
    }

    setMarcandoTodas(true);

    try {
      const resposta = await fetch("/api/notificacoes-gestor", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          marcarTodas: true,
        }),
      });

      if (!resposta.ok) {
        throw new Error("Não foi possível marcar as notificações.");
      }

      setNotificacoes((atuais) =>
        atuais.map((item) => ({
          ...item,
          lida: true,
          lidaEm: item.lidaEm || new Date().toISOString(),
        }))
      );
      setQuantidadeNaoLidas(0);
    } catch {
      await carregarNotificacoes();
    } finally {
      setMarcandoTodas(false);
    }
  }

  return (
    <div ref={painelRef} className="relative">
      <button
        type="button"
        onClick={() => {
          setAberto((atual) => !atual);
          void carregarNotificacoes();
        }}
        className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
        aria-label="Abrir notificações"
      >
        <Bell size={21} />

        {quantidadeNaoLidas > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full border-2 border-white bg-red-600 px-1 text-[11px] font-bold text-white">
            {quantidadeNaoLidas > 99 ? "99+" : quantidadeNaoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div className="fixed inset-x-3 top-20 z-[80] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-14 sm:w-[420px]">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-slate-950 px-5 py-4 text-white">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-300">
                Operação em tempo real
              </p>
              <h2 className="mt-1 text-lg font-bold">Notificações</h2>
              <p className="mt-1 text-xs text-slate-300">
                {quantidadeNaoLidas} não {quantidadeNaoLidas === 1 ? "lida" : "lidas"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setAberto(false)}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20"
              aria-label="Fechar notificações"
            >
              <X size={17} />
            </button>
          </div>

          <div className="border-b border-slate-200 bg-white px-4 py-4">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                  {estadoPush === "ativo" ? (
                    <BellRing size={19} />
                  ) : estadoPush === "bloqueado" ? (
                    <BellOff size={19} />
                  ) : (
                    <Smartphone size={19} />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <strong className="text-sm text-slate-900">
                    Notificações neste aparelho
                  </strong>

                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    {estadoPush === "verificando"
                      ? "Verificando compatibilidade..."
                      : mensagemPush}
                  </p>

                  {estadoPush === "instalar" && (
                    <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs leading-5 text-blue-700">
                      No Safari, toque em <strong>Compartilhar</strong>, depois em{" "}
                      <strong>Adicionar à Tela de Início</strong>. Abra pelo novo ícone e
                      volte a este sino.
                    </div>
                  )}

                  {estadoPush !== "verificando" &&
                    estadoPush !== "indisponivel" &&
                    estadoPush !== "instalar" &&
                    estadoPush !== "bloqueado" && (
                      <button
                        type="button"
                        onClick={() =>
                          void (estadoPush === "ativo"
                            ? desativarNotificacoesPush()
                            : ativarNotificacoesPush())
                        }
                        disabled={processandoPush}
                        className={`mt-3 flex min-h-10 items-center justify-center gap-2 rounded-xl px-4 text-xs font-semibold text-white transition disabled:cursor-wait disabled:opacity-60 ${
                          estadoPush === "ativo"
                            ? "bg-slate-700 hover:bg-slate-800"
                            : "bg-emerald-600 hover:bg-emerald-700"
                        }`}
                      >
                        {processandoPush ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : estadoPush === "ativo" ? (
                          <BellOff size={15} />
                        ) : (
                          <BellRing size={15} />
                        )}

                        {processandoPush
                          ? "Processando..."
                          : estadoPush === "ativo"
                            ? "Desativar neste aparelho"
                            : "Ativar notificações"}
                      </button>
                    )}

                  {estadoPush === "bloqueado" && (
                    <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-700">
                      No iPhone, abra <strong>Ajustes → Notificações → Express Manager</strong>{" "}
                      e permita os alertas.
                    </p>
                  )}

                  {estadoPush === "erro" && (
                    <button
                      type="button"
                      onClick={() => void verificarEstadoPush()}
                      className="mt-3 rounded-xl bg-slate-700 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-800"
                    >
                      Verificar novamente
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
            <span className="text-xs font-medium text-slate-500">
              Últimas {notificacoes.length} notificações
            </span>

            <button
              type="button"
              onClick={() => void marcarTodasComoLidas()}
              disabled={quantidadeNaoLidas === 0 || marcandoTodas}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {marcandoTodas ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <CheckCheck size={14} />
              )}
              Marcar todas como lidas
            </button>
          </div>

          <div className="max-h-[65vh] overflow-y-auto p-3">
            {carregando ? (
              <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-slate-500">
                <Loader2 size={18} className="animate-spin" />
                Carregando notificações...
              </div>
            ) : erro ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
                {erro}
              </div>
            ) : notificacoes.length === 0 ? (
              <div className="flex min-h-40 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 text-center">
                <Bell size={25} className="text-slate-300" />
                <strong className="mt-3 text-sm text-slate-700">Nenhuma notificação</strong>
                <p className="mt-1 text-xs text-slate-500">
                  As movimentações dos motoboys aparecerão aqui.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {notificacoes.map((notificacao) => {
                  const conteudo = (
                    <div
                      className={`rounded-2xl border p-4 transition hover:shadow-sm ${estiloNotificacao(
                        notificacao.tipo
                      )} ${notificacao.lida ? "opacity-70" : "ring-2 ring-emerald-100"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <strong className="text-sm text-slate-900">
                              {notificacao.titulo}
                            </strong>

                            {!notificacao.lida && (
                              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                            )}
                          </div>

                          <p className="mt-1 text-sm leading-5 text-slate-600">
                            {notificacao.mensagem}
                          </p>

                          <p className="mt-2 text-[11px] font-medium text-slate-400">
                            {formatarHorario(notificacao.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );

                  if (notificacao.teleId) {
                    return (
                      <Link
                        key={notificacao.id}
                        href={`/teles/${notificacao.teleId}`}
                        onClick={() => {
                          void marcarComoLida(notificacao);
                          setAberto(false);
                        }}
                        className="block"
                      >
                        {conteudo}
                      </Link>
                    );
                  }

                  return (
                    <button
                      type="button"
                      key={notificacao.id}
                      onClick={() => void marcarComoLida(notificacao)}
                      className="block w-full text-left"
                    >
                      {conteudo}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
