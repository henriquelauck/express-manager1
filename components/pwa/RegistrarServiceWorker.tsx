"use client";

import { useEffect } from "react";

export default function RegistrarServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    async function registrar() {
      try {
        await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });
      } catch (erro) {
        console.error("Erro ao registrar service worker:", erro);
      }
    }

    void registrar();
  }, []);

  return null;
}
