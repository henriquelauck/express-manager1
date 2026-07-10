"use client";

import { AutocompleteEndereco } from "@/components/maps";
import type { Parada, TipoParada } from "@/types/Parada";
import { FileText, MapPin, Phone, Trash2, User } from "lucide-react";
import type { ReactNode } from "react";

type CardParadaProps = {
  parada: Parada;
  index: number;
  podeRemover: boolean;
  onAtualizar: (
    index: number,
    campo: keyof Parada,
    valor: string
  ) => void;
  onRemover: (index: number) => void;
};

export default function CardParada({
  parada,
  index,
  podeRemover,
  onAtualizar,
  onRemover,
}: CardParadaProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-xl font-bold">Parada {index + 1}</h3>

        <button
          type="button"
          onClick={() => onRemover(index)}
          disabled={!podeRemover}
          aria-label={`Excluir parada ${index + 1}`}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-100 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Trash2 size={18} />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <label className="text-sm font-medium text-slate-600">
            Tipo da parada
          </label>

          <select
            value={parada.tipo}
            onChange={(event) =>
              onAtualizar(
                index,
                "tipo",
                event.target.value as TipoParada
              )
            }
            className="mt-2 h-14 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-emerald-500"
          >
            <option value="Entrega">Entrega</option>
            <option value="Coleta">Coleta</option>
            <option value="Trocar">Trocar</option>
            <option value="Entrega e coleta">Entrega e coleta</option>
          </select>
        </div>

        <CampoTexto
          label="Nome do cliente"
          icon={<User size={18} />}
          value={parada.cliente}
          onChange={(valor) => onAtualizar(index, "cliente", valor)}
          list="locais-frequentes-lista"
        />

        <AutocompleteEndereco
          label="Endereço"
          icon={<MapPin size={18} />}
          value={parada.endereco}
          onChange={(valor: string) =>
            onAtualizar(index, "endereco", valor)
          }
        />

        <CampoTexto
          label="Contato"
          icon={<Phone size={18} />}
          value={parada.contato}
          onChange={(valor) => onAtualizar(index, "contato", valor)}
        />

        <div className="md:col-span-2">
          <CampoTexto
            label="Observação"
            icon={<FileText size={18} />}
            value={parada.observacao}
            onChange={(valor) =>
              onAtualizar(index, "observacao", valor)
            }
          />
        </div>
      </div>

      {(parada.tipo === "Trocar" ||
        parada.tipo === "Entrega e coleta") && (
        <p className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Essa parada adiciona automaticamente R$5,00 de retorno.
        </p>
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
};

function CampoTexto({
  label,
  value,
  onChange,
  icon,
  list,
}: CampoTextoProps) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-600">
        {label}
      </label>

      <div className="relative mt-2">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </div>
        )}

        <input
          value={value}
          list={list}
          onChange={(event) => onChange(event.target.value)}
          className={`h-14 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-emerald-500 ${
            icon ? "pl-11" : ""
          }`}
        />
      </div>
    </div>
  );
}