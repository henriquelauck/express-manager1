"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Home,
  Truck,
  ClipboardList,
  Users,
  Bike,
  DollarSign,
  Package,
  FileText,
  KeyRound,
  LogOut,
  User,
  ReceiptText,
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const [usuario, setUsuario] = useState<any>(null);

  useEffect(() => {
    async function carregarUsuario() {
      const resposta = await fetch("/api/auth/me");
      const dados = await resposta.json();
      setUsuario(dados.usuario);
    }

    carregarUsuario();
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", {
      method: "POST",
    });

    window.location.href = "/login";
  }

  return (
    <aside className="w-[300px] max-w-[85vw] min-h-screen bg-white border-r border-slate-200 p-6 overflow-y-auto flex flex-col">
      <div className="flex items-center gap-3 mb-10">
        <Package className="w-12 h-12 text-emerald-600" />
        <div className="text-2xl font-bold leading-6">
          Express <br />
          <span className="text-emerald-600">Manager</span>
        </div>
      </div>

      <nav className="space-y-3">
        <MenuLink href="/" icon={<Home />} text="Dashboard" ativo={pathname === "/"} />
        <MenuLink href="/nova-tele" icon={<Truck />} text="Nova Tele" ativo={pathname === "/nova-tele"} />
        <MenuLink href="/teles" icon={<ClipboardList />} text="Operações" ativo={pathname === "/teles"} />
        <MenuLink href="/financeiro" icon={<DollarSign />} text="Financeiro" ativo={pathname === "/financeiro"} />
        <MenuLink href="/fechamentos" icon={<ReceiptText />}text="Fechamentos" ativo={pathname === "/fechamentos"}/>
        <MenuLink href="/extrato-geral" icon={<FileText />} text="Extrato Geral" ativo={pathname === "/extrato-geral"} />
                <div className="border-t border-slate-100 my-4" />

        <MenuLink href="/clientes" icon={<Users />} text="Clientes" ativo={pathname === "/clientes"} />
        <MenuLink href="/motoboys" icon={<Bike />} text="Motoboys" ativo={pathname === "/motoboys"} />
        <MenuLink href="/motoboys/extrato" icon={<DollarSign />} text="Financeiro Motoboys" ativo={pathname === "/motoboys/extrato"} />
        <MenuLink href="/configuracoes/logins" icon={<KeyRound />} text="Logins Motoboys" ativo={pathname === "/configuracoes/logins"} />
      </nav>

      <div className="mt-auto pt-6 border-t border-slate-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <User size={20} />
          </div>

          <div>
            <p className="font-bold leading-5">
              {usuario?.nome || "Usuário"}
            </p>
            <p className="text-sm text-slate-500">
              {usuario?.role === "MOTOBOY" ? "Motoboy" : "Gestor"}
            </p>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full h-12 rounded-2xl bg-red-50 text-red-600 hover:bg-red-100 transition flex items-center justify-center gap-2"
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </aside>
  );
}

function MenuLink({ href, icon, text, ativo }: any) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition ${
        ativo
          ? "bg-emerald-100 text-emerald-700 font-semibold"
          : "text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
      }`}
    >
      <div className="w-6 h-6">{icon}</div>
      <span>{text}</span>
    </Link>
  );
}