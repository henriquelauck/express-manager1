"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { carregarGoogleMaps } from "@/components/maps/googleMapsLoader";

export default function AutocompleteEndereco({ label, value, onChange }: any) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [sugestoes, setSugestoes] = useState<any[]>([]);
  const [aberto, setAberto] = useState(false);
  const [sessionToken, setSessionToken] = useState<any>(null);

  useEffect(() => {
    carregarGoogleMaps(async () => {
      if (!window.google?.maps) return;

      const { AutocompleteSessionToken } =
        (await window.google.maps.importLibrary("places")) as any;

      setSessionToken(new AutocompleteSessionToken());
    });
  }, []);

  async function buscarSugestoes(texto: string) {
    onChange(texto);

    if (!texto || texto.length < 3) {
      setSugestoes([]);
      setAberto(false);
      return;
    }

    carregarGoogleMaps(async () => {
      const { AutocompleteSuggestion } =
        (await window.google.maps.importLibrary("places")) as any;

      const resposta =
        await AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: texto,
          includedRegionCodes: ["br"],
          sessionToken,
        });

      setSugestoes(resposta.suggestions || []);
      setAberto(true);
    });
  }

  async function selecionarSugestao(sugestao: any) {
    const placePrediction = sugestao.placePrediction;

    if (!placePrediction) return;

    const place = placePrediction.toPlace();

    await place.fetchFields({
      fields: ["formattedAddress", "location"],
    });

    if (place.formattedAddress) {
      onChange(place.formattedAddress);
    }

    setSugestoes([]);
    setAberto(false);
  }

  return (
    <div className="relative">
      <label className="text-sm font-medium text-slate-600">{label}</label>

      <div className="relative mt-2">
        <MapPin
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          ref={inputRef}
          value={value}
          onChange={(e) => buscarSugestoes(e.target.value)}
          onFocus={() => sugestoes.length > 0 && setAberto(true)}
          className="w-full h-14 rounded-xl border border-slate-200 px-4 pl-11 outline-none focus:border-emerald-500"
          placeholder="Digite o endereço"
        />
      </div>

      {aberto && sugestoes.length > 0 && (
        <div className="absolute z-50 mt-2 w-full rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
          {sugestoes.map((sugestao: any, index: number) => (
            <button
              key={index}
              type="button"
              onClick={() => selecionarSugestao(sugestao)}
              className="w-full text-left px-4 py-3 text-sm hover:bg-emerald-50 border-b border-slate-100 last:border-b-0"
            >
              {sugestao.placePrediction?.text?.text}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}