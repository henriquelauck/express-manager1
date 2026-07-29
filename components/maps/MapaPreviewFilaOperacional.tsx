"use client";

import { AlertTriangle, Loader2, MapPinned, Route } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  motoboyId: string | null;
  itemIds: string[];
  className?: string;
};

type PontoRota = {
  itemId: string;
  ordem: number;
  latitude: number;
  longitude: number;
  endereco: string;
  tipo: string;
  cliente: string;
  solicitante: string;
  teleId: string;
};

type RespostaPrevia = {
  possuiRota: boolean;
  motoboy: {
    id: string;
    nome: string;
    online: boolean;
    localizacaoAtualizadaEm?: string | null;
  };
  origem: {
    latitude: number;
    longitude: number;
    descricao: string;
  };
  pontos: PontoRota[];
  polyline: string;
  distanciaMetros: number;
  duracaoSegundos: number;
};

type GoogleMapsWindow = Window & {
  google?: any;
  __expressGoogleMapsPromise?: Promise<any>;
};

function formatarDistancia(metros: number) {
  if (!Number.isFinite(metros) || metros <= 0) {
    return "—";
  }

  if (metros < 1000) {
    return `${Math.round(metros)} m`;
  }

  return `${(metros / 1000).toFixed(1).replace(".", ",")} km`;
}

function formatarDuracao(segundos: number) {
  if (!Number.isFinite(segundos) || segundos <= 0) {
    return "—";
  }

  const minutos = Math.max(1, Math.round(segundos / 60));

  if (minutos < 60) {
    return `${minutos} min`;
  }

  const horas = Math.floor(minutos / 60);
  const minutosRestantes = minutos % 60;

  return minutosRestantes > 0 ? `${horas}h ${minutosRestantes}min` : `${horas}h`;
}

async function lerErro(resposta: Response, fallback: string) {
  try {
    const dados = await resposta.json();

    return typeof dados?.erro === "string" ? dados.erro : fallback;
  } catch {
    return fallback;
  }
}

