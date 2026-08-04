"use client";

import { Capacitor, registerPlugin } from "@capacitor/core";
import {
  Bike,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Download,
  Clock3,
  Loader2,
  LocateFixed,
  LogOut,
  Menu,
  X,
  Home,
  BarChart3,
  MapPin,
  Maximize2,
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
  bateriaSemRestricao: boolean;
  gpsAtivo: boolean;
  servicoAtivo: boolean;
  prontoParaFicarOnline: boolean;
  precisaAbrirConfiguracoes: boolean;
  precisaCorrigirBateria?: boolean;
  precisaAtivarGps?: boolean;
  fabricante?: string;
  modelo?: string;
  versaoAndroid?: string;
  nivelAndroid?: number;
  possuiAtalhoFabricante?: boolean;
  rotuloAtalhoFabricante?: string;
};

type LocalizacaoNativaPlugin = {
  iniciar(): Promise<ResultadoLocalizacaoNativa>;
  parar(): Promise<ResultadoLocalizacaoNativa>;
  pararSomAlerta(): Promise<{ parado: boolean }>;
  verificarPermissoes(): Promise<EstadoPermissoesLocalizacao>;
  abrirConfiguracoesLocalizacao(): Promise<{ aberto: boolean }>;
  abrirConfiguracoesBateria(): Promise<{ aberto: boolean; fallback?: boolean }>;
  abrirConfiguracoesGps(): Promise<{ aberto: boolean }>;
  abrirConfiguracoesNotificacoes(): Promise<{ aberto: boolean }>;
  abrirConfiguracoesFabricante(): Promise<{
    aberto: boolean;
    fabricante?: string;
    fallback?: boolean;
  }>;
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
  distanciaAteColetaKm?: number;
  duracaoAteColetaMin?: number;
  distanciaTotalKm?: number;
  duracaoTotalMin?: number;
  polylineTotal?: string | null;
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
  const [latitudeAtual, setLatitudeAtual] = useState<number | null>(null);
  const [longitudeAtual, setLongitudeAtual] = useState<number | null>(null);
  const [latitudeMapa, setLatitudeMapa] = useState<number | null>(null);
  const [longitudeMapa, setLongitudeMapa] = useState<number | null>(null);
  const [miniMapas, setMiniMapas] = useState<Record<string, EstadoMiniMapa>>({});
  const [permissoesLocalizacao, setPermissoesLocalizacao] =
    useState<EstadoPermissoesLocalizacao | null>(null);
  const [verificandoPermissoes, setVerificandoPermissoes] = useState(false);
  const [abrindoConfiguracoes, setAbrindoConfiguracoes] = useState(false);
  const [abrindoConfiguracoesBateria, setAbrindoConfiguracoesBateria] = useState(false);
  const [abrindoConfiguracoesGps, setAbrindoConfiguracoesGps] = useState(false);
  const [abrindoConfiguracoesNotificacoes, setAbrindoConfiguracoesNotificacoes] =
    useState(false);
  const [abrindoConfiguracoesFabricante, setAbrindoConfiguracoesFabricante] =
    useState(false);
  const [reiniciandoServicoNativo, setReiniciandoServicoNativo] = useState(false);
  const [preparacaoExpandida, setPreparacaoExpandida] = useState(false);
  const [atualizacaoDisponivel, setAtualizacaoDisponivel] =
    useState<VersaoAplicativo | null>(null);
  const [versaoInstalada, setVersaoInstalada] = useState<string | null>(null);
  const [verificandoAtualizacao, setVerificandoAtualizacao] = useState(false);
  const [baixandoAtualizacao, setBaixandoAtualizacao] = useState(false);
  const [erroAtualizacaoApp, setErroAtualizacaoApp] = useState("");
  const [menuAberto, setMenuAberto] = useState(false);
  const [concluidasAberto, setConcluidasAberto] = useState(false);
  const [mapaExpandido, setMapaExpandido] = useState(false);
  const [resumoRotaExpandido, setResumoRotaExpandido] = useState(false);

  const watchIdRef = useRef<number | null>(null);
  const ultimaPosicaoRef = useRef<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const ultimoEnvioEmRef = useRef(0);
  const coordenadasRecentesMapaRef = useRef<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const ultimaAtualizacaoVisualMapaEmRef = useRef(0);
  const timerAtualizacaoVisualMapaRef = useRef<number | null>(null);
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

  async function abrirConfiguracoesDaBateria() {
    if (!executandoNoAppAndroid() || abrindoConfiguracoesBateria) {
      return;
    }

    setAbrindoConfiguracoesBateria(true);
    setErroLocalizacao("");

    try {
      await LocalizacaoNativa.abrirConfiguracoesBateria();
    } catch (erroConfiguracoes) {
      setErroLocalizacao(
        erroConfiguracoes instanceof Error
          ? erroConfiguracoes.message
          : "Não foi possível abrir as configurações de bateria."
      );
    } finally {
      setAbrindoConfiguracoesBateria(false);
    }
  }

  async function abrirConfiguracoesDoGps() {
    if (!executandoNoAppAndroid() || abrindoConfiguracoesGps) {
      return;
    }

    setAbrindoConfiguracoesGps(true);
    setErroLocalizacao("");

    try {
      await LocalizacaoNativa.abrirConfiguracoesGps();
    } catch (erroConfiguracoes) {
      setErroLocalizacao(
        erroConfiguracoes instanceof Error
          ? erroConfiguracoes.message
          : "Não foi possível abrir as configurações de GPS."
      );
    } finally {
      setAbrindoConfiguracoesGps(false);
    }
  }

  async function abrirConfiguracoesDasNotificacoes() {
    if (!executandoNoAppAndroid() || abrindoConfiguracoesNotificacoes) {
      return;
    }

    setAbrindoConfiguracoesNotificacoes(true);
    setErroLocalizacao("");

    try {
      await LocalizacaoNativa.abrirConfiguracoesNotificacoes();
    } catch (erroConfiguracoes) {
      setErroLocalizacao(
        erroConfiguracoes instanceof Error
          ? erroConfiguracoes.message
          : "Não foi possível abrir as configurações de notificações."
      );
    } finally {
      setAbrindoConfiguracoesNotificacoes(false);
    }
  }

  async function abrirConfiguracoesEspeciaisDoFabricante() {
    if (!executandoNoAppAndroid() || abrindoConfiguracoesFabricante) {
      return;
    }

    setAbrindoConfiguracoesFabricante(true);
    setErroLocalizacao("");

    try {
      await LocalizacaoNativa.abrirConfiguracoesFabricante();
    } catch (erroConfiguracoes) {
      setErroLocalizacao(
        erroConfiguracoes instanceof Error
          ? erroConfiguracoes.message
          : "Não foi possível abrir as configurações especiais do aparelho."
      );
    } finally {
      setAbrindoConfiguracoesFabricante(false);
    }
  }

  async function reiniciarServicoNativo() {
    if (
      !executandoNoAppAndroid() ||
      reiniciandoServicoNativo ||
      !online
    ) {
      return;
    }

    setReiniciandoServicoNativo(true);
    setErroLocalizacao("");

    try {
      await LocalizacaoNativa.parar();
      await LocalizacaoNativa.iniciar();
      await verificarPermissoesLocalizacao();
    } catch (erroServico) {
      setErroLocalizacao(
        erroServico instanceof Error
          ? erroServico.message
          : "Não foi possível reiniciar o serviço nativo."
      );
    } finally {
      setReiniciandoServicoNativo(false);
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
    if (latitudeAtual === null || longitudeAtual === null) {
      coordenadasRecentesMapaRef.current = null;
      ultimaAtualizacaoVisualMapaEmRef.current = 0;

      if (timerAtualizacaoVisualMapaRef.current !== null) {
        window.clearTimeout(timerAtualizacaoVisualMapaRef.current);
        timerAtualizacaoVisualMapaRef.current = null;
      }

      setLatitudeMapa(null);
      setLongitudeMapa(null);
      return;
    }

    coordenadasRecentesMapaRef.current = {
      latitude: latitudeAtual,
      longitude: longitudeAtual,
    };

    const atualizarMapa = () => {
      const coordenadas = coordenadasRecentesMapaRef.current;

      if (!coordenadas) {
        return;
      }

      setLatitudeMapa(coordenadas.latitude);
      setLongitudeMapa(coordenadas.longitude);
      ultimaAtualizacaoVisualMapaEmRef.current = Date.now();
      timerAtualizacaoVisualMapaRef.current = null;
    };

    if (ultimaAtualizacaoVisualMapaEmRef.current === 0) {
      atualizarMapa();
      return;
    }

    if (timerAtualizacaoVisualMapaRef.current !== null) {
      return;
    }

    const tempoDecorrido =
      Date.now() - ultimaAtualizacaoVisualMapaEmRef.current;
    const tempoRestante = Math.max(30000 - tempoDecorrido, 0);

    if (tempoRestante === 0) {
      atualizarMapa();
      return;
    }

    timerAtualizacaoVisualMapaRef.current = window.setTimeout(
      atualizarMapa,
      tempoRestante
    );
  }, [latitudeAtual, longitudeAtual]);

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

      if (timerAtualizacaoVisualMapaRef.current !== null) {
        window.clearTimeout(timerAtualizacaoVisualMapaRef.current);
        timerAtualizacaoVisualMapaRef.current = null;
      }

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
    const paradasValidas = Array.isArray(tele.paradas)
      ? [...tele.paradas]
          .sort((a, b) => Number(a.ordem || 0) - Number(b.ordem || 0))
          .filter((parada) => String(parada.endereco || "").trim())
      : [];

    if (paradasValidas.length < 2) {
      const chaveSemRota = `${tele.id}-sem-rota`;

      if (miniMapasConsultadosRef.current.has(chaveSemRota)) {
        return;
      }

      miniMapasConsultadosRef.current.add(chaveSemRota);

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

    const latitudeChave =
      latitudeAtual !== null ? latitudeAtual.toFixed(3) : "sem-latitude";
    const longitudeChave =
      longitudeAtual !== null ? longitudeAtual.toFixed(3) : "sem-longitude";
    const chaveConsulta = `${tele.id}-${latitudeChave}-${longitudeChave}`;

    if (miniMapasConsultadosRef.current.has(chaveConsulta)) {
      return;
    }

    miniMapasConsultadosRef.current.add(chaveConsulta);

    setMiniMapas((atuais) => ({
      ...atuais,
      [tele.id]: {
        carregando: true,
        erro: null,
        resultado: atuais[tele.id]?.resultado || null,
      },
    }));

    try {
      const temRetorno = paradasValidas.some((parada) =>
        ["TROCAR", "ENTREGA_E_COLETA", "RETORNO"].includes(
          String(parada.tipo || "").toUpperCase()
        )
      );

      const paradasParaCalculo = paradasValidas.filter(
        (parada) => String(parada.tipo || "").toUpperCase() !== "RETORNO"
      );

      async function calcularRota(enderecos: string[], retorno: boolean) {
        const resposta = await fetch("/api/maps/calcular-rota", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            paradas: enderecos.map((endereco) => ({
              endereco,
            })),
            temRetorno: retorno,
          }),
        });

        if (!resposta.ok) {
          let mensagem = "Não foi possível calcular a rota.";

          try {
            const dadosErro = await resposta.json();
            mensagem = dadosErro?.erro || mensagem;
          } catch {}

          throw new Error(mensagem);
        }

        return (await resposta.json()) as ResultadoMiniMapa;
      }

      const enderecosTele = paradasParaCalculo.map((parada) =>
        String(parada.endereco || "").trim()
      );

      const rotaTele = await calcularRota(enderecosTele, temRetorno);

      let rotaTotal: ResultadoMiniMapa | null = null;

      if (latitudeAtual !== null && longitudeAtual !== null) {
        rotaTotal = await calcularRota(
          [`${latitudeAtual},${longitudeAtual}`, ...enderecosTele],
          temRetorno
        );
      }

      const distanciaTele = Number(rotaTele.distanciaKm || 0);
      const duracaoTele = Number(rotaTele.duracaoMin || 0);
      const distanciaTotal = rotaTotal
        ? Number(rotaTotal.distanciaKm || 0)
        : distanciaTele;
      const duracaoTotal = rotaTotal
        ? Number(rotaTotal.duracaoMin || 0)
        : duracaoTele;

      setMiniMapas((atuais) => ({
        ...atuais,
        [tele.id]: {
          carregando: false,
          erro: null,
          resultado: {
            distanciaKm: distanciaTele,
            duracaoMin: duracaoTele,
            polyline: rotaTele.polyline || null,
            distanciaAteColetaKm: Math.max(distanciaTotal - distanciaTele, 0),
            duracaoAteColetaMin: Math.max(duracaoTotal - duracaoTele, 0),
            distanciaTotalKm: distanciaTotal,
            duracaoTotalMin: duracaoTotal,
            polylineTotal: rotaTotal?.polyline || rotaTele.polyline || null,
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
              : "Não foi possível carregar a rota da tele.",
          resultado: atuais[tele.id]?.resultado || null,
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
      setLatitudeAtual(typeof presenca.latitude === "number" ? presenca.latitude : null);
      setLongitudeAtual(typeof presenca.longitude === "number" ? presenca.longitude : null);

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
    setLatitudeAtual(posicao.coords.latitude);
    setLongitudeAtual(posicao.coords.longitude);

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
      setLocalizacaoAtualizadaEm(null);
      setLatitudeAtual(null);
      setLongitudeAtual(null);
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

  const entregasAndamento = useMemo(
    () =>
      teles
        .filter((tele) => tele.statusAceite === "ACEITA" && tele.status !== "ENTREGUE")
        .sort(ordenarTelesPorFila),
    [teles]
  );

  useEffect(() => {
    const telesComRota = [...telesAguardandoAceite, ...entregasAndamento];

    for (const tele of telesComRota) {
      void carregarMiniMapa(tele);
    }
  }, [
    telesAguardandoAceite,
    entregasAndamento,
    latitudeAtual,
    longitudeAtual,
  ]);

  const entregasConcluidas = useMemo(
    () =>
      telesHoje
        .filter((tele) => tele.statusAceite === "ACEITA" && tele.status === "ENTREGUE")
        .sort(ordenarTeles),
    [telesHoje]
  );

  const preparacaoCompleta =
    permissoesLocalizacao !== null &&
    permissoesLocalizacao.localizacaoDuranteUso &&
    permissoesLocalizacao.localizacaoSegundoPlano &&
    permissoesLocalizacao.notificacoes &&
    permissoesLocalizacao.gpsAtivo &&
    permissoesLocalizacao.bateriaSemRestricao &&
    (!online || permissoesLocalizacao.servicoAtivo);

  const teleDestaqueMapa =
    telesAguardandoAceite[0] ||
    entregasAndamento.find((tele) => tele.rotaAtiva) ||
    entregasAndamento[0] ||
    null;

  const rotaDestaqueMapa = teleDestaqueMapa
    ? miniMapas[teleDestaqueMapa.id]?.resultado || null
    : null;

  const polylineDestaqueMapa =
    rotaDestaqueMapa?.polylineTotal || rotaDestaqueMapa?.polyline || null;

  const teleRotaAtivaMapa =
    entregasAndamento.find((tele) => tele.rotaAtiva) ||
    entregasAndamento[0] ||
    null;

  const enderecosPendentesRotaAtivaMapa = useMemo(() => {
    if (!teleRotaAtivaMapa) {
      return [];
    }

    const paradas = Array.isArray(teleRotaAtivaMapa.paradas)
      ? [...teleRotaAtivaMapa.paradas].sort(
          (a, b) => Number(a.ordem || 0) - Number(b.ordem || 0)
        )
      : [];

    const indiceAtual = Math.max(
      0,
      Math.min(
        Number(teleRotaAtivaMapa.paradaAtualMotoboy || 0),
        Math.max(paradas.length - 1, 0)
      )
    );

    return paradas
      .slice(indiceAtual)
      .map((parada) => String(parada.endereco || "").trim())
      .filter(Boolean);
  }, [teleRotaAtivaMapa]);

  const mapaRotaDinamicaSrc =
    teleRotaAtivaMapa &&
    enderecosPendentesRotaAtivaMapa.length > 0 &&
    latitudeMapa !== null &&
    longitudeMapa !== null
      ? `https://maps.google.com/maps?saddr=${encodeURIComponent(
          `${latitudeMapa},${longitudeMapa}`
        )}&daddr=${enderecosPendentesRotaAtivaMapa
          .map((endereco) => encodeURIComponent(endereco))
          .join("+to:")}&dirflg=d&output=embed`
      : null;

  const urlRotaCompletaGoogleMaps =
    teleRotaAtivaMapa &&
    enderecosPendentesRotaAtivaMapa.length > 0 &&
    latitudeAtual !== null &&
    longitudeAtual !== null
      ? (() => {
          const origem = encodeURIComponent(`${latitudeAtual},${longitudeAtual}`);
          const destino = encodeURIComponent(
            enderecosPendentesRotaAtivaMapa[
              enderecosPendentesRotaAtivaMapa.length - 1
            ]
          );
          const pontosIntermediarios = enderecosPendentesRotaAtivaMapa
            .slice(0, -1)
            .map((endereco) => encodeURIComponent(endereco))
            .join("%7C");

          return `https://www.google.com/maps/dir/?api=1&origin=${origem}&destination=${destino}${
            pontosIntermediarios ? `&waypoints=${pontosIntermediarios}` : ""
          }&travelmode=driving`;
        })()
      : null;

  const mapaLocalizacaoSrc =
    latitudeMapa !== null && longitudeMapa !== null
      ? `https://maps.google.com/maps?q=${latitudeMapa},${longitudeMapa}&z=16&output=embed`
      : null;

  const segundosSemAtualizacao = useMemo(() => {
    if (!localizacaoAtualizadaEm) {
      return null;
    }

    const instante = new Date(localizacaoAtualizadaEm).getTime();

    if (!Number.isFinite(instante)) {
      return null;
    }

    return Math.max(0, Math.round((Date.now() - instante) / 1000));
  }, [localizacaoAtualizadaEm, online, atualizando, teles.length]);

  const statusPainel = useMemo(() => {
    const semAtualizacaoRecente =
      segundosSemAtualizacao !== null && segundosSemAtualizacao > 120;

    const precisaoRuim =
      precisaoLocalizacao !== null &&
      Number.isFinite(precisaoLocalizacao) &&
      precisaoLocalizacao > 80;

    if (!online) {
      return {
        tipo: "OFFLINE" as const,
        rotulo: "Offline",
        subtitulo: "Indisponível",
        descricao:
          "Ative seu status para compartilhar sua localização e receber teles com mais rapidez.",
        badgeClasse: "bg-slate-100 text-slate-700",
        painelClasse: "border-slate-200 bg-white",
        iconeClasse: "bg-slate-100 text-slate-500",
      };
    }

    if (semAtualizacaoRecente || precisaoRuim) {
      return {
        tipo: "REDE_RUIM" as const,
        rotulo: "Rede ruim",
        subtitulo: "Atenção",
        descricao:
          "Sua localização está ativa, mas o sinal ou a precisão não estão ideais no momento.",
        badgeClasse: "bg-amber-100 text-amber-700",
        painelClasse: "border-amber-200 bg-amber-50",
        iconeClasse: "bg-amber-500 text-white",
      };
    }

    return {
      tipo: "ONLINE" as const,
      rotulo: "Online",
      subtitulo: "Disponível",
      descricao:
        "Seu app está pronto para receber teles e compartilhar sua localização com o gestor.",
      badgeClasse: "bg-emerald-100 text-emerald-700",
      painelClasse: "border-emerald-200 bg-emerald-50",
      iconeClasse: "bg-emerald-600 text-white",
    };
  }, [online, precisaoLocalizacao, segundosSemAtualizacao]);

  useEffect(() => {
    if (!permissoesLocalizacao) {
      return;
    }

    setPreparacaoExpandida(!preparacaoCompleta);
  }, [permissoesLocalizacao, preparacaoCompleta]);

  function fecharMenu() {
    setMenuAberto(false);
  }

  function abrirEntregasConcluidas() {
    fecharMenu();
    setConcluidasAberto(true);
  }

  useEffect(() => {
    if (
      !menuAberto &&
      !concluidasAberto &&
      !mapaExpandido &&
      telesAguardandoAceite.length === 0
    ) {
      return;
    }

    const fecharComEscape = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") {
        fecharMenu();
      }
    };

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", fecharComEscape);

    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", fecharComEscape);
    };
  }, [
    menuAberto,
    concluidasAberto,
    mapaExpandido,
    telesAguardandoAceite.length,
  ]);

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
    <main className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-50 px-0 py-0 sm:px-6 sm:py-7">
      <div className="mx-auto w-full min-w-0 max-w-6xl overflow-x-hidden">
        <header className="bg-slate-950 text-white shadow-lg sm:rounded-3xl">
          <div className="relative px-4 pb-4 pt-[calc(env(safe-area-inset-top)+14px)] sm:p-7">
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-500/20 blur-3xl" />

            <div className="relative flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-slate-950 sm:h-14 sm:w-14">
                  <Bike size={24} />
                </div>

                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                    Express Manager
                  </p>
                  <h1 className="truncate text-lg font-bold sm:text-3xl">
                    Olá, {usuario?.nome || "Motoboy"}
                  </h1>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => void carregarDados(true)}
                  disabled={atualizando || Boolean(teleAtualizando)}
                  aria-label="Atualizar painel"
                  title="Atualizar"
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white transition hover:bg-white/15 disabled:opacity-60"
                >
                  <RefreshCw size={19} className={atualizando ? "animate-spin" : ""} />
                </button>

                <button
                  type="button"
                  onClick={() => setMenuAberto(true)}
                  aria-label="Abrir menu"
                  title="Menu"
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white transition hover:bg-white/15"
                >
                  <Menu size={20} />
                </button>
              </div>
            </div>
          </div>
        </header>

        {telesAguardandoAceite[0] && (
          <PainelAceiteTele
            tele={telesAguardandoAceite[0]}
            miniMapa={miniMapas[telesAguardandoAceite[0].id]}
            atualizando={teleAtualizando === telesAguardandoAceite[0].id}
            bloqueado={Boolean(teleAtualizando)}
            latitudeAtual={latitudeMapa}
            longitudeAtual={longitudeMapa}
            onAceitar={() =>
              void responderAceite(telesAguardandoAceite[0], "ACEITAR")
            }
            onRecusar={() =>
              void responderAceite(telesAguardandoAceite[0], "RECUSAR")
            }
          />
        )}

        {mapaExpandido && (
          <div className="fixed inset-0 z-[190] flex flex-col bg-slate-950">
            <header className="flex items-center justify-between gap-3 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+12px)] text-white">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">
                  Mapa da operação
                </p>
                <h2 className="mt-1 truncate text-base font-bold">
                  {teleRotaAtivaMapa?.solicitante || "Sua localização atual"}
                </h2>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {urlRotaCompletaGoogleMaps && (
                  <button
                    type="button"
                    onClick={() => {
                      window.location.href = urlRotaCompletaGoogleMaps;
                    }}
                    aria-label="Abrir rota completa no Google Maps"
                    title="Abrir no Google Maps"
                    className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-3 text-xs font-bold"
                  >
                    <Route size={18} />
                    Google Maps
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setMapaExpandido(false)}
                  aria-label="Fechar mapa ampliado"
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/15 bg-white/10"
                >
                  <X size={21} />
                </button>
              </div>
            </header>

            <div className="relative min-h-0 flex-1 bg-slate-200">
              {mapaRotaDinamicaSrc ? (
                <iframe
                  title="Mapa ampliado da rota ativa"
                  src={mapaRotaDinamicaSrc}
                  className="pointer-events-auto h-full w-full border-0"
                  style={{ touchAction: "pan-x pan-y pinch-zoom" }}
                  loading="eager"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : mapaLocalizacaoSrc ? (
                <iframe
                  title="Mapa ampliado da localização"
                  src={mapaLocalizacaoSrc}
                  className="pointer-events-auto h-full w-full border-0"
                  style={{ touchAction: "pan-x pan-y pinch-zoom" }}
                  loading="eager"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : polylineDestaqueMapa ? (
                <img
                  src={`/api/maps/imagem-rota?polyline=${encodeURIComponent(
                    polylineDestaqueMapa
                  )}&versao=mapa-ampliado-operacional-1`}
                  alt="Rota ampliada"
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex h-full items-center justify-center px-6 text-center text-slate-600">
                  A localização ainda não está disponível.
                </div>
              )}
            </div>

            <div className="bg-slate-950 px-4 pb-[calc(env(safe-area-inset-bottom)+14px)] pt-3">
              <p className="text-center text-xs leading-5 text-slate-300">
                Arraste o mapa e use dois dedos para aproximar ou afastar.
              </p>
            </div>
          </div>
        )}

        {menuAberto && (
          <div className="fixed inset-0 z-[100]">
            <button
              type="button"
              aria-label="Fechar menu"
              onClick={fecharMenu}
              className="absolute inset-0 bg-slate-950/55 backdrop-blur-[2px]"
            />

            <aside className="absolute bottom-0 right-0 top-0 flex w-[86%] max-w-sm flex-col bg-white shadow-2xl">
              <div className="bg-slate-950 px-5 pb-5 pt-[calc(env(safe-area-inset-top)+18px)] text-white">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-slate-950">
                      <Bike size={24} />
                    </div>

                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                        Express Manager
                      </p>
                      <h2 className="truncate text-lg font-bold">
                        {usuario?.nome || "Motoboy"}
                      </h2>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={fecharMenu}
                    aria-label="Fechar menu"
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="mt-5 flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3">
                  <div>
                    <p className="text-xs text-slate-300">Status atual</p>
                    <strong className="mt-1 block text-sm">
                      {statusPainel.rotulo} • {statusPainel.subtitulo}
                    </strong>
                  </div>

                  <span
                    className={`h-3 w-3 rounded-full ${
                      statusPainel.tipo === "ONLINE"
                        ? "bg-emerald-400"
                        : statusPainel.tipo === "REDE_RUIM"
                          ? "bg-amber-400"
                          : "bg-slate-400"
                    }`}
                  />
                </div>
              </div>

              <nav className="flex-1 overflow-y-auto p-4">
                <button
                  type="button"
                  onClick={fecharMenu}
                  className="flex w-full items-center gap-3 rounded-2xl bg-emerald-50 px-4 py-4 text-left font-semibold text-emerald-800"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                    <Home size={19} />
                  </span>
                  Início
                </button>

                <Link
                  href="/motoboy/minha-operacao"
                  onClick={fecharMenu}
                  className="mt-2 flex items-center gap-3 rounded-2xl px-4 py-4 font-semibold text-slate-800 transition hover:bg-slate-50"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                    <CircleDollarSign size={19} />
                  </span>
                  Minha operação
                </Link>

                <Link
                  href="/motoboy/extrato"
                  onClick={fecharMenu}
                  className="mt-2 flex items-center gap-3 rounded-2xl px-4 py-4 font-semibold text-slate-800 transition hover:bg-slate-50"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                    <WalletCards size={19} />
                  </span>
                  Extrato
                </Link>

                <Link
                  href="/motoboy/relatorio-operacao"
                  onClick={fecharMenu}
                  className="mt-2 flex items-center gap-3 rounded-2xl px-4 py-4 font-semibold text-slate-800 transition hover:bg-slate-50"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                    <BarChart3 size={19} />
                  </span>
                  Relatório da operação
                </Link>

                <button
                  type="button"
                  onClick={abrirEntregasConcluidas}
                  className="mt-2 flex w-full items-center gap-3 rounded-2xl px-4 py-4 text-left font-semibold text-slate-800 transition hover:bg-slate-50"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <CheckCircle2 size={19} />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block">Entregas concluídas</span>
                    <span className="mt-0.5 block text-xs font-normal text-slate-500">
                      {entregasConcluidas.length} hoje
                    </span>
                  </span>

                  <ChevronRight size={18} className="text-slate-400" />
                </button>

                <div className="my-4 border-t border-slate-100" />

                <button
                  type="button"
                  onClick={() => {
                    fecharMenu();
                    void carregarDados(true);
                  }}
                  disabled={atualizando || Boolean(teleAtualizando)}
                  className="flex w-full items-center gap-3 rounded-2xl px-4 py-4 text-left font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                    <RefreshCw
                      size={19}
                      className={atualizando ? "animate-spin" : ""}
                    />
                  </span>
                  Atualizar painel
                </button>
              </nav>

              <div className="border-t border-slate-100 p-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
                <button
                  type="button"
                  onClick={() => void sair()}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-red-50 font-semibold text-red-700 transition hover:bg-red-100"
                >
                  <LogOut size={18} />
                  Sair do aplicativo
                </button>
              </div>
            </aside>
          </div>
        )}

        {concluidasAberto && (
          <div className="fixed inset-0 z-[110] flex flex-col bg-slate-50">
            <header className="bg-slate-950 px-4 pb-4 pt-[calc(env(safe-area-inset-top)+14px)] text-white shadow-lg">
              <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500 text-slate-950">
                    <CheckCircle2 size={22} />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
                      Histórico de hoje
                    </p>
                    <h2 className="truncate text-lg font-bold">
                      Entregas concluídas
                    </h2>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setConcluidasAberto(false)}
                  aria-label="Fechar entregas concluídas"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-white"
                >
                  <X size={20} />
                </button>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-5 pb-[calc(env(safe-area-inset-bottom)+24px)]">
              <div className="mx-auto w-full max-w-4xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
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
              </div>
            </div>
          </div>
        )}

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

        {executandoNoAppAndroid() && permissoesLocalizacao && (
          preparacaoCompleta && !preparacaoExpandida ? (
            <section className="mt-5 hidden overflow-hidden rounded-3xl border border-emerald-300 bg-emerald-50 shadow-sm sm:block">
              <button
                type="button"
                onClick={() => setPreparacaoExpandida(true)}
                className="flex w-full items-center justify-between gap-4 p-4 text-left sm:p-5"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white">
                    <CheckCircle2 size={22} />
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                      Preparação obrigatória
                    </p>
                    <h2 className="mt-1 font-bold text-slate-900">
                      Celular preparado para operar
                    </h2>
                  </div>
                </div>

                <span className="flex shrink-0 items-center gap-1.5 text-sm font-semibold text-emerald-700">
                  Ver detalhes
                  <ChevronDown size={18} />
                </span>
              </button>
            </section>
          ) : (
          <section
            className={`mt-5 overflow-hidden rounded-3xl border shadow-sm ${
              permissoesLocalizacao.prontoParaFicarOnline
                ? "border-emerald-300 bg-emerald-50"
                : "border-amber-300 bg-amber-50"
            }`}
          >
            <div className="p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                    permissoesLocalizacao.prontoParaFicarOnline
                      ? "bg-emerald-600 text-white"
                      : "bg-amber-500 text-white"
                  }`}
                >
                  {permissoesLocalizacao.prontoParaFicarOnline ? (
                    <CheckCircle2 size={23} />
                  ) : (
                    <LocateFixed size={23} />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm font-semibold ${
                      permissoesLocalizacao.prontoParaFicarOnline
                        ? "text-emerald-700"
                        : "text-amber-700"
                    }`}
                  >
                    Preparação obrigatória
                  </p>

                  <h2 className="mt-1 text-xl font-bold text-slate-900">
                    {permissoesLocalizacao.prontoParaFicarOnline
                      ? "Celular preparado para operar"
                      : "Conclua as configurações abaixo"}
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    O Express Manager precisa dessas permissões para receber teles e continuar
                    enviando a localização com o aplicativo minimizado ou com a tela bloqueada.
                  </p>

                  {preparacaoCompleta && (
                    <button
                      type="button"
                      onClick={() => setPreparacaoExpandida(false)}
                      className="mt-4 flex h-10 items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-white px-4 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-50"
                    >
                      Recolher detalhes
                      <ChevronDown size={17} className="rotate-180" />
                    </button>
                  )}

                  {(permissoesLocalizacao.fabricante ||
                    permissoesLocalizacao.modelo ||
                    permissoesLocalizacao.versaoAndroid) && (
                    <div className="mt-4 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-xs text-slate-600">
                      <strong className="text-slate-800">Aparelho identificado:</strong>{" "}
                      {[permissoesLocalizacao.fabricante, permissoesLocalizacao.modelo]
                        .filter(Boolean)
                        .join(" ")}
                      {permissoesLocalizacao.versaoAndroid
                        ? ` • Android ${permissoesLocalizacao.versaoAndroid}`
                        : ""}
                    </div>
                  )}

                  <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <ItemPreparacao
                      pronto={permissoesLocalizacao.localizacaoDuranteUso}
                      titulo="Localização"
                      descricao="Acesso durante o uso"
                      acaoRotulo="Abrir permissão"
                      onAcao={() => void abrirConfiguracoesDaLocalizacao()}
                      carregando={abrindoConfiguracoes}
                    />
                    <ItemPreparacao
                      pronto={permissoesLocalizacao.localizacaoSegundoPlano}
                      titulo="Segundo plano"
                      descricao='Selecionar "Permitir o tempo todo"'
                      acaoRotulo="Abrir permissão"
                      onAcao={() => void abrirConfiguracoesDaLocalizacao()}
                      carregando={abrindoConfiguracoes}
                    />
                    <ItemPreparacao
                      pronto={permissoesLocalizacao.notificacoes}
                      titulo="Notificações"
                      descricao="Avisos e serviço permanente"
                      acaoRotulo="Abrir notificações"
                      onAcao={() => void abrirConfiguracoesDasNotificacoes()}
                      carregando={abrindoConfiguracoesNotificacoes}
                    />
                    <ItemPreparacao
                      pronto={permissoesLocalizacao.gpsAtivo}
                      titulo="GPS"
                      descricao="Localização do aparelho ligada"
                      acaoRotulo="Ativar GPS"
                      onAcao={() => void abrirConfiguracoesDoGps()}
                      carregando={abrindoConfiguracoesGps}
                    />
                    <ItemPreparacao
                      pronto={permissoesLocalizacao.bateriaSemRestricao}
                      titulo="Bateria"
                      descricao="Express Manager sem otimização"
                      acaoRotulo="Liberar bateria"
                      onAcao={() => void abrirConfiguracoesDaBateria()}
                      carregando={abrindoConfiguracoesBateria}
                    />
                    <ItemPreparacao
                      pronto={online ? permissoesLocalizacao.servicoAtivo : true}
                      titulo="Serviço nativo"
                      descricao={online ? "Executando em primeiro plano" : "Inicia ao ficar online"}
                      acaoRotulo="Reiniciar serviço"
                      onAcao={() => void reiniciarServicoNativo()}
                      carregando={reiniciandoServicoNativo}
                      ocultarAcao={!online}
                    />
                  </div>

                  {!permissoesLocalizacao.prontoParaFicarOnline && (
                    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                      {(!permissoesLocalizacao.localizacaoDuranteUso ||
                        !permissoesLocalizacao.localizacaoSegundoPlano ||
                        !permissoesLocalizacao.notificacoes) && (
                        <button
                          type="button"
                          onClick={() => void abrirConfiguracoesDaLocalizacao()}
                          disabled={abrindoConfiguracoes}
                          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                        >
                          {abrindoConfiguracoes ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <LocateFixed size={18} />
                          )}
                          Corrigir permissões
                        </button>
                      )}

                      {!permissoesLocalizacao.bateriaSemRestricao && (
                        <button
                          type="button"
                          onClick={() => void abrirConfiguracoesDaBateria()}
                          disabled={abrindoConfiguracoesBateria}
                          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 font-semibold text-white transition hover:bg-amber-600 disabled:opacity-60"
                        >
                          {abrindoConfiguracoesBateria ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <Clock3 size={18} />
                          )}
                          Liberar bateria
                        </button>
                      )}

                      {!permissoesLocalizacao.gpsAtivo && (
                        <button
                          type="button"
                          onClick={() => void abrirConfiguracoesDoGps()}
                          disabled={abrindoConfiguracoesGps}
                          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                        >
                          {abrindoConfiguracoesGps ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <MapPin size={18} />
                          )}
                          Ativar GPS
                        </button>
                      )}

                      {permissoesLocalizacao.possuiAtalhoFabricante && (
                        <button
                          type="button"
                          onClick={() => void abrirConfiguracoesEspeciaisDoFabricante()}
                          disabled={abrindoConfiguracoesFabricante}
                          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60"
                        >
                          {abrindoConfiguracoesFabricante ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <RefreshCw size={18} />
                          )}
                          {permissoesLocalizacao.rotuloAtalhoFabricante ||
                            "Configuração especial"}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => void verificarPermissoesLocalizacao()}
                        disabled={verificandoPermissoes}
                        className="flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                      >
                        <RefreshCw
                          size={18}
                          className={verificandoPermissoes ? "animate-spin" : ""}
                        />
                        Verificar novamente
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
          )
        )}

        <section className="sm:mt-5">
          <div className="border-y border-slate-200 bg-white px-3 py-2.5 shadow-sm sm:rounded-3xl sm:border sm:px-4">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${statusPainel.iconeClasse}`}
              >
                {statusPainel.tipo === "OFFLINE" ? (
                  <WifiOff size={21} />
                ) : (
                  <Wifi size={21} />
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                  <strong className="truncate text-sm text-slate-900 sm:text-base">
                    {statusPainel.rotulo}
                  </strong>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusPainel.badgeClasse}`}
                  >
                    {statusPainel.subtitulo}
                  </span>
                </div>

                <p className="mt-1 truncate text-xs text-slate-500">
                  {localizacaoAtualizadaEm
                    ? `Localização ${formatarTempoLocalizacao(localizacaoAtualizadaEm)}`
                    : "Aguardando localização"}
                </p>
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
                className={`flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl px-3 text-[11px] font-bold text-white transition disabled:cursor-wait disabled:opacity-60 ${
                  online
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {alterandoPresenca ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : online ? (
                  <WifiOff size={16} />
                ) : (
                  <Wifi size={16} />
                )}
                {online ? "Offline" : "Online"}
              </button>
            </div>

            {statusPainel.tipo === "REDE_RUIM" && (
              <div className="mt-3 rounded-2xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                Sinal ou precisão instáveis. Mantenha GPS e internet ativos.
              </div>
            )}
          </div>

          {teleDestaqueMapa && rotaDestaqueMapa && (
            <div className="border-b border-slate-200 bg-slate-950 text-white sm:mt-3 sm:rounded-2xl sm:border-b-0">
              <button
                type="button"
                onClick={() => setResumoRotaExpandido((aberto) => !aberto)}
                className="flex w-full min-w-0 items-center justify-between gap-3 px-4 py-2.5 text-left"
              >
                <div className="min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-300">
                    {telesAguardandoAceite.some(
                      (tele) => tele.id === teleDestaqueMapa.id
                    )
                      ? "Nova tele no mapa"
                      : "Rota em andamento"}
                  </p>
                  <p className="mt-0.5 truncate text-sm font-bold">
                    {teleDestaqueMapa.solicitante || "Solicitante não informado"}
                  </p>
                </div>

                <span className="flex shrink-0 items-center gap-1 text-[11px] font-semibold text-slate-200">
                  {resumoRotaExpandido ? "Recolher" : "Ver resumo"}
                  <ChevronDown
                    size={16}
                    className={resumoRotaExpandido ? "rotate-180 transition" : "transition"}
                  />
                </span>
              </button>

              {resumoRotaExpandido && (
                <div className="grid grid-cols-3 gap-2 border-t border-white/10 px-4 py-2.5 text-center">
                  <div>
                    <p className="text-[9px] uppercase tracking-wide text-slate-400">
                      Até coleta
                    </p>
                    <strong className="mt-0.5 block text-xs">
                      {formatarDistancia(
                        rotaDestaqueMapa.distanciaAteColetaKm || 0
                      )}
                    </strong>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-wide text-slate-400">
                      Total
                    </p>
                    <strong className="mt-0.5 block text-xs">
                      {formatarDistancia(
                        rotaDestaqueMapa.distanciaTotalKm ||
                          rotaDestaqueMapa.distanciaKm
                      )}
                    </strong>
                  </div>
                  <div>
                    <p className="text-[9px] uppercase tracking-wide text-slate-400">
                      Tempo
                    </p>
                    <strong className="mt-0.5 block text-xs">
                      {Math.round(
                        rotaDestaqueMapa.duracaoTotalMin ||
                          rotaDestaqueMapa.duracaoMin
                      )} min
                    </strong>
                  </div>
                </div>
              )}
            </div>
          )}

          <article className="w-full min-w-0 max-w-full overflow-hidden border-b border-slate-200 bg-white shadow-sm sm:mt-3 sm:rounded-[2rem] sm:border">
            <div className="relative h-[52svh] min-h-[390px] max-h-[560px] w-full min-w-0 overscroll-contain bg-slate-200 sm:h-[560px] sm:max-h-none">
              {mapaRotaDinamicaSrc ? (
                <iframe
                  key={`${teleRotaAtivaMapa?.id}-${latitudeMapa?.toFixed(5)}-${longitudeMapa?.toFixed(5)}-${enderecosPendentesRotaAtivaMapa.join("|")}`}
                  title="Mapa interativo da rota completa"
                  src={mapaRotaDinamicaSrc}
                  className="pointer-events-auto block h-full w-full min-w-0 max-w-full border-0"
                  style={{ touchAction: "auto" }}
                  tabIndex={0}
                  loading="eager"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : polylineDestaqueMapa ? (
                <img
                  src={`/api/maps/imagem-rota?polyline=${encodeURIComponent(
                    polylineDestaqueMapa
                  )}&versao=mapa-principal-operacional-2`}
                  alt="Rota em destaque no mapa principal"
                  className="block h-full w-full min-w-0 max-w-full object-contain"
                />
              ) : mapaLocalizacaoSrc ? (
                <iframe
                  title="Mapa interativo da sua localização"
                  src={mapaLocalizacaoSrc}
                  className="pointer-events-auto block h-full w-full min-w-0 max-w-full border-0"
                  style={{ touchAction: "auto" }}
                  tabIndex={0}
                  loading="eager"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,_#dcfce7,_#f8fafc_55%)] px-6 text-center">
                  <div className="max-w-sm">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-100 text-emerald-700">
                      <MapPin size={30} />
                    </div>
                    <h2 className="mt-5 text-2xl font-bold text-slate-900">
                      Mapa da sua operação
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-slate-600">
                      Fique online para mostrar sua posição atual e começar a receber teles.
                    </p>
                  </div>
                </div>
              )}

              <button
                type="button"
                onClick={() => setMapaExpandido(true)}
                className="absolute bottom-3 right-3 z-20 flex h-11 items-center justify-center gap-2 rounded-2xl bg-slate-950/95 px-3 text-xs font-bold text-white shadow-xl"
              >
                <Maximize2 size={17} />
                Ampliar
              </button>
            </div>
          </article>

          <div className="grid min-w-0 grid-cols-3 gap-1.5 px-3 pt-2.5 sm:gap-2 sm:px-0">
            <div className="min-w-0 rounded-2xl border border-slate-200 bg-white px-2.5 py-2.5 shadow-sm">
              <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                Aguardando
              </p>
              <strong className="mt-0.5 block text-lg text-slate-900">
                {telesAguardandoAceite.length}
              </strong>
            </div>

            <div className="min-w-0 rounded-2xl border border-slate-200 bg-white px-2.5 py-2.5 shadow-sm">
              <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                Em rota
              </p>
              <strong className="mt-0.5 block text-lg text-slate-900">
                {entregasAndamento.length}
              </strong>
            </div>

            <div className="min-w-0 rounded-2xl border border-slate-200 bg-white px-2.5 py-2.5 shadow-sm">
              <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                Concluídas
              </p>
              <strong className="mt-0.5 block text-lg text-slate-900">
                {entregasConcluidas.length}
              </strong>
            </div>
          </div>

          <div className="mt-2 grid min-w-0 grid-cols-3 gap-1.5 px-3 sm:gap-2 sm:px-0">
            <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm sm:p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                Bruto hoje
              </p>
              <strong className="mt-1 block truncate text-[13px] text-slate-900 sm:text-sm">
                {formatarMoeda(brutoHoje)}
              </strong>
            </div>

            <div className="min-w-0 overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50 p-2.5 shadow-sm sm:p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
                Seu líquido
              </p>
              <strong className="mt-1 block truncate text-[13px] text-emerald-800 sm:text-sm">
                {formatarMoeda(liquidoHoje)}
              </strong>
            </div>

            <div className="min-w-0 overflow-hidden rounded-2xl border border-blue-200 bg-blue-50 p-2.5 shadow-sm sm:p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-600">
                Recebido
              </p>
              <strong className="mt-1 block truncate text-[13px] text-blue-800 sm:text-sm">
                {formatarMoeda(recebidoHoje)}
              </strong>
            </div>
          </div>

          {erroLocalizacao && (
            <div className="mx-4 mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-0">
              {erroLocalizacao}
            </div>
          )}
        </section>
        {erro && (
          <div className="mx-4 mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 sm:mx-0">
            {erro}
          </div>
        )}

        <section className="mt-6 hidden grid-cols-2 gap-4 sm:grid lg:grid-cols-5">
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
          className={`mt-6 hidden overflow-hidden rounded-3xl border shadow-sm sm:block ${
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
          <section className="mx-4 mt-6 overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-sm sm:mx-0 sm:mt-8">
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

        <section className="mx-3 mt-5 min-w-0 max-w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm sm:mx-0 sm:mt-8">
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
                  miniMapa={miniMapas[tele.id]}
                  compacto
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


        <footer className="py-8 text-center text-xs text-slate-400">
          Express Manager • Área do motoboy
        </footer>
      </div>
    </main>
  );
}

