"use client";

import type { Cliente } from "@/types/Cliente";
import type { Parada } from "@/types/Parada";
import { Plus } from "lucide-react";
import CardParada from "./CardParada";

type LocalFrequente = {
  cliente: string;
  endereco: string;
  contato: string;
};

type ListaParadasProps = {
  paradas: Parada[];
  clientes: Cliente[];
  locaisFrequentes: LocalFrequente[];
  onAtualizar: (index: number, campo: keyof Parada, valor: string) => void;
  onRemover: (index: number) => void;
  onAdicionar: () => void;
};

export default function ListaParadas({
  paradas,
  clientes,
  locaisFrequentes,
  onAtualizar,
  onRemover,
  onAdicionar,
}: ListaParadasProps) {
  return (
    <>
      <div className="space-y-6">
        {paradas.map((parada, index) => (
          <CardParada
            key={parada.id}
            parada={parada}
            index={index}
            podeRemover={paradas.length > 1}
            onAtualizar={onAtualizar}
            onRemover={onRemover}
          />
        ))}
      </div>

      <datalist id="clientes-lista">
        {clientes.map((cliente) => (
          <option key={cliente.id || cliente.nome} value={cliente.nome} />
        ))}
      </datalist>

      <datalist id="locais-frequentes-lista">
        {locaisFrequentes.map((local) => (
          <option key={local.cliente.toLowerCase()} value={local.cliente} />
        ))}
      </datalist>

      <button
        type="button"
        onClick={onAdicionar}
        className="mt-6 flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-emerald-400 text-emerald-700 hover:bg-emerald-50"
      >
        <Plus size={22} />
        Adicionar parada
      </button>
    </>
  );
}
