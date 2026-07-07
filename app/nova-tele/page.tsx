"use client";
import PageContainer from "@/components/ui/PageContainer";
import PageHeader from "@/components/ui/PageHeader";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useExpressManager } from "@/context/ExpressManagerContext";
import {
  ArrowRight,
  MapPin,
  Phone,
  User,
  FileText,
  Plus,
  Trash2,
} from "lucide-react";

type TipoParada = "Entrega" | "Coleta" | "Trocar" | "Entrega e coleta";

type Parada = {
  id: string;
  tipo: TipoParada;
  cliente: string;
  endereco: string;
  contato: string;
  observacao: string;
};
function gerarId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
export default function NovaTelePage() {
  const router = useRouter();
  const { clientes, recarregarDados } = useExpressManager();

  const [solicitante, setSolicitante] = useState("");
  const [dataTele, setDataTele] = useState(new Date().toISOString().split("T")[0]);
  const [valorBase, setValorBase] = useState("14,00");
  const [observacaoGeral, setObservacaoGeral] = useState("");
  const [salvando, setSalvando] = useState(false);
const [calculandoRota, setCalculandoRota] = useState(false);
const [rotaCalculada, setRotaCalculada] = useState<any>(null);
  const [paradas, setParadas] = useState<Parada[]>([
    {
      id: gerarId(),
      tipo: "Entrega",
      cliente: "",
      endereco: "",
      contato: "",
      observacao: "",
    },
  ]);

  function atualizarParada(index: number, campo: keyof Parada, valor: string) {
    const novasParadas = [...paradas];

    novasParadas[index] = {
      ...novasParadas[index],
      [campo]: valor,
    };

    if (campo === "cliente") {
      const clienteEncontrado = clientes.find(
        (cliente) => cliente.nome.toLowerCase() === valor.toLowerCase()
      );

      if (clienteEncontrado) {
        novasParadas[index].endereco = clienteEncontrado.endereco1 || "";
        novasParadas[index].contato = clienteEncontrado.telefone || "";
      }
    }

    setParadas(novasParadas);
  }

  function adicionarParada() {
    setParadas([
      ...paradas,
      {
        id: gerarId(),
        tipo: "Entrega",
        cliente: "",
        endereco: "",
        contato: "",
        observacao: "",
      },
    ]);
  }

  function removerParada(index: number) {
    if (paradas.length === 1) return;
    setParadas(paradas.filter((_, i) => i !== index));
  }

  function temRetorno() {
    return paradas.some(
      (parada) =>
        parada.tipo === "Trocar" || parada.tipo === "Entrega e coleta"
    );
  }

  function descobrirTipoRota() {
    if (paradas.length === 1) return paradas[0].tipo;
    if (temRetorno()) return "Rota com retorno";
    return "Rota com múltiplas paradas";
  }

  function converterValor(valor: string) {
    return Number(valor.replace(",", "."));
  }

  function formatarValor(valor: number) {
    return valor.toFixed(2).replace(".", ",");
  }

  function calcularRetorno() {
  const petexame = solicitante.toLowerCase().includes("petexame");

  if (petexame) return 0;

  return temRetorno() ? 5 : 0;
}

  function calcularTotal() {
    return converterValor(valorBase) + calcularRetorno();
  }

async function calcularRota() {
  const enderecosIncompletos = paradas.some((parada) => !parada.endereco);

  if (enderecosIncompletos) {
    alert("Preencha o endereço de todas as paradas.");
    return;
  }

  if (paradas.length < 2) {
    alert("Adicione pelo menos duas paradas para calcular a rota.");
    return;
  }

  setCalculandoRota(true);

  const resposta = await fetch("/api/maps/calcular-rota", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      paradas: paradas.map((parada) => ({
        endereco: parada.endereco,
      })),
      temRetorno: temRetorno(),
    }),
  });

  const dados = await resposta.json();

  setCalculandoRota(false);

  if (!resposta.ok) {
    alert(dados.erro || "Erro ao calcular rota.");
    return;
  }

  setRotaCalculada(dados);
  setValorBase(formatarValor(dados.valorSugerido - calcularRetorno()));
}

  async function criarTele() {
    if (!solicitante) {
      alert("Selecione o cliente solicitante.");
      return;
    }

    const paradaIncompleta = paradas.some(
      (parada) => !parada.cliente || !parada.endereco
    );

    if (paradaIncompleta) {
      alert("Preencha nome do cliente e endereço em todas as paradas.");
      return;
    }

    setSalvando(true);

    const base = converterValor(valorBase);
    const retorno = calcularRetorno();
    const total = calcularTotal();

    const resposta = await fetch("/api/teles", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dataTele,
        solicitante,
        motoboyId: null,
        motoboy: "",
        status: "Aguardando cliente",

        valorBase: base,
        retorno,
        espera: 0,
        total,
        distanciaKm: rotaCalculada?.distanciaKm || null,
        tempoMinutos: rotaCalculada?.duracaoMin || null,

        recebimento: "pendente",
        formaCobranca: "semanal",
        valorRecebido: 0,
        motoboyRecebedor: null,
        fechamentoId: null,

        observacaoGeral,
        paradas,

        tipoRota: descobrirTipoRota(),
        valor: formatarValor(total),
      }),
    });

    if (!resposta.ok) {
      alert("Erro ao salvar tele.");
      setSalvando(false);
      return;
    }

    await recarregarDados();

    setSalvando(false);
    router.push("/teles");
  }

  return (
    <PageContainer>
      <div className="mb-8">
        <PageHeader
    titulo="Nova Tele"
    descricao="Cadastre uma nova operação."
/>
      </div>

      <div className="bg-white rounded-3xl p-4 md:p-8 shadow-sm border border-slate-100 max-w-5xl">
        <div className="mb-8">
          <label className="text-sm font-medium text-slate-600">
            Cliente solicitante
          </label>

          <select
            value={solicitante}
            onChange={(e) => setSolicitante(e.target.value)}
            className="w-full mt-2 h-14 rounded-xl border border-slate-200 px-4 outline-none focus:border-emerald-500"
          >
            <option value="">Selecione o cliente solicitante</option>

            {clientes.map((cliente) => (
              <option key={cliente.id || cliente.nome} value={cliente.nome}>
                {cliente.nome}
              </option>
            ))}
          </select>
</div>

<div className="mb-8">
  <label className="text-sm font-medium text-slate-600">
    Data da tele
  </label>

  <input
    type="date"
    value={dataTele}
    onChange={(e) => setDataTele(e.target.value)}
    className="w-full mt-2 h-14 rounded-xl border border-slate-200 px-4 outline-none focus:border-emerald-500"
  />
</div>

        <h2 className="text-2xl font-bold mb-4">Rota</h2>

        <div className="space-y-6">
          {paradas.map((parada, index) => (
            <div
              key={parada.id}
              className="border border-slate-200 rounded-3xl p-6 bg-white"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xl font-bold">Parada {index + 1}</h3>

                <button
                  onClick={() => removerParada(index)}
                  className="w-10 h-10 rounded-xl border border-red-100 text-red-600 flex items-center justify-center hover:bg-red-50"
                >
                  <Trash2 size={18} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="text-sm font-medium text-slate-600">
                    Tipo da parada
                  </label>

                  <select
                    value={parada.tipo}
                    onChange={(e) =>
                      atualizarParada(index, "tipo", e.target.value)
                    }
                    className="w-full mt-2 h-14 rounded-xl border border-slate-200 px-4 outline-none focus:border-emerald-500"
                  >
                    <option>Entrega</option>
                    <option>Coleta</option>
                    <option>Trocar</option>
                    <option>Entrega e coleta</option>
                  </select>
                </div>

                <Input
                  label="Nome do cliente"
                  icon={<User size={18} />}
                  value={parada.cliente}
                  onChange={(value: string) =>
                    atualizarParada(index, "cliente", value)
                  }
                  list="clientes-lista"
                />

                <Input
                  label="Contato"
                  icon={<Phone size={18} />}
                  value={parada.contato}
                  onChange={(value: string) =>
                    atualizarParada(index, "contato", value)
                  }
                />

                <Input
                  label="Endereço"
                  icon={<MapPin size={18} />}
                  value={parada.endereco}
                  onChange={(value: string) =>
                    atualizarParada(index, "endereco", value)
                  }
                />

                <div className="md:col-span-2">
                  <Input
                    label="Observação"
                    icon={<FileText size={18} />}
                    value={parada.observacao}
                    onChange={(value: string) =>
                      atualizarParada(index, "observacao", value)
                    }
                  />
                </div>
              </div>

              {(parada.tipo === "Trocar" ||
                parada.tipo === "Entrega e coleta") && (
                <p className="text-sm text-emerald-700 bg-emerald-50 px-4 py-3 rounded-xl mt-5">
                  Essa parada adiciona automaticamente R$5,00 de retorno.
                </p>
              )}
            </div>
          ))}
        </div>

        <datalist id="clientes-lista">
          {clientes.map((cliente) => (
            <option key={cliente.id || cliente.nome} value={cliente.nome} />
          ))}
        </datalist>

        <button
          onClick={adicionarParada}
          className="w-full mt-6 h-14 rounded-2xl border border-dashed border-emerald-400 text-emerald-700 flex items-center justify-center gap-2 hover:bg-emerald-50"
        >
          <Plus size={22} />
          Adicionar parada
        </button>

        <div className="grid-cols-1 md:grid-cols-2">
          <Input
            label="Valor base"
            value={valorBase}
            onChange={setValorBase}
          />

          <Input
            label="Observação geral"
            value={observacaoGeral}
            onChange={setObservacaoGeral}
          />

<button
  type="button"
  onClick={calcularRota}
  disabled={calculandoRota}
  className="w-full md:col-span-2 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center gap-2 disabled:opacity-50"
>
  {calculandoRota ? "Calculando rota..." : "Calcular rota"}
</button>

{rotaCalculada && (
  <div className="md:col-span-2 bg-emerald-50 border border-emerald-100 rounded-2xl p-5 text-sm text-emerald-800">
    <p>
      Distância: <strong>{rotaCalculada.distanciaKm.toFixed(1)} km</strong>
    </p>

    <p>
      Tempo estimado: <strong>{rotaCalculada.duracaoMin} min</strong>
    </p>

    <p>
      Valor sugerido:{" "}
      <strong>R$ {formatarValor(rotaCalculada.valorSugerido)}</strong>
    </p>

{rotaCalculada?.enderecosEncontrados && (
  <div className="mt-3 space-y-1">
    <p className="font-bold">Endereços encontrados:</p>

    {rotaCalculada.enderecosEncontrados.map((endereco: string, index: number) => (
      <p key={index}>
        {index + 1}. {endereco}
      </p>
    ))}
  </div>
)}

    {rotaCalculada.origemEncontrada && (
      <p className="mt-2">
        Origem encontrada: <strong>{rotaCalculada.origemEncontrada}</strong>
      </p>
    )}

    {rotaCalculada.destinoEncontrado && (
      <p>
        Destino encontrado: <strong>{rotaCalculada.destinoEncontrado}</strong>
      </p>
    )}
  </div>
)}
          <div className="md:col-span-2 bg-slate-50 rounded-2xl p-5">
            <div className="flex justify-between text-sm mb-2">
              <span>Valor base</span>
              <strong>R$ {formatarValor(converterValor(valorBase))}</strong>
            </div>

            <div className="flex justify-between text-sm mb-2">
              <span>Retorno</span>
              <strong>R$ {formatarValor(calcularRetorno())}</strong>
            </div>

            <div className="flex justify-between text-sm mb-4">
              <span>Espera</span>
              <strong>R$ 0,00</strong>
            </div>

            <div className="border-t border-slate-200 pt-4 flex justify-between items-center">
              <span className="font-bold">Total</span>
              <h2 className="text-3xl font-bold text-emerald-700">
                R$ {formatarValor(calcularTotal())}
              </h2>
            </div>

            <p className="text-sm text-slate-500 mt-2">
              Tipo: {descobrirTipoRota()}
            </p>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={criarTele}
            disabled={salvando}
            className="w-full md:w-auto bg-emerald-600 text-white px-7 py-4 rounded-2xl flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
          >
            {salvando ? "Salvando..." : "Continuar"}
            <ArrowRight size={22} />
          </button>
        </div>
      </div>
    </PageContainer>
  );
}

function Input({ label, value, onChange, icon, list }: any) {
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
          value={value}
          list={list}
          onChange={(e) => onChange(e.target.value)}
          className={`w-full h-14 rounded-xl border border-slate-200 px-4 outline-none focus:border-emerald-500 ${
            icon ? "pl-11" : ""
          }`}
        />
      </div>
    </div>
  );
}