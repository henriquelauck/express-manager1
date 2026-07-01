"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Cliente } from "@/types/Cliente";
import { Motoboy } from "@/types/Motoboy";
import { Tele } from "@/types/Tele";

type ExpressManagerContextType = {
  clientes: Cliente[];
  motoboys: Motoboy[];
  teles: Tele[];

  setClientes: (clientes: Cliente[]) => void;
  setMotoboys: (motoboys: Motoboy[]) => void;
  setTeles: (teles: Tele[]) => void;

  recarregarDados: () => Promise<void>;
};

const ExpressManagerContext = createContext<ExpressManagerContextType | null>(
  null
);

export function ExpressManagerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [motoboys, setMotoboys] = useState<Motoboy[]>([]);
  const [teles, setTeles] = useState<Tele[]>([]);

  async function recarregarDados() {
    const [respostaClientes, respostaMotoboys, respostaTeles] =
      await Promise.all([
        fetch("/api/clientes"),
        fetch("/api/motoboys"),
        fetch("/api/teles"),
      ]);

    const clientesBanco = await respostaClientes.json();
    const motoboysBanco = await respostaMotoboys.json();
    const telesBanco = await respostaTeles.json();

    setClientes(clientesBanco);
    setMotoboys(motoboysBanco);
    setTeles(telesBanco);
  }

  useEffect(() => {
    recarregarDados();
  }, []);

  return (
    <ExpressManagerContext.Provider
      value={{
        clientes,
        motoboys,
        teles,
        setClientes,
        setMotoboys,
        setTeles,
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
    throw new Error(
      "useExpressManager deve ser usado dentro de ExpressManagerProvider"
    );
  }

  return context;
}