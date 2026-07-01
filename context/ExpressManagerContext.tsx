"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Cliente } from "@/types/Cliente";
import { Motoboy } from "@/types/Motoboy";
import { Tele } from "@/types/Tele";
import { carregarDados, salvarDados } from "@/lib/storage";

type ExpressManagerContextType = {
  clientes: Cliente[];
  motoboys: Motoboy[];
  teles: Tele[];

  setClientes: (clientes: Cliente[]) => void;
  setMotoboys: (motoboys: Motoboy[]) => void;
  setTeles: (teles: Tele[]) => void;
};

const ExpressManagerContext = createContext<ExpressManagerContextType | null>(
  null
);

export function ExpressManagerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [carregou, setCarregou] = useState(false);

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [motoboys, setMotoboys] = useState<Motoboy[]>([]);
  const [teles, setTeles] = useState<Tele[]>([]);

  useEffect(() => {
    setClientes(carregarDados<Cliente[]>("clientes", []));
    setMotoboys(carregarDados<Motoboy[]>("motoboys", []));
    setTeles(carregarDados<Tele[]>("teles", []));
    setCarregou(true);
  }, []);

  useEffect(() => {
  async function carregarTudo() {
    const respostaClientes = await fetch("/api/clientes");
    const clientesBanco = await respostaClientes.json();

    const respostaMotoboys = await fetch("/api/motoboys");
    const motoboysBanco = await respostaMotoboys.json();

    setClientes(clientesBanco);
    setMotoboys(motoboysBanco);

    setTeles(carregarDados<Tele[]>("teles", []));

    setCarregou(true);
  }

  carregarTudo();
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