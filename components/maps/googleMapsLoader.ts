"use client";

declare global {
  interface Window {
    google: any;
    googleMapsScriptLoading?: boolean;
    googleMapsCallbacks?: (() => void)[];
    __initGoogleMaps?: () => void;
  }
}

export function carregarGoogleMaps(callback: () => void) {
  if (window.google?.maps) {
    callback();
    return;
  }

  window.googleMapsCallbacks = window.googleMapsCallbacks || [];
  window.googleMapsCallbacks.push(callback);

  if (window.googleMapsScriptLoading) return;

  window.googleMapsScriptLoading = true;

  const script = document.createElement("script");

  script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=geometry,places&loading=async&callback=__initGoogleMaps`;

  script.async = true;
  script.defer = true;

  window.__initGoogleMaps = () => {
    window.googleMapsCallbacks?.forEach((cb) => cb());
    window.googleMapsCallbacks = [];
  };

  document.body.appendChild(script);
}