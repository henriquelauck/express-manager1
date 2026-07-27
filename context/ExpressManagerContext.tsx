"use client";

import type { Cliente } from "@/types/Cliente";
import type { Motoboy } from "@/types/Motoboy";
import type { Tele } from "@/types/Tele";
import { createContext, useCallback, useContext, useEffect, useState } from "react";

export type MovimentoFinanceiroMotoboy = {
  id: string;
  motoboyId: string;
  motoboy: string;
  tipo: "CLIENTE" | "ESCRITORIO" | "AJUSTE";
  valor: number;
  descricao?: string;
  teleId?: string | null;
  fechamentoId?: string | null;
  criadoEm: string;
};

type ExpressManagerContextType = {
  clientes: Cliente[];
  motoboys: Motoboy[];
  teles: Tele[];
  movimentosFinanceirosMotoboy: MovimentoFinanceiroMotoboy[];

  setClientes: React.Dispatch<React.SetStateAction<Cliente[]>>;
  setMotoboys: React.Dispatch<React.SetStateAction<Motoboy[]>>;
  setTeles: React.Dispatch<React.SetStateAction<Tele[]>>;
  setMovimentosFinanceirosMotoboy: React.Dispatch<
    React.SetStateAction<MovimentoFinanceiroMotoboy[]>
  >;

  recarregarDados: () => Promise<void>;
};

const ExpressManagerContext = createContext<ExpressManagerContextType | null>(null);

async function buscarLista<T>(url: string, nome: string): Promise<T[]> {
  try {
    const resposta = await fetch(url, {
      cache: "no-store",
    });

    if (!resposta.ok) {
      let detalhe = "";

      try {
        const erro = await resposta.json();
        detalhe = erro?.erro ? `: ${erro.erro}` : "";
      } catch {}

      console.error(`Erro ao carregar ${nome}. HTTP ${resposta.status}${detalhe}`);

      return [];
    }

    const dados = await resposta.json();

    if (!Array.isArray(dados)) {
      console.error(`Resposta inválida ao carregar ${nome}: era esperada uma lista.`, dados);

      return [];
    }

    return dados as T[];
  } catch (erro) {
    console.error(`Não foi possível carregar ${nome}:`, erro);
    return [];
  }
}

export function ExpressManagerProvider({ children }: { children: React.ReactNode }) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [motoboys, setMotoboys] = useState<Motoboy[]>([]);
  const [teles, setTeles] = useState<Tele[]>([]);
  const [movimentosFinanceirosMotoboy, setMovimentosFinanceirosMotoboy] = useState<
    MovimentoFinanceiroMotoboy[]
  >([]);

  const recarregarDados = useCallback(async () => {
    const [clientesBanco, motoboysBanco, telesBanco, movimentosBanco] = await Promise.all([
      buscarLista<Cliente>("/api/clientes", "clientes"),
      buscarLista<Motoboy>("/api/motoboys", "motoboys"),
      buscarLista<Tele>("/api/teles", "teles"),
      buscarLista<MovimentoFinanceiroMotoboy>(
        "/api/movimentos-financeiros-motoboy",
        "movimentos financeiros dos motoboys"
      ),
    ]);

    setClientes(clientesBanco);
    setMotoboys(motoboysBanco);
    setTeles(telesBanco);
    setMovimentosFinanceirosMotoboy(movimentosBanco);
  }, []);

  useEffect(() => {
    void recarregarDados();
  }, [recarregarDados]);

  return (
    <ExpressManagerContext.Provider
      value={{
        clientes,
        motoboys,
        teles,
        movimentosFinanceirosMotoboy,
        setClientes,
        setMotoboys,
        setTeles,
        setMovimentosFinanceirosMotoboy,
        recarregarDados,
      }}
    >
      {children}
    </ExpressManagerContext.Provider>
  );
}

export function useExpressManager() {
  const context = useContext(ExpressManagerContext);

  if (!context) {
    throw new Error("useExpressManager deve ser usado dentro de ExpressManagerProvider");
  }

  return context;
}
