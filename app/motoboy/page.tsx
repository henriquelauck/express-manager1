"use client";

import { Capacitor, registerPlugin } from "@capacitor/core";
import {
  Bike,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Download,
  Clock3,
  Loader2,
  LocateFixed,
  LogOut,
  MapPin,
  PackageCheck,
  RefreshCw,
  Route,
  Target,
  Trophy,
  WalletCards,
  Wifi,
  WifiOff,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

const META_TROCA_OLEO = 1500;
const FUSO_BRASIL = "America/Sao_Paulo";

type Usuario = {
  id: string;
  nome: string;
  email: string;
  role: string;
  motoboyId?: string | null;
};

type Parada = {
  id?: string;
  ordem?: number;
  tipo?: string | null;
  cliente?: string | null;
  endereco?: string | null;
  telefone?: string | null;
  observacao?: string | null;
};

type PresencaMotoboy = {
  online: boolean;
  latitude?: number | null;
  longitude?: number | null;
  precisao?: number | null;
  onlineDesde?: string | null;
  localizacaoAtualizadaEm?: string | null;
};

type ResultadoLocalizacaoNativa = {
  ativo: boolean;
  servicoEncontrado?: boolean;
};

type EstadoPermissoesLocalizacao = {
  localizacaoDuranteUso: boolean;
  localizacaoSegundoPlano: boolean;
  notificacoes: boolean;
  prontoParaFicarOnline: boolean;
  precisaAbrirConfiguracoes: boolean;
};

type LocalizacaoNativaPlugin = {
  iniciar(): Promise<ResultadoLocalizacaoNativa>;
  parar(): Promise<ResultadoLocalizacaoNativa>;
  pararSomAlerta(): Promise<{ parado: boolean }>;
  verificarPermissoes(): Promise<EstadoPermissoesLocalizacao>;
  abrirConfiguracoesLocalizacao(): Promise<{ aberto: boolean }>;
};

type CredenciaisNativasPlugin = {
  removerToken(): Promise<{ removido: boolean }>;
};

type VersaoAplicativo = {
  versionCode: number;
  versionName: string;
  obrigatoria: boolean;
  mensagem: string;
  apkUrl: string;
};

type AtualizacaoNativaPlugin = {
  obterVersaoInstalada(): Promise<{
    versionCode: number;
    versionName: string;
    packageName: string;
  }>;
  verificarPermissaoInstalacao(): Promise<{
    permitido: boolean;
    precisaAbrirConfiguracoes: boolean;
  }>;
  abrirPermissaoInstalacao(): Promise<{
    aberto: boolean;
    permitido?: boolean;
  }>;
  baixarEInstalar(opcoes: {
    apkUrl: string;
    nomeArquivo: string;
  }): Promise<{
    baixado: boolean;
    instaladorAberto: boolean;
  }>;
};

const LocalizacaoNativa = registerPlugin<LocalizacaoNativaPlugin>("LocalizacaoNativa");

const CredenciaisNativas = registerPlugin<CredenciaisNativasPlugin>("CredenciaisNativas");

const AtualizacaoNativa = registerPlugin<AtualizacaoNativaPlugin>("AtualizacaoNativa");

function executandoNoAppAndroid() {
  return (
    typeof window !== "undefined" &&
    Capacitor.isNativePlatform() &&
    Capacitor.getPlatform() === "android"
  );
}

type ResultadoMiniMapa = {
  distanciaKm: number;
  duracaoMin: number;
  polyline: string | null;
};

type EstadoMiniMapa = {
  carregando: boolean;
  erro: string | null;
  resultado: ResultadoMiniMapa | null;
};

type EtapaMotoboyTele =
  | "AGUARDANDO_INICIO_COLETA"
  | "EM_ROTA_COLETA"
  | "CHEGOU_NA_COLETA"
  | "EM_ROTA_ENTREGA"
  | "CHEGOU_NA_ENTREGA"
  | "CONCLUIDA";

type ItemFilaMotoboy = {
  id: string;
  ordem: number;
  posicao?: number | null;
  status: "PENDENTE" | "EM_ANDAMENTO";
  teleId: string;
  paradaId: string;
  iniciadaEm?: string | null;
  parada: Parada;
};

type Tele = {
  id: string;
  solicitante?: string | null;
  status: string;
  etapaMotoboy?: EtapaMotoboyTele | null;
  paradaAtualMotoboy?: number | null;
  rotaColetaIniciadaEm?: string | null;
  chegouNaColetaEm?: string | null;
  entregaIniciadaEm?: string | null;
  chegouNaEntregaEm?: string | null;
  concluidaPeloMotoboyEm?: string | null;
  statusAceite?: "NAO_ENVIADA" | "AGUARDANDO_ACEITE" | "ACEITA" | "RECUSADA";
  aguardandoAceite?: boolean;
  aceitaPeloMotoboy?: boolean;
  ordemMotoboy?: number | null;
  posicaoNaFila?: number | null;
  filaOperacionalAtiva?: boolean;
  rotaAtiva?: boolean;
  aguardandoRetomada?: boolean;
  etapaLiberadaPelaFila?: boolean;
  bloqueadaPelaFila?: boolean;
  totalEtapasPendentesFila?: number;
  itemFilaAtual?: ItemFilaMotoboy | null;
  proximaEtapaDaTele?: ItemFilaMotoboy | null;
  atribuidaAoMotoboyEm?: string | null;
  aceitaPeloMotoboyEm?: string | null;
  recusadaPeloMotoboyEm?: string | null;
  motivoRecusaMotoboy?: string | null;
  espera?: number | string | null;
  esperaAtualIniciadaEm?: string | null;
  blocosEsperaAtual?: number | null;
  esperaMinutosAcumulados?: number | null;
  total?: number | string | null;
  recebimento?: "PENDENTE" | "ESCRITORIO" | "MOTOBOY" | string | null;
  formaCobranca?: "NA_HORA" | "SEMANAL" | "QUINZENAL" | "MENSAL" | string | null;
  valorRecebido?: number | string | null;
  dataRecebimento?: string | null;
  motoboyRecebedor?: string | null;
  dataTele?: string | null;
  createdAt?: string | null;
  criadoEm?: string | null;
  observacao?: string | null;
  observacaoGeral?: string | null;
  paradas?: Parada[];
};

export default function MotoboyPage() {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [teles, setTeles] = useState<Tele[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [teleAtualizando, setTeleAtualizando] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [erroLocalizacao, setErroLocalizacao] = useState("");
  const [online, setOnline] = useState(false);
  const [alterandoPresenca, setAlterandoPresenca] = useState(false);
  const [precisaoLocalizacao, setPrecisaoLocalizacao] = useState<number | null>(null);
  const [localizacaoAtualizadaEm, setLocalizacaoAtualizadaEm] = useState<string | null>(null);
  const [miniMapas, setMiniMapas] = useState<Record<string, EstadoMiniMapa>>({});
  const [permissoesLocalizacao, setPermissoesLocalizacao] =
    useState<EstadoPermissoesLocalizacao | null>(null);
  const [verificandoPermissoes, setVerificandoPermissoes] = useState(false);
  const [abrindoConfiguracoes, setAbrindoConfiguracoes] = useState(false);
  const [atualizacaoDisponivel, setAtualizacaoDisponivel] =
    useState<VersaoAplicativo | null>(null);
  const [versaoInstalada, setVersaoInstalada] = useState<string | null>(null);
  const [verificandoAtualizacao, setVerificandoAtualizacao] = useState(false);
  const [baixandoAtualizacao, setBaixandoAtualizacao] = useState(false);
  const [erroAtualizacaoApp, setErroAtualizacaoApp] = useState("");

  const watchIdRef = useRef<number | null>(null);
  const ultimaPosicaoRef = useRef<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const ultimoEnvioEmRef = useRef(0);
  const atualizacaoAutomaticaEmAndamentoRef = useRef(false);
  const teleAtualizandoRef = useRef<string | null>(null);
  const miniMapasConsultadosRef = useRef<Set<string>>(new Set());

  async function verificarPermissoesLocalizacao() {
    if (!executandoNoAppAndroid()) {
      return true;
    }

    setVerificandoPermissoes(true);

    try {
      const estado = await LocalizacaoNativa.verificarPermissoes();

      setPermissoesLocalizacao(estado);

      return estado.prontoParaFicarOnline;
    } catch (erroPermissao) {
      console.error("Não foi possível verificar as permissões nativas:", erroPermissao);
      return false;
    } finally {
      setVerificandoPermissoes(false);
    }
  }

  async function abrirConfiguracoesDaLocalizacao() {
    if (!executandoNoAppAndroid() || abrindoConfiguracoes) {
      return;
    }

    setAbrindoConfiguracoes(true);
    setErroLocalizacao("");

    try {
      await LocalizacaoNativa.abrirConfiguracoesLocalizacao();
    } catch (erroConfiguracoes) {
      setErroLocalizacao(
        erroConfiguracoes instanceof Error
          ? erroConfiguracoes.message
          : "Não foi possível abrir as configurações do aplicativo."
      );
    } finally {
      setAbrindoConfiguracoes(false);
    }
  }

  async function verificarAtualizacaoDoAplicativo() {
    if (!executandoNoAppAndroid() || verificandoAtualizacao) {
      return;
    }

    setVerificandoAtualizacao(true);
    setErroAtualizacaoApp("");

    try {
      const [instalada, respostaVersao] = await Promise.all([
        AtualizacaoNativa.obterVersaoInstalada(),
        fetch("/api/app-motoboy/versao", {
          cache: "no-store",
        }),
      ]);

      setVersaoInstalada(instalada.versionName || String(instalada.versionCode));

      if (!respostaVersao.ok) {
        throw new Error("Não foi possível verificar a versão mais recente.");
      }

      const disponivel = (await respostaVersao.json()) as VersaoAplicativo;

      if (
        Number.isFinite(Number(disponivel.versionCode)) &&
        Number(disponivel.versionCode) > Number(instalada.versionCode)
      ) {
        setAtualizacaoDisponivel(disponivel);
      } else {
        setAtualizacaoDisponivel(null);
      }
    } catch (erroVerificacao) {
      console.error("Não foi possível verificar atualização:", erroVerificacao);
    } finally {
      setVerificandoAtualizacao(false);
    }
  }

  async function iniciarAtualizacaoDoAplicativo() {
    if (
      !executandoNoAppAndroid() ||
      !atualizacaoDisponivel ||
      baixandoAtualizacao
    ) {
      return;
    }

    setBaixandoAtualizacao(true);
    setErroAtualizacaoApp("");

    try {
      const permissao =
        await AtualizacaoNativa.verificarPermissaoInstalacao();

      if (!permissao.permitido) {
        await AtualizacaoNativa.abrirPermissaoInstalacao();

        setErroAtualizacaoApp(
          'Ative "Permitir desta fonte" e volte ao Express Manager. Depois toque novamente em "Baixar atualização".'
        );
        return;
      }

      await AtualizacaoNativa.baixarEInstalar({
        apkUrl: atualizacaoDisponivel.apkUrl,
        nomeArquivo: `express-manager-motoboy-${atualizacaoDisponivel.versionName}.apk`,
      });
    } catch (erroDownload) {
      setErroAtualizacaoApp(
        erroDownload instanceof Error
          ? erroDownload.message
          : "Não foi possível baixar ou instalar a atualização."
      );
    } finally {
      setBaixandoAtualizacao(false);
    }
  }

  async function carregarDados(mostrarAtualizacao = false) {
    if (mostrarAtualizacao) {
      setAtualizando(true);
    } else {
      setCarregando(true);
    }

    setErro("");

    try {
      const [usuarioRes, telesRes] = await Promise.all([
        fetch("/api/auth/me", {
          cache: "no-store",
        }),
        fetch("/api/motoboys/minhas-teles", {
          cache: "no-store",
        }),
      ]);

      if (usuarioRes.status === 401 || telesRes.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!usuarioRes.ok) {
        throw new Error("Não foi possível carregar seu usuário.");
      }

      if (!telesRes.ok) {
        let mensagem = "Não foi possível carregar suas entregas.";

        try {
          const dadosErro = await telesRes.json();
          mensagem = dadosErro?.erro || mensagem;
        } catch {}

        throw new Error(mensagem);
      }

      const usuarioDados = await usuarioRes.json();
      const telesDados = await telesRes.json();

      setUsuario(usuarioDados.usuario || null);
      setTeles(Array.isArray(telesDados) ? telesDados : []);
    } catch (erroCarregamento) {
      setErro(
        erroCarregamento instanceof Error
          ? erroCarregamento.message
          : "Não foi possível carregar o painel."
      );
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }

  useEffect(() => {
    teleAtualizandoRef.current = teleAtualizando;
  }, [teleAtualizando]);

  useEffect(() => {
    void carregarDados();
    void carregarPresenca();
    void verificarPermissoesLocalizacao();
    void verificarAtualizacaoDoAplicativo();

    const intervaloAtualizacao = window.setInterval(() => {
      void carregarTelesAutomaticamente();
    }, 15000);

    const verificarAoRetornar = () => {
      if (document.visibilityState === "visible") {
        void verificarPermissoesLocalizacao();
        void verificarAtualizacaoDoAplicativo();
      }
    };

    document.addEventListener("visibilitychange", verificarAoRetornar);

    return () => {
      window.clearInterval(intervaloAtualizacao);
      document.removeEventListener("visibilitychange", verificarAoRetornar);
      pararMonitoramentoLocal();
    };
  }, []);

  async function carregarTelesAutomaticamente() {
    if (atualizacaoAutomaticaEmAndamentoRef.current || teleAtualizandoRef.current) {
      return;
    }

    atualizacaoAutomaticaEmAndamentoRef.current = true;

    try {
      const resposta = await fetch("/api/motoboys/minhas-teles", {
        cache: "no-store",
      });

      if (resposta.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!resposta.ok) {
        return;
      }

      const dados = await resposta.json();

      if (Array.isArray(dados)) {
        setTeles(dados);
      }
    } catch (erroAtualizacaoAutomatica) {
      console.error(
        "Não foi possível atualizar automaticamente as teles:",
        erroAtualizacaoAutomatica
      );
    } finally {
      atualizacaoAutomaticaEmAndamentoRef.current = false;
    }
  }

  async function carregarMiniMapa(tele: Tele) {
    if (miniMapasConsultadosRef.current.has(tele.id)) {
      return;
    }

    const paradasValidas = Array.isArray(tele.paradas)
      ? [...tele.paradas]
          .sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0))
          .filter((parada) => String(parada.endereco || "").trim())
      : [];

    if (paradasValidas.length < 2) {
      miniMapasConsultadosRef.current.add(tele.id);

      setMiniMapas((atuais) => ({
        ...atuais,
        [tele.id]: {
          carregando: false,
          erro: "A rota precisa ter pelo menos dois endereços.",
          resultado: null,
        },
      }));

      return;
    }

    miniMapasConsultadosRef.current.add(tele.id);

    setMiniMapas((atuais) => ({
      ...atuais,
      [tele.id]: {
        carregando: true,
        erro: null,
        resultado: null,
      },
    }));

    try {
      const temRetorno = paradasValidas.some((parada) =>
        ["TROCAR", "ENTREGA_E_COLETA", "RETORNO"].includes(String(parada.tipo || "").toUpperCase())
      );

      const paradasParaCalculo = paradasValidas.filter(
        (parada) => String(parada.tipo || "").toUpperCase() !== "RETORNO"
      );

      const resposta = await fetch("/api/maps/calcular-rota", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paradas: paradasParaCalculo.map((parada) => ({
            endereco: String(parada.endereco || "").trim(),
          })),
          temRetorno,
        }),
      });

      if (!resposta.ok) {
        let mensagem = "Não foi possível carregar a prévia da rota.";

        try {
          const dadosErro = await resposta.json();
          mensagem = dadosErro?.erro || mensagem;
        } catch {}

        throw new Error(mensagem);
      }

      const dados = (await resposta.json()) as ResultadoMiniMapa;

      setMiniMapas((atuais) => ({
        ...atuais,
        [tele.id]: {
          carregando: false,
          erro: null,
          resultado: {
            distanciaKm: Number(dados.distanciaKm || 0),
            duracaoMin: Number(dados.duracaoMin || 0),
            polyline: dados.polyline || null,
          },
        },
      }));
    } catch (erroMiniMapa) {
      setMiniMapas((atuais) => ({
        ...atuais,
        [tele.id]: {
          carregando: false,
          erro:
            erroMiniMapa instanceof Error
              ? erroMiniMapa.message
              : "Não foi possível carregar a prévia da rota.",
          resultado: null,
        },
      }));
    }
  }

  async function carregarPresenca() {
    try {
      const resposta = await fetch("/api/motoboys/minha-localizacao", {
        cache: "no-store",
      });

      if (!resposta.ok) return;

      const dados = await resposta.json();
      const presenca = dados?.motoboy as PresencaMotoboy | undefined;

      if (!presenca) return;

      setOnline(Boolean(presenca.online));
      setPrecisaoLocalizacao(typeof presenca.precisao === "number" ? presenca.precisao : null);
      setLocalizacaoAtualizadaEm(presenca.localizacaoAtualizadaEm || null);

      if (presenca.online) {
        iniciarWatchPosition();
      }
    } catch (erroPresenca) {
      console.error("Erro ao consultar presença do motoboy:", erroPresenca);
    }
  }

  function pararMonitoramentoLocal() {
    if (watchIdRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }

  async function enviarLocalizacao(acao: "ONLINE" | "ATUALIZAR", posicao: GeolocationPosition) {
    const resposta = await fetch("/api/motoboys/minha-localizacao", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        acao,
        latitude: posicao.coords.latitude,
        longitude: posicao.coords.longitude,
        precisao: posicao.coords.accuracy,
      }),
    });

    if (!resposta.ok) {
      let mensagem = "Não foi possível enviar sua localização.";

      try {
        const dadosErro = await resposta.json();
        mensagem = dadosErro?.erro || mensagem;
      } catch {}

      throw new Error(mensagem);
    }

    const dados = await resposta.json();

    setOnline(true);
    setPrecisaoLocalizacao(posicao.coords.accuracy);
    setLocalizacaoAtualizadaEm(dados?.motoboy?.localizacaoAtualizadaEm || new Date().toISOString());

    ultimaPosicaoRef.current = {
      latitude: posicao.coords.latitude,
      longitude: posicao.coords.longitude,
    };
    ultimoEnvioEmRef.current = Date.now();
  }

  function iniciarWatchPosition() {
    if (typeof navigator === "undefined" || !navigator.geolocation || watchIdRef.current !== null) {
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (posicao) => {
        const agora = Date.now();
        const ultima = ultimaPosicaoRef.current;
        const distancia = ultima
          ? distanciaEmMetros(
              ultima.latitude,
              ultima.longitude,
              posicao.coords.latitude,
              posicao.coords.longitude
            )
          : Number.POSITIVE_INFINITY;

        const passouTempo = agora - ultimoEnvioEmRef.current >= 15000;
        const moveuDistancia = distancia >= 25;

        if (!passouTempo && !moveuDistancia) return;

        void enviarLocalizacao("ATUALIZAR", posicao).catch((erroEnvio) => {
          setErroLocalizacao(
            erroEnvio instanceof Error
              ? erroEnvio.message
              : "Não foi possível atualizar sua localização."
          );
        });
      },
      (erroGps) => {
        setErroLocalizacao(mensagemErroGeolocalizacao(erroGps));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 20000,
      }
    );
  }

  async function ficarOnline() {
    if (alterandoPresenca || online) return;

    setAlterandoPresenca(true);
    setErroLocalizacao("");

    try {
      if (executandoNoAppAndroid()) {
        const permissaoPronta = await verificarPermissoesLocalizacao();

        if (!permissaoPronta) {
          throw new Error(
            'Ative "Permitir o tempo todo" nas configurações de localização antes de ficar online.'
          );
        }
      }
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        throw new Error("Este aparelho não oferece suporte à localização.");
      }

      const posicao = await obterPosicaoAtual();

      await enviarLocalizacao("ONLINE", posicao);

      if (executandoNoAppAndroid()) {
        await LocalizacaoNativa.iniciar();
      }

      iniciarWatchPosition();
    } catch (erroOnline) {
      try {
        if (executandoNoAppAndroid()) {
          await LocalizacaoNativa.parar();
        }
      } catch {}

      setErroLocalizacao(
        erroOnline instanceof Error ? erroOnline.message : "Não foi possível ficar online."
      );
    } finally {
      setAlterandoPresenca(false);
    }
  }

  async function ficarOffline() {
    if (alterandoPresenca || !online) return;

    setAlterandoPresenca(true);
    setErroLocalizacao("");

    try {
      if (executandoNoAppAndroid()) {
        await LocalizacaoNativa.parar();
      }

      const resposta = await fetch("/api/motoboys/minha-localizacao", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          acao: "OFFLINE",
        }),
      });

      if (!resposta.ok) {
        let mensagem = "Não foi possível ficar offline.";

        try {
          const dadosErro = await resposta.json();
          mensagem = dadosErro?.erro || mensagem;
        } catch {}

        throw new Error(mensagem);
      }

      pararMonitoramentoLocal();
      setOnline(false);
      setPrecisaoLocalizacao(null);
    } catch (erroOffline) {
      setErroLocalizacao(
        erroOffline instanceof Error ? erroOffline.message : "Não foi possível ficar offline."
      );
    } finally {
      setAlterandoPresenca(false);
    }
  }

  async function sair() {
    const acessoAndroid = executandoNoAppAndroid();

    try {
      if (acessoAndroid) {
        try {
          await LocalizacaoNativa.parar();
        } catch (erroServico) {
          console.error("Não foi possível parar o serviço nativo:", erroServico);
        }
      }

      if (online) {
        try {
          await fetch("/api/motoboys/minha-localizacao", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              acao: "OFFLINE",
            }),
          });
        } catch (erroOffline) {
          console.error("Não foi possível marcar o motoboy offline:", erroOffline);
        }
      }

      pararMonitoramentoLocal();

      await fetch("/api/auth/logout", {
        method: "POST",
        headers: acessoAndroid
          ? {
              "x-express-app": "android",
            }
          : undefined,
      });

      if (acessoAndroid) {
        try {
          await CredenciaisNativas.removerToken();
        } catch (erroToken) {
          console.error("Não foi possível remover o token do aparelho:", erroToken);
        }
      }
    } finally {
      window.location.href = "/login";
    }
  }

  async function expirarAceiteAutomaticamente(tele: Tele) {
    if (teleAtualizando) return;

    setTeleAtualizando(tele.id);

    try {
      await fetch("/api/motoboys/minhas-teles/aceite", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teleId: tele.id,
          acao: "RECUSAR",
          motivo: "Prazo de aceite expirado",
        }),
      });
    } catch (erroExpiracao) {
      console.error("Não foi possível expirar a tele automaticamente:", erroExpiracao);
    } finally {
      await carregarDados(true);
      setTeleAtualizando(null);
    }
  }

  async function responderAceite(tele: Tele, acao: "ACEITAR" | "RECUSAR") {
    if (teleAtualizando) return;

    /*
     * Antes de aceitar uma tele, confirma novamente as permissões
     * obrigatórias no Android. Recusar continua permitido.
     */
    if (acao === "ACEITAR" && executandoNoAppAndroid()) {
      setVerificandoPermissoes(true);
      setErro("");

      try {
        const estado = await LocalizacaoNativa.verificarPermissoes();

        setPermissoesLocalizacao(estado);

        if (!estado.prontoParaFicarOnline) {
          const faltando: string[] = [];

          if (!estado.localizacaoDuranteUso) {
            faltando.push("localização");
          }

          if (!estado.localizacaoSegundoPlano) {
            faltando.push('localização em "Permitir o tempo todo"');
          }

          if (!estado.notificacoes) {
            faltando.push("notificações");
          }

          setErro(
            `Não é possível aceitar esta tele. Ative: ${faltando.join(
              ", "
            )}. Depois volte ao aplicativo e tente novamente.`
          );

          setErroLocalizacao(
            "As permissões obrigatórias precisam estar ativas para aceitar e realizar uma tele."
          );

          return;
        }
      } catch (erroPermissao) {
        console.error("Não foi possível confirmar as permissões antes do aceite:", erroPermissao);

        setErro(
          "Não foi possível verificar as permissões do celular. Abra as configurações do Express Manager e confirme a localização e as notificações."
        );

        return;
      } finally {
        setVerificandoPermissoes(false);
      }
    }

    let motivo = "";

    if (acao === "RECUSAR") {
      const resposta = window.prompt(
        "Informe o motivo da recusa, ou deixe em branco para recusar sem motivo:"
      );

      if (resposta === null) {
        return;
      }

      motivo = resposta.trim();
    }

    setTeleAtualizando(tele.id);
    setErro("");

    if (executandoNoAppAndroid()) {
      try {
        await LocalizacaoNativa.pararSomAlerta();
      } catch (erroSom) {
        console.error("Não foi possível parar imediatamente o som do alerta:", erroSom);
      }
    }

    try {
      const resposta = await fetch("/api/motoboys/minhas-teles/aceite", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teleId: tele.id,
          acao,
          motivo,
        }),
      });

      if (!resposta.ok) {
        let mensagem =
          acao === "ACEITAR"
            ? "Não foi possível aceitar a tele."
            : "Não foi possível recusar a tele.";

        try {
          const dadosErro = await resposta.json();
          mensagem = dadosErro?.erro || mensagem;
        } catch {}

        throw new Error(mensagem);
      }

      await carregarDados(true);
    } catch (erroAceite) {
      setErro(
        erroAceite instanceof Error
          ? erroAceite.message
          : "Não foi possível registrar sua resposta."
      );
    } finally {
      setTeleAtualizando(null);
    }
  }

  function abrirRotaParaParadaAtual(tele: Tele) {
    const paradasOrdenadas = Array.isArray(tele.paradas)
      ? [...tele.paradas].sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0))
      : [];

    const indiceAtual = Math.max(
      0,
      Math.min(Number(tele.paradaAtualMotoboy || 0), Math.max(paradasOrdenadas.length - 1, 0))
    );

    const paradaAtual = paradasOrdenadas[indiceAtual];
    const endereco = String(paradaAtual?.endereco || "").trim();

    if (!endereco) {
      setErro("A parada atual não possui endereço informado.");
      return;
    }

    const destino = encodeURIComponent(endereco);

    if (executandoNoAppAndroid()) {
      window.location.href = `geo:0,0?q=${destino}`;
      return;
    }

    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${destino}&travelmode=driving`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  async function avancarEtapaMotoboy(tele: Tele, novaEtapa: EtapaMotoboyTele) {
    if (tele.statusAceite !== "ACEITA") {
      setErro("Aceite a tele antes de iniciar o serviço.");
      return;
    }

    if (teleAtualizando) return;

    if (
      novaEtapa === "CONCLUIDA" &&
      !window.confirm(
        "Confirmar que esta entrega foi concluída? Depois disso, ela será movida para as entregas concluídas."
      )
    ) {
      return;
    }

    setTeleAtualizando(tele.id);
    setErro("");

    try {
      const resposta = await fetch("/api/motoboys/minhas-teles/status", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          teleId: tele.id,
          etapaMotoboy: novaEtapa,
        }),
      });

      if (!resposta.ok) {
        let mensagem = "Não foi possível atualizar a etapa da tele.";

        try {
          const dadosErro = await resposta.json();
          mensagem = dadosErro?.erro || mensagem;
        } catch {}

        throw new Error(mensagem);
      }

      const dados = await resposta.json();
      const teleAtualizada = dados?.tele;

      setTeles((atuais) =>
        atuais.map((item) =>
          item.id === tele.id
            ? {
                ...item,
                status: teleAtualizada?.status || item.status,
                etapaMotoboy: teleAtualizada?.etapaMotoboy || novaEtapa,
                paradaAtualMotoboy:
                  teleAtualizada?.paradaAtualMotoboy ?? item.paradaAtualMotoboy ?? 0,
                rotaColetaIniciadaEm:
                  teleAtualizada?.rotaColetaIniciadaEm ?? item.rotaColetaIniciadaEm,
                chegouNaColetaEm: teleAtualizada?.chegouNaColetaEm ?? item.chegouNaColetaEm,
                entregaIniciadaEm: teleAtualizada?.entregaIniciadaEm ?? item.entregaIniciadaEm,
                chegouNaEntregaEm: teleAtualizada?.chegouNaEntregaEm ?? item.chegouNaEntregaEm,
                concluidaPeloMotoboyEm:
                  teleAtualizada?.concluidaPeloMotoboyEm ?? item.concluidaPeloMotoboyEm,
              }
            : item
        )
      );

      await carregarDados(true);
    } catch (erroAtualizacao) {
      setErro(
        erroAtualizacao instanceof Error
          ? erroAtualizacao.message
          : "Não foi possível atualizar a etapa."
      );
    } finally {
      setTeleAtualizando(null);
    }
  }

  async function registrarPagamentoRecebidoPeloMotoboy(tele: Tele) {
    if (teleAtualizando) return;

    const total = Number(tele.total || 0);
    const valorRecebidoAtual = Number(tele.valorRecebido || 0);
    const saldoPendente = Math.max(total - valorRecebidoAtual, 0);

    if (saldoPendente <= 0.009) {
      setErro("Esta tele não possui saldo pendente.");
      return;
    }

    const confirmou = window.confirm(
      `Confirmar o recebimento de ${formatarMoeda(
        saldoPendente
      )} do cliente? O valor ficará registrado como recebido por você.`
    );

    if (!confirmou) return;

    setTeleAtualizando(tele.id);
    setErro("");

    try {
      const resposta = await fetch("/api/teles", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: tele.id,
          valorRecebido: total,
          recebimento: "motoboy",
          motoboyRecebedor: usuario?.nome || null,
        }),
      });

      if (!resposta.ok) {
        let mensagem = "Não foi possível registrar o recebimento.";

        try {
          const dadosErro = await resposta.json();
          mensagem = dadosErro?.erro || mensagem;
        } catch {}

        throw new Error(mensagem);
      }

      await carregarDados(true);
    } catch (erroPagamento) {
      setErro(
        erroPagamento instanceof Error
          ? erroPagamento.message
          : "Não foi possível registrar o recebimento."
      );
    } finally {
      setTeleAtualizando(null);
    }
  }

  const telesHoje = useMemo(() => {
    const hoje = dataBrasilISO(new Date());

    return teles.filter((tele) => dataDaTele(tele) === hoje);
  }, [teles]);

  const telesSemana = useMemo(() => {
    const hoje = dataBrasilISO(new Date());
    const inicioSemana = inicioDaSemanaISO(hoje);
    const fimSemana = fimDaSemanaISO(hoje);

    return teles.filter((tele) => {
      const data = dataDaTele(tele);

      return data >= inicioSemana && data <= fimSemana;
    });
  }, [teles]);

  const brutoHoje = useMemo(
    () => telesHoje.reduce((total, tele) => total + Number(tele.total || 0), 0),
    [telesHoje]
  );

  const liquidoHoje = brutoHoje * 0.8;

  const recebidoHoje = useMemo(() => {
    const hoje = dataBrasilISO(new Date());
    const nomeMotoboy = normalizarTexto(usuario?.nome || "");

    return teles.reduce((total, tele) => {
      const recebidoPeloMotoboy = String(tele.recebimento || "").toUpperCase() === "MOTOBOY";

      const dataRecebimento = tele.dataRecebimento ? dataBrasilISO(tele.dataRecebimento) : "";

      const nomeRecebedor = normalizarTexto(tele.motoboyRecebedor || "");

      const pertenceAoMotoboy = !nomeRecebedor || !nomeMotoboy || nomeRecebedor === nomeMotoboy;

      if (!recebidoPeloMotoboy || dataRecebimento !== hoje || !pertenceAoMotoboy) {
        return total;
      }

      return total + Number(tele.valorRecebido || 0);
    }, 0);
  }, [teles, usuario?.nome]);

  const brutoSemana = useMemo(
    () => telesSemana.reduce((total, tele) => total + Number(tele.total || 0), 0),
    [telesSemana]
  );

  const progressoMeta = Math.min((brutoSemana / META_TROCA_OLEO) * 100, 100);

  const ganhouTrocaOleo = brutoSemana >= META_TROCA_OLEO;
  const faltaMeta = Math.max(META_TROCA_OLEO - brutoSemana, 0);

  const telesAguardandoAceite = useMemo(
    () =>
      teles
        .filter((tele) => tele.statusAceite === "AGUARDANDO_ACEITE" || tele.aguardandoAceite)
        .sort(ordenarTelesPorFila),
    [teles]
  );

  useEffect(() => {
    for (const tele of telesAguardandoAceite) {
      void carregarMiniMapa(tele);
    }
  }, [telesAguardandoAceite]);

  const entregasAndamento = useMemo(
    () =>
      teles
        .filter((tele) => tele.statusAceite === "ACEITA" && tele.status !== "ENTREGUE")
        .sort(ordenarTelesPorFila),
    [teles]
  );

  const entregasConcluidas = useMemo(
    () =>
      telesHoje
        .filter((tele) => tele.statusAceite === "ACEITA" && tele.status === "ENTREGUE")
        .sort(ordenarTeles),
    [telesHoje]
  );

  if (carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <RefreshCw size={30} className="animate-spin text-emerald-600" />

          <div>
            <p className="font-semibold text-slate-800">Carregando painel</p>
            <p className="mt-1 text-sm text-slate-500">Buscando suas entregas e valores.</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-5 sm:px-6 sm:py-7">
      <div className="mx-auto w-full max-w-6xl">
        <header className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-lg">
          <div className="relative p-5 sm:p-7">
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-500/20 blur-3xl" />

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-slate-950">
                  <Bike size={27} />
                </div>

                <div>
                  <p className="text-sm font-medium text-emerald-300">Área do motoboy</p>

                  <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
                    Olá, {usuario?.nome || "Motoboy"}
                  </h1>

                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Acompanhe suas entregas e atualize o andamento.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/motoboy/extrato"
                  className="flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  <WalletCards size={18} />
                  Ver extrato
                </Link>

                <button
                  type="button"
                  onClick={() => void carregarDados(true)}
                  disabled={atualizando || Boolean(teleAtualizando)}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/10 px-5 font-semibold text-white transition hover:bg-white/15 disabled:opacity-60"
                >
                  <RefreshCw size={18} className={atualizando ? "animate-spin" : ""} />
                  Atualizar
                </button>

                <button
                  type="button"
                  onClick={() => void sair()}
                  className="flex h-12 items-center justify-center gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-5 font-semibold text-red-200 transition hover:bg-red-500/20"
                >
                  <LogOut size={18} />
                  Sair
                </button>
              </div>
            </div>
          </div>
        </header>

        {executandoNoAppAndroid() && atualizacaoDisponivel && (
          <section className="mt-5 overflow-hidden rounded-3xl border border-blue-300 bg-blue-50 shadow-sm">
            <div className="p-5 sm:p-6">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white">
                    <Download size={23} />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-blue-700">
                      Atualização disponível
                    </p>

                    <h2 className="mt-1 text-xl font-bold text-slate-900">
                      Express Manager {atualizacaoDisponivel.versionName}
                    </h2>

                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">
                      {atualizacaoDisponivel.mensagem}
                    </p>

                    <p className="mt-2 text-xs text-slate-500">
                      Versão instalada: {versaoInstalada || "não identificada"}
                    </p>

                    {erroAtualizacaoApp && (
                      <div className="mt-4 rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm leading-6 text-amber-800">
                        {erroAtualizacaoApp}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void iniciarAtualizacaoDoAplicativo()}
                  disabled={baixandoAtualizacao}
                  className="flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60 md:w-auto"
                >
                  {baixandoAtualizacao ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Baixando...
                    </>
                  ) : (
                    <>
                      <Download size={18} />
                      Baixar atualização
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>
        )}

        {executandoNoAppAndroid() &&
          permissoesLocalizacao &&
          !permissoesLocalizacao.prontoParaFicarOnline && (
            <section className="mt-5 overflow-hidden rounded-3xl border border-amber-300 bg-amber-50 shadow-sm">
              <div className="p-5 sm:p-6">
                <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white">
                      <LocateFixed size={23} />
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-amber-700">Permissão obrigatória</p>

                      <h2 className="mt-1 text-xl font-bold text-slate-900">
                        Ative a localização em segundo plano
                      </h2>

                      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">
                        Para receber e realizar entregas, permita o acesso à localização em segundo
                        plano. Assim, sua posição continuará sendo atualizada mesmo com a tela
                        bloqueada. Ao tocar em “Ficar offline”, o compartilhamento da localização
                        será encerrado.
                      </p>

                      <div className="mt-4 rounded-2xl border border-amber-200 bg-white/80 px-4 py-3 text-sm leading-6 text-slate-700">
                        Abra as configurações e selecione:
                        <strong className="ml-1">
                          Permissões → Localização → Permitir o tempo todo
                        </strong>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void abrirConfiguracoesDaLocalizacao()}
                    disabled={abrindoConfiguracoes}
                    className="flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-500 px-6 font-semibold text-white transition hover:bg-amber-600 disabled:cursor-wait disabled:opacity-60 md:w-auto"
                  >
                    {abrindoConfiguracoes ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Abrindo...
                      </>
                    ) : (
                      <>
                        <LocateFixed size={18} />
                        Ativar permissão
                      </>
                    )}
                  </button>
                </div>
              </div>
            </section>
          )}

        <section
          className={`mt-5 overflow-hidden rounded-3xl border p-5 shadow-sm sm:p-6 ${
            online ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"
          }`}
        >
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                  online ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500"
                }`}
              >
                {online ? <Wifi size={23} /> : <WifiOff size={23} />}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900">
                    {online ? "Você está online" : "Você está offline"}
                  </h2>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      online ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {online ? "Disponível" : "Indisponível"}
                  </span>
                </div>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  {online
                    ? executandoNoAppAndroid()
                      ? "Sua localização está sendo compartilhada pelo aplicativo Android, inclusive com o app minimizado."
                      : executandoNoAppAndroid()
                        ? "Sua localização está sendo compartilhada pelo aplicativo Android, inclusive com o app minimizado."
                        : "Sua posição está sendo compartilhada enquanto este painel permanecer aberto."
                    : "Fique online para que o gestor veja sua posição e possa despachar as teles mais próximas."}
                </p>

                {online && (
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <LocateFixed size={14} />
                      {localizacaoAtualizadaEm
                        ? `Atualizada ${formatarTempoLocalizacao(localizacaoAtualizadaEm)}`
                        : "Aguardando localização"}
                    </span>

                    {precisaoLocalizacao !== null && (
                      <span>Precisão aproximada: {Math.round(precisaoLocalizacao)} m</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => void (online ? ficarOffline() : ficarOnline())}
              disabled={
                alterandoPresenca ||
                verificandoPermissoes ||
                (executandoNoAppAndroid() &&
                  !online &&
                  permissoesLocalizacao !== null &&
                  !permissoesLocalizacao.prontoParaFicarOnline)
              }
              className={`flex h-12 w-full items-center justify-center gap-2 rounded-xl px-6 font-semibold text-white transition disabled:cursor-wait disabled:opacity-60 md:w-auto ${
                online ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"
              }`}
            >
              {alterandoPresenca ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Aguarde...
                </>
              ) : online ? (
                <>
                  <WifiOff size={18} />
                  Ficar offline
                </>
              ) : (
                <>
                  <Wifi size={18} />
                  Ficar online
                </>
              )}
            </button>
          </div>

          {erroLocalizacao && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {erroLocalizacao}
            </div>
          )}
        </section>

        {erro && (
          <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {erro}
          </div>
        )}

        <section className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
          <CardResumo
            titulo="Entregas hoje"
            valor={String(telesHoje.length)}
            subtitulo={`${entregasConcluidas.length} concluídas`}
            icone={<PackageCheck size={21} />}
          />

          <CardResumo
            titulo="Em andamento"
            valor={String(entregasAndamento.length)}
            subtitulo="Pendentes hoje"
            icone={<Clock3 size={21} />}
            destaque="laranja"
          />

          <CardResumo
            titulo="Bruto hoje"
            valor={formatarMoeda(brutoHoje)}
            subtitulo="Valor das teles"
            icone={<CircleDollarSign size={21} />}
          />

          <CardResumo
            titulo="Seu líquido"
            valor={formatarMoeda(liquidoHoje)}
            subtitulo="80% do bruto"
            icone={<WalletCards size={21} />}
            destaque="verde"
          />

          <CardResumo
            titulo="Recebido hoje"
            valor={formatarMoeda(recebidoHoje)}
            subtitulo="Pagamentos recebidos de clientes"
            icone={<CircleDollarSign size={21} />}
            destaque="azul"
          />
        </section>

        <section
          className={`mt-6 overflow-hidden rounded-3xl border shadow-sm ${
            ganhouTrocaOleo
              ? "border-emerald-600 bg-emerald-600 text-white"
              : "border-slate-200 bg-white text-slate-900"
          }`}
        >
          <div className="p-5 sm:p-6">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                    ganhouTrocaOleo ? "bg-white/15 text-white" : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {ganhouTrocaOleo ? <Trophy size={23} /> : <Target size={23} />}
                </div>

                <div>
                  <p
                    className={`text-sm font-semibold ${
                      ganhouTrocaOleo ? "text-emerald-100" : "text-emerald-600"
                    }`}
                  >
                    Meta semanal
                  </p>

                  <h2 className="mt-1 text-xl font-bold sm:text-2xl">
                    {ganhouTrocaOleo ? "Meta atingida" : "Troca de óleo"}
                  </h2>

                  <p
                    className={`mt-2 max-w-2xl text-sm leading-6 ${
                      ganhouTrocaOleo ? "text-emerald-50" : "text-slate-500"
                    }`}
                  >
                    {ganhouTrocaOleo
                      ? "Você atingiu a meta de bruto da semana e garantiu uma troca de óleo grátis."
                      : `Faltam ${formatarMoeda(faltaMeta)} para atingir a meta.`}
                  </p>
                </div>
              </div>

              <div className="shrink-0 md:text-right">
                <p className={`text-sm ${ganhouTrocaOleo ? "text-emerald-100" : "text-slate-500"}`}>
                  Acumulado na semana
                </p>

                <strong className="mt-1 block text-2xl">{formatarMoeda(brutoSemana)}</strong>

                <p
                  className={`mt-1 text-sm ${
                    ganhouTrocaOleo ? "text-emerald-100" : "text-slate-500"
                  }`}
                >
                  de {formatarMoeda(META_TROCA_OLEO)}
                </p>
              </div>
            </div>

            <div
              className={`mt-6 h-3 overflow-hidden rounded-full ${
                ganhouTrocaOleo ? "bg-white/20" : "bg-slate-100"
              }`}
            >
              <div
                className={`h-full rounded-full transition-all ${
                  ganhouTrocaOleo ? "bg-white" : "bg-emerald-600"
                }`}
                style={{ width: `${progressoMeta}%` }}
              />
            </div>

            <div className="mt-3 flex items-center justify-between gap-4 text-sm">
              <span className={ganhouTrocaOleo ? "text-emerald-100" : "text-slate-500"}>
                {Math.round(progressoMeta)}% concluído
              </span>

              <span
                className={
                  ganhouTrocaOleo ? "font-semibold text-white" : "font-medium text-slate-700"
                }
              >
                {telesSemana.length} teles na semana
              </span>
            </div>
          </div>
        </section>

        {telesAguardandoAceite.length > 0 && (
          <section className="mt-8 overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-sm">
            <CabecalhoSecao
              titulo="Novas teles aguardando aceite"
              descricao="Confira os dados e aceite ou recuse antes de iniciar."
              quantidade={telesAguardandoAceite.length}
              icone={<Clock3 size={21} />}
            />

            <div className="divide-y divide-slate-100">
              {telesAguardandoAceite.map((tele) => (
                <CardTele
                  key={tele.id}
                  tele={tele}
                  miniMapa={miniMapas[tele.id]}
                  atualizando={teleAtualizando === tele.id}
                  bloqueado={Boolean(teleAtualizando)}
                  onAvancarEtapa={() => {}}
                  onAceitar={() => void responderAceite(tele, "ACEITAR")}
                  onRecusar={() => void responderAceite(tele, "RECUSAR")}
                  onExpirarAceite={() => void expirarAceiteAutomaticamente(tele)}
                  onAbrirMapaParadaAtual={() => {}}
                  onRegistrarPagamento={() => {}}
                />
              ))}
            </div>
          </section>
        )}

        <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <CabecalhoSecao
            titulo="Entregas em andamento"
            descricao="Atualize cada etapa conforme o serviço avança."
            quantidade={entregasAndamento.length}
            icone={<Route size={21} />}
          />

          {entregasAndamento.length === 0 ? (
            <EstadoVazio
              titulo="Nenhuma entrega em andamento"
              descricao="Quando uma tele for atribuída para hoje, ela aparecerá aqui."
              icone={<Route size={26} />}
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {entregasAndamento.map((tele) => (
                <CardTele
                  key={tele.id}
                  tele={tele}
                  miniMapa={undefined}
                  atualizando={teleAtualizando === tele.id}
                  bloqueado={Boolean(teleAtualizando)}
                  onAvancarEtapa={(etapa) => void avancarEtapaMotoboy(tele, etapa)}
                  onAceitar={() => {}}
                  onRecusar={() => {}}
                  onExpirarAceite={() => {}}
                  onAbrirMapaParadaAtual={() => abrirRotaParaParadaAtual(tele)}
                  onRegistrarPagamento={() =>
                    void registrarPagamentoRecebidoPeloMotoboy(tele)
                  }
                />
              ))}
            </div>
          )}
        </section>

        <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <CabecalhoSecao
            titulo="Entregas concluídas"
            descricao="Teles finalizadas hoje."
            quantidade={entregasConcluidas.length}
            icone={<CheckCircle2 size={21} />}
            concluida
          />

          {entregasConcluidas.length === 0 ? (
            <EstadoVazio
              titulo="Nenhuma entrega concluída"
              descricao="As teles finalizadas hoje aparecerão nesta lista."
              icone={<CheckCircle2 size={26} />}
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {entregasConcluidas.map((tele) => (
                <CardTele
                  key={tele.id}
                  tele={tele}
                  miniMapa={undefined}
                  concluida
                  atualizando={false}
                  bloqueado
                  onAvancarEtapa={() => {}}
                  onAceitar={() => {}}
                  onRecusar={() => {}}
                  onExpirarAceite={() => {}}
                  onAbrirMapaParadaAtual={() => {}}
                  onRegistrarPagamento={() => {}}
                />
              ))}
            </div>
          )}
        </section>

        <footer className="py-8 text-center text-xs text-slate-400">
          Express Manager • Área do motoboy
        </footer>
      </div>
    </main>
  );
}