async function carregarGoogleMaps() {
  const janela = window as GoogleMapsWindow;

  if (janela.google?.maps) {
    return janela.google.maps;
  }

  if (janela.__expressGoogleMapsPromise) {
    return janela.__expressGoogleMapsPromise;
  }

  janela.__expressGoogleMapsPromise = (async () => {
    const resposta = await fetch("/api/maps/config", {
      cache: "no-store",
    });

    if (!resposta.ok) {
      throw new Error(await lerErro(resposta, "Não foi possível carregar a configuração do mapa."));
    }

    const dados = await resposta.json();
    const apiKey = String(dados?.apiKey || "").trim();

    if (!apiKey) {
      throw new Error("A chave do Google Maps não foi retornada.");
    }

    await new Promise<void>((resolve, reject) => {
      const scriptExistente = document.querySelector<HTMLScriptElement>(
        'script[data-express-google-maps="true"]'
      );

      if (scriptExistente) {
        if (janela.google?.maps) {
          resolve();
          return;
        }

        scriptExistente.addEventListener("load", () => resolve(), {
          once: true,
        });

        scriptExistente.addEventListener(
          "error",
          () => reject(new Error("Não foi possível carregar o Google Maps.")),
          {
            once: true,
          }
        );

        return;
      }

      const script = document.createElement("script");

      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
        apiKey
      )}&v=weekly&language=pt-BR&region=BR&libraries=geometry`;

      script.async = true;
      script.defer = true;
      script.dataset.expressGoogleMaps = "true";

      script.addEventListener("load", () => resolve(), {
        once: true,
      });

      script.addEventListener(
        "error",
        () => reject(new Error("Não foi possível carregar o Google Maps.")),
        {
          once: true,
        }
      );

      document.head.appendChild(script);
    });

    if (!janela.google?.maps) {
      throw new Error("O Google Maps não ficou disponível no navegador.");
    }

    return janela.google.maps;
  })();

  try {
    return await janela.__expressGoogleMapsPromise;
  } catch (erro) {
    janela.__expressGoogleMapsPromise = undefined;
    throw erro;
  }
}

export default function MapaPreviewFilaOperacional({ motoboyId, itemIds, className = "" }: Props) {
  const mapaContainerRef = useRef<HTMLDivElement | null>(null);
  const mapaRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const marcadoresRef = useRef<any[]>([]);
  const controladorRef = useRef<AbortController | null>(null);

  const [mapsPronto, setMapsPronto] = useState(false);
  const [carregandoMapa, setCarregandoMapa] = useState(true);
  const [carregandoRota, setCarregandoRota] = useState(false);
  const [erro, setErro] = useState("");
  const [previa, setPrevia] = useState<RespostaPrevia | null>(null);

  const assinaturaItens = useMemo(() => itemIds.join("|"), [itemIds]);

  useEffect(() => {
    let cancelado = false;

    async function iniciarMapa() {
      try {
        const maps = await carregarGoogleMaps();

        if (cancelado || !mapaContainerRef.current || mapaRef.current) {
          return;
        }

        mapaRef.current = new maps.Map(mapaContainerRef.current, {
          center: {
            lat: -29.687,
            lng: -51.132,
          },
          zoom: 13,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          zoomControl: true,
          gestureHandling: "cooperative",
          clickableIcons: false,
        });

        setMapsPronto(true);
        setErro("");
      } catch (erroCarregamento) {
        if (!cancelado) {
          setErro(
            erroCarregamento instanceof Error
              ? erroCarregamento.message
              : "Não foi possível carregar o mapa."
          );
        }
      } finally {
        if (!cancelado) {
          setCarregandoMapa(false);
        }
      }
    }

    void iniciarMapa();

    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    const janela = window as GoogleMapsWindow;
    const maps = janela.google?.maps;
    const mapa = mapaRef.current;

    function limparRota() {
      polylineRef.current?.setMap(null);
      polylineRef.current = null;

      marcadoresRef.current.forEach((marcador) => marcador.setMap(null));
      marcadoresRef.current = [];
    }

    if (!mapsPronto || !maps || !mapa) {
      return;
    }

    limparRota();
    setPrevia(null);
    setErro("");

    if (!motoboyId || itemIds.length === 0) {
      return;
    }

    controladorRef.current?.abort();
    const controlador = new AbortController();
    controladorRef.current = controlador;

    const temporizador = window.setTimeout(async () => {
      setCarregandoRota(true);

      try {
        const resposta = await fetch("/api/maps/preview-fila-operacional", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            motoboyId,
            itemIds,
          }),
          cache: "no-store",
          signal: controlador.signal,
        });

        if (!resposta.ok) {
          throw new Error(await lerErro(resposta, "Não foi possível calcular a prévia da fila."));
        }

        const dados = (await resposta.json()) as RespostaPrevia;

        if (
          !dados?.possuiRota ||
          !dados?.polyline ||
          !Array.isArray(dados.pontos) ||
          !dados.origem
        ) {
          throw new Error("A prévia da rota retornou dados incompletos.");
        }

        const caminho = maps.geometry.encoding.decodePath(dados.polyline);

        polylineRef.current = new maps.Polyline({
          map: mapa,
          path: caminho,
          geodesic: true,
          strokeColor: "#2563eb",
          strokeOpacity: 0.95,
          strokeWeight: 6,
        });

        const marcadorOrigem = new maps.Marker({
          map: mapa,
          position: {
            lat: Number(dados.origem.latitude),
            lng: Number(dados.origem.longitude),
          },
          title: dados.origem.descricao || "Posição atual do motoboy",
          label: {
            text: "M",
            color: "#ffffff",
            fontWeight: "700",
          },
        });

        marcadoresRef.current.push(marcadorOrigem);

        dados.pontos.forEach((ponto) => {
          const marcador = new maps.Marker({
            map: mapa,
            position: {
              lat: Number(ponto.latitude),
              lng: Number(ponto.longitude),
            },
            title: `${ponto.ordem}. ${ponto.tipo} — ${
              ponto.cliente || ponto.solicitante
            }\n${ponto.endereco}`,
            label: {
              text: String(ponto.ordem),
              color: "#ffffff",
              fontWeight: "700",
            },
          });

          marcadoresRef.current.push(marcador);
        });

        const limites = new maps.LatLngBounds();

        caminho.forEach((ponto: any) => limites.extend(ponto));

        limites.extend({
          lat: Number(dados.origem.latitude),
          lng: Number(dados.origem.longitude),
        });

        dados.pontos.forEach((ponto) => {
          limites.extend({
            lat: Number(ponto.latitude),
            lng: Number(ponto.longitude),
          });
        });

        mapa.fitBounds(limites, 70);
        setPrevia(dados);
        setErro("");
      } catch (erroRota) {
        if (erroRota instanceof DOMException && erroRota.name === "AbortError") {
          return;
        }

        setErro(
          erroRota instanceof Error
            ? erroRota.message
            : "Não foi possível calcular a prévia da fila."
        );
      } finally {
        if (!controlador.signal.aborted) {
          setCarregandoRota(false);
        }
      }
    }, 500);

    return () => {
      window.clearTimeout(temporizador);
      controlador.abort();
    };
  }, [assinaturaItens, itemIds, mapsPronto, motoboyId]);

  return (
    <section
      className={`overflow-hidden rounded-2xl border border-slate-200 bg-white ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div>
          <div className="flex items-center gap-2 text-slate-900">
            <MapPinned className="h-5 w-5" />
            <h4 className="font-bold">Prévia da rota organizada</h4>
          </div>

          <p className="mt-1 text-xs text-slate-500">
            O traçado acompanha a ordem atual das etapas, mesmo antes de salvar.
          </p>
        </div>

        {previa && (
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-lg bg-blue-50 px-2.5 py-1.5 font-semibold text-blue-700">
              {formatarDistancia(previa.distanciaMetros)}
            </span>

            <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 font-semibold text-slate-700">
              {formatarDuracao(previa.duracaoSegundos)}
            </span>
          </div>
        )}
      </div>

      <div className="relative h-[360px] bg-slate-100">
        <div ref={mapaContainerRef} className="h-full w-full" />

        {(carregandoMapa || carregandoRota) && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-white/75 text-sm font-medium text-slate-600 backdrop-blur-[1px]">
            <Loader2 className="h-5 w-5 animate-spin" />
            {carregandoMapa ? "Carregando minimapa..." : "Recalculando a sequência..."}
          </div>
        )}

        {!carregandoMapa && !carregandoRota && !erro && itemIds.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
            <Route className="h-8 w-8 text-slate-400" />
            <p className="mt-3 text-sm font-semibold text-slate-700">
              Nenhuma etapa disponível para calcular a rota.
            </p>
          </div>
        )}

        {!carregandoMapa && !carregandoRota && erro && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50 px-6 text-center">
            <AlertTriangle className="h-8 w-8 text-amber-500" />

            <p className="mt-3 text-sm font-semibold text-slate-800">
              Não foi possível exibir a prévia.
            </p>

            <p className="mt-1 max-w-md text-xs leading-5 text-slate-500">{erro}</p>
          </div>
        )}
      </div>

      {previa && (
        <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500">
          <strong className="text-slate-700">M</strong> representa a posição atual do motoboy. Os
          demais números seguem a fila exibida.
        </div>
      )}
    </section>
  );
}