function PainelAceiteTele({
  tele,
  miniMapa,
  atualizando,
  bloqueado,
  latitudeAtual,
  longitudeAtual,
  onAceitar,
  onRecusar,
}: {
  tele: Tele;
  miniMapa?: EstadoMiniMapa;
  atualizando: boolean;
  bloqueado: boolean;
  latitudeAtual: number | null;
  longitudeAtual: number | null;
  onAceitar: () => void;
  onRecusar: () => void;
}) {
  const [agora, setAgora] = useState(() => Date.now());

  useEffect(() => {
    const intervalo = window.setInterval(() => {
      setAgora(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalo);
  }, []);

  const segundosRestantes = calcularSegundosRestantesAceite(
    tele.atribuidaAoMotoboyEm,
    agora
  );

  const expirado = segundosRestantes === 0;
  const resultado = miniMapa?.resultado || null;
  const total = Number(tele.total || 0);
  const paradas = Array.isArray(tele.paradas)
    ? [...tele.paradas].sort(
        (a, b) => Number(a.ordem || 0) - Number(b.ordem || 0)
      )
    : [];
  const primeiraParada = paradas[0];

  const enderecosRota = paradas
    .map((parada) => String(parada.endereco || "").trim())
    .filter(Boolean);

  const origemPreview =
    latitudeAtual !== null && longitudeAtual !== null
      ? `${latitudeAtual},${longitudeAtual}`
      : enderecosRota[0] || "";

  const destinoPreview =
    enderecosRota.length > 0
      ? enderecosRota
          .map((endereco) => encodeURIComponent(endereco))
          .join("+to:")
      : "";

  const mapaPreviewSrc =
    origemPreview && destinoPreview
      ? `https://maps.google.com/maps?saddr=${encodeURIComponent(
          origemPreview
        )}&daddr=${destinoPreview}&dirflg=d&output=embed`
      : null;

  return (
    <div className="fixed inset-0 z-[200] flex w-full max-w-full items-start justify-center overflow-hidden bg-slate-950/75 px-2.5 pb-[calc(env(safe-area-inset-bottom)+10px)] pt-[calc(env(safe-area-inset-top)+10px)] backdrop-blur-sm sm:items-center sm:p-6">
      <section className="max-h-[calc(100svh_-_env(safe-area-inset-top)_-_env(safe-area-inset-bottom)_-_20px)] w-full min-w-0 max-w-[calc(100vw-20px)] overflow-x-hidden overflow-y-auto overscroll-contain rounded-[1.75rem] bg-white shadow-2xl sm:max-h-[94vh] sm:max-w-2xl sm:rounded-[2rem]">
        <div className="bg-slate-950 px-4 py-4 text-white sm:px-5 sm:py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-300">
                Nova tele aguardando resposta
              </p>
              <h2 className="mt-1.5 truncate text-xl font-bold sm:mt-2 sm:text-2xl">
                {tele.solicitante || "Solicitante não informado"}
              </h2>
            </div>

            <div
              className={`shrink-0 rounded-2xl px-3 py-2 text-center ${
                segundosRestantes <= 30
                  ? "bg-red-500 text-white"
                  : "bg-white/10 text-white"
              }`}
            >
              <p className="text-[9px] font-bold uppercase tracking-wide text-white/70">
                Responder em
              </p>
              <strong className="mt-1 block text-xl tabular-nums">
                {formatarContagemAceite(segundosRestantes)}
              </strong>
            </div>
          </div>
        </div>

        <div className="p-3.5 sm:p-5">
          <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
              <MapPin size={19} />
            </div>

            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wide text-blue-700">
                Primeira coleta
              </p>
              <p className="mt-1 font-bold text-slate-900">
                {primeiraParada?.cliente ||
                  tituloTipoParada(primeiraParada?.tipo) ||
                  "Coleta"}
              </p>
              <p className="mt-1 break-words text-sm leading-5 text-slate-600">
                {primeiraParada?.endereco || "Endereço não informado"}
              </p>
            </div>
          </div>

          <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-700">
                  Prévia completa da rota
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Sua posição → coleta → entrega
                </p>
              </div>

              <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                Interativo
              </span>
            </div>

            <div className="h-[235px] w-full min-w-0 bg-slate-200 sm:h-[300px]">
              {mapaPreviewSrc ? (
                <iframe
                  title="Prévia interativa da rota antes do aceite"
                  src={mapaPreviewSrc}
                  className="h-full w-full border-0"
                  loading="eager"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : resultado?.polylineTotal || resultado?.polyline ? (
                <img
                  src={`/api/maps/imagem-rota?polyline=${encodeURIComponent(
                    resultado.polylineTotal || resultado.polyline || ""
                  )}&versao=preview-aceite-interativo-1`}
                  alt="Prévia da rota antes do aceite"
                  className="h-full w-full object-contain"
                />
              ) : (
                <div className="flex h-full items-center justify-center px-5 text-center text-sm text-slate-500">
                  A rota será exibida assim que a localização e os endereços estiverem disponíveis.
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 bg-white px-4 py-2.5 text-center text-[11px] leading-4 text-slate-500">
              Arraste o mapa e use dois dedos para analisar todo o percurso antes de responder.
            </div>
          </div>

          {miniMapa?.carregando ? (
            <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
              <Loader2 size={18} className="animate-spin" />
              Calculando distância e tempo...
            </div>
          ) : resultado ? (
            <MetricasRota tele={tele} resultado={resultado} destaque />
          ) : miniMapa?.erro ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-700">
              {miniMapa.erro}
            </div>
          ) : null}

          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Valor da tele
              </p>
              <strong className="mt-1 block text-lg text-slate-900">
                {formatarMoeda(total)}
              </strong>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">
                Seu líquido
              </p>
              <strong className="mt-1 block text-lg text-emerald-800">
                {formatarMoeda(total * 0.8)}
              </strong>
            </div>
          </div>

          <div className="sticky bottom-0 z-20 -mx-3.5 mt-3 grid min-w-0 grid-cols-2 gap-2.5 border-t border-slate-200 bg-white/95 px-3.5 pb-1 pt-3 backdrop-blur sm:static sm:mx-0 sm:mt-5 sm:gap-3 sm:border-0 sm:bg-transparent sm:px-0 sm:pb-0 sm:pt-0 sm:backdrop-blur-none">
            <button
              type="button"
              onClick={onRecusar}
              disabled={bloqueado || expirado}
              className="flex min-h-14 min-w-0 items-center justify-center gap-1.5 rounded-2xl border-2 border-red-200 bg-red-50 px-2.5 text-sm font-bold text-red-700 transition active:scale-[0.98] disabled:opacity-50 sm:min-h-16 sm:px-4 sm:text-base"
            >
              {atualizando ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <XCircle size={21} />
              )}
              Recusar
            </button>

            <button
              type="button"
              onClick={onAceitar}
              disabled={bloqueado || expirado}
              className="flex min-h-14 min-w-0 items-center justify-center gap-1.5 rounded-2xl bg-emerald-600 px-2.5 text-sm font-bold text-white shadow-lg shadow-emerald-600/25 transition active:scale-[0.98] disabled:opacity-50 sm:min-h-16 sm:px-4 sm:text-lg"
            >
              {atualizando ? (
                <>
                  <Loader2 size={21} className="animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <CheckCircle2 size={22} />
                  Aceitar tele
                </>
              )}
            </button>
          </div>

          {expirado && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-semibold text-red-700">
              O prazo desta tele terminou.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function ItemPreparacao({
  pronto,
  titulo,
  descricao,
  acaoRotulo,
  onAcao,
  carregando = false,
  ocultarAcao = false,
}: {
  pronto: boolean;
  titulo: string;
  descricao: string;
  acaoRotulo?: string;
  onAcao?: () => void;
  carregando?: boolean;
  ocultarAcao?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        pronto
          ? "border-emerald-200 bg-white text-emerald-800"
          : "border-amber-200 bg-white text-amber-800"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
            pronto ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
          }`}
        >
          {pronto ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
        </div>

        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900">{titulo}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">{descricao}</p>
        </div>
      </div>

      {!pronto && onAcao && acaoRotulo && !ocultarAcao && (
        <button
          type="button"
          onClick={onAcao}
          disabled={carregando}
          className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
        >
          {carregando && <Loader2 size={15} className="animate-spin" />}
          {acaoRotulo}
        </button>
      )}
    </div>
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
  compacto = false,
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
  compacto?: boolean;
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

  if (compacto && !concluida && tele.statusAceite === "ACEITA") {
    const paradaFoco =
      etapaAtual === "CHEGOU_NA_COLETA" || etapaAtual === "CHEGOU_NA_ENTREGA"
        ? paradaLiberada
        : paradaAtual;

    const indiceParadaFoco =
      paradaFoco?.id && paradaFoco.id === paradaLiberada?.id
        ? indiceVisualAtual
        : indiceParadaAtual;

    const nomeParadaFoco = paradaFoco
      ? tituloParada(paradaFoco, indiceParadaFoco)
      : "Parada não informada";

    const enderecoParadaFoco =
      String(paradaFoco?.endereco || "").trim() || "Endereço não informado";

    return (
      <article className="w-full min-w-0 max-w-full overflow-hidden p-3 sm:p-6">
        <div className="w-full min-w-0 max-w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div
            className={`px-4 py-3 sm:px-5 ${
              tele.rotaAtiva
                ? "bg-emerald-600 text-white"
                : tele.aguardandoRetomada
                  ? "bg-orange-500 text-white"
                  : "bg-slate-950 text-white"
            }`}
          >
            <div className="flex min-w-0 items-start justify-between gap-2.5 sm:gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">
                  {tele.rotaAtiva
                    ? "Rota ativa"
                    : tele.aguardandoRetomada
                      ? "Rota pausada"
                      : "Próxima tele"}
                </p>
                <h3 className="mt-1 truncate text-lg font-bold">
                  {tele.solicitante || "Solicitante não informado"}
                </h3>
              </div>

              <div className="max-w-[42%] shrink-0 text-right">
                <p className="text-[10px] uppercase tracking-wide text-white/70">
                  Seu líquido
                </p>
                <strong className="mt-1 block truncate text-base sm:text-lg">
                  {formatarMoeda(totalTele * 0.8)}
                </strong>
              </div>
            </div>
          </div>

          <div className="min-w-0 p-3.5 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                <MapPin size={21} />
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Destino atual
                </p>
                <h4 className="mt-1 break-words text-sm font-bold leading-5 text-slate-900 sm:text-base">
                  {rotuloCurtoTipoParada(paradaFoco?.tipo)} • {nomeParadaFoco}
                </h4>
                <p className="mt-1 break-words text-sm leading-5 text-slate-500">
                  {enderecoParadaFoco}
                </p>
              </div>
            </div>

            {miniMapa?.carregando ? (
              <div className="mt-4 flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                <Loader2 size={17} className="animate-spin" />
                Calculando distância e tempo...
              </div>
            ) : miniMapa?.resultado ? (
              <MetricasRota tele={tele} resultado={miniMapa.resultado} />
            ) : miniMapa?.erro ? (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
                {miniMapa.erro}
              </div>
            ) : null}

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                Etapa atual
              </p>
              <p className="mt-1 text-sm font-semibold leading-5 text-slate-800">
                {rotuloEtapaMotoboy(etapaAtual, paradaFoco)}
              </p>
            </div>

            {observacao && (
              <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-5 text-amber-800">
                <strong>Observação:</strong> {observacao}
              </div>
            )}

            {sugestaoGestor?.parada && (
              <div className="mt-3 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-700">
                  Sugestão do gestor
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {rotuloCurtoTipoParada(sugestaoGestor.parada.tipo)}
                  {sugestaoGestor.parada.cliente
                    ? ` • ${sugestaoGestor.parada.cliente}`
                    : ""}
                </p>
              </div>
            )}

            {precisaCobrar && (
              <button
                type="button"
                onClick={onRegistrarPagamento}
                disabled={bloqueado}
                className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 font-bold text-white transition hover:bg-amber-600 disabled:opacity-60"
              >
                {atualizando ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <CircleDollarSign size={18} />
                )}
                Cobrar {formatarMoeda(saldoPendente)}
              </button>
            )}

            {esperaAtiva && (
              <div className="mt-4 flex items-center justify-between gap-4 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-orange-700">
                    Tempo de espera
                  </p>
                  <strong className="mt-1 block text-xl tabular-nums text-slate-900">
                    {formatarCronometroEspera(segundosEspera)}
                  </strong>
                </div>

                <div className="text-right">
                  <p className="text-xs text-slate-500">Acumulado</p>
                  <strong className="mt-1 block text-orange-700">
                    {formatarMoeda(Number(tele.espera || 0))}
                  </strong>
                </div>
              </div>
            )}

            {tele.aguardandoRetomada && (
              <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm leading-5 text-orange-800">
                Esta rota está pausada. Retome quando voltar para esta tele.
              </div>
            )}

            {acaoEtapa && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => onAvancarEtapa(acaoEtapa.proximaEtapa)}
                  disabled={bloqueado}
                  className={`flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
                    tele.aguardandoRetomada
                      ? "bg-orange-600 hover:bg-orange-700"
                      : acaoEtapa.proximaEtapa === "CONCLUIDA"
                        ? "bg-emerald-600 hover:bg-emerald-700"
                        : "bg-slate-950 hover:bg-slate-800"
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

                {(etapaAtual === "EM_ROTA_COLETA" ||
                  etapaAtual === "EM_ROTA_ENTREGA") &&
                  paradaAtual && (
                    <button
                      type="button"
                      onClick={onAbrirMapaParadaAtual}
                      disabled={bloqueado}
                      className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
                    >
                      <MapPin size={18} />
                      Abrir mapa
                    </button>
                  )}
              </div>
            )}

            <details className="mt-4 rounded-2xl border border-slate-200 bg-white">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-slate-700">
                Ver todos os detalhes da tele
                <ChevronDown size={18} className="text-slate-400" />
              </summary>

              <div className="border-t border-slate-100 px-4 py-4">
                <div className="space-y-3">
                  {paradas.map((parada, indice) => (
                    <div
                      key={parada.id || `${tele.id}-compacta-${indice}`}
                      className={`rounded-2xl border px-3 py-3 ${
                        indice === indiceVisualAtual
                          ? "border-blue-200 bg-blue-50"
                          : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                            indice === indiceVisualAtual
                              ? "bg-blue-600 text-white"
                              : "bg-slate-900 text-white"
                          }`}
                        >
                          {indice + 1}
                        </span>

                        <div className="min-w-0">
                          <p className="font-semibold text-slate-800">
                            {tituloParada(parada, indice)}
                          </p>
                          <p className="mt-1 break-words text-xs leading-5 text-slate-500">
                            {parada.endereco || "Endereço não informado"}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
                  <div>
                    <p className="text-xs text-slate-400">Valor da tele</p>
                    <strong className="mt-1 block text-slate-900">
                      {formatarMoeda(totalTele)}
                    </strong>
                  </div>

                  <div className="text-right">
                    <p className="text-xs text-slate-400">Seu líquido</p>
                    <strong className="mt-1 block text-emerald-700">
                      {formatarMoeda(totalTele * 0.8)}
                    </strong>
                  </div>
                </div>
              </div>
            </details>
          </div>
        </div>
      </article>
    );
  }

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
            <div className="mt-5">
              {miniMapa?.carregando ? (
                <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                  <Loader2 size={18} className="animate-spin" />
                  Calculando distância e tempo...
                </div>
              ) : miniMapa?.resultado ? (
                <MetricasRota tele={tele} resultado={miniMapa.resultado} destaque />
              ) : miniMapa?.erro ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-700">
                  {miniMapa.erro}
                </div>
              ) : null}

              <div className="mt-3 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-800">
                A rota desta tele está sendo exibida no mapa principal acima.
              </div>
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

function MetricasRota({
  tele,
  resultado,
  destaque = false,
}: {
  tele: Tele;
  resultado: ResultadoMiniMapa;
  destaque?: boolean;
}) {
  const distanciaTele = Number(resultado.distanciaKm || 0);
  const distanciaAteColeta = Number(resultado.distanciaAteColetaKm || 0);
  const distanciaTotal = Number(resultado.distanciaTotalKm || distanciaTele);
  const duracaoTele = Number(resultado.duracaoMin || 0);
  const duracaoAteColeta = Number(resultado.duracaoAteColetaMin || 0);
  const duracaoTotal = Number(resultado.duracaoTotalMin || duracaoTele);
  const valorTele = Number(tele.total || 0);
  const valorPorKm = distanciaTotal > 0 ? valorTele / distanciaTotal : 0;
  const liquidoPorKm =
    distanciaTotal > 0 ? (valorTele * 0.8) / distanciaTotal : 0;

  return (
    <div
      className={`mt-4 w-full min-w-0 max-w-full overflow-hidden rounded-2xl border ${
        destaque
          ? "border-emerald-200 bg-emerald-50"
          : "border-slate-200 bg-slate-50"
      }`}
    >
      <div className={`grid divide-x divide-slate-200 ${
        destaque
          ? "grid-cols-3"
          : "grid-cols-2 divide-y sm:grid-cols-3 sm:divide-y-0"
      }`}>
        <MetricaRota
          titulo="Até a coleta"
          valor={formatarDistancia(distanciaAteColeta)}
          detalhe={`${Math.round(duracaoAteColeta)} min`}
        />
        <MetricaRota
          titulo="Rota da tele"
          valor={formatarDistancia(distanciaTele)}
          detalhe={`${Math.round(duracaoTele)} min`}
        />
        <MetricaRota
          titulo="Total estimado"
          valor={formatarDistancia(distanciaTotal)}
          detalhe={`${Math.round(duracaoTotal)} min`}
          classeExtra={destaque ? "" : "col-span-2 sm:col-span-1"}
        />
      </div>

      <div className="grid grid-cols-2 border-t border-slate-200 bg-white/80">
        <MetricaRota
          titulo="Valor por km"
          valor={`${formatarMoeda(valorPorKm)}/km`}
        />
        <MetricaRota
          titulo="Seu líquido por km"
          valor={`${formatarMoeda(liquidoPorKm)}/km`}
          destaque
        />
      </div>
    </div>
  );
}

function MetricaRota({
  titulo,
  valor,
  detalhe,
  destaque = false,
  classeExtra = "",
}: {
  titulo: string;
  valor: string;
  detalhe?: string;
  destaque?: boolean;
  classeExtra?: string;
}) {
  return (
    <div className={`min-w-0 overflow-hidden px-2.5 py-3 sm:px-3 ${classeExtra}`}>
      <p className="break-words text-[8px] font-bold uppercase tracking-wide text-slate-400 sm:text-[9px]">
        {titulo}
      </p>
      <strong
        className={`mt-1 block break-words text-xs leading-4 sm:text-sm ${
          destaque ? "text-emerald-700" : "text-slate-900"
        }`}
      >
        {valor}
      </strong>
      {detalhe && <p className="mt-0.5 text-xs text-slate-500">{detalhe}</p>}
    </div>
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

function formatarDistancia(valorKm: number) {
  if (!Number.isFinite(valorKm)) {
    return "0 km";
  }

  return `${valorKm.toFixed(1).replace(".", ",")} km`;
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
