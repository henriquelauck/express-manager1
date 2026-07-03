"use client";

import { Menu, X } from "lucide-react";
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
  const [menuAberto, setMenuAberto] = useState(false);

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

  useEffect(() => {
    setMenuAberto(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = menuAberto ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [menuAberto]);

  if (carregando) return null;

  if (rotaLogin) return <>{children}</>;

  if (usuario?.role === "MOTOBOY") return <>{children}</>;

  return (
    <ExpressManagerProvider>
      <div className="min-h-screen bg-[#f7f8fb]">
        <button
          onClick={() => setMenuAberto(true)}
          className="fixed top-4 left-4 z-40 w-12 h-12 rounded-2xl bg-white shadow border flex items-center justify-center"
        >
          <Menu size={24} />
        </button>

        {menuAberto && (
          <div className="fixed inset-0 z-50">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setMenuAberto(false)}
            />

            <div className="absolute left-0 top-0 h-full">
              <Sidebar />
            </div>

            <button
              onClick={() => setMenuAberto(false)}
              className="absolute top-4 right-4 w-11 h-11 rounded-2xl bg-white shadow flex items-center justify-center"
            >
              <X size={22} />
            </button>
          </div>
        )}

        <div className="pt-20">{children}</div>
      </div>
    </ExpressManagerProvider>
  );
}