"use client";
import FloatingButton from "@/components/FloatingButton";
import { useExpressManager } from "@/context/ExpressManagerContext";
import Link from "next/link";
import { useState } from "react";
import {
  ClipboardList,
  Pencil,
  Trash2,
  MapPin,
  Phone,
  User,
  Bike,
  Timer,
  MessageCircle,
  Send,
  X,
  Plus,
} from "lucide-react";

type Motoboy = {
  nome: string;
  telefone: string;
  moto: string;
  placa: string;
};

type Cliente = {
  nome: string;
  telefone: string;
  endereco1: string;
  endereco2: string;
};

type Parada = {
  id?: string;
  tipo: string;
  cliente?: string;
  nomeCliente?: string;
  endereco: string;
  contato: string;
  observacao: string;
};

type Tele = {
  id: string;
  solicitante: string;
  tipoRota: string;
  nomeCliente: string;
  endereco: string;
  contato: string;
  observacao: string;
  valor: string;
  status: string;
  criadoEm: string;
  motoboy?: string;
  esperaMinutos?: number;
  valorBase?: number;
  retorno?: number;
  espera?: number;
  total?: number;
  paradas?: Parada[];
};

const statusOptions = [
  "Aguardando cliente",
  "Aguardando motoboy disponível",
  "Em rota",
  "Entregue",
];