function CardResumo({
  titulo,
  valor,
  subtitulo,
  icone,
  destaque = "padrao",
}: {
  titulo: string;
  valor: string;
  subtitulo: string;
  icone: React.ReactNode;
  destaque?: "padrao" | "verde" | "laranja" | "azul";
}) {
  const estilos = {
    padrao: "bg-slate-100 text-slate-700",
    verde: "bg-emerald-100 text-emerald-700",
    laranja: "bg-orange-100 text-orange-700",
    azul: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${estilos[destaque]}`}>
        {icone}
      </div>

      <p className="mt-4 text-xs font-medium text-slate-500 sm:text-sm">{titulo}</p>

      <strong className="mt-1 block break-words text-xl text-slate-900 sm:text-2xl">{valor}</strong>

      <p className="mt-1 text-xs text-slate-400">{subtitulo}</p>
    </div>
  );
}

function CabecalhoSecao({
  titulo,
  descricao,
  quantidade,
  icone,
  concluida = false,
}: {
  titulo: string;
  descricao: string;
  quantidade: number;
  icone: React.ReactNode;
  concluida?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/70 px-5 py-5 sm:px-6">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
            concluida ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"
          }`}
        >
          {icone}
        </div>

        <div className="min-w-0">
          <h2 className="text-lg font-bold text-slate-900 sm:text-xl">{titulo}</h2>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">{descricao}</p>
        </div>
      </div>

      <span
        className={`flex h-9 min-w-9 shrink-0 items-center justify-center rounded-xl px-3 text-sm font-bold ${
          concluida ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700"
        }`}
      >
        {quantidade}
      </span>
    </div>
  );
}

function CardTele({
  tele,
  miniMapa,
  concluida = false,
  atualizando,
  bloqueado,
  onAvancarEtapa,
  onAceitar,
  onRecusar,
  onExpirarAceite,
  onAbrirMapaParadaAtual,
  onRegistrarPagamento,
}: {
  tele: Tele;
  miniMapa?: EstadoMiniMapa;
  concluida?: boolean;
  atualizando: boolean;
  bloqueado: boolean;
  onAvancarEtapa: (etapa: EtapaMotoboyTele) => void;
  onAceitar: () => void;
  onRecusar: () => void;
  onExpirarAceite: () => void;
  onAbrirMapaParadaAtual: () => void;
  onRegistrarPagamento: () => void;
}) {
  const [agoraAceite, setAgoraAceite] = useState(() => Date.now());
  const [agoraEspera, setAgoraEspera] = useState(() => Date.now());
  const expiracaoDisparadaRef = useRef(false);

  const estaAguardandoAceite =
    tele.statusAceite === "AGUARDANDO_ACEITE" || tele.aguardandoAceite === true;

  useEffect(() => {
    if (!estaAguardandoAceite) return;

    const intervalo = window.setInterval(() => {
      setAgoraAceite(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalo);
  }, [estaAguardandoAceite]);

  const esperaAtiva =
    Boolean(tele.esperaAtualIniciadaEm) &&
    (tele.etapaMotoboy === "CHEGOU_NA_COLETA" ||
      tele.etapaMotoboy === "CHEGOU_NA_ENTREGA");

  useEffect(() => {
    if (!esperaAtiva) return;

    setAgoraEspera(Date.now());

    const intervalo = window.setInterval(() => {
      setAgoraEspera(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalo);
  }, [esperaAtiva, tele.esperaAtualIniciadaEm]);

  const segundosEspera = esperaAtiva
    ? calcularSegundosEspera(tele.esperaAtualIniciadaEm, agoraEspera)
    : 0;

  const blocosCompletosEspera = Math.floor(segundosEspera / (15 * 60));
  const proximoBlocoEmSegundos = 15 * 60 - (segundosEspera % (15 * 60));
  const valorEsperaPrevisto = blocosCompletosEspera * 5;

  const segundosRestantesAceite = estaAguardandoAceite
    ? calcularSegundosRestantesAceite(tele.atribuidaAoMotoboyEm, agoraAceite)
    : null;

  const aceiteExpirado = segundosRestantesAceite === 0;

  useEffect(() => {
    if (!estaAguardandoAceite || !aceiteExpirado || expiracaoDisparadaRef.current) {
      return;
    }

    expiracaoDisparadaRef.current = true;
    onExpirarAceite();
  }, [aceiteExpirado, estaAguardandoAceite, onExpirarAceite]);

  useEffect(() => {
    if (!estaAguardandoAceite) {
      expiracaoDisparadaRef.current = false;
    }
  }, [estaAguardandoAceite]);

  const paradas = Array.isArray(tele.paradas)
    ? [...tele.paradas].sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0))
    : [];

  const etapaAtual = tele.etapaMotoboy || "AGUARDANDO_INICIO_COLETA";
  const indiceParadaAtual = Math.max(
    0,
    Math.min(Number(tele.paradaAtualMotoboy || 0), Math.max(paradas.length - 1, 0))
  );

  const indiceParadaLiberada = tele.itemFilaAtual?.paradaId
    ? paradas.findIndex((parada) => parada.id === tele.itemFilaAtual?.paradaId)
    : -1;

  const indiceVisualAtual = indiceParadaLiberada >= 0 ? indiceParadaLiberada : indiceParadaAtual;

  const paradaAtual = paradas[indiceParadaAtual];
  const paradaLiberada = indiceParadaLiberada >= 0 ? paradas[indiceParadaLiberada] : paradaAtual;

  const proximaParada =
    etapaAtual === "CHEGOU_NA_COLETA" || etapaAtual === "CHEGOU_NA_ENTREGA"
      ? paradaLiberada
      : paradas[indiceParadaAtual + 1];

  const sugestaoGestor = tele.proximaEtapaDaTele || tele.itemFilaAtual || null;

  /*
   * A fila do gestor agora é apenas uma sugestão visual.
   * O motoboy continua livre para iniciar qualquer tele.
   */
  const deveFinalizarTele =
    etapaAtual === "CHEGOU_NA_ENTREGA" && Number(tele.totalEtapasPendentesFila || 0) === 0;

  const acaoEtapa = tele.aguardandoRetomada
    ? {
        texto: "Retomar rota",
        proximaEtapa: etapaAtual as EtapaMotoboyTele,
      }
    : deveFinalizarTele
      ? {
          texto: "Finalizar tele",
          proximaEtapa: "CONCLUIDA" as EtapaMotoboyTele,
        }
      : obterAcaoEtapaMotoboy({
          etapa: etapaAtual,
          paradaAtual,
          proximaParada,
        });

  const observacao = tele.observacaoGeral || tele.observacao;

  const totalTele = Number(tele.total || 0);
  const valorRecebido = Number(tele.valorRecebido || 0);
  const saldoPendente = Math.max(totalTele - valorRecebido, 0);
  const cobrancaNaHora = String(tele.formaCobranca || "").toUpperCase() === "NA_HORA";
  const estaNoLocal =
    etapaAtual === "CHEGOU_NA_COLETA" || etapaAtual === "CHEGOU_NA_ENTREGA";
  const precisaCobrar =
    !concluida &&
    tele.statusAceite === "ACEITA" &&
    cobrancaNaHora &&
    estaNoLocal &&
    saldoPendente > 0.009;

  return (
    <article className="p-5 sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <strong className="text-lg text-slate-900">
              {tele.solicitante || "Solicitante não informado"}
            </strong>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                estaAguardandoAceite
                  ? "bg-amber-100 text-amber-700"
                  : concluida
                    ? "bg-emerald-100 text-emerald-700"
                    : classeStatus(tele.status)
              }`}
            >
              {estaAguardandoAceite ? "Aguardando seu aceite" : formatarStatus(tele.status)}
            </span>

            {estaAguardandoAceite && segundosRestantesAceite !== null && (
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  aceiteExpirado
                    ? "bg-red-100 text-red-700"
                    : segundosRestantesAceite <= 15
                      ? "bg-orange-100 text-orange-700"
                      : "bg-slate-900 text-white"
                }`}
              >
                {aceiteExpirado
                  ? "Tempo esgotado"
                  : `Aceitar em ${formatarContagemAceite(segundosRestantesAceite)}`}
              </span>
            )}

            {tele.rotaAtiva && (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                Rota ativa
              </span>
            )}

            {tele.aguardandoRetomada && (
              <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-700">
                Aguardando retomada
              </span>
            )}

            {tele.statusAceite === "ACEITA" && sugestaoGestor?.posicao && (
              <span className="rounded-full bg-violet-100 px-3 py-1 text-xs font-bold text-violet-700">
                Sugestão do gestor: {sugestaoGestor.posicao}ª etapa
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-500">
            <span className="flex items-center gap-1.5">
              <CalendarDays size={15} />
              {formatarData(tele.dataTele || tele.createdAt)}
            </span>

            <span className="flex items-center gap-1.5">
              <MapPin size={15} />
              {paradas.length} {paradas.length === 1 ? "parada" : "paradas"}
            </span>
          </div>

          {estaAguardandoAceite && (
            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 py-3">
                <div>
                  <p className="font-semibold text-slate-800">Prévia da rota</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Confira o trajeto antes de aceitar a tele.
                  </p>
                </div>

                {miniMapa?.resultado && (
                  <div className="shrink-0 text-right text-xs text-slate-500">
                    <strong className="block text-sm text-slate-800">
                      {miniMapa.resultado.distanciaKm.toFixed(1).replace(".", ",")} km
                    </strong>
                    <span>{miniMapa.resultado.duracaoMin} min</span>
                  </div>
                )}
              </div>

              {miniMapa?.carregando ? (
                <div className="flex h-48 items-center justify-center gap-2 text-sm text-slate-500">
                  <Loader2 size={18} className="animate-spin" />
                  Calculando rota...
                </div>
              ) : miniMapa?.resultado?.polyline ? (
                <img
                  src={`/api/maps/imagem-rota?polyline=${encodeURIComponent(
                    miniMapa.resultado.polyline
                  )}&versao=mapa-real-2`}
                  alt="Prévia do trajeto da tele"
                  className="h-48 w-full object-cover sm:h-56"
                  loading="lazy"
                />
              ) : miniMapa?.erro ? (
                <div className="px-4 py-5 text-sm text-amber-700">{miniMapa.erro}</div>
              ) : (
                <div className="flex h-48 items-center justify-center text-sm text-slate-500">
                  Preparando prévia da rota...
                </div>
              )}
            </div>
          )}

          {paradas.length > 0 ? (
            <div className="mt-5 space-y-3">
              {paradas.map((parada, indice) => {
                const paradaAtiva =
                  !concluida && tele.statusAceite === "ACEITA" && indice === indiceVisualAtual;

                const paradaConcluida =
                  concluida || (tele.statusAceite === "ACEITA" && indice < indiceParadaAtual);

                return (
                  <div
                    key={parada.id || `${tele.id}-${indice}`}
                    className={`relative flex gap-3 rounded-2xl p-3 ${
                      paradaAtiva ? "border border-blue-200 bg-blue-50" : ""
                    }`}
                  >
                    <div className="flex w-7 shrink-0 flex-col items-center">
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                          paradaConcluida
                            ? "bg-emerald-100 text-emerald-700"
                            : paradaAtiva
                              ? "bg-blue-600 text-white"
                              : "bg-slate-900 text-white"
                        }`}
                      >
                        {indice + 1}
                      </div>

                      {indice < paradas.length - 1 && (
                        <div className="mt-1 h-full min-h-6 w-px bg-slate-200" />
                      )}
                    </div>

                    <div className="min-w-0 pb-2">
                      <p className="font-semibold text-slate-800">
                        {parada.cliente || tituloTipoParada(parada.tipo) || `Parada ${indice + 1}`}
                      </p>

                      <p className="mt-1 break-words text-sm leading-6 text-slate-500">
                        {parada.endereco || "Endereço não informado"}
                      </p>

                      {parada.observacao && (
                        <p className="mt-1 text-sm text-slate-600">{parada.observacao}</p>
                      )}
                      {paradaAtiva && (
                        <span className="mt-2 inline-flex rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                          Parada atual
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
              Nenhuma parada informada nesta tele.
            </div>
          )}

          {observacao && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
              <strong>Observação:</strong> {observacao}
            </div>
          )}

          {!concluida && tele.statusAceite === "ACEITA" && sugestaoGestor?.parada && (
            <div className="mt-5 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-4">
              <p className="text-xs font-bold uppercase tracking-wide text-violet-700">
                Sugestão de rota do gestor
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {sugestaoGestor.posicao
                  ? `Sugestão ${sugestaoGestor.posicao}ª da sequência`
                  : "Próxima parada sugerida"}
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Esta ordem é apenas uma recomendação. Você pode iniciar outra tele quando for mais
                prático para a operação.
              </p>

              <div className="mt-3 rounded-xl bg-white/80 px-3 py-3 text-sm text-slate-600">
                <strong className="text-slate-800">
                  {rotuloCurtoTipoParada(sugestaoGestor.parada.tipo)}
                </strong>
                {sugestaoGestor.parada.cliente ? ` — ${sugestaoGestor.parada.cliente}` : ""}
                {sugestaoGestor.parada.endereco && (
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {sugestaoGestor.parada.endereco}
                  </p>
                )}
              </div>
            </div>
          )}

          {precisaCobrar && (
            <div className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-amber-700">
                    Cobrança necessária
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">
                    Esta tele deve ser cobrada no local antes de continuar.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onRegistrarPagamento}
                  disabled={bloqueado}
                  className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 font-bold text-white transition hover:bg-amber-600 disabled:cursor-wait disabled:opacity-60"
                >
                  {atualizando ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <CircleDollarSign size={18} />
                  )}
                  Precisa cobrar {formatarMoeda(saldoPendente)}
                </button>
              </div>
            </div>
          )}

          {!concluida && tele.statusAceite === "ACEITA" && esperaAtiva && (
            <div className="mt-5 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-orange-700">
                    Tempo de espera
                  </p>

                  <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
                    {formatarCronometroEspera(segundosEspera)}
                  </p>

                  <p className="mt-1 text-sm text-slate-600">
                    {blocosCompletosEspera === 0
                      ? `Próximo acréscimo de R$ 5,00 em ${formatarCronometroEspera(
                          proximoBlocoEmSegundos
                        )}`
                      : `${blocosCompletosEspera} ${
                          blocosCompletosEspera === 1 ? "bloco cobrado" : "blocos cobrados"
                        } • ${formatarMoeda(valorEsperaPrevisto)}`}
                  </p>
                </div>

                <div className="rounded-xl bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
                  <span className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Espera acumulada
                  </span>
                  <strong className="mt-1 block text-lg text-orange-700">
                    {formatarMoeda(Number(tele.espera || 0))}
                  </strong>
                </div>
              </div>
            </div>
          )}

          {!concluida && tele.aguardandoRetomada && (
            <div className="mt-5 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-4">
              <p className="text-xs font-bold uppercase tracking-wide text-orange-700">
                Rota temporariamente pausada
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                Você iniciou outra rota. Toque em “Retomar rota” quando voltar para esta tele.
                A outra rota ficará aguardando automaticamente.
              </p>
            </div>
          )}

          {!concluida && estaAguardandoAceite ? (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:flex">
              <button
                type="button"
                onClick={onRecusar}
                disabled={bloqueado || aceiteExpirado}
                className="flex h-12 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {atualizando ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <XCircle size={18} />
                )}
                Recusar
              </button>

              <button
                type="button"
                onClick={onAceitar}
                disabled={bloqueado || aceiteExpirado}
                className="flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {atualizando ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={18} />
                )}
                Aceitar tele
              </button>
            </div>
          ) : (
            !concluida &&
            tele.statusAceite === "ACEITA" &&
            acaoEtapa && (
              <div className="mt-5">
                <div className="mb-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Etapa atual
                  </p>
                  <p className="mt-1 font-semibold text-slate-800">
                    {rotuloEtapaMotoboy(
                      etapaAtual,
                      etapaAtual === "CHEGOU_NA_COLETA" || etapaAtual === "CHEGOU_NA_ENTREGA"
                        ? paradaLiberada
                        : paradaAtual
                    )}
                  </p>

                  {paradaLiberada && (
                    <p className="mt-1 text-sm text-slate-500">
                      Destino definido:{" "}
                      <strong className="text-slate-700">
                        {tituloParada(paradaLiberada, indiceVisualAtual)}
                      </strong>
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => onAvancarEtapa(acaoEtapa.proximaEtapa)}
                    disabled={bloqueado}
                    className={`flex h-12 w-full items-center justify-center gap-2 rounded-xl px-5 font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto ${
                      tele.aguardandoRetomada
                        ? "bg-orange-600 hover:bg-orange-700"
                        : acaoEtapa.proximaEtapa === "CONCLUIDA"
                          ? "bg-emerald-600 hover:bg-emerald-700"
                          : "bg-slate-900 hover:bg-slate-800"
                    }`}
                  >
                    {atualizando ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Atualizando...
                      </>
                    ) : (
                      <>
                        {tele.aguardandoRetomada ? (
                          <RefreshCw size={18} />
                        ) : acaoEtapa.proximaEtapa === "CONCLUIDA" ? (
                          <CheckCircle2 size={18} />
                        ) : (
                          <Route size={18} />
                        )}
                        {acaoEtapa.texto}
                      </>
                    )}
                  </button>

                  {(etapaAtual === "EM_ROTA_COLETA" || etapaAtual === "EM_ROTA_ENTREGA") &&
                    paradaAtual && (
                      <button
                        type="button"
                        onClick={onAbrirMapaParadaAtual}
                        disabled={bloqueado}
                        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                      >
                        <MapPin size={18} />
                        Abrir mapa: {rotuloCurtoTipoParada(paradaAtual.tipo)}
                      </button>
                    )}
                </div>
              </div>
            )
          )}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-4 border-t border-slate-100 pt-4 lg:min-w-44 lg:flex-col lg:items-end lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          <div className="lg:text-right">
            <p className="text-xs text-slate-400">Valor da tele</p>
            <strong className="mt-1 block text-xl text-slate-900">
              {formatarMoeda(Number(tele.total || 0))}
            </strong>
            <p className="mt-1 text-sm font-semibold text-emerald-700">
              Líquido {formatarMoeda(Number(tele.total || 0) * 0.8)}
            </p>
          </div>

          <ChevronRight size={20} className="text-slate-300 lg:hidden" />
        </div>
      </div>
    </article>
  );
}

function EstadoVazio({
  titulo,
  descricao,
  icone,
}: {
  titulo: string;
  descricao: string;
  icone: React.ReactNode;
}) {
  return (
    <div className="px-6 py-12 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        {icone}
      </div>

      <h3 className="mt-4 font-bold text-slate-800">{titulo}</h3>

      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">{descricao}</p>
    </div>
  );
}

function obterAcaoEtapaMotoboy({
  etapa,
  paradaAtual,
  proximaParada,
}: {
  etapa: EtapaMotoboyTele;
  paradaAtual?: Parada;
  proximaParada?: Parada;
}): {
  texto: string;
  proximaEtapa: EtapaMotoboyTele;
} | null {
  const tipoAtual = rotuloCurtoTipoParada(paradaAtual?.tipo);
  const tipoProximo = rotuloCurtoTipoParada(proximaParada?.tipo);

  if (etapa === "AGUARDANDO_INICIO_COLETA") {
    return {
      texto: `Iniciar rota até ${artigoParaTipo(tipoAtual)} ${tipoAtual.toLowerCase()}`,
      proximaEtapa: "EM_ROTA_COLETA",
    };
  }

  if (etapa === "EM_ROTA_COLETA") {
    return {
      texto: `Cheguei ${artigoEmTipo(tipoAtual)} ${tipoAtual.toLowerCase()}`,
      proximaEtapa: "CHEGOU_NA_COLETA",
    };
  }

  if (etapa === "CHEGOU_NA_COLETA") {
    return {
      texto: `Iniciar rota até ${artigoParaTipo(tipoProximo)} ${tipoProximo.toLowerCase()}`,
      proximaEtapa: "EM_ROTA_ENTREGA",
    };
  }

  if (etapa === "EM_ROTA_ENTREGA") {
    return {
      texto: `Cheguei ${artigoEmTipo(tipoAtual)} ${tipoAtual.toLowerCase()}`,
      proximaEtapa: "CHEGOU_NA_ENTREGA",
    };
  }

  if (etapa === "CHEGOU_NA_ENTREGA") {
    if (proximaParada) {
      return {
        texto: `Iniciar rota até ${artigoParaTipo(tipoProximo)} ${tipoProximo.toLowerCase()}`,
        proximaEtapa: "EM_ROTA_ENTREGA",
      };
    }

    return {
      texto: "Finalizar tele",
      proximaEtapa: "CONCLUIDA",
    };
  }

  return null;
}

function rotuloEtapaMotoboy(etapa: EtapaMotoboyTele, paradaAtual?: Parada) {
  const tipoAtual = rotuloCurtoTipoParada(paradaAtual?.tipo);

  const mapa: Record<EtapaMotoboyTele, string> = {
    AGUARDANDO_INICIO_COLETA: `Aguardando início da rota até ${artigoParaTipo(tipoAtual)} ${tipoAtual.toLowerCase()}`,
    EM_ROTA_COLETA: `Em deslocamento até ${artigoParaTipo(tipoAtual)} ${tipoAtual.toLowerCase()}`,
    CHEGOU_NA_COLETA: `No local ${artigoDeTipo(tipoAtual)} ${tipoAtual.toLowerCase()}`,
    EM_ROTA_ENTREGA: `Em deslocamento até ${artigoParaTipo(tipoAtual)} ${tipoAtual.toLowerCase()}`,
    CHEGOU_NA_ENTREGA: `No local ${artigoDeTipo(tipoAtual)} ${tipoAtual.toLowerCase()}`,
    CONCLUIDA: "Tele concluída",
  };

  return mapa[etapa];
}

function rotuloCurtoTipoParada(tipo?: string | null) {
  const mapa: Record<string, string> = {
    COLETA: "Coleta",
    ENTREGA: "Entrega",
    RETORNO: "Retorno",
    TROCAR: "Troca",
    ENTREGA_E_COLETA: "Entrega e coleta",
  };

  return mapa[String(tipo || "").toUpperCase()] || "Parada";
}

function artigoParaTipo(tipo: string) {
  return tipo === "Entrega" || tipo === "Entrega e coleta" || tipo === "Troca" ? "a" : "o";
}

function artigoEmTipo(tipo: string) {
  return tipo === "Entrega" || tipo === "Entrega e coleta" || tipo === "Troca" ? "na" : "no";
}

function artigoDeTipo(tipo: string) {
  return tipo === "Entrega" || tipo === "Entrega e coleta" || tipo === "Troca" ? "da" : "do";
}

function tituloParada(parada: Parada, indice: number) {
  return parada.cliente || tituloTipoParada(parada.tipo) || `Parada ${indice + 1}`;
}

function calcularSegundosRestantesAceite(
  atribuidaAoMotoboyEm: string | null | undefined,
  agora: number
) {
  if (!atribuidaAoMotoboyEm) return 300;

  const inicio = new Date(atribuidaAoMotoboyEm).getTime();

  if (!Number.isFinite(inicio)) return 300;

  const decorrido = Math.floor((agora - inicio) / 1000);

  return Math.max(300 - decorrido, 0);
}

function formatarContagemAceite(segundos: number) {
  const minutos = Math.floor(segundos / 60);
  const restante = segundos % 60;

  return `${String(minutos).padStart(2, "0")}:${String(restante).padStart(2, "0")}`;
}

function calcularSegundosEspera(
  esperaAtualIniciadaEm: string | null | undefined,
  agora: number
) {
  if (!esperaAtualIniciadaEm) return 0;

  const inicio = new Date(esperaAtualIniciadaEm).getTime();

  if (!Number.isFinite(inicio)) return 0;

  return Math.max(0, Math.floor((agora - inicio) / 1000));
}

function formatarCronometroEspera(segundosTotais: number) {
  const horas = Math.floor(segundosTotais / 3600);
  const minutos = Math.floor((segundosTotais % 3600) / 60);
  const segundos = segundosTotais % 60;

  if (horas > 0) {
    return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(
      2,
      "0"
    )}:${String(segundos).padStart(2, "0")}`;
  }

  return `${String(minutos).padStart(2, "0")}:${String(segundos).padStart(2, "0")}`;
}

function dataBrasilISO(data: Date | string) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO_BRASIL,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(data));

  const ano = partes.find((parte) => parte.type === "year")?.value;
  const mes = partes.find((parte) => parte.type === "month")?.value;
  const dia = partes.find((parte) => parte.type === "day")?.value;

  return `${ano}-${mes}-${dia}`;
}

function dataDaTele(tele: Tele) {
  if (tele.dataTele) {
    return dataBrasilISO(tele.dataTele);
  }

  if (tele.createdAt) {
    return dataBrasilISO(tele.createdAt);
  }

  if (tele.criadoEm) {
    const parteData = tele.criadoEm.split(",")[0]?.trim();
    const [dia, mes, ano] = parteData.split("/");

    if (dia && mes && ano) {
      return `${ano}-${mes}-${dia}`;
    }
  }

  return "";
}

function inicioDaSemanaISO(dataISO: string) {
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  const data = new Date(ano, mes - 1, dia);
  const diaSemana = data.getDay();

  data.setDate(data.getDate() - diaSemana);

  return montarISO(data);
}

function fimDaSemanaISO(dataISO: string) {
  const [ano, mes, dia] = dataISO.split("-").map(Number);
  const data = new Date(ano, mes - 1, dia);
  const diaSemana = data.getDay();

  data.setDate(data.getDate() + (6 - diaSemana));

  return montarISO(data);
}

function montarISO(data: Date) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function ordenarTelesPorFila(a: Tele, b: Tele) {
  if (a.statusAceite === "ACEITA" && b.statusAceite === "ACEITA") {
    const ordemA = a.posicaoNaFila ?? a.ordemMotoboy ?? Number.MAX_SAFE_INTEGER;
    const ordemB = b.posicaoNaFila ?? b.ordemMotoboy ?? Number.MAX_SAFE_INTEGER;

    if (ordemA !== ordemB) {
      return ordemA - ordemB;
    }
  }

  const atribuicaoA = new Date(a.atribuidaAoMotoboyEm || a.createdAt || 0).getTime();
  const atribuicaoB = new Date(b.atribuidaAoMotoboyEm || b.createdAt || 0).getTime();

  return atribuicaoA - atribuicaoB;
}

function ordenarTeles(a: Tele, b: Tele) {
  const dataA = new Date(a.dataTele || a.createdAt || 0).getTime();
  const dataB = new Date(b.dataTele || b.createdAt || 0).getTime();

  return dataB - dataA;
}

function formatarData(data?: string | null) {
  if (!data) return "Data não informada";

  return new Date(data).toLocaleDateString("pt-BR", {
    timeZone: FUSO_BRASIL,
  });
}

function formatarMoeda(valor: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

function tituloTipoParada(tipo?: string | null) {
  const mapa: Record<string, string> = {
    COLETA: "Coleta",
    ENTREGA: "Entrega",
    RETORNO: "Retorno",
    TROCAR: "Trocar",
    ENTREGA_E_COLETA: "Entrega e coleta",
  };

  return tipo ? mapa[tipo] || tipo : "";
}

function normalizarTexto(valor: string) {
  return String(valor || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function formatarStatus(status: string) {
  const mapa: Record<string, string> = {
    AGUARDANDO_CLIENTE: "Aguardando cliente",
    AGUARDANDO_MOTOBOY: "Aguardando motoboy",
    AGUARDANDO_COLETA: "Aguardando coleta",
    EM_ROTA: "Em rota",
    ENTREGUE: "Entregue",
  };

  return mapa[status] || status;
}

function classeStatus(status: string) {
  const mapa: Record<string, string> = {
    AGUARDANDO_CLIENTE: "bg-amber-100 text-amber-700",
    AGUARDANDO_MOTOBOY: "bg-orange-100 text-orange-700",
    AGUARDANDO_COLETA: "bg-sky-100 text-sky-700",
    EM_ROTA: "bg-blue-100 text-blue-700",
  };

  return mapa[status] || "bg-slate-100 text-slate-700";
}

function obterPosicaoAtual() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      resolve,
      (erro) => {
        reject(new Error(mensagemErroGeolocalizacao(erro)));
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 20000,
      }
    );
  });
}

function mensagemErroGeolocalizacao(erro: GeolocationPositionError) {
  if (erro.code === erro.PERMISSION_DENIED) {
    return "Permissão de localização negada. Libere a localização nas configurações do navegador.";
  }

  if (erro.code === erro.POSITION_UNAVAILABLE) {
    return "O celular não conseguiu determinar sua localização.";
  }

  if (erro.code === erro.TIMEOUT) {
    return "A localização demorou para responder. Tente novamente em um local aberto.";
  }

  return "Não foi possível acessar a localização do celular.";
}

function distanciaEmMetros(
  latitude1: number,
  longitude1: number,
  latitude2: number,
  longitude2: number
) {
  const raioTerra = 6371000;
  const paraRadianos = (valor: number) => (valor * Math.PI) / 180;

  const deltaLatitude = paraRadianos(latitude2 - latitude1);
  const deltaLongitude = paraRadianos(longitude2 - longitude1);

  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(paraRadianos(latitude1)) *
      Math.cos(paraRadianos(latitude2)) *
      Math.sin(deltaLongitude / 2) ** 2;

  return 2 * raioTerra * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatarTempoLocalizacao(data: string) {
  const segundos = Math.max(0, Math.floor((Date.now() - new Date(data).getTime()) / 1000));

  if (segundos < 10) return "agora";
  if (segundos < 60) return `há ${segundos} segundos`;

  const minutos = Math.floor(segundos / 60);

  if (minutos === 1) return "há 1 minuto";
  if (minutos < 60) return `há ${minutos} minutos`;

  return new Date(data).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: FUSO_BRASIL,
  });
}
