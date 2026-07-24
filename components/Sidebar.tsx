"use client";

import {
  BarChart3,
  Bike,
  ClipboardList,
  DollarSign,
  Home,
  KeyRound,
  LogOut,
  Package,
  Truck,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type Usuario = {
  nome?: string;
  role?: string;
};

type MenuLinkProps = {
  href: string;
  icon: React.ReactNode;
  text: string;
  ativo: boolean;
};

export default function Sidebar() {
  const pathname = usePathname();
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  useEffect(() => {
    let ativo = true;

    async function carregarUsuario() {
      try {
        const resposta = await fetch("/api/auth/me", {
          cache: "no-store",
        });

        if (!resposta.ok) return;

        const dados = await resposta.json();

        if (ativo) {
          setUsuario(dados.usuario || null);
        }
      } catch (erro) {
        console.error("Erro ao carregar usuário:", erro);
      }
    }

    void carregarUsuario();

    return () => {
      ativo = false;
    };
  }, []);

  async function logout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      });
    } finally {
      window.location.href = "/login";
    }
  }

  function rotaAtiva(href: string) {
    if (href === "/") {
      return pathname === "/";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const financeiroAtivo =
    rotaAtiva("/financeiro") ||
    rotaAtiva("/fechamentos") ||
    rotaAtiva("/extrato-geral") ||
    rotaAtiva("/motoboys/extrato");

  return (
    <aside className="flex min-h-screen w-[300px] max-w-[85vw] flex-col overflow-y-auto border-r border-slate-200 bg-white p-6">
      <div className="mb-10 flex items-center gap-3">
        <Package className="h-12 w-12 text-emerald-600" />

        <div className="text-2xl font-bold leading-6 text-slate-900">
          Express <br />
          <span className="text-emerald-600">Manager</span>
        </div>
      </div>

      <nav className="space-y-3">
        <MenuLink href="/" icon={<Home size={22} />} text="Dashboard" ativo={rotaAtiva("/")} />

        <MenuLink
          href="/nova-tele"
          icon={<Truck size={22} />}
          text="Nova Tele"
          ativo={rotaAtiva("/nova-tele")}
        />

        <MenuLink
          href="/teles"
          icon={<ClipboardList size={22} />}
          text="Operações"
          ativo={rotaAtiva("/teles")}
        />

        <MenuLink
          href="/financeiro"
          icon={<DollarSign size={22} />}
          text="Financeiro"
          ativo={financeiroAtivo}
        />

        <MenuLink
          href="/relatorios"
          icon={<BarChart3 size={22} />}
          text="Relatórios"
          ativo={rotaAtiva("/relatorios")}
        />

        <div className="my-4 border-t border-slate-100" />

        <MenuLink
          href="/clientes"
          icon={<Users size={22} />}
          text="Clientes"
          ativo={rotaAtiva("/clientes")}
        />

        <MenuLink
          href="/motoboys"
          icon={<Bike size={22} />}
          text="Motoboys"
          ativo={rotaAtiva("/motoboys")}
        />

        <MenuLink
          href="/configuracoes/logins"
          icon={<KeyRound size={22} />}
          text="Logins Motoboys"
          ativo={rotaAtiva("/configuracoes/logins")}
        />
      </nav>

      <div className="mt-auto border-t border-slate-200 pt-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <User size={20} />
          </div>

          <div className="min-w-0">
            <p className="truncate font-bold leading-5 text-slate-900">
              {usuario?.nome || "Usuário"}
            </p>

            <p className="text-sm text-slate-500">
              {usuario?.role === "MOTOBOY" ? "Motoboy" : "Gestor"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void logout()}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-red-50 text-red-600 transition hover:bg-red-100"
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </aside>
  );
}

function MenuLink({ href, icon, text, ativo }: MenuLinkProps) {
  return (
    <Link
      href={href}
      aria-current={ativo ? "page" : undefined}
      className={`flex items-center gap-4 rounded-2xl px-5 py-4 transition ${
        ativo
          ? "bg-emerald-100 font-semibold text-emerald-700"
          : "text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
      }`}
    >
      <div className="flex h-6 w-6 items-center justify-center">{icon}</div>

      <span>{text}</span>
    </Link>
  );
}
