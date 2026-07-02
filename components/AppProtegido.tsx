"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { ExpressManagerProvider } from "@/context/ExpressManagerContext";
import LoginGestor from "@/components/LoginGestor";

export default function AppProtegido({
  children,
}: {
  children: React.ReactNode;
}) {
  const [logado, setLogado] = useState(false);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const tipoLogin = localStorage.getItem("express_tipo_login");

    if (tipoLogin === "gestor") {
      setLogado(true);
    }

    setCarregando(false);
  }, []);

  if (carregando) {
    return null;
  }

  if (!logado) {
    return <LoginGestor onEntrar={() => setLogado(true)} />;
  }

  return (
    <ExpressManagerProvider>
      <div className="flex min-h-screen bg-[#f7f8fb]">
        <Sidebar />
        <div className="flex-1">{children}</div>
      </div>
    </ExpressManagerProvider>
  );
}