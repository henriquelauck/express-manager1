"use client";
import PageContainer from "@/components/ui/PageContainer";
import PageHeader from "@/components/ui/PageHeader";
import { useExpressManager } from "@/context/ExpressManagerContext";
import { TipoParada } from "@/types/Parada";
import { Tele } from "@/types/Tele";
import {
  Bike,
  Copy,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Send,
  Timer,
  Trash2,
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type Cliente = {
  id?: string;
  nome: string;
  telefone: string;
  endereco1: string;
  endereco2?: string;
};

type Motoboy = {
  id?: string;
  nome: string;
  telefone: string;
  moto: string;
  placa: string;
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

const statusOptions = [
  "Aguardando cliente",
  "Aguardando motoboy disponível",
  "Aguardando coleta",
  "Em rota",
  "Entregue",
];

export default function TelesPage() {
  const { clientes, motoboys, teles, setTeles, recarregarDados } = useExpressManager();

  const esperaTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const [modalAberto, setModalAberto] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [telefoneDestino, setTelefoneDestino] = useState("");
  const [motoboyFiltro, setMotoboyFiltro] = useState("todos");
  const [clienteFiltro, setClienteFiltro] = useState("todos");
  const [modalEdicaoAberto, setModalEdicaoAberto] = useState(false);
  const [teleEditando, setTeleEditando] = useState<any>(null);
  const [dataFiltro, setDataFiltro] = useState(new Date().toISOString().split("T")[0]);

  const carregarTeles = useCallback(async () => {
    const resposta = await fetch("/api/teles");

    if (!resposta.ok) {
      console.error("Erro ao carregar teles.");
      return;
    }

    const dados = await resposta.json();

    setTeles(Array.isArray(dados) ? dados : []);
  }, [setTeles]);

  useEffect(() => {
    void carregarTeles();
  }, [carregarTeles]);

  function converterValor(valor: string) {
    return Number(String(valor || "0").replace(",", "."));
  }

  function formatarValor(valor: number) {
    return valor.toFixed(2).replace(".", ",");
  }

  function valorEspera(minutos: number) {
    return Math.floor(minutos / 15) * 5;
  }

  function dataHoje() {
    return new Date().toLocaleDateString("pt-BR");
  }

  function ehDaDataSelecionada(tele: Tele) {
    if (!tele.dataTele) return false;

    return tele.dataTele.slice(0, 10) === dataFiltro;
  }
  function ehDoMotoboySelecionado(tele: Tele) {
    if (motoboyFiltro === "todos") return true;
    if (motoboyFiltro === "sem-motoboy") return !tele.motoboy;

    return tele.motoboy === motoboyFiltro;
  }

  function ehDoClienteSelecionado(tele: Tele) {
    if (clienteFiltro === "todos") return true;

    return tele.solicitante === clienteFiltro;
  }

  function normalizarTelefone(telefone: string) {
    const numeros = telefone?.replace(/\D/g, "") || "";
    if (!numeros) return "";
    if (numeros.startsWith("55")) return numeros;
    return `55${numeros}`;
  }

  function getParadas(tele: Tele) {
    if (tele.paradas && tele.paradas.length > 0) return tele.paradas;

    return [
      {
        id: `${tele.id}-parada-1`,
        tipo: tele.tipoRota as TipoParada,
        cliente: tele.nomeCliente,
        endereco: tele.endereco,
        contato: tele.contato,
        observacao: tele.observacao,
      },
    ];
  }

  async function salvarTeleNoBanco(teleAtualizada: any, recarregar = true) {
    const resposta = await fetch("/api/teles", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...teleAtualizada,
        paradas: getParadas(teleAtualizada),
      }),
    });

    if (!resposta.ok) {
      const erro = await resposta.text();
      alert(`Erro ao atualizar tele: ${erro}`);
      return;
    }

    if (recarregar) {
      await recarregarDados();
    }
  }

  async function alterarStatus(id: string, novoStatus: string) {
    const tele = teles.find((item: Tele) => item.id === id);
    if (!tele) return;

    await salvarTeleNoBanco({
      ...tele,
      status: novoStatus,
    });
  }

  async function alterarMotoboy(id: string, motoboy: string) {
    const tele = teles.find((item: Tele) => item.id === id);
    if (!tele) return;

    await salvarTeleNoBanco({
      ...tele,
      motoboy,
      status: motoboy ? "Aguardando coleta" : "Aguardando motoboy disponível",
    });
  }

  function alterarEspera(id: string, minutos: number) {
    const tele = teles.find((item: Tele) => item.id === id);
    if (!tele) return;

    const esperaAtual = tele.esperaMinutos || 0;
    const valorSemEspera = converterValor(tele.valor) - valorEspera(esperaAtual);

    const novoValor = valorSemEspera + valorEspera(minutos);

    const teleAtualizada = {
      ...tele,
      esperaMinutos: minutos,
      espera: valorEspera(minutos),
      total: novoValor,
      valor: formatarValor(novoValor),
      paradas: getParadas(tele),
    };

    setTeles(teles.map((item: Tele) => (item.id === id ? teleAtualizada : item)));

    if (esperaTimers.current[id]) {
      clearTimeout(esperaTimers.current[id]);
    }

    esperaTimers.current[id] = setTimeout(() => {
      salvarTeleNoBanco(teleAtualizada, false);
    }, 700);
  }

  async function excluirTele(id: string) {
    const confirmar = confirm("Tem certeza que deseja excluir essa tele?");
    if (!confirmar) return;

    const resposta = await fetch("/api/teles", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ id }),
    });

    if (!resposta.ok) {
      const erro = await resposta.text();
      alert(`Erro ao atualizar tele: ${erro}`);
      return;
    }
    await recarregarDados();
  }

  function editarTele(id: string) {
    const tele = teles.find((item: Tele) => item.id === id);
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

  async function salvarEdicaoTele() {
    if (!teleEditando) return;

    const primeiraParada = teleEditando.paradas[0];
    const valorNumerico = converterValor(teleEditando.valor);

    await salvarTeleNoBanco({
      ...teleEditando,
      valorBase: valorNumerico,
      total: valorNumerico,
      valor: formatarValor(valorNumerico),

      nomeCliente: primeiraParada.cliente || primeiraParada.nomeCliente,
      endereco: primeiraParada.endereco,
      contato: primeiraParada.contato,
      observacao: primeiraParada.observacao,

      paradas: teleEditando.paradas,
    });

    setModalEdicaoAberto(false);
    setTeleEditando(null);
  }

  function concluirTele(id: string) {
    alterarStatus(id, "Entregue");
  }

  function gerarTextoParadas(tele: Tele, incluirObservacao: boolean) {
    return getParadas(tele)
      .map((parada) => {
        const nome = parada.cliente || "";
        let texto = `${parada.tipo}\n${nome}\n${parada.endereco}`;

        if (incluirObservacao && parada.observacao) {
          texto += `\nObs: ${parada.observacao}`;
        }

        return texto;
      })
      .join("\n\n--------------------\n\n");
  }

  function gerarOrcamento(tele: Tele) {
    const cliente = clientes.find((c: Cliente) => c.nome === tele.solicitante);
    const telefone = cliente?.telefone || "";

    const temRetorno = getParadas(tele).some(
      (parada: any) => parada.tipo === "Trocar" || parada.tipo === "Entrega e coleta"
    );

    const avisoRetorno = !temRetorno
      ? `

⚠️ Este orçamento é referente à entrega sem retorno. Caso seja necessário retorno ao local de origem, será acrescido o valor de R$ 5,00.`
      : "";

    const texto = `Olá!

Segue orçamento da tele:

${gerarTextoParadas(tele, false)}

Valor: R$ ${tele.valor}${avisoRetorno}

⚠️ Em caso de cancelamento após a confirmação da tele, será cobrado o valor mínimo referente ao deslocamento do motoboy, no valor de R$ 15,00.

Aguardamos sua confirmação.`;

    setMensagem(texto);
    setTelefoneDestino(normalizarTelefone(telefone));
    setModalAberto(true);
  }

  function gerarTeleMotoboy(tele: Tele) {
    const motoboy = motoboys.find((m: Motoboy) => m.nome === tele.motoboy);
    const telefone = motoboy?.telefone || "";

    const enderecos = getParadas(tele)
      .map((parada: Parada) => parada.endereco?.trim())
      .filter(Boolean);

    let linkMaps = "";

    if (enderecos.length >= 2) {
      const origem = enderecos[0];
      const destino = enderecos[enderecos.length - 1];
      const waypoints = enderecos.slice(1, -1);

      const params = new URLSearchParams({
        api: "1",
        origin: origem,
        destination: destino,
        travelmode: "driving",
      });

      if (waypoints.length) {
        params.set("waypoints", waypoints.join("|"));
      }

      linkMaps = `https://www.google.com/maps/dir/?${params.toString()}`;
    }

    const texto = `🚨 NOVA TELE

${gerarTextoParadas(tele, true)}

Valor da tele: R$ ${tele.valor}${
      linkMaps
        ? `

🗺️ Abrir rota:
${linkMaps}`
        : ""
    }`;

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

  async function copiarMensagem() {
    try {
      await navigator.clipboard.writeText(mensagem);
      alert("Mensagem copiada!");
    } catch {
      alert("Não foi possível copiar a mensagem.");
    }
  }

  function totalPorStatus(status: string) {
    return teles
      .filter(
        (tele: Tele) =>
          tele.status === status &&
          ehDaDataSelecionada(tele) &&
          ehDoMotoboySelecionado(tele) &&
          ehDoClienteSelecionado(tele)
      )
      .reduce((total: number, tele: Tele) => total + converterValor(tele.valor), 0);
  }
  return (
    <PageContainer>
      <PageHeader titulo="Central de Operações" descricao="Gerencie todas as teles." />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 max-w-3xl">
        <div className={`rounded-3xl p-4 border ${corColuna(status)}`}>
          <label className="text-sm font-medium text-slate-600">Data das operações</label>

          <input
            type="date"
            value={dataFiltro}
            onChange={(e) => setDataFiltro(e.target.value)}
            className="w-full mt-2 h-12 rounded-xl border border-slate-200 px-4 outline-none focus:border-emerald-500"
          />
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <label className="text-sm font-medium text-slate-600">Motoboy</label>

          <select
            value={motoboyFiltro}
            onChange={(e) => setMotoboyFiltro(e.target.value)}
            className="w-full mt-2 h-12 rounded-xl border border-slate-200 px-4 outline-none focus:border-emerald-500"
          >
            <option value="todos">Todos</option>
            <option value="sem-motoboy">Sem motoboy</option>

            {motoboys.map((motoboy: Motoboy) => (
              <option key={motoboy.id || motoboy.nome} value={motoboy.nome}>
                {motoboy.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
          <label className="text-sm font-medium text-slate-600">Cliente</label>

          <select
            value={clienteFiltro}
            onChange={(e) => setClienteFiltro(e.target.value)}
            className="w-full mt-2 h-12 rounded-xl border border-slate-200 px-4 outline-none focus:border-emerald-500"
          >
            <option value="todos">Todos</option>

            {[...new Set(clientes.map((cliente: Cliente) => cliente.nome))].sort().map((nome) => (
              <option key={nome} value={nome}>
                {nome}
              </option>
            ))}
          </select>
        </div>
      </div>

      {teles.length === 0 && (
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 max-w-xl">
          <h2 className="text-xl font-bold">Nenhuma tele cadastrada</h2>
          <p className="text-slate-500 mt-2">Cadastre uma nova tele para ela aparecer aqui.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-5 items-start">
        {statusOptions.map((status) => {
          const telesDoStatus = teles.filter(
            (tele: Tele) =>
              tele.status === status &&
              ehDaDataSelecionada(tele) &&
              ehDoMotoboySelecionado(tele) &&
              ehDoClienteSelecionado(tele)
          );

          return (
            <div
              key={status}
              className={`rounded-3xl p-4 shadow-sm border min-h-[500px] ${corColuna(status)}`}
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
                {telesDoStatus.map((tele: Tele) => (
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
          <div className="bg-white w-[95vw] max-w-[650px] rounded-3xl p-5 md:p-8 shadow-xl">
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

            <div className="grid grid-cols-2 gap-3 mt-5">
              <button
                onClick={copiarMensagem}
                className="h-14 rounded-2xl border border-slate-200 bg-white text-slate-700 flex items-center justify-center gap-2 hover:bg-slate-50"
              >
                <Copy size={20} />
                Copiar
              </button>

              <button
                onClick={enviarWhatsApp}
                className="h-14 rounded-2xl bg-emerald-600 text-white flex items-center justify-center gap-2"
              >
                <MessageCircle size={22} />
                WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}

      {modalEdicaoAberto && teleEditando && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white w-[95vw] max-w-[800px] max-h-[90vh] overflow-y-auto rounded-3xl p-5 md:p-8 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Editar tele</h2>

              <button
                onClick={() => setModalEdicaoAberto(false)}
                className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
              <div>
                <label className="text-sm font-medium text-slate-600">Solicitante</label>

                <select
                  value={teleEditando.solicitante}
                  onChange={(e) => atualizarTeleEditando("solicitante", e.target.value)}
                  className="w-full mt-2 h-12 rounded-xl border border-slate-200 px-4"
                >
                  {clientes.map((cliente: Cliente) => (
                    <option key={cliente.id || cliente.nome} value={cliente.nome}>
                      {cliente.nome}
                    </option>
                  ))}
                </select>
              </div>

              <InputModal
                label="Valor"
                value={teleEditando.valor}
                onChange={(value: string) => atualizarTeleEditando("valor", value)}
              />

              <div>
                <label className="text-sm font-medium text-slate-600">Motoboy</label>

                <select
                  value={teleEditando.motoboy || ""}
                  onChange={(e) => atualizarTeleEditando("motoboy", e.target.value)}
                  className="w-full mt-2 h-12 rounded-xl border border-slate-200 px-4"
                >
                  <option value="">Selecionar</option>
                  {motoboys.map((motoboy: Motoboy) => (
                    <option key={motoboy.id || motoboy.nome} value={motoboy.nome}>
                      {motoboy.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-600">Status</label>

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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputModal
                      value={parada.tipo}
                      onChange={(value: string) => atualizarParadaEditando(index, "tipo", value)}
                    />

                    <InputModal
                      value={parada.cliente || parada.nomeCliente || ""}
                      onChange={(value: string) => atualizarParadaEditando(index, "cliente", value)}
                      placeholder="Nome do cliente"
                    />

                    <InputModal
                      value={parada.contato || ""}
                      onChange={(value: string) => atualizarParadaEditando(index, "contato", value)}
                      placeholder="Contato"
                    />

                    <InputModal
                      value={parada.endereco || ""}
                      onChange={(value: string) =>
                        atualizarParadaEditando(index, "endereco", value)
                      }
                      placeholder="Endereço"
                    />

                    <InputModal
                      value={parada.observacao || ""}
                      onChange={(value: string) =>
                        atualizarParadaEditando(index, "observacao", value)
                      }
                      placeholder="Observação"
                      className="md:col-span-2"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col md:flex-row md:justify-between gap-4">
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
        className="fixed bottom-5 right-5 md:bottom-8 md:right-8 w-14 h-14 md:w-16 md:h-16 rounded-full bg-emerald-600 text-white shadow-xl flex items-center justify-center hover:bg-emerald-700 transition z-40"
      >
        <Plus size={34} />
      </Link>
    </PageContainer>
  );
}
function corColuna(status: string) {
  const texto = String(status).toLowerCase();

  if (texto.includes("aguardando cliente")) {
    return "bg-slate-200 border-slate-400";
  }

  if (texto.includes("aguardando motoboy")) {
    return "bg-orange-200 border-orange-400";
  }

  if (texto.includes("aguardando coleta")) {
    return "bg-violet-200 border-violet-400";
  }

  if (texto.includes("rota")) {
    return "bg-sky-200 border-sky-400";
  }

  if (texto.includes("entregue")) {
    return "bg-emerald-200 border-emerald-400";
  }

  return "bg-white border-slate-200";
}

function StatusBadge({ status }: { status: string }) {
  let classes = "bg-slate-100 text-slate-700";

  if (status === "Aguardando cliente") {
    classes = "bg-orange-100 text-orange-700";
  }

  if (status === "Aguardando motoboy disponível") {
    classes = "bg-blue-100 text-blue-700";
  }

  if (status === "Aguardando coleta") {
    classes = "bg-violet-100 text-violet-700";
  }

  if (status === "Em rota") {
    classes = "bg-emerald-100 text-emerald-700";
  }

  if (status === "Entregue") {
    classes = "bg-slate-900 text-white";
  }

  return <span className={`inline-flex px-3 py-1 rounded-xl text-xs ${classes}`}>{status}</span>;
}
function InputModal({ label, value, onChange, placeholder, className }: any) {
  return (
    <div className={className}>
      {label && <label className="text-sm font-medium text-slate-600">{label}</label>}

      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full mt-2 h-12 rounded-xl border border-slate-200 px-4"
      />
    </div>
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
  const paradas = getParadas(tele);

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      {/* Cabeçalho */}
      <div className="border-b border-slate-100 bg-slate-50 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-slate-900">
                {tele.tipoRota}
              </h3>

              <StatusBadge status={tele.status} />
            </div>

            <p className="mt-1 truncate text-sm font-medium text-slate-600">
              {tele.solicitante}
            </p>

            {tele.criadoEm && (
              <p className="mt-1 text-xs text-slate-400">
                {tele.criadoEm}
              </p>
            )}
          </div>

          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => editarTele(tele.id)}
              title="Editar tele"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100"
            >
              <Pencil size={15} />
            </button>

            <button
              type="button"
              onClick={() => excluirTele(tele.id)}
              title="Excluir tele"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-100 bg-white text-red-600 transition hover:bg-red-50"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-2xl bg-white px-4 py-3">
          <span className="text-sm text-slate-500">
            Valor da tele
          </span>

          <strong className="text-lg text-emerald-700">
            R$ {tele.valor}
          </strong>
        </div>
      </div>

      {/* Rota */}
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Rota
          </p>

          <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-500">
            {paradas.length} {paradas.length === 1 ? "parada" : "paradas"}
          </span>
        </div>

        <div className="space-y-3">
          {paradas.map((parada: Parada, index: number) => (
            <div
              key={parada.id || index}
              className="relative rounded-2xl border border-slate-100 bg-slate-50 p-4"
            >
              <div className="mb-3 flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                  {index + 1}
                </span>

                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {parada.tipo}
                  </p>

                  <p className="truncate font-bold text-slate-900">
                    {parada.cliente ||
                      parada.nomeCliente ||
                      "Local não informado"}
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex items-start gap-2">
                  <MapPin
                    size={15}
                    className="mt-0.5 shrink-0 text-slate-400"
                  />

                  <span className="leading-5">
                    {parada.endereco || "Endereço não informado"}
                  </span>
                </div>

                {parada.contato && (
                  <div className="flex items-center gap-2">
                    <Phone
                      size={15}
                      className="shrink-0 text-slate-400"
                    />

                    <span>{parada.contato}</span>
                  </div>
                )}

                {parada.observacao && (
                  <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                    <strong>Observação:</strong>{" "}
                    {parada.observacao}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {tele.observacaoGeral && (
          <div className="mt-3 rounded-2xl border border-orange-100 bg-orange-50 p-3 text-sm text-orange-800">
            <strong>Observação geral:</strong>{" "}
            {tele.observacaoGeral}
          </div>
        )}
      </div>

      {/* Operação */}
      <div className="border-t border-slate-100 p-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
          Operação
        </p>

        <div className="space-y-3">
          <div>
            <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
              <Bike size={14} />
              Motoboy
            </label>

            <select
              value={tele.motoboy || ""}
              onChange={(e) =>
                alterarMotoboy(tele.id, e.target.value)
              }
              className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500"
            >
              <option value="">Selecionar motoboy</option>

              {motoboys.map((motoboy: Motoboy) => (
                <option
                  key={motoboy.id || motoboy.nome}
                  value={motoboy.nome}
                >
                  {motoboy.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                <Timer size={14} />
                Espera
              </label>

              <div className="relative mt-2">
                <input
                  type="number"
                  min="0"
                  value={espera}
                  onChange={(e) =>
                    alterarEspera(
                      tele.id,
                      Number(e.target.value)
                    )
                  }
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 pr-10 text-sm outline-none focus:border-emerald-500"
                />

                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                  min
                </span>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-600">
                Status
              </label>

              <select
                value={tele.status}
                onChange={(e) =>
                  alterarStatus(tele.id, e.target.value)
                }
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-emerald-500"
              >
                {statusOptions.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Financeiro */}
      <div className="border-t border-slate-100 bg-emerald-50/70 p-4">
        <div className="space-y-2">
          <LinhaValor
            label="Valor base"
            valor={`R$ ${formatarValor(
              tele.valorBase || converterValor(tele.valor)
            )}`}
          />

          <LinhaValor
            label="Retorno"
            valor={`R$ ${formatarValor(tele.retorno || 0)}`}
          />

          <LinhaValor
            label={`Espera (${espera} min)`}
            valor={`R$ ${formatarValor(acrescimoEspera)}`}
          />

          <div className="flex items-center justify-between border-t border-emerald-200 pt-3">
            <span className="font-bold text-emerald-800">
              Total
            </span>

            <strong className="text-xl text-emerald-700">
              R$ {tele.valor}
            </strong>
          </div>
        </div>
      </div>

      {/* Ações */}
      <div className="border-t border-slate-100 p-4">
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => gerarOrcamento(tele)}
            className="flex h-11 items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100"
          >
            <MessageCircle size={16} />
            Orçamento
          </button>

          <button
            type="button"
            onClick={() => gerarTeleMotoboy(tele)}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <Send size={16} />
            Gerar tele
          </button>
        </div>

        {tele.status !== "Entregue" && (
          <button
            type="button"
            onClick={() => concluirTele(tele.id)}
            className="mt-3 h-11 w-full rounded-xl bg-emerald-600 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Concluir entrega
          </button>
        )}

        {tele.status === "Entregue" && (
          <div className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-700">
            Entrega concluída
          </div>
        )}
      </div>
    </div>
  );
}

function LinhaValor({ label, valor }: any) {
  return (
    <div className="flex justify-between text-sm">
      <span>{label}</span>
      <strong>{valor}</strong>
    </div>
  );
}
