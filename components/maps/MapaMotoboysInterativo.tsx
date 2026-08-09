"use client";

import { Loader2, MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type MotoboyMapa = {
  id: string;
  nome: string;
  online?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  localizacaoAtualizadaEm?: string | null;
  segundosSemAtualizar?: number | null;
  localizacaoRecente: boolean;
  teleAtual?: {
    id: string;
    etapaMotoboy?: string | null;
    ordemMotoboy?: number | null;
  } | null;
};

type Props = {
  motoboys: MotoboyMapa[];
  motoboySelecionadoId?: string | null;
  onSelecionarMotoboy?: (motoboyId: string) => void;
  className?: string;
};

type GoogleMapsWindow = Window & {
  google?: any;
  __expressGoogleMapsPromise?: Promise<any>;
};

function coordenadaValida(valor: unknown): valor is number {
  return typeof valor === "number" && Number.isFinite(valor);
}


function formatarTempoSemAtualizar(segundos?: number | null) {
  if (segundos === null || segundos === undefined || !Number.isFinite(segundos)) {
    return "horário desconhecido";
  }

  if (segundos < 60) {
    return `${Math.max(0, Math.floor(segundos))}s`;
  }

  const minutos = Math.floor(segundos / 60);

  if (minutos < 60) {
    return `${minutos} min`;
  }

  const horas = Math.floor(minutos / 60);
  const minutosRestantes = minutos % 60;

  if (horas < 24) {
    return minutosRestantes > 0 ? `${horas}h ${minutosRestantes}min` : `${horas}h`;
  }

  const dias = Math.floor(horas / 24);
  return `${dias} ${dias === 1 ? "dia" : "dias"}`;
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
      let mensagem = "Não foi possível carregar a configuração do mapa.";

      try {
        const dadosErro = await resposta.json();
        mensagem = dadosErro?.erro || mensagem;
      } catch {}

      throw new Error(mensagem);
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

export default function MapaMotoboysInterativo({
  motoboys,
  motoboySelecionadoId = null,
  onSelecionarMotoboy,
  className = "",
}: Props) {
  const mapaContainerRef = useRef<HTMLDivElement | null>(null);
  const mapaRef = useRef<any>(null);
  const marcadoresRef = useRef<Map<string, any>>(new Map());
  const rotaPolylineRef = useRef<any>(null);
  const marcadorDestinoRef = useRef<any>(null);
  const ultimoSelecionadoRef = useRef<string | null | undefined>(undefined);
  const ultimaReferenciaRotaRef = useRef<{
    motoboyId: string;
    latitude: number;
    longitude: number;
    chaveEtapa: string;
  } | null>(null);
  const carregandoRotaRef = useRef(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

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
          setCarregando(false);
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

    if (!maps || !mapa) {
      return;
    }

    const motoboysValidos = motoboys.filter(
      (motoboy) =>
        coordenadaValida(motoboy.latitude) &&
        coordenadaValida(motoboy.longitude)
    );

    const idsAtuais = new Set(motoboysValidos.map((motoboy) => motoboy.id));

    for (const [motoboyId, marcador] of marcadoresRef.current.entries()) {
      if (!idsAtuais.has(motoboyId)) {
        marcador.setMap(null);
        marcadoresRef.current.delete(motoboyId);
      }
    }

    for (const motoboy of motoboysValidos) {
      const posicao = {
        lat: motoboy.latitude as number,
        lng: motoboy.longitude as number,
      };

      const marcadorExistente = marcadoresRef.current.get(motoboy.id);

      const localizacaoRecente = motoboy.localizacaoRecente;
      const tempoSemAtualizar = formatarTempoSemAtualizar(motoboy.segundosSemAtualizar);
      const tituloMarcador = localizacaoRecente
        ? `${motoboy.nome} • localização atual`
        : `${motoboy.nome} • última localização há ${tempoSemAtualizar}`;

      const iconeMarcador = {
        path: maps.SymbolPath.CIRCLE,
        scale: localizacaoRecente ? 17 : 16,
        fillColor: localizacaoRecente ? "#16a34a" : "#64748b",
        fillOpacity: localizacaoRecente ? 1 : 0.82,
        strokeColor: "#ffffff",
        strokeOpacity: 1,
        strokeWeight: 3,
      };

      if (marcadorExistente) {
        marcadorExistente.setPosition(posicao);
        marcadorExistente.setTitle(tituloMarcador);
        marcadorExistente.setIcon(iconeMarcador);
        marcadorExistente.setOpacity(localizacaoRecente ? 1 : 0.72);
        marcadorExistente.setZIndex(localizacaoRecente ? 20 : 10);
        continue;
      }

      const marcador = new maps.Marker({
        map: mapa,
        position: posicao,
        title: tituloMarcador,
        icon: iconeMarcador,
        opacity: localizacaoRecente ? 1 : 0.72,
        zIndex: localizacaoRecente ? 20 : 10,
        label: {
          text: motoboy.nome.trim().charAt(0).toUpperCase() || "M",
          color: "#ffffff",
          fontWeight: "700",
        },
      });

      marcador.addListener("click", () => {
        onSelecionarMotoboy?.(motoboy.id);
      });

      marcadoresRef.current.set(motoboy.id, marcador);
    }

    const selecaoMudou = ultimoSelecionadoRef.current !== motoboySelecionadoId;

    if (selecaoMudou) {
      ultimoSelecionadoRef.current = motoboySelecionadoId;

      if (motoboySelecionadoId) {
        const selecionado = motoboysValidos.find((motoboy) => motoboy.id === motoboySelecionadoId);

        if (selecionado) {
          mapa.panTo({
            lat: selecionado.latitude as number,
            lng: selecionado.longitude as number,
          });

          if (mapa.getZoom() < 15) {
            mapa.setZoom(15);
          }
        }

        return;
      }

      if (motoboysValidos.length === 1) {
        mapa.panTo({
          lat: motoboysValidos[0].latitude as number,
          lng: motoboysValidos[0].longitude as number,
        });

        mapa.setZoom(15);
        return;
      }

      if (motoboysValidos.length > 1) {
        const limites = new maps.LatLngBounds();

        motoboysValidos.forEach((motoboy) => {
          limites.extend({
            lat: motoboy.latitude as number,
            lng: motoboy.longitude as number,
          });
        });

        mapa.fitBounds(limites, 80);
      }
    }
  }, [motoboys, motoboySelecionadoId, onSelecionarMotoboy]);

  useEffect(() => {
    let cancelado = false;
    const janela = window as GoogleMapsWindow;
    const maps = janela.google?.maps;
    const mapa = mapaRef.current;

    function limparRota() {
      rotaPolylineRef.current?.setMap(null);
      rotaPolylineRef.current = null;

      marcadorDestinoRef.current?.setMap(null);
      marcadorDestinoRef.current = null;

      ultimaReferenciaRotaRef.current = null;
    }

    async function carregarRotaSelecionada() {
      if (!motoboySelecionadoId || !maps || !mapa) {
        limparRota();
        return;
      }

      const selecionado = motoboys.find(
        (motoboy) =>
          motoboy.id === motoboySelecionadoId &&
          motoboy.localizacaoRecente &&
          coordenadaValida(motoboy.latitude) &&
          coordenadaValida(motoboy.longitude)
      );

      if (!selecionado || carregandoRotaRef.current) {
        return;
      }

      const latitude = selecionado.latitude as number;
      const longitude = selecionado.longitude as number;
      const chaveEtapa = [
        selecionado.teleAtual?.id || "",
        selecionado.teleAtual?.etapaMotoboy || "",
        String(selecionado.teleAtual?.ordemMotoboy ?? ""),
      ].join("|");

      const ultima = ultimaReferenciaRotaRef.current;
      const mudouMotoboy = !ultima || ultima.motoboyId !== motoboySelecionadoId;
      const mudouEtapa = !ultima || ultima.chaveEtapa !== chaveEtapa;

      // A rota da Central é recalculada apenas quando muda o motoboy
      // selecionado ou a etapa/destino operacional. O marcador de posição
      // continua atualizando sem nova chamada de Routes.
      const precisaAtualizar = mudouMotoboy || mudouEtapa;

      if (!precisaAtualizar) {
        return;
      }

      carregandoRotaRef.current = true;

      try {
        const resposta = await fetch(
          `/api/maps/rota-atual-motoboy?motoboyId=${encodeURIComponent(motoboySelecionadoId)}`,
          {
            cache: "no-store",
          }
        );

        if (!resposta.ok) {
          let mensagem = "Nao foi possivel carregar a rota atual.";

          try {
            const dadosErro = await resposta.json();
            mensagem = dadosErro?.erro || mensagem;
          } catch {}

          throw new Error(mensagem);
        }

        const dados = await resposta.json();

        if (cancelado) {
          return;
        }

        if (!dados?.possuiRota || !dados?.polyline || !dados?.destino) {
          limparRota();
          return;
        }

        const caminho = maps.geometry.encoding.decodePath(dados.polyline);

        const novaPolyline = new maps.Polyline({
          map: mapa,
          path: caminho,
          geodesic: true,
          strokeColor: "#2563eb",
          strokeOpacity: 0.95,
          strokeWeight: 6,
        });

        const novoMarcadorDestino = new maps.Marker({
          map: mapa,
          position: {
            lat: Number(dados.destino.latitude),
            lng: Number(dados.destino.longitude),
          },
          title: dados.destino.endereco || "Destino atual",
          label: {
            text: "D",
            color: "#ffffff",
            fontWeight: "700",
          },
        });

        const polylineAnterior = rotaPolylineRef.current;
        const marcadorAnterior = marcadorDestinoRef.current;

        rotaPolylineRef.current = novaPolyline;
        marcadorDestinoRef.current = novoMarcadorDestino;

        polylineAnterior?.setMap(null);
        marcadorAnterior?.setMap(null);

        ultimaReferenciaRotaRef.current = {
          motoboyId: motoboySelecionadoId,
          latitude,
          longitude,
          chaveEtapa,
        };

        if (mudouMotoboy || mudouEtapa) {
          const limites = new maps.LatLngBounds();

          caminho.forEach((ponto: any) => limites.extend(ponto));

          limites.extend({
            lat: latitude,
            lng: longitude,
          });

          limites.extend({
            lat: Number(dados.destino.latitude),
            lng: Number(dados.destino.longitude),
          });

          mapa.fitBounds(limites, 90);
        }
      } catch (erroRota) {
        if (!cancelado) {
          console.error("Erro ao desenhar rota do motoboy:", erroRota);
        }
      } finally {
        carregandoRotaRef.current = false;
      }
    }

    void carregarRotaSelecionada();

    return () => {
      cancelado = true;
    };
  }, [motoboySelecionadoId, motoboys]);

  return (
    <div className={`relative overflow-hidden bg-slate-100 ${className}`}>
      <div ref={mapaContainerRef} className="h-full min-h-[520px] w-full" />

      {carregando && (
        <div className="absolute inset-0 flex items-center justify-center gap-3 bg-slate-100 text-sm text-slate-500">
          <Loader2 size={20} className="animate-spin" />
          Carregando mapa interativo...
        </div>
      )}

      {!carregando && erro && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 px-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-400 shadow-sm">
            <MapPin size={25} />
          </div>

          <h3 className="mt-4 font-bold text-slate-800">Não foi possível carregar o mapa</h3>

          <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">{erro}</p>
        </div>
      )}

      {!carregando && !erro && (
        <>
          <div className="pointer-events-none absolute bottom-3 left-3 rounded-xl bg-white/95 px-3 py-2 text-xs font-medium text-slate-600 shadow-sm">
            Arraste para mover • Ctrl + roda do mouse para zoom • Clique no motoboy para ver a rota
          </div>

          <div className="pointer-events-none absolute right-3 top-3 rounded-xl bg-white/95 px-3 py-2 text-xs text-slate-600 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-green-600" />
              Localização atual
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-slate-500 opacity-80" />
              Última localização conhecida
            </div>
          </div>
        </>
      )}
    </div>
  );
}