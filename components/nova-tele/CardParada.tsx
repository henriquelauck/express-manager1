"use client";

import { AutocompleteEndereco } from "@/components/maps";
import type { Parada, TipoParada } from "@/types/Parada";
import {
  FileText,
  MapPin,
  PackageCheck,
  PackageOpen,
  Phone,
  RefreshCw,
  Trash2,
  User,
} from "lucide-react";
import type { ReactNode } from "react";

type CardParadaProps = {
  parada: Parada;
  index: number;
  podeRemover: boolean;
  onAtualizar: (index: number, campo: keyof Parada, valor: string) => void;
  onRemover: (index: number) => void;
};

const tipoParadaConfig: Record<
  TipoParada,
  {
    titulo: string;
    descricao: string;
    icone: ReactNode;
    badge: string;
    borda: string;
  }
> = {
  Coleta: {
    titulo: "Coleta",
    descricao: "Local onde o motoboy irá buscar o item.",
    icone: <PackageOpen size={20} />,
    badge: "bg-blue-100 text-blue-700",
    borda: "border-blue-200",
  },
  Entrega: {
    titulo: "Entrega",
    descricao: "Destino onde o item será entregue.",
    icone: <PackageCheck size={20} />,
    badge: "bg-emerald-100 text-emerald-700",
    borda: "border-emerald-200",
  },
  Trocar: {
    titulo: "Trocar",
    descricao: "Entrega um item e recolhe outro no mesmo local.",
    icone: <RefreshCw size={20} />,
    badge: "bg-violet-100 text-violet-700",
    borda: "border-violet-200",
  },
  "Entrega e coleta": {
    titulo: "Entrega e coleta",
    descricao: "Realiza uma entrega e também uma coleta no local.",
    icone: <RefreshCw size={20} />,
    badge: "bg-orange-100 text-orange-700",
    borda: "border-orange-200",
  },
};

export default function CardParada({
  parada,
  index,
  podeRemover,
  onAtualizar,
  onRemover,
}: CardParadaProps) {
  const tipoConfig = tipoParadaConfig[parada.tipo];

  return (
    <div className={`overflow-hidden rounded-3xl border bg-white shadow-sm ${tipoConfig.borda}`}>
      <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/70 px-5 py-5 md:flex-row md:items-center md:justify-between md:px-6">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tipoConfig.badge}`}
          >
            {tipoConfig.icone}
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900">Parada {index + 1}</h3>

              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tipoConfig.badge}`}>
                {tipoConfig.titulo}
              </span>
            </div>

            <p className="mt-1 text-sm text-slate-500">{tipoConfig.descricao}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onRemover(index)}
          disabled={!podeRemover}
          aria-label={`Excluir parada ${index + 1}`}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-red-100 bg-white px-4 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 md:w-auto"
        >
          <Trash2 size={17} />
          Remover
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-2 md:p-6">
        <div>
          <label className="text-sm font-medium text-slate-600">Tipo da parada</label>

          <select
            value={parada.tipo}
            onChange={(event) => onAtualizar(index, "tipo", event.target.value as TipoParada)}
            className="mt-2 h-14 w-full rounded-xl border border-slate-200 bg-white px-4 text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
          >
            <option value="Entrega">Entrega</option>
            <option value="Coleta">Coleta</option>
            <option value="Trocar">Trocar</option>
            <option value="Entrega e coleta">Entrega e coleta</option>
          </select>
        </div>

        <CampoTexto
          label="Nome do local ou cliente"
          icon={<User size={18} />}
          value={parada.cliente}
          onChange={(valor) => onAtualizar(index, "cliente", valor)}
          list="locais-frequentes-lista"
          placeholder="Ex.: SaveCell ou João"
        />

        <AutocompleteEndereco
          label="Endereço"
          icon={<MapPin size={18} />}
          value={parada.endereco}
          onChange={(valor: string) => onAtualizar(index, "endereco", valor)}
        />

        <CampoTexto
          label="Contato"
          icon={<Phone size={18} />}
          value={parada.contato}
          onChange={(valor) => onAtualizar(index, "contato", valor)}
          placeholder="Telefone ou nome do contato"
          opcional
        />

        <div className="md:col-span-2">
          <CampoObservacao
            label="Observação"
            icon={<FileText size={18} />}
            value={parada.observacao}
            onChange={(valor) => onAtualizar(index, "observacao", valor)}
            placeholder="Ex.: cobrar produto, tocar interfone, pacote frágil..."
          />
        </div>
      </div>

      {(parada.tipo === "Trocar" || parada.tipo === "Entrega e coleta") && (
        <div className="border-t border-emerald-100 bg-emerald-50 px-5 py-4 text-sm text-emerald-700 md:px-6">
          Esta parada adiciona automaticamente <strong>R$ 5,00 de retorno</strong>.
        </div>
      )}
    </div>
  );
}

type CampoTextoProps = {
  label: string;
  value: string;
  onChange: (valor: string) => void;
  icon?: ReactNode;
  list?: string;
  placeholder?: string;
  opcional?: boolean;
};

function CampoTexto({
  label,
  value,
  onChange,
  icon,
  list,
  placeholder,
  opcional,
}: CampoTextoProps) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-slate-600">{label}</label>

        {opcional && <span className="text-xs text-slate-400">Opcional</span>}
      </div>

      <div className="relative mt-2">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">{icon}</div>
        )}

        <input
          value={value}
          list={list}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={`h-14 w-full rounded-xl border border-slate-200 bg-white px-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 ${
            icon ? "pl-11" : ""
          }`}
        />
      </div>
    </div>
  );
}

type CampoObservacaoProps = {
  label: string;
  value: string;
  onChange: (valor: string) => void;
  icon?: ReactNode;
  placeholder?: string;
};

function CampoObservacao({ label, value, onChange, icon, placeholder }: CampoObservacaoProps) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-slate-600">{label}</label>

        <span className="text-xs text-slate-400">Opcional</span>
      </div>

      <div className="relative mt-2">
        {icon && <div className="absolute left-4 top-4 text-slate-400">{icon}</div>}

        <textarea
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          rows={3}
          className={`min-h-24 w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 ${
            icon ? "pl-11" : ""
          }`}
        />
      </div>
    </div>
  );
}