export default function TelesPage() {
  
  const { clientes, motoboys, teles, setTeles } = useExpressManager();  

  const [modalAberto, setModalAberto] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [telefoneDestino, setTelefoneDestino] = useState("");
  const [modalEdicaoAberto, setModalEdicaoAberto] = useState(false);
const [teleEditando, setTeleEditando] = useState<any>(null);
  

  function converterValor(valor: string) {
    return Number(valor.replace(",", "."));
  }

  function formatarValor(valor: number) {
    return valor.toFixed(2).replace(".", ",");
  }

  function valorEspera(minutos: number) {
    return Math.floor(minutos / 15) * 5;
  }

  function normalizarTelefone(telefone: string) {
    const numeros = telefone.replace(/\D/g, "");
    if (!numeros) return "";
    if (numeros.startsWith("55")) return numeros;
    return `55${numeros}`;
  }

  function alterarStatus(id: string, novoStatus: string) {
    setTeles(
      teles.map((tele) =>
        tele.id === id ? { ...tele, status: novoStatus } : tele
      )
    );
  }

  function alterarMotoboy(id: string, motoboy: string) {
    setTeles(
      teles.map((tele) =>
        tele.id === id
          ? {
              ...tele,
              motoboy,
              status: motoboy ? "Em rota" : tele.status,
            }
          : tele
      )
    );
  }

  function alterarEspera(id: string, minutos: number) {
    setTeles(
      teles.map((tele) => {
        if (tele.id !== id) return tele;

        const esperaAtual = tele.esperaMinutos || 0;
        const valorSemEspera =
          converterValor(tele.valor) - valorEspera(esperaAtual);

        const novoValor = valorSemEspera + valorEspera(minutos);

        return {
          ...tele,
          esperaMinutos: minutos,
          espera: valorEspera(minutos),
          total: novoValor,
          valor: formatarValor(novoValor),
        };
      })
    );
  }

  function excluirTele(id: string) {
    const confirmar = confirm("Tem certeza que deseja excluir essa tele?");
    if (!confirmar) return;

    setTeles(teles.filter((tele) => tele.id !== id));
  }

  function editarTele(id: string) {
  const tele = teles.find((item) => item.id === id);

  if (!tele) return;

  setTeleEditando({
    ...tele,
    paradas: getParadas(tele),
  });

  setModalEdicaoAberto(true);
}

function atualizarTeleEditando(campo: string, valor: any) {
  setTeleEditando({
    ...teleEditando,
    [campo]: valor,
  });
}

function atualizarParadaEditando(index: number, campo: string, valor: string) {
  const novasParadas = [...teleEditando.paradas];

  novasParadas[index] = {
    ...novasParadas[index],
    [campo]: valor,
  };

  setTeleEditando({
    ...teleEditando,
    paradas: novasParadas,
  });
}

function salvarEdicaoTele() {
  if (!teleEditando) return;

  const primeiraParada = teleEditando.paradas[0];

  setTeles(
    teles.map((tele) =>
      tele.id === teleEditando.id
        ? {
            ...teleEditando,
            nomeCliente: primeiraParada.cliente || primeiraParada.nomeCliente,
            endereco: primeiraParada.endereco,
            contato: primeiraParada.contato,
            observacao: primeiraParada.observacao,
          }
        : tele
    )
  );

  setModalEdicaoAberto(false);
  setTeleEditando(null);
}

  function concluirTele(id: string) {
    alterarStatus(id, "Entregue");
  }

  function getParadas(tele: Tele) {
    if (tele.paradas && tele.paradas.length > 0) return tele.paradas;

    return [
      {
        tipo: tele.tipoRota,
        cliente: tele.nomeCliente,
        endereco: tele.endereco,
        contato: tele.contato,
        observacao: tele.observacao,
      },
    ];
  }

  function gerarTextoParadas(tele: Tele, incluirObservacao: boolean) {
    return getParadas(tele)
      .map((parada) => {
        const nome = parada.cliente || parada.nomeCliente || "";

        let texto = `${parada.tipo}\n${nome}\n${parada.endereco}`;

        if (incluirObservacao && parada.observacao) {
          texto += `\nObs: ${parada.observacao}`;
        }

        return texto;
      })
      .join("\n\n--------------------\n\n");
  }

  function gerarOrcamento(tele: Tele) {
    const cliente = clientes.find((c) => c.nome === tele.solicitante);
    const telefone = cliente?.telefone || "";

    const texto = `Olá!

Segue orçamento da tele:

${gerarTextoParadas(tele, false)}

Valor: R$ ${tele.valor}

Aguardamos sua confirmação.`;

    setMensagem(texto);
    setTelefoneDestino(normalizarTelefone(telefone));
    setModalAberto(true);
  }

  function gerarTeleMotoboy(tele: Tele) {
    const motoboy = motoboys.find((m) => m.nome === tele.motoboy);
    const telefone = motoboy?.telefone || "";

    const texto = `NOVA TELE

${gerarTextoParadas(tele, true)}

Valor da tele: R$ ${tele.valor}`;

    setMensagem(texto);
    setTelefoneDestino(normalizarTelefone(telefone));
    setModalAberto(true);
  }

  function enviarWhatsApp() {
    if (!telefoneDestino) {
      alert("Telefone não encontrado. Verifique o cadastro do cliente ou motoboy.");
      return;
    }

    const texto = encodeURIComponent(mensagem);
    window.open(`https://wa.me/${telefoneDestino}?text=${texto}`, "_blank");
  }

  function totalPorStatus(status: string) {
    return teles
      .filter((tele) => tele.status === status)
      .reduce((total, tele) => total + converterValor(tele.valor), 0);
  }

  return (
    <main className="min-h-screen bg-[#f7f8fb] p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold">Central de Operações</h1>
        <p className="text-slate-500 mt-2">
          Acompanhe suas teles por status operacional.
        </p>
      </div>

      {teles.length === 0 && (
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 max-w-xl">
          <h2 className="text-xl font-bold">Nenhuma tele cadastrada</h2>
          <p className="text-slate-500 mt-2">
            Cadastre uma nova tele para ela aparecer aqui.
          </p>
        </div>
      )}

      <div className="grid grid-cols-4 gap-5 items-start">
        {statusOptions.map((status) => {
          const telesDoStatus = teles.filter((tele) => tele.status === status);

          return (
            <div
              key={status}
              className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 min-h-[500px]"
            >
              <div className="mb-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold">{status}</h2>
                  <StatusBadge status={status} />
                </div>

                <p className="text-sm text-slate-500 mt-2">
                  {telesDoStatus.length} teles • R$ {formatarValor(totalPorStatus(status))}
                </p>
              </div>

              <div className="space-y-4">
                {telesDoStatus.map((tele) => (
                  <TeleCard
                    key={tele.id}
                    tele={tele}
                    motoboys={motoboys}
                    alterarStatus={alterarStatus}
                    alterarMotoboy={alterarMotoboy}
                    alterarEspera={alterarEspera}
                    excluirTele={excluirTele}
                    editarTele={editarTele}
                    concluirTele={concluirTele}
                    gerarOrcamento={gerarOrcamento}
                    gerarTeleMotoboy={gerarTeleMotoboy}
                    getParadas={getParadas}
                    valorEspera={valorEspera}
                    formatarValor={formatarValor}
                    converterValor={converterValor}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {modalAberto && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white w-[650px] rounded-3xl p-8 shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-2xl font-bold">Mensagem pronta</h2>

              <button
                onClick={() => setModalAberto(false)}
                className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>

            <textarea
              value={mensagem}
              onChange={(e) => setMensagem(e.target.value)}
              className="w-full h-80 rounded-2xl border border-slate-200 p-4 outline-none focus:border-emerald-500"
            />

            <button
              onClick={enviarWhatsApp}
              className="w-full mt-5 h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center gap-2"
            >
              <MessageCircle size={22} />
              Enviar no WhatsApp
            </button>
          </div>
        </div>
      )}
      {modalEdicaoAberto && teleEditando && (
  <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
    <div className="bg-white w-[800px] max-h-[90vh] overflow-y-auto rounded-3xl p-8 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Editar tele</h2>

        <button
          onClick={() => setModalEdicaoAberto(false)}
          className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center"
        >
          <X size={18} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-5 mb-6">
        <div>
          <label className="text-sm font-medium text-slate-600">
            Solicitante
          </label>
          <select
            value={teleEditando.solicitante}
            onChange={(e) =>
              atualizarTeleEditando("solicitante", e.target.value)
            }
            className="w-full mt-2 h-12 rounded-xl border border-slate-200 px-4"
          >
            {clientes.map((cliente) => (
              <option key={cliente.id || cliente.nome} value={cliente.nome}>
                {cliente.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-600">
            Valor
          </label>
          <input
            value={teleEditando.valor}
            onChange={(e) => atualizarTeleEditando("valor", e.target.value)}
            className="w-full mt-2 h-12 rounded-xl border border-slate-200 px-4"
          />
        </div>

        <div>
          <label className="text-sm font-medium text-slate-600">
            Motoboy
          </label>
          <select
            value={teleEditando.motoboy || ""}
            onChange={(e) => atualizarTeleEditando("motoboy", e.target.value)}
            className="w-full mt-2 h-12 rounded-xl border border-slate-200 px-4"
          >
            <option value="">Selecionar</option>
            {motoboys.map((motoboy) => (
              <option key={motoboy.id || motoboy.nome} value={motoboy.nome}>
                {motoboy.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-sm font-medium text-slate-600">
            Status
          </label>
          <select
            value={teleEditando.status}
            onChange={(e) => atualizarTeleEditando("status", e.target.value)}
            className="w-full mt-2 h-12 rounded-xl border border-slate-200 px-4"
          >
            {statusOptions.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </div>
      </div>

      <h3 className="text-xl font-bold mb-4">Paradas</h3>

      <div className="space-y-5">
        {teleEditando.paradas.map((parada: any, index: number) => (
          <div key={index} className="bg-slate-50 rounded-2xl p-5">
            <p className="font-bold mb-4">Parada {index + 1}</p>

            <div className="grid grid-cols-2 gap-4">
              <input
                value={parada.tipo}
                onChange={(e) =>
                  atualizarParadaEditando(index, "tipo", e.target.value)
                }
                className="h-12 rounded-xl border border-slate-200 px-4"
              />

              <input
                value={parada.cliente || parada.nomeCliente || ""}
                onChange={(e) =>
                  atualizarParadaEditando(index, "cliente", e.target.value)
                }
                className="h-12 rounded-xl border border-slate-200 px-4"
                placeholder="Nome do cliente"
              />

              <input
                value={parada.contato || ""}
                onChange={(e) =>
                  atualizarParadaEditando(index, "contato", e.target.value)
                }
                className="h-12 rounded-xl border border-slate-200 px-4"
                placeholder="Contato"
              />

              <input
                value={parada.endereco || ""}
                onChange={(e) =>
                  atualizarParadaEditando(index, "endereco", e.target.value)
                }
                className="h-12 rounded-xl border border-slate-200 px-4"
                placeholder="Endereço"
              />

              <input
                value={parada.observacao || ""}
                onChange={(e) =>
                  atualizarParadaEditando(index, "observacao", e.target.value)
                }
                className="col-span-2 h-12 rounded-xl border border-slate-200 px-4"
                placeholder="Observação"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-3 mt-8">
        <button
          onClick={() => setModalEdicaoAberto(false)}
          className="px-5 py-3 rounded-xl border border-slate-200"
        >
          Cancelar
        </button>

        <button
          onClick={salvarEdicaoTele}
          className="px-5 py-3 rounded-xl bg-emerald-600 text-white"
        >
          Salvar alterações
        </button>
      </div>
    </div>
  </div>
)}
      <Link
  href="/nova-tele"
  className="fixed bottom-8 right-8 w-16 h-16 rounded-full bg-emerald-600 text-white shadow-xl flex items-center justify-center hover:bg-emerald-700 transition"
>
  <Plus size={34} />
</Link>
    </main>
  );
}

function TeleCard({
  tele,
  motoboys,
  alterarStatus,
  alterarMotoboy,
  alterarEspera,
  excluirTele,
  editarTele,
  concluirTele,
  gerarOrcamento,
  gerarTeleMotoboy,
  getParadas,
  valorEspera,
  formatarValor,
  converterValor,
}: any) {
  const espera = tele.esperaMinutos || 0;
  const acrescimoEspera = valorEspera(espera);

  return (
    <div className="bg-[#f7f8fb] rounded-3xl p-4 border border-slate-100">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-bold">{tele.tipoRota}</h3>
          <p className="text-sm text-slate-500">{tele.solicitante}</p>
          <p className="text-xs text-slate-400">{tele.criadoEm}</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => editarTele(tele.id)}
            className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center"
          >
            <Pencil size={16} />
          </button>

          <button
            onClick={() => excluirTele(tele.id)}
            className="w-9 h-9 rounded-xl bg-white border border-red-100 text-red-600 flex items-center justify-center"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="space-y-3 text-sm text-slate-600">
        {getParadas(tele).map((parada: Parada, index: number) => (
          <div key={index} className="bg-white rounded-2xl p-3">
            <p className="font-bold text-slate-900">{parada.tipo}</p>

            <p className="flex items-center gap-2 mt-2">
              <User size={15} /> {parada.cliente || parada.nomeCliente}
            </p>

            <p className="flex items-start gap-2 mt-2">
              <MapPin size={15} className="mt-1" />
              <span>{parada.endereco}</span>
            </p>

            {parada.contato && (
              <p className="flex items-center gap-2 mt-2">
                <Phone size={15} /> {parada.contato}
              </p>
            )}

            {parada.observacao && (
              <p className="bg-slate-50 rounded-xl p-2 mt-2">
                Obs: {parada.observacao}
              </p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <label className="text-xs font-medium text-slate-600 flex items-center gap-2">
            <Bike size={14} />
            Motoboy
          </label>

          <select
            value={tele.motoboy || ""}
            onChange={(e) => alterarMotoboy(tele.id, e.target.value)}
            className="w-full mt-2 h-11 rounded-xl border border-slate-200 px-3 outline-none focus:border-emerald-500 text-sm"
          >
            <option value="">Selecionar</option>

            {motoboys.map((motoboy: Motoboy, index: number) => (
              <option key={index} value={motoboy.nome}>
                {motoboy.nome}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-slate-600 flex items-center gap-2">
            <Timer size={14} />
            Espera
          </label>

          <input
            type="number"
            min="0"
            value={espera}
            onChange={(e) => alterarEspera(tele.id, Number(e.target.value))}
            className="w-full mt-2 h-11 rounded-xl border border-slate-200 px-3 outline-none focus:border-emerald-500 text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-slate-600">Status</label>

          <select
            value={tele.status}
            onChange={(e) => alterarStatus(tele.id, e.target.value)}
            className="w-full mt-2 h-11 rounded-xl border border-slate-200 px-3 outline-none focus:border-emerald-500 text-sm"
          >
            {statusOptions.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </div>

        <div className="bg-emerald-50 rounded-2xl p-3">
          <div className="flex justify-between text-xs">
            <span>Base</span>
            <strong>
              R$ {formatarValor(tele.valorBase || converterValor(tele.valor))}
            </strong>
          </div>

          <div className="flex justify-between text-xs mt-1">
            <span>Retorno</span>
            <strong>R$ {formatarValor(tele.retorno || 0)}</strong>
          </div>

          <div className="flex justify-between text-xs mt-1">
            <span>Espera</span>
            <strong>R$ {formatarValor(acrescimoEspera)}</strong>
          </div>

          <div className="flex justify-between text-base font-bold text-emerald-700 border-t border-emerald-100 mt-2 pt-2">
            <span>Total</span>
            <span>R$ {tele.valor}</span>
          </div>
        </div>

        <button
          onClick={() => gerarOrcamento(tele)}
          className="w-full h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center gap-2 text-sm"
        >
          <MessageCircle size={16} />
          Gerar orçamento
        </button>

        <button
          onClick={() => gerarTeleMotoboy(tele)}
          className="w-full h-11 rounded-xl bg-slate-900 text-white flex items-center justify-center gap-2 text-sm"
        >
          <Send size={16} />
          Gerar tele
        </button>

        {tele.status !== "Entregue" && (
          <button
            onClick={() => concluirTele(tele.id)}
            className="w-full h-11 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm"
          >
            Concluir entrega
          </button>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  let classes = "bg-slate-100 text-slate-700";

  if (status === "Aguardando cliente") {
    classes = "bg-orange-100 text-orange-700";
  }

  if (status === "Aguardando motoboy disponível") {
    classes = "bg-blue-100 text-blue-700";
  }

  if (status === "Em rota") {
    classes = "bg-emerald-100 text-emerald-700";
  }

  if (status === "Entregue") {
    classes = "bg-slate-900 text-white";
  }

  return (
    <span className={`inline-flex px-3 py-1 rounded-xl text-xs ${classes}`}>
      {status}
    </span>
  );
}