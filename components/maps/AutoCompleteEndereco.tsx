"use client";

import { carregarGoogleMaps } from "@/components/maps/googleMapsLoader";
import { MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type AutocompleteEnderecoProps = {
  label: string;
  value: string;
  onChange: (valor: string) => void;
  icon?: React.ReactNode;
};

type SugestaoAutocomplete = {
  placePrediction?: {
    text?: {
      text?: string;
    };
    toPlace: () => {
      formattedAddress?: string;
      fetchFields: (opcoes: { fields: string[] }) => Promise<void>;
    };
  };
};

type AutocompleteSessionTokenInstance = object;

type BibliotecaPlaces = {
  AutocompleteSessionToken: new () => AutocompleteSessionTokenInstance;
  AutocompleteSuggestion: {
    fetchAutocompleteSuggestions: (opcoes: {
      input: string;
      includedRegionCodes: string[];
      sessionToken: AutocompleteSessionTokenInstance | null;
    }) => Promise<{
      suggestions?: SugestaoAutocomplete[];
    }>;
  };
};

export default function AutocompleteEndereco({
  label,
  value,
  onChange,
  icon,
}: AutocompleteEnderecoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sugestoes, setSugestoes] = useState<SugestaoAutocomplete[]>([]);
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [sessionToken, setSessionToken] = useState<AutocompleteSessionTokenInstance | null>(null);

  useEffect(() => {
    carregarGoogleMaps(async () => {
      if (!window.google?.maps) return;

      try {
        const { AutocompleteSessionToken } = (await window.google.maps.importLibrary(
          "places"
        )) as unknown as BibliotecaPlaces;

        setSessionToken(new AutocompleteSessionToken());
      } catch (error) {
        console.error("Erro ao iniciar autocomplete de endereço:", error);
      }
    });
  }, []);

  useEffect(() => {
    function fecharAoClicarFora(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setAberto(false);
      }
    }

    document.addEventListener("mousedown", fecharAoClicarFora);

    return () => {
      document.removeEventListener("mousedown", fecharAoClicarFora);
    };
  }, []);

  async function gerarNovoToken() {
    if (!window.google?.maps) return;

    try {
      const { AutocompleteSessionToken } = (await window.google.maps.importLibrary(
        "places"
      )) as unknown as BibliotecaPlaces;

      setSessionToken(new AutocompleteSessionToken());
    } catch (error) {
      console.error("Erro ao renovar sessão do autocomplete:", error);
    }
  }

  function buscarSugestoes(texto: string) {
    onChange(texto);

    if (!texto.trim() || texto.trim().length < 3) {
      setSugestoes([]);
      setAberto(false);
      setCarregando(false);
      return;
    }

    setCarregando(true);

    carregarGoogleMaps(async () => {
      try {
        const { AutocompleteSuggestion } = (await window.google.maps.importLibrary(
          "places"
        )) as unknown as BibliotecaPlaces;

        const resposta = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: texto,
          includedRegionCodes: ["br"],
          sessionToken,
        });

        const novasSugestoes = resposta.suggestions || [];

        setSugestoes(novasSugestoes);
        setAberto(novasSugestoes.length > 0);
      } catch (error) {
        console.error("Erro ao buscar sugestões de endereço:", error);
        setSugestoes([]);
        setAberto(false);
      } finally {
        setCarregando(false);
      }
    });
  }

  async function selecionarSugestao(sugestao: SugestaoAutocomplete) {
    const placePrediction = sugestao.placePrediction;

    if (!placePrediction) return;

    try {
      const place = placePrediction.toPlace();

      await place.fetchFields({
        fields: ["formattedAddress"],
      });

      if (place.formattedAddress) {
        onChange(place.formattedAddress);
      }

      setSugestoes([]);
      setAberto(false);
      await gerarNovoToken();
    } catch (error) {
      console.error("Erro ao selecionar endereço:", error);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="text-sm font-medium text-slate-600">{label}</label>

      <div className="relative mt-2">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
          {icon || <MapPin size={18} />}
        </div>

        <input
          value={value}
          onChange={(event) => buscarSugestoes(event.target.value)}
          onFocus={() => sugestoes.length > 0 && setAberto(true)}
          autoComplete="off"
          className="h-14 w-full rounded-xl border border-slate-200 bg-white px-4 pl-11 pr-24 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          placeholder="Digite o endereço"
        />

        {carregando && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">
            Buscando...
          </span>
        )}
      </div>

      {aberto && sugestoes.length > 0 && (
        <div className="absolute z-50 mt-2 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {sugestoes.map((sugestao, index) => {
            const texto = sugestao.placePrediction?.text?.text || "Endereço sugerido";

            return (
              <button
                key={`${texto}-${index}`}
                type="button"
                onClick={() => selecionarSugestao(sugestao)}
                className="w-full border-b border-slate-100 px-4 py-3 text-left text-sm text-slate-700 transition last:border-b-0 hover:bg-emerald-50"
              >
                {texto}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
