"use client";

import { useEffect, useRef } from "react";
import { carregarGoogleMaps } from "@/components/maps/googleMapsLoader";

type Ponto = {
  lat: number;
  lng: number;
  endereco: string;
};

export default function MapaRota({
  polyline,
  pontos,
}: {
  polyline: string;
  pontos: Ponto[];
}) {
  const mapaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!polyline || !pontos?.length) return;

    carregarGoogleMaps(() => {
      if (!mapaRef.current || !window.google?.maps) return;

      const bounds = new window.google.maps.LatLngBounds();

      const mapa = new window.google.maps.Map(mapaRef.current, {
        zoom: 13,
        center: { lat: pontos[0].lat, lng: pontos[0].lng },
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });

      pontos.forEach((ponto, index) => {
        const posicao = { lat: ponto.lat, lng: ponto.lng };
        bounds.extend(posicao);

        new window.google.maps.Marker({
          position: posicao,
          map: mapa,
          label: String(index + 1),
          title: ponto.endereco,
        });
      });

      const rotaDecodificada =
        window.google.maps.geometry.encoding.decodePath(polyline);

      const linhaRota = new window.google.maps.Polyline({
        path: rotaDecodificada,
        geodesic: true,
        strokeWeight: 5,
      });

      linhaRota.setMap(mapa);
      mapa.fitBounds(bounds);
    });
  }, [polyline, pontos]);

  return (
    <div className="mb-4 overflow-hidden rounded-2xl border border-emerald-200 bg-white">
      <div ref={mapaRef} className="h-[360px] w-full" />
    </div>
  );
}