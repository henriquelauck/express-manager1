"use client";

import Link from "next/link";
import {
  Home,
  Truck,
  ClipboardList,
  Users,
  Bike,
  DollarSign,
  BarChart3,
  Settings,
  Package,
  FileText,
} from "lucide-react";

export default function Sidebar() {
  return (
    <aside className="w-[300px] min-h-screen bg-white border-r border-slate-200 p-6">
      <div className="flex items-center gap-3 mb-10">
        <Package className="w-12 h-12 text-emerald-600" />
        <div className="text-2xl font-bold leading-6">
          Express <br />
          <span className="text-emerald-600">Manager</span>
        </div>
      </div>

      <nav className="space-y-3">
        <MenuLink href="/" icon={<Home />} text="Dashboard" />
        <MenuLink href="/nova-tele" icon={<Truck />} text="Nova Tele" />
        <MenuLink href="/teles" icon={<ClipboardList />} text="Operações" />
        <MenuLink href="/clientes" icon={<Users />} text="Clientes" />
        <MenuLink href="/motoboys" icon={<Bike />} text="Motoboys" />
        <MenuLink href="/motoboys/extrato" icon={<ClipboardList />} text="Extrato Motoboys" />
        <MenuLink href="/financeiro" icon={<DollarSign />} text="Financeiro" />
        <MenuLink href="/configuracoes" icon={<Settings />} text="Configurações" />
        <MenuLink href="/configuracoes/logins" icon={<Settings />} text="Logins Motoboys"/>
        <MenuLink href="/extrato-geral" icon={<FileText />} text="Extrato Geral" />
                
      </nav>
    </aside>
  );
}

function MenuLink({ href, icon, text }: any) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 px-5 py-4 rounded-2xl text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition"
    >
      <div className="w-6 h-6">{icon}</div>
      <span className="font-medium">{text}</span>
    </Link>
  );
}