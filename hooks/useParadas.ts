import { gerarId } from "@/lib/utils/id";
import type { Parada } from "@/types/Parada";
import { useState } from "react";

export function useParadas() {
  const [paradas, setParadas] = useState<Parada[]>([
    {
      id: gerarId(),
      tipo: "Coleta",
      cliente: "",
      endereco: "",
      contato: "",
      observacao: "",
    },
    {
      id: gerarId(),
      tipo: "Entrega",
      cliente: "",
      endereco: "",
      contato: "",
      observacao: "",
    },
  ]);

  function adicionarParada() {
    setParadas((paradasAtuais) => [
      ...paradasAtuais,
      {
        id: gerarId(),
        tipo: "Entrega",
        cliente: "",
        endereco: "",
        contato: "",
        observacao: "",
      },
    ]);
  }

  function removerParada(index: number) {
    setParadas((paradasAtuais) => {
      if (paradasAtuais.length === 1) return paradasAtuais;

      return paradasAtuais.filter((_, i) => i !== index);
    });
  }

  return {
    paradas,
    setParadas,
    adicionarParada,
    removerParada,
  };
}
