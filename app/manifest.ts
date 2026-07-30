import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Express Manager",
    short_name: "Express",
    description: "Sistema de gestão de entregas e operação de motoboys.",
    start_url: "/",
    display: "standalone",
    background_color: "#f8fafc",
    theme_color: "#059669",
    orientation: "portrait",
    lang: "pt-BR",
  };
}
