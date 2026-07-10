"use client";

import type { ReactNode } from "react";

type InputProps = {
  label: string;
  value: string;
  onChange: (valor: string) => void;
  icon?: ReactNode;
  list?: string;
  type?: string;
  placeholder?: string;
};

export default function Input({
  label,
  value,
  onChange,
  icon,
  list,
  type = "text",
  placeholder,
}: InputProps) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-600">{label}</label>

      <div className="relative mt-2">
        {icon && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
            {icon}
          </div>
        )}

        <input
          type={type}
          value={value}
          list={list}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={`h-14 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-emerald-500 ${
            icon ? "pl-11" : ""
          }`}
        />
      </div>
    </div>
  );
}