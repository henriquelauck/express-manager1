"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { ExpressManagerProvider } from "@/context/ExpressManagerContext";

export default function AppProtegido({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [carregando, setCarregando] = useState(true);
  const [usuario, setUsuario] = useState<any>(null);

  const rotaLogin = pathname === "/login";

  useEffect(() => {
    async function verificarLogin() {
      if (rotaLogin) {
        setCarregando(false);
        return;
      }

      const resposta = await fetch("/api/auth/me");

      if (!resposta.ok) {
        router.push("/login");
        return;
      }

      const dados = await resposta.json();
      setUsuario(dados.usuario);
      setCarregando(false);
    }

    verificarLogin();
  }, [rotaLogin, router]);

  if (carregando) return null;

  if (rotaLogin) {
    return <>{children}</>;
  }

  if (usuario?.role === "MOTOBOY") {
    return <>{children}</>;
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