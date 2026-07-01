"use client";

import { useState } from "react";
import { Plus, Users, Pencil, Phone, MapPin, List } from "lucide-react";
import { useExpressManager } from "@/context/ExpressManagerContext";

export default function ClientesPage() {
  const { clientes, setClientes } = useExpressManager();

  const [tela, setTela] = useState<"lista" | "cadastro">("lista");
  const [editandoIndex, setEditandoIndex] = useState<number | null>(null);
  const [salvando, setSalvando] = useState(false);

  const [form, setForm] = useState({
    nome: "",
    telefone: "",
    endereco1: "",
    endereco2: "",
  });

  async function recarregarClientes() {
    const resposta = await fetch("/api/clientes");
    const clientesAtualizados = await resposta.json();
    setClientes(clientesAtualizados);
  }

  function abrirCadastro() {
    setEditandoIndex(null);
    setForm({ nome: "", telefone: "", endereco1: "", endereco2: "" });
    setTela("cadastro");
  }

  function abrirEdicao(index: number) {
    setEditandoIndex(index);
    setForm({
      nome: clientes[index].nome || "",
      telefone: clientes[index].telefone || "",
      endereco1: clientes[index].endereco1 || "",
      endereco2: clientes[index].endereco2 || "",
    });
    setTela("cadastro");
  }

  async function salvarCliente() {
    if (!form.nome || !form.telefone || !form.endereco1) return;

    setSalvando(true);

    const editando = editandoIndex !== null;
    const clienteAtual = editando ? clientes[editandoIndex] : null;

    await fetch("/api/clientes", {
      method: editando ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: clienteAtual?.id,
        nome: form.nome,
        telefone: form.telefone,
        endereco1: form.endereco1,
        endereco2: form.endereco2,
      }),
    });

    await recarregarClientes();

    setForm({ nome: "", telefone: "", endereco1: "", endereco2: "" });
    setEditandoIndex(null);
    setTela("lista");
    setSalvando(false);
  }

  return (
    <main className="min-h-screen bg-[#f7f8fb] p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold">Clientes</h1>
          <p className="text-slate-500 mt-2">
            Cadastre, edite e consulte seus clientes.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setTela("lista")}
            className={`px-6 py-4 rounded-2xl flex items-center gap-2 shadow-sm ${
              tela === "lista"
                ? "bg-emerald-600 text-white"
                : "bg-white text-slate-700"
            }`}
          >
            <List size={22} />
            Lista de clientes
          </button>

          <button
            onClick={abrirCadastro}
            className={`px-6 py-4 rounded-2xl flex items-center gap-2 shadow-sm ${
              tela === "cadastro"
                ? "bg-emerald-600 text-white"
                : "bg-white text-slate-700"
            }`}
          >
            <Plus size={22} />
            Cadastrar cliente
          </button>
        </div>
      </div>

      {tela === "lista" && (
        <div className="grid grid-cols-3 gap-6">
          {clientes.map((cliente, index) => (
            <div
              key={cliente.id || index}
              className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100"
            >
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Users size={30} />
                  </div>

                  <div>
                    <h2 className="text-xl font-bold">{cliente.nome}</h2>
                    <p className="text-sm text-slate-500">Cliente cadastrado</p>
                  </div>
                </div>

                <button
                  onClick={() => abrirEdicao(index)}
                  className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50"
                >
                  <Pencil size={18} />
                </button>
              </div>

              <div className="space-y-3 text-sm text-slate-600">
                <p className="flex items-center gap-2">
                  <Phone size={16} /> {cliente.telefone}
                </p>

                <p className="flex items-start gap-2">
                  <MapPin size={16} className="mt-1" />
                  <span>{cliente.endereco1}</span>
                </p>

                {cliente.endereco2 && (
                  <p className="flex items-start gap-2">
                    <MapPin size={16} className="mt-1" />
                    <span>{cliente.endereco2}</span>
                  </p>
                )}
              </div>
            </div>
          ))}

          {clientes.length === 0 && (
            <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
              <h2 className="text-xl font-bold">Nenhum cliente cadastrado</h2>
              <p className="text-slate-500 mt-2">
                Clique em Cadastrar cliente para adicionar o primeiro.
              </p>
            </div>
          )}
        </div>
      )}

      {tela === "cadastro" && (
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 max-w-3xl">
          <h2 className="text-2xl font-bold mb-6">
            {editandoIndex !== null ? "Editar cliente" : "Cadastrar cliente"}
          </h2>

          <div className="space-y-5">
            <Input
              label="Nome do cliente"
              value={form.nome}
              onChange={(value: string) => setForm({ ...form, nome: value })}
            />

            <Input
              label="Telefone"
              value={form.telefone}
              onChange={(value: string) =>
                setForm({ ...form, telefone: value })
              }
            />

            <Input
              label="Endereço 1"
              value={form.endereco1}
              onChange={(value: string) =>
                setForm({ ...form, endereco1: value })
              }
            />

            <Input
              label="Endereço 2"
              value={form.endereco2}
              onChange={(value: string) =>
                setForm({ ...form, endereco2: value })
              }
            />
          </div>

          <div className="flex justify-end gap-3 mt-8">
            <button
              onClick={() => setTela("lista")}
              className="px-5 py-3 rounded-xl border border-slate-200"
            >
              Cancelar
            </button>

            <button
              onClick={salvarCliente}
              disabled={salvando}
              className="px-5 py-3 rounded-xl bg-emerald-600 text-white disabled:opacity-50"
            >
              {salvando
                ? "Salvando..."
                : editandoIndex !== null
                ? "Salvar alterações"
                : "Salvar cliente"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function Input({ label, value, onChange }: any) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-600">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-2 h-12 rounded-xl border border-slate-200 px-4 outline-none focus:border-emerald-500"
      />
    </div>
  );
}