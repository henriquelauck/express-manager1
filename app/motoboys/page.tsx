"use client";
import PageContainer from "@/components/ui/PageContainer";
import PageHeader from "@/components/ui/PageHeader";
import { useState } from "react";
import {
  Plus,
  Bike,
  Phone,
  ClipboardList,
  DollarSign,
  Pencil,
} from "lucide-react";
import { useExpressManager } from "@/context/ExpressManagerContext";
import { Motoboy } from "@/types/Motoboy";

export default function MotoboysPage() {
  const { motoboys, setMotoboys, teles } = useExpressManager();

  const [modalAberto, setModalAberto] = useState(false);
  const [editandoIndex, setEditandoIndex] = useState<number | null>(null);

  const [form, setForm] = useState({
    nome: "",
    telefone: "",
    moto: "",
    placa: "",
  });

  function abrirCadastro() {
    setEditandoIndex(null);
    setForm({ nome: "", telefone: "", moto: "", placa: "" });
    setModalAberto(true);
  }

  function abrirEdicao(index: number) {
    setEditandoIndex(index);
    setForm(motoboys[index]);
    setModalAberto(true);
  }

  async function salvarMotoboy() {
  if (!form.nome || !form.telefone || !form.moto || !form.placa) {
    alert("Preencha todos os campos.");
    return;
  }

  const editando = editandoIndex !== null;
  const motoboyAtual = editando ? motoboys[editandoIndex] : null;

  const resposta = await fetch("/api/motoboys", {
    method: editando ? "PUT" : "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id: motoboyAtual?.id,
      nome: form.nome,
      telefone: form.telefone,
      moto: form.moto,
      placa: form.placa,
    }),
  });

  if (!resposta.ok) {
    alert("Erro ao salvar motoboy.");
    return;
  }

  const respostaLista = await fetch("/api/motoboys");
  const motoboysAtualizados = await respostaLista.json();

  setMotoboys(motoboysAtualizados);

  setForm({ nome: "", telefone: "", moto: "", placa: "" });
  setEditandoIndex(null);
  setModalAberto(false);
}
function converterValor(valor: string) {
  return Number(valor.replace(",", "."));
}

function formatarValor(valor: number) {
  return valor.toFixed(2).replace(".", ",");
}

function dataDaTele(criadoEm: string) {
  return criadoEm.split(",")[0];
}

function resumoMotoboy(nome: string, periodo: "hoje" | "semana" | "mes") {
  const hoje = new Date();
  const hojeBR = hoje.toLocaleDateString("pt-BR");

  const primeiroDiaSemana = new Date(hoje);
  primeiroDiaSemana.setDate(hoje.getDate() - hoje.getDay());

  const telesFiltradas = teles.filter((tele: any) => {
    if (tele.motoboy !== nome) return false;

    const dataBR = dataDaTele(tele.criadoEm);
    const [dia, mes, ano] = dataBR.split("/");
    const dataTele = new Date(Number(ano), Number(mes) - 1, Number(dia));

    if (periodo === "hoje") return dataBR === hojeBR;

    if (periodo === "semana") return dataTele >= primeiroDiaSemana;

    return (
      dataTele.getMonth() === hoje.getMonth() &&
      dataTele.getFullYear() === hoje.getFullYear()
    );
  });

  const total = telesFiltradas.reduce(
    (soma: number, tele: any) => soma + converterValor(tele.valor),
    0
  );

  return {
    entregas: telesFiltradas.length,
    valor: `R$ ${formatarValor(total)}`,
  };
}
  return (
    <PageContainer>
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
        <div>
          <PageHeader
  titulo="Motoboys"
  descricao="Cadastre e acompanhe o desempenho dos motoboys."
/>
        </div>

        <button
          onClick={abrirCadastro}
          className="w-full lg:w-auto bg-emerald-600 text-white px-6 py-4 rounded-2xl flex items-center justify-center gap-2 shadow-sm"
        >
          <Plus size={22} />
          Cadastrar motoboy
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {motoboys.map((motoboy, index) => (
          <div
            key={motoboy.id || index}
            className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Bike size={30} />
                </div>

                <div>
                  <h2 className="text-xl font-bold">{motoboy.nome}</h2>
                  <p className="text-sm text-slate-500">{motoboy.moto}</p>
                </div>
              </div>

              <button
                onClick={() => abrirEdicao(index)}
                className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50"
              >
                <Pencil size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
  <Resumo
    titulo="Hoje"
    entregas={resumoMotoboy(motoboy.nome, "hoje").entregas}
    valor={resumoMotoboy(motoboy.nome, "hoje").valor}
  />

  <Resumo
    titulo="Semana"
    entregas={resumoMotoboy(motoboy.nome, "semana").entregas}
    valor={resumoMotoboy(motoboy.nome, "semana").valor}
  />

  <Resumo
    titulo="Mês"
    entregas={resumoMotoboy(motoboy.nome, "mes").entregas}
    valor={resumoMotoboy(motoboy.nome, "mes").valor}
  />
</div>

            
          </div>
        ))}
      </div>

      {modalAberto && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white w-[95vw] max-w-[500px] rounded-3xl p-5 md:p-8 shadow-xl">
            <h2 className="text-2xl font-bold mb-6">
              {editandoIndex !== null ? "Editar motoboy" : "Cadastrar motoboy"}
            </h2>

            <div className="space-y-4">
              <Input
                label="Nome do motoboy"
                value={form.nome}
                onChange={(value: string) =>
                  setForm({ ...form, nome: value })
                }
              />

              <Input
                label="Telefone"
                value={form.telefone}
                onChange={(value: string) =>
                  setForm({ ...form, telefone: value })
                }
              />

              <Input
                label="Modelo da moto"
                value={form.moto}
                onChange={(value: string) =>
                  setForm({ ...form, moto: value })
                }
              />

              <Input
                label="Placa"
                value={form.placa}
                onChange={(value: string) =>
                  setForm({ ...form, placa: value.toUpperCase() })
                }
              />
            </div>

            <div className="flex flex-col md:flex-row md:justify-end gap-3 mt-8">
              <button
                onClick={() => setModalAberto(false)}
                className="w-full md:w-auto px-5 py-3 rounded-xl border border-slate-200"
              >
                Cancelar
              </button>

              <button
                onClick={salvarMotoboy}
                className="w-full md:w-auto px-5 py-3 rounded-xl bg-emerald-600 text-white"
              >
                {editandoIndex !== null
                  ? "Salvar alterações"
                  : "Salvar motoboy"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
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

function Resumo({ titulo, entregas, valor }: any) {
  return (
    <div className="bg-slate-50 rounded-2xl p-4">
      <p className="text-xs text-slate-500 mb-2">{titulo}</p>
      <p className="flex items-center gap-1 text-sm font-bold">
        <ClipboardList size={14} />
        {entregas}
      </p>
      <p className="flex items-center gap-1 text-sm font-bold text-emerald-700 mt-1">
        <DollarSign size={14} />
        {valor}
      </p>
    </div>
  );
}