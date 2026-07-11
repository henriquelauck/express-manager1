"use client";

import { Cliente } from "@/types/Cliente";
import { Motoboy } from "@/types/Motoboy";
import { Tele } from "@/types/Tele";
import { createContext, useContext, useEffect, useState } from "react";

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

  setClientes: (clientes: Cliente[]) => void;
  setMotoboys: (motoboys: Motoboy[]) => void;
  setTeles: (teles: Tele[]) => void;
  setMovimentosFinanceirosMotoboy: (movimentos: MovimentoFinanceiroMotoboy[]) => void;

  recarregarDados: () => Promise<void>;
};

const ExpressManagerContext = createContext<ExpressManagerContextType | null>(null);

export function ExpressManagerProvider({ children }: { children: React.ReactNode }) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [motoboys, setMotoboys] = useState<Motoboy[]>([]);
  const [teles, setTeles] = useState<Tele[]>([]);
  const [movimentosFinanceirosMotoboy, setMovimentosFinanceirosMotoboy] = useState<
    MovimentoFinanceiroMotoboy[]
  >([]);

  async function recarregarDados() {
    const [respostaClientes, respostaMotoboys, respostaTeles, respostaMovimentos] =
      await Promise.all([
        fetch("/api/clientes"),
        fetch("/api/motoboys"),
        fetch("/api/teles"),
        fetch("/api/movimentos-financeiros-motoboy"),
      ]);

    const clientesBanco = await respostaClientes.json();
    const motoboysBanco = await respostaMotoboys.json();
    const telesBanco = await respostaTeles.json();
    const movimentosBanco = await respostaMovimentos.json();

    setClientes(clientesBanco);
    setMotoboys(motoboysBanco);
    setTeles(telesBanco);
    setMovimentosFinanceirosMotoboy(Array.isArray(movimentosBanco) ? movimentosBanco : []);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void recarregarDados();
  }, []);

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
