"use client";
import PageContainer from "@/components/ui/PageContainer";
import PageHeader from "@/components/ui/PageHeader";
import { useExpressManager } from "@/context/ExpressManagerContext";
import { TipoParada } from "@/types/Parada";
import type { StatusTele, Tele } from "@/types/Tele";
import {
  AlertTriangle,
  Bike,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Copy,
  Filter,
  Loader2,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  RotateCcw,
  Send,
  Timer,
  Trash2,
  WalletCards,
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

const statusOptions: StatusTele[] = [
  "Aguardando cliente",
  "Aguardando motoboy disponível",
  "Aguardando coleta",
  "Em rota",
  "Entregue",
];

type SituacaoCobranca = "pago" | "pago_parcial" | "fim_semana" | "precisa_cobrar";

type RecebedorPagamento = "escritorio" | "motoboy";

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
  const [teleArrastandoId, setTeleArrastandoId] = useState<string | null>(null);
  const [statusSobrevoado, setStatusSobrevoado] = useState<StatusTele | null>(null);
  const [telePagamento, setTelePagamento] = useState<Tele | null>(null);
  const [valorPagamento, setValorPagamento] = useState("");
  const [recebedorPagamento, setRecebedorPagamento] = useState<RecebedorPagamento>("escritorio");
  const [motoboyRecebedorPagamento, setMotoboyRecebedorPagamento] = useState("");
  const [salvandoPagamento, setSalvandoPagamento] = useState(false);
  const [teleParaExcluir, setTeleParaExcluir] = useState<Tele | null>(null);
  const [excluindoTele, setExcluindoTele] = useState(false);
  const [erroExclusao, setErroExclusao] = useState("");

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
      return false;
    }

    if (recarregar) {
      await recarregarDados();
    }

    return true;
  }

  async function alterarStatus(id: string, novoStatus: StatusTele) {
    const tele = teles.find((item: Tele) => item.id === id);
    if (!tele) return false;

    return salvarTeleNoBanco({
      ...tele,
      status: novoStatus,
    });
  }

  function iniciarArraste(event: React.DragEvent<HTMLDivElement>, teleId: string) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", teleId);
    setTeleArrastandoId(teleId);
  }

  function encerrarArraste() {
    setTeleArrastandoId(null);
    setStatusSobrevoado(null);
  }

  async function soltarTeleNaColuna(
    event: React.DragEvent<HTMLDivElement>,
    novoStatus: StatusTele
  ) {
    event.preventDefault();

    const teleId = event.dataTransfer.getData("text/plain") || teleArrastandoId;

    setStatusSobrevoado(null);
    setTeleArrastandoId(null);

    if (!teleId) return;

    const teleAtual = teles.find((tele: Tele) => tele.id === teleId);

    if (!teleAtual || teleAtual.status === novoStatus) {
      return;
    }

    const statusAnterior = teleAtual.status;
    const teleAtualizada = {
      ...teleAtual,
      status: novoStatus,
    };

    setTeles(teles.map((tele: Tele) => (tele.id === teleId ? teleAtualizada : tele)));

    const salvou = await salvarTeleNoBanco(teleAtualizada, false);

    if (!salvou) {
      setTeles(
        teles.map((tele: Tele) => (tele.id === teleId ? { ...tele, status: statusAnterior } : tele))
      );
      return;
    }

    await recarregarDados();
  }

  async function alterarMotoboy(id: string, motoboy: string) {
    const tele = teles.find((item: Tele) => item.id === id);
    if (!tele) return false;

    return salvarTeleNoBanco({
      ...tele,
      motoboy,
      status: motoboy ? "Aguardando coleta" : "Aguardando motoboy disponível",
    });
  }

  function saldoPendenteDaTele(tele: Tele) {
    return Math.max(Number(tele.total || 0) - Number(tele.valorRecebido || 0), 0);
  }

  function descobrirSituacaoCobranca(tele: Tele): SituacaoCobranca {
    const saldoPendente = saldoPendenteDaTele(tele);
    const valorRecebido = Number(tele.valorRecebido || 0);

    if (saldoPendente <= 0.009) {
      return "pago";
    }

    if (valorRecebido > 0.009) {
      return "pago_parcial";
    }

    if (tele.formaCobranca === "semanal") {
      return "fim_semana";
    }

    return "precisa_cobrar";
  }

  function abrirPagamento(tele: Tele) {
    const saldoPendente = saldoPendenteDaTele(tele);

    setTelePagamento(tele);
    setValorPagamento(formatarValor(saldoPendente));
    setRecebedorPagamento(tele.recebimento === "motoboy" ? "motoboy" : "escritorio");
    setMotoboyRecebedorPagamento(tele.motoboyRecebedor || tele.motoboy || "");
  }

  function fecharPagamento() {
    if (salvandoPagamento) return;

    setTelePagamento(null);
    setValorPagamento("");
    setRecebedorPagamento("escritorio");
    setMotoboyRecebedorPagamento("");
  }

  async function registrarPagamento() {
    if (!telePagamento || salvandoPagamento) return;

    const valorAgora = converterValor(valorPagamento);
    const recebidoAnterior = Number(telePagamento.valorRecebido || 0);
    const saldoAnterior = saldoPendenteDaTele(telePagamento);

    if (!Number.isFinite(valorAgora) || valorAgora <= 0) {
      alert("Informe um valor recebido maior que zero.");
      return;
    }

    if (valorAgora > saldoAnterior + 0.009) {
      alert(`O valor recebido não pode ultrapassar o saldo de R$ ${formatarValor(saldoAnterior)}.`);
      return;
    }

    if (recebedorPagamento === "motoboy" && !motoboyRecebedorPagamento) {
      alert("Selecione o motoboy que recebeu o pagamento.");
      return;
    }

    const novoValorRecebido = Math.min(
      recebidoAnterior + valorAgora,
      Number(telePagamento.total || 0)
    );
    const quitou = novoValorRecebido >= Number(telePagamento.total || 0) - 0.009;

    const teleAtualizada: Tele = {
      ...telePagamento,
      recebimento: recebedorPagamento,
      recebido: quitou,
      valorRecebido: novoValorRecebido,
      dataRecebimento: new Date().toISOString(),
      motoboyRecebedor: recebedorPagamento === "motoboy" ? motoboyRecebedorPagamento : null,
    };

    setSalvandoPagamento(true);
    setTeles(teles.map((item: Tele) => (item.id === telePagamento.id ? teleAtualizada : item)));

    const salvou = await salvarTeleNoBanco(teleAtualizada, false);

    if (!salvou) {
      setTeles(teles.map((item: Tele) => (item.id === telePagamento.id ? telePagamento : item)));
      setSalvandoPagamento(false);
      return;
    }

    await recarregarDados();
    setSalvandoPagamento(false);
    setTelePagamento(null);
    setValorPagamento("");
    setRecebedorPagamento("escritorio");
    setMotoboyRecebedorPagamento("");
  }

  async function alterarSituacaoCobranca(id: string, situacao: SituacaoCobranca) {
    const tele = teles.find((item: Tele) => item.id === id);
    if (!tele) return false;

    if (situacao === "pago" || situacao === "pago_parcial") {
      abrirPagamento(tele);
      return true;
    }

    const teleAnterior = tele;
    const possuiPagamento = Number(tele.valorRecebido || 0) > 0.009;

    const teleAtualizada: Tele = {
      ...tele,
      formaCobranca: situacao === "fim_semana" ? "semanal" : "na_hora",
      recebimento: possuiPagamento ? tele.recebimento : "pendente",
      recebido: saldoPendenteDaTele(tele) <= 0.009,
      motoboyRecebedor: possuiPagamento ? tele.motoboyRecebedor : null,
    };

    setTeles(teles.map((item: Tele) => (item.id === id ? teleAtualizada : item)));

    const salvou = await salvarTeleNoBanco(teleAtualizada, false);

    if (!salvou) {
      setTeles(teles.map((item: Tele) => (item.id === id ? teleAnterior : item)));
      return false;
    }

    await recarregarDados();
    return true;
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

  function solicitarExclusao(tele: Tele) {
    setErroExclusao("");
    setTeleParaExcluir(tele);
  }

  function cancelarExclusao() {
    if (excluindoTele) return;

    setErroExclusao("");
    setTeleParaExcluir(null);
  }

  async function confirmarExclusaoTele() {
    if (!teleParaExcluir || excluindoTele) return;

    setExcluindoTele(true);
    setErroExclusao("");

    try {
      const resposta = await fetch("/api/teles", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: teleParaExcluir.id }),
      });

      if (!resposta.ok) {
        const erro = await resposta.text();
        throw new Error(erro || "Não foi possível excluir a tele.");
      }

      await recarregarDados();
      setTeleParaExcluir(null);
    } catch (erro) {
      setErroExclusao(erro instanceof Error ? erro.message : "Não foi possível excluir a tele.");
    } finally {
      setExcluindoTele(false);
    }
  }

  function editarTele(id: string) {
    const tele = teles.find((item: Tele) => item.id === id);
    if (!tele) return;

    setTeleEditando({
      ...tele,
      formaCobranca: (tele as any).formaCobranca || "na_hora",
      recebimento: (tele as any).recebimento || "pendente",
      valorRecebido: String((tele as any).valorRecebido || ""),
      motoboyRecebedor: (tele as any).motoboyRecebedor || "",
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
    const recebimento = teleEditando.recebimento || "pendente";

    const valorRecebido =
      recebimento === "pendente"
        ? 0
        : converterValor(String(teleEditando.valorRecebido || teleEditando.valor || "0"));

    const motoboyRecebedor =
      recebimento === "motoboy"
        ? teleEditando.motoboyRecebedor || teleEditando.motoboy || null
        : null;

    await salvarTeleNoBanco({
      ...teleEditando,
      valorBase: valorNumerico,
      total: valorNumerico,
      valor: formatarValor(valorNumerico),
      formaCobranca: teleEditando.formaCobranca || "na_hora",
      recebimento,
      recebido: recebimento !== "pendente",
      valorRecebido,
      motoboyRecebedor,
      nomeCliente: primeiraParada.cliente || primeiraParada.nomeCliente,
      endereco: primeiraParada.endereco,
      contato: primeiraParada.contato,
      observacao: primeiraParada.observacao,
      paradas: teleEditando.paradas,
    });

    setModalEdicaoAberto(false);
    setTeleEditando(null);
  }

  async function concluirTele(id: string) {
    return alterarStatus(id, "Entregue");
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

  const telesFiltradas = teles.filter(
    (tele: Tele) =>
      ehDaDataSelecionada(tele) && ehDoMotoboySelecionado(tele) && ehDoClienteSelecionado(tele)
  );

  const totalFiltrado = telesFiltradas.reduce(
    (total: number, tele: Tele) => total + converterValor(tele.valor),
    0
  );

  const telesSemMotoboy = telesFiltradas.filter((tele: Tele) => !tele.motoboy).length;

  const saldoPendenteFiltrado = telesFiltradas.reduce(
    (total: number, tele: Tele) => total + saldoPendenteDaTele(tele),
    0
  );

  const filtrosSecundariosAtivos = motoboyFiltro !== "todos" || clienteFiltro !== "todos";

  function limparFiltros() {
    setDataFiltro(new Date().toISOString().split("T")[0]);
    setMotoboyFiltro("todos");
    setClienteFiltro("todos");
  }

  function totalPorStatus(status: string) {
    return telesFiltradas
      .filter((tele: Tele) => tele.status === status)
      .reduce((total: number, tele: Tele) => total + converterValor(tele.valor), 0);
  }

  return (
    <PageContainer>
      <div className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <PageHeader
          titulo="Central de Operações"
          descricao="Acompanhe, filtre e movimente todas as teles do dia."
        />

        <Link
          href="/nova-tele"
          className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 font-semibold text-white shadow-sm transition hover:bg-emerald-700 sm:w-auto"
        >
          <Plus size={20} />
          Nova tele
        </Link>
      </div>

      <section className="mb-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-5 md:flex-row md:items-center md:justify-between md:px-6">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <Filter size={21} />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">Filtros da operação</h2>
              <p className="mt-1 text-sm text-slate-500">
                Mostrando as teles conforme o período e os filtros selecionados.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={limparFiltros}
            disabled={!filtrosSecundariosAtivos}
            className="flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RotateCcw size={16} />
            Limpar filtros
          </button>
        </div>

        <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-3 md:p-6">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <CalendarDays size={16} />
              Data das operações
            </label>

            <input
              type="date"
              value={dataFiltro}
              onChange={(event) => setDataFiltro(event.target.value)}
              className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <Bike size={16} />
              Motoboy
            </label>

            <select
              value={motoboyFiltro}
              onChange={(event) => setMotoboyFiltro(event.target.value)}
              className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            >
              <option value="todos">Todos os motoboys</option>
              <option value="sem-motoboy">Somente sem motoboy</option>

              {motoboys.map((motoboy: Motoboy) => (
                <option key={motoboy.id || motoboy.nome} value={motoboy.nome}>
                  {motoboy.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-slate-600">Cliente solicitante</label>

            <select
              value={clienteFiltro}
              onChange={(event) => setClienteFiltro(event.target.value)}
              className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
            >
              <option value="todos">Todos os clientes</option>

              {[...new Set(clientes.map((cliente: Cliente) => cliente.nome))].sort().map((nome) => (
                <option key={nome} value={nome}>
                  {nome}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <div className="mb-6 grid grid-cols-2 gap-4 xl:grid-cols-4">
        <ResumoOperacao
          label="Teles filtradas"
          value={String(telesFiltradas.length)}
          description="Operações exibidas no quadro"
        />

        <ResumoOperacao
          label="Valor das teles"
          value={`R$ ${formatarValor(totalFiltrado)}`}
          description="Total bruto das operações"
        />

        <ResumoOperacao
          label="Sem motoboy"
          value={String(telesSemMotoboy)}
          description="Precisam de atribuição"
          alerta={telesSemMotoboy > 0}
        />

        <ResumoOperacao
          label="Saldo a receber"
          value={`R$ ${formatarValor(saldoPendenteFiltrado)}`}
          description="Valor ainda pendente"
          alerta={saldoPendenteFiltrado > 0}
        />
      </div>

      {teles.length === 0 && (
        <div className="mb-6 rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Nenhuma tele cadastrada</h2>
          <p className="mt-2 text-slate-500">
            Cadastre uma nova tele para ela aparecer na Central de Operações.
          </p>
        </div>
      )}

      {teles.length > 0 && telesFiltradas.length === 0 && (
        <div className="mb-6 rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <h2 className="text-xl font-bold text-slate-900">Nenhuma tele encontrada</h2>
          <p className="mt-2 text-slate-500">
            Não existem operações correspondentes à data e aos filtros escolhidos.
          </p>

          <button
            type="button"
            onClick={limparFiltros}
            className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <RotateCcw size={16} />
            Voltar para hoje
          </button>
        </div>
      )}

      <section className="w-full">
        <div className="grid w-full grid-cols-1 items-start gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
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
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setStatusSobrevoado(status);
                }}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                    setStatusSobrevoado(null);
                  }
                }}
                onDrop={(event) => void soltarTeleNaColuna(event, status)}
                className={`min-h-[560px] min-w-0 rounded-3xl border p-4 shadow-sm transition ${
                  statusSobrevoado === status
                    ? "scale-[1.01] ring-4 ring-emerald-300 ring-offset-2"
                    : ""
                } ${corColuna(status)}`}
              >
                <div className="sticky top-0 z-10 -mx-1 mb-5 overflow-hidden rounded-2xl border border-white/70 bg-white/90 shadow-sm backdrop-blur">
                  <div className="flex items-start justify-between gap-3 px-4 py-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2.5 w-2.5 shrink-0 rounded-full ${corIndicadorStatus(
                            status
                          )}`}
                        />

                        <h2 className="text-base font-bold leading-5 text-slate-900">{status}</h2>
                      </div>

                      <p className="mt-2 text-xs text-slate-500">{descricaoStatus(status)}</p>
                    </div>

                    <span className="flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 px-2 text-xs font-bold text-white">
                      {telesDoStatus.length}
                    </span>
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-4 py-3">
                    <span className="text-xs font-medium text-slate-500">Valor da coluna</span>

                    <strong className="text-sm text-slate-900">
                      R$ {formatarValor(totalPorStatus(status))}
                    </strong>
                  </div>
                </div>

                <div className="space-y-4">
                  {telesDoStatus.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-white/70 bg-white/50 px-4 py-8 text-center text-sm text-slate-500">
                      Arraste uma tele para esta coluna ou aguarde novas operações.
                    </div>
                  )}

                  {telesDoStatus.map((tele: Tele) => (
                    <TeleCard
                      key={tele.id}
                      tele={tele}
                      arrastando={teleArrastandoId === tele.id}
                      onDragStart={(event: React.DragEvent<HTMLDivElement>) =>
                        iniciarArraste(event, tele.id)
                      }
                      onDragEnd={encerrarArraste}
                      motoboys={motoboys}
                      alterarStatus={alterarStatus}
                      alterarMotoboy={alterarMotoboy}
                      alterarEspera={alterarEspera}
                      alterarSituacaoCobranca={alterarSituacaoCobranca}
                      descobrirSituacaoCobranca={descobrirSituacaoCobranca}
                      abrirPagamento={abrirPagamento}
                      saldoPendenteDaTele={saldoPendenteDaTele}
                      solicitarExclusao={solicitarExclusao}
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
      </section>

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

      {telePagamento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-xl md:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Registrar pagamento</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Informe o valor recebido e quem ficou com o dinheiro.
                </p>
              </div>

              <button
                type="button"
                onClick={fecharPagamento}
                disabled={salvandoPagamento}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              <ResumoPagamento label="Total" valor={telePagamento.total} />
              <ResumoPagamento
                label="Já recebido"
                valor={Number(telePagamento.valorRecebido || 0)}
              />
              <ResumoPagamento
                label="Pendente"
                valor={saldoPendenteDaTele(telePagamento)}
                destaque
              />
            </div>

            <div className="mt-6">
              <label className="text-sm font-medium text-slate-600">Valor recebido agora</label>
              <input
                value={valorPagamento}
                onChange={(event) => setValorPagamento(event.target.value)}
                inputMode="decimal"
                placeholder="0,00"
                className="mt-2 h-14 w-full rounded-xl border border-slate-200 px-4 text-lg font-semibold outline-none focus:border-emerald-500"
              />
              <p className="mt-2 text-xs text-slate-500">
                O restante continuará pendente para o próximo fechamento.
              </p>
            </div>

            <div className="mt-6">
              <p className="text-sm font-medium text-slate-600">Quem recebeu?</p>

              <div className="mt-2 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRecebedorPagamento("escritorio")}
                  className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                    recebedorPagamento === "escritorio"
                      ? "border-blue-400 bg-blue-50 text-blue-800"
                      : "border-slate-200 text-slate-600"
                  }`}
                >
                  Escritório
                </button>

                <button
                  type="button"
                  onClick={() => setRecebedorPagamento("motoboy")}
                  className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                    recebedorPagamento === "motoboy"
                      ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                      : "border-slate-200 text-slate-600"
                  }`}
                >
                  Motoboy
                </button>
              </div>
            </div>

            {recebedorPagamento === "motoboy" && (
              <div className="mt-5">
                <label className="text-sm font-medium text-slate-600">Motoboy recebedor</label>
                <select
                  value={motoboyRecebedorPagamento}
                  onChange={(event) => setMotoboyRecebedorPagamento(event.target.value)}
                  className="mt-2 h-14 w-full rounded-xl border border-slate-200 bg-white px-4 outline-none focus:border-emerald-500"
                >
                  <option value="">Selecionar motoboy</option>
                  {motoboys.map((motoboy: Motoboy) => (
                    <option key={motoboy.id || motoboy.nome} value={motoboy.nome}>
                      {motoboy.nome}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="mt-7 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={fecharPagamento}
                disabled={salvandoPagamento}
                className="h-13 rounded-xl border border-slate-200 font-medium text-slate-600 disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => void registrarPagamento()}
                disabled={salvandoPagamento}
                className="h-13 rounded-xl bg-emerald-600 font-semibold text-white disabled:opacity-60"
              >
                {salvandoPagamento ? "Salvando..." : "Registrar pagamento"}
              </button>
            </div>
          </div>
        </div>
      )}

      {teleParaExcluir && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-excluir-tele"
            className="w-full max-w-lg overflow-hidden rounded-3xl border border-red-100 bg-white shadow-2xl"
          >
            <div className="flex items-start gap-4 border-b border-red-100 bg-red-50 px-5 py-5 md:px-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-700">
                <AlertTriangle size={23} />
              </div>

              <div className="min-w-0 flex-1">
                <h2 id="titulo-excluir-tele" className="text-xl font-bold text-slate-900">
                  Excluir esta tele?
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Esta ação remove definitivamente a operação e não poderá ser desfeita.
                </p>
              </div>

              <button
                type="button"
                onClick={cancelarExclusao}
                disabled={excluindoTele}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-white disabled:cursor-wait disabled:opacity-50"
                aria-label="Fechar confirmação"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 p-5 md:p-6">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Tele selecionada
                </p>

                <div className="mt-3 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900">{teleParaExcluir.solicitante}</p>
                    <p className="mt-1 break-words text-sm leading-6 text-slate-600">
                      {resumoDaRota(getParadas(teleParaExcluir))}
                    </p>
                  </div>

                  <strong className="shrink-0 whitespace-nowrap text-emerald-700">
                    R$ {teleParaExcluir.valor}
                  </strong>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <StatusBadge status={teleParaExcluir.status} />

                  <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-slate-500">
                    {getParadas(teleParaExcluir).length}{" "}
                    {getParadas(teleParaExcluir).length === 1 ? "parada" : "paradas"}
                  </span>

                  <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-slate-500">
                    {teleParaExcluir.motoboy || "Sem motoboy"}
                  </span>
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
                Confirme somente depois de verificar que esta não é uma tele válida ou necessária
                para os fechamentos.
              </div>

              {erroExclusao && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {erroExclusao}
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:justify-end md:px-6">
              <button
                type="button"
                onClick={cancelarExclusao}
                disabled={excluindoTele}
                className="h-12 rounded-xl border border-slate-200 bg-white px-6 font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-wait disabled:opacity-50"
              >
                Manter tele
              </button>

              <button
                type="button"
                onClick={() => void confirmarExclusaoTele()}
                disabled={excluindoTele}
                className="flex h-12 items-center justify-center gap-2 rounded-xl bg-red-600 px-6 font-semibold text-white transition hover:bg-red-700 disabled:cursor-wait disabled:opacity-60"
              >
                {excluindoTele ? (
                  <>
                    <Loader2 size={17} className="animate-spin" />
                    Excluindo...
                  </>
                ) : (
                  <>
                    <Trash2 size={17} />
                    Excluir definitivamente
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {modalEdicaoAberto && teleEditando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-sm md:p-6">
          <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/20 bg-slate-50 shadow-2xl">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-5 md:px-7">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-600">
                  Central de Operações
                </p>
                <h2 className="mt-1 text-2xl font-bold text-slate-900">Editar tele</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Atualize a operação, as paradas e os dados de recebimento.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalEdicaoAberto(false)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                aria-label="Fechar edição"
              >
                <X size={19} />
              </button>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto p-4 md:p-7">
              <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                    <Bike size={19} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Dados operacionais</h3>
                    <p className="text-xs text-slate-500">
                      Cliente, valor, responsável e etapa atual.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-slate-600">Solicitante</label>
                    <select
                      value={teleEditando.solicitante}
                      onChange={(event) => atualizarTeleEditando("solicitante", event.target.value)}
                      className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    >
                      {clientes.map((cliente: Cliente) => (
                        <option key={cliente.id || cliente.nome} value={cliente.nome}>
                          {cliente.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <InputModal
                    label="Valor da tele"
                    value={teleEditando.valor}
                    onChange={(value: string) => atualizarTeleEditando("valor", value)}
                    placeholder="0,00"
                  />

                  <div>
                    <label className="text-sm font-medium text-slate-600">
                      Motoboy responsável
                    </label>
                    <select
                      value={teleEditando.motoboy || ""}
                      onChange={(event) => atualizarTeleEditando("motoboy", event.target.value)}
                      className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    >
                      <option value="">Sem motoboy definido</option>
                      {motoboys.map((motoboy: Motoboy) => (
                        <option key={motoboy.id || motoboy.nome} value={motoboy.nome}>
                          {motoboy.nome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-600">Status da operação</label>
                    <select
                      value={teleEditando.status}
                      onChange={(event) => atualizarTeleEditando("status", event.target.value)}
                      className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-slate-50/70 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                      <MapPin size={19} />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">Rota e paradas</h3>
                      <p className="text-xs text-slate-500">
                        Confira os locais e informações de cada etapa.
                      </p>
                    </div>
                  </div>

                  <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">
                    {teleEditando.paradas.length}{" "}
                    {teleEditando.paradas.length === 1 ? "parada" : "paradas"}
                  </span>
                </div>

                <div className="space-y-4 p-5">
                  {teleEditando.paradas.map((parada: Parada, index: number) => (
                    <div
                      key={parada.id || `${index}-${parada.endereco}`}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70"
                    >
                      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                            {index + 1}
                          </span>
                          <div>
                            <p className="text-sm font-bold text-slate-900">Parada {index + 1}</p>
                            <p className="text-xs text-slate-500">
                              {parada.tipo || "Tipo não informado"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
                        <InputModal
                          label="Tipo da parada"
                          value={parada.tipo}
                          onChange={(value: string) =>
                            atualizarParadaEditando(index, "tipo", value)
                          }
                          placeholder="Coleta ou entrega"
                        />

                        <InputModal
                          label="Cliente ou local"
                          value={parada.cliente || parada.nomeCliente || ""}
                          onChange={(value: string) =>
                            atualizarParadaEditando(index, "cliente", value)
                          }
                          placeholder="Nome do cliente"
                        />

                        <InputModal
                          label="Contato"
                          value={parada.contato || ""}
                          onChange={(value: string) =>
                            atualizarParadaEditando(index, "contato", value)
                          }
                          placeholder="Nome ou telefone"
                        />

                        <InputModal
                          label="Endereço"
                          value={parada.endereco || ""}
                          onChange={(value: string) =>
                            atualizarParadaEditando(index, "endereco", value)
                          }
                          placeholder="Endereço completo"
                        />

                        <InputModal
                          label="Observação"
                          value={parada.observacao || ""}
                          onChange={(value: string) =>
                            atualizarParadaEditando(index, "observacao", value)
                          }
                          placeholder="Instruções desta parada"
                          className="md:col-span-2"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                    <WalletCards size={19} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Financeiro</h3>
                    <p className="text-xs text-slate-500">
                      Defina cobrança, recebimento e responsável pelo valor.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 p-5 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-slate-600">Forma de cobrança</label>
                    <select
                      value={teleEditando.formaCobranca || "na_hora"}
                      onChange={(event) =>
                        atualizarTeleEditando("formaCobranca", event.target.value)
                      }
                      className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    >
                      <option value="na_hora">Cobrar na hora</option>
                      <option value="semanal">Fechamento semanal</option>
                      <option value="quinzenal">Fechamento quinzenal</option>
                      <option value="mensal">Fechamento mensal</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-600">
                      Situação do recebimento
                    </label>
                    <select
                      value={teleEditando.recebimento || "pendente"}
                      onChange={(event) => {
                        const novoRecebimento = event.target.value;

                        setTeleEditando((teleAtual: any) => ({
                          ...teleAtual,
                          recebimento: novoRecebimento,
                          valorRecebido:
                            novoRecebimento === "pendente"
                              ? ""
                              : teleAtual.valorRecebido || teleAtual.valor,
                          motoboyRecebedor:
                            novoRecebimento === "motoboy"
                              ? teleAtual.motoboyRecebedor || teleAtual.motoboy || ""
                              : "",
                        }));
                      }}
                      className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                    >
                      <option value="pendente">Pagamento pendente</option>
                      <option value="escritorio">Recebido no escritório</option>
                      <option value="motoboy">Recebido pelo motoboy</option>
                    </select>
                  </div>

                  <InputModal
                    label="Valor recebido"
                    value={teleEditando.valorRecebido || ""}
                    onChange={(value: string) => atualizarTeleEditando("valorRecebido", value)}
                    placeholder="0,00"
                    disabled={teleEditando.recebimento === "pendente"}
                  />

                  {teleEditando.recebimento === "motoboy" ? (
                    <div>
                      <label className="text-sm font-medium text-slate-600">
                        Motoboy recebedor
                      </label>
                      <select
                        value={teleEditando.motoboyRecebedor || ""}
                        onChange={(event) =>
                          atualizarTeleEditando("motoboyRecebedor", event.target.value)
                        }
                        className="mt-2 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                      >
                        <option value="">Selecionar motoboy</option>
                        {motoboys.map((motoboy: Motoboy) => (
                          <option key={motoboy.id || motoboy.nome} value={motoboy.nome}>
                            {motoboy.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="flex min-h-20 items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 text-sm text-slate-500">
                      {teleEditando.recebimento === "pendente"
                        ? "O valor continuará pendente para o fechamento."
                        : "O recebimento ficará registrado no escritório."}
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:justify-end md:px-7">
              <button
                type="button"
                onClick={() => setModalEdicaoAberto(false)}
                className="h-12 rounded-xl border border-slate-200 px-6 font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => void salvarEdicaoTele()}
                className="flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 font-semibold text-white transition hover:bg-emerald-700"
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

type ResumoOperacaoProps = {
  label: string;
  value: string;
  description: string;
  alerta?: boolean;
};

function ResumoOperacao({ label, value, description, alerta = false }: ResumoOperacaoProps) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <strong
        className={`mt-2 block text-2xl font-bold ${alerta ? "text-orange-600" : "text-slate-900"}`}
      >
        {value}
      </strong>
      <p className="mt-1 text-xs text-slate-400">{description}</p>
    </div>
  );
}

function resumoDaRota(paradas: Parada[]) {
  if (!paradas.length) return "Rota não informada";

  const primeira = paradas[0];
  const ultima = paradas[paradas.length - 1];

  const origem =
    primeira.cliente || primeira.nomeCliente || primeira.endereco || "Origem não informada";

  if (paradas.length === 1) return origem;

  const destino =
    ultima.cliente || ultima.nomeCliente || ultima.endereco || "Destino não informado";

  return `${origem} → ${destino}`;
}

function descricaoStatus(status: string) {
  if (status === "Aguardando cliente") {
    return "Operações aguardando confirmação.";
  }

  if (status === "Aguardando motoboy disponível") {
    return "Teles ainda sem motoboy definido.";
  }

  if (status === "Aguardando coleta") {
    return "Motoboy definido e aguardando início.";
  }

  if (status === "Em rota") {
    return "Operações em andamento.";
  }

  if (status === "Entregue") {
    return "Entregas concluídas no período.";
  }

  return "Operações desta etapa.";
}

function corIndicadorStatus(status: string) {
  if (status === "Aguardando cliente") {
    return "bg-slate-500";
  }

  if (status === "Aguardando motoboy disponível") {
    return "bg-orange-500";
  }

  if (status === "Aguardando coleta") {
    return "bg-violet-500";
  }

  if (status === "Em rota") {
    return "bg-sky-500";
  }

  if (status === "Entregue") {
    return "bg-emerald-500";
  }

  return "bg-slate-400";
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
function InputModal({ label, value, onChange, placeholder, className, disabled = false }: any) {
  return (
    <div className={className}>
      {label && <label className="text-sm font-medium text-slate-600">{label}</label>}

      <input
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
      />
    </div>
  );
}

function rotuloFormaCobranca(formaCobranca: string) {
  const forma = String(formaCobranca || "na_hora").toLowerCase();

  if (forma === "semanal") return "Semanal";
  if (forma === "quinzenal") return "Quinzenal";
  if (forma === "mensal") return "Mensal";

  return "Na hora";
}

function rotuloRecebimento(recebimento: string) {
  const status = String(recebimento || "pendente").toLowerCase();

  if (status === "escritorio") return "Recebido no escritório";
  if (status === "motoboy") return "Recebido pelo motoboy";

  return "Pendente";
}

function corRecebimento(recebimento: string) {
  const status = String(recebimento || "pendente").toLowerCase();

  if (status === "escritorio") {
    return "border-blue-200 bg-blue-50 text-blue-800";
  }

  if (status === "motoboy") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  return "border-amber-200 bg-amber-50 text-amber-800";
}

function TeleCard({
  tele,
  arrastando,
  onDragStart,
  onDragEnd,
  motoboys,
  alterarStatus,
  alterarMotoboy,
  alterarEspera,
  alterarSituacaoCobranca,
  descobrirSituacaoCobranca,
  abrirPagamento,
  saldoPendenteDaTele,
  solicitarExclusao,
  editarTele,
  concluirTele,
  gerarOrcamento,
  gerarTeleMotoboy,
  getParadas,
  valorEspera,
  formatarValor,
  converterValor,
}: any) {
  const [expandido, setExpandido] = useState(false);
  const [acaoSalvando, setAcaoSalvando] = useState<string | null>(null);

  async function executarAcao(chave: string, acao: () => Promise<unknown>) {
    if (acaoSalvando) return;

    setAcaoSalvando(chave);

    try {
      await acao();
    } finally {
      setAcaoSalvando(null);
    }
  }

  const espera = tele.esperaMinutos || 0;
  const acrescimoEspera = valorEspera(espera);
  const paradas = getParadas(tele);

  const primeiraParada = paradas[0];
  const ultimaParada = paradas[paradas.length - 1];

  const origem = primeiraParada?.cliente || primeiraParada?.nomeCliente || "Origem não informada";

  const destino = ultimaParada?.cliente || ultimaParada?.nomeCliente || "Destino não informado";

  const resumoRota = paradas.length > 1 && origem !== destino ? `${origem} → ${destino}` : origem;
  const situacaoCobranca = descobrirSituacaoCobranca(tele);

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`cursor-grab overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md active:cursor-grabbing ${
        arrastando ? "scale-[0.98] opacity-50 ring-2 ring-emerald-400" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => setExpandido((estadoAtual) => !estadoAtual)}
        className="w-full border-b border-slate-100 bg-white p-4 text-left transition hover:bg-slate-50"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <SituacaoCobrancaBadge situacao={situacaoCobranca} />

              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-500">
                {paradas.length} {paradas.length === 1 ? "parada" : "paradas"}
              </span>
            </div>

            <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {tele.solicitante}
            </p>

            <h3 className="mt-1 break-words text-[15px] font-bold leading-6 text-slate-900">
              {resumoRota}
            </h3>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-3">
            <strong className="whitespace-nowrap text-base font-bold text-emerald-700">
              R$ {tele.valor}
            </strong>

            <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm">
              {expandido ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Bike size={14} className="shrink-0 text-slate-400" />

            <span className={tele.motoboy ? "" : "font-medium text-orange-600"}>
              {tele.motoboy || "Motoboy não definido"}
            </span>
          </div>

          {tele.criadoEm && <p className="truncate pl-6 text-slate-400">{tele.criadoEm}</p>}
        </div>
      </button>

      {acaoSalvando && (
        <div className="flex items-center justify-center gap-2 border-b border-emerald-100 bg-emerald-50 px-4 py-2 text-xs font-medium text-emerald-700">
          <Loader2 size={14} className="animate-spin" />
          Salvando alteração...
        </div>
      )}

      {expandido && (
        <>
          {/* Cabeçalho detalhado */}
          <div className="border-b border-slate-100 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-slate-900">{tele.tipoRota}</h3>

                  <StatusBadge status={tele.status} />
                </div>

                <p className="mt-1 truncate text-sm font-medium text-slate-600">
                  {tele.solicitante}
                </p>

                {tele.criadoEm && <p className="mt-1 text-xs text-slate-400">{tele.criadoEm}</p>}
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
                  onClick={() => solicitarExclusao(tele)}
                  title="Excluir tele"
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-100 bg-white text-red-600 transition hover:bg-red-50"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-2xl bg-white px-4 py-3">
              <span className="text-sm text-slate-500">Valor da tele</span>

              <strong className="text-lg text-emerald-700">R$ {tele.valor}</strong>
            </div>
          </div>

          {/* Rota */}
          <div className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Rota</p>

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
                        {parada.cliente || parada.nomeCliente || "Local não informado"}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-slate-600">
                    <div className="flex items-start gap-2">
                      <MapPin size={15} className="mt-0.5 shrink-0 text-slate-400" />

                      <span className="leading-5">
                        {parada.endereco || "Endereço não informado"}
                      </span>
                    </div>

                    {parada.contato && (
                      <div className="flex items-center gap-2">
                        <Phone size={15} className="shrink-0 text-slate-400" />

                        <span>{parada.contato}</span>
                      </div>
                    )}

                    {parada.observacao && (
                      <div className="mt-3 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        <strong>Observação:</strong> {parada.observacao}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {tele.observacaoGeral && (
              <div className="mt-3 rounded-2xl border border-orange-100 bg-orange-50 p-3 text-sm text-orange-800">
                <strong>Observação geral:</strong> {tele.observacaoGeral}
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
                  disabled={Boolean(acaoSalvando)}
                  onChange={(e) => {
                    const novoMotoboy = e.target.value;
                    void executarAcao("motoboy", () => alterarMotoboy(tele.id, novoMotoboy));
                  }}
                  className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-emerald-500 disabled:cursor-wait disabled:bg-slate-100"
                >
                  <option value="">Selecionar motoboy</option>

                  {motoboys.map((motoboy: Motoboy) => (
                    <option key={motoboy.id || motoboy.nome} value={motoboy.nome}>
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
                      onChange={(e) => alterarEspera(tele.id, Number(e.target.value))}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 pr-10 text-sm outline-none focus:border-emerald-500"
                    />

                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                      min
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-600">Status</label>

                  <select
                    value={tele.status}
                    disabled={Boolean(acaoSalvando)}
                    onChange={(e) => {
                      const novoStatus = e.target.value as StatusTele;
                      void executarAcao("status", () => alterarStatus(tele.id, novoStatus));
                    }}
                    className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-emerald-500 disabled:cursor-wait disabled:bg-slate-100"
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
                valor={`R$ ${formatarValor(tele.valorBase || converterValor(tele.valor))}`}
              />

              <LinhaValor label="Retorno" valor={`R$ ${formatarValor(tele.retorno || 0)}`} />

              <LinhaValor
                label={`Espera (${espera} min)`}
                valor={`R$ ${formatarValor(acrescimoEspera)}`}
              />

              <div className="flex items-center justify-between border-t border-emerald-200 pt-3">
                <span className="font-bold text-emerald-800">Total</span>

                <strong className="text-xl text-emerald-700">R$ {tele.valor}</strong>
              </div>
            </div>
          </div>

          {/* Cobrança rápida */}
          <div className="border-t border-slate-100 p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
              Situação de cobrança
            </p>

            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => abrirPagamento(tele)}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition ${
                  situacaoCobranca === "pago" || situacaoCobranca === "pago_parcial"
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span>
                  <strong>
                    {situacaoCobranca === "pago"
                      ? "Pago"
                      : situacaoCobranca === "pago_parcial"
                        ? "Pago parcialmente"
                        : "Registrar pagamento"}
                  </strong>
                  <span className="mt-0.5 block text-xs opacity-75">
                    {situacaoCobranca === "pago"
                      ? "Valor total recebido"
                      : situacaoCobranca === "pago_parcial"
                        ? `Recebido R$ ${formatarValor(
                            Number(tele.valorRecebido || 0)
                          )} • falta R$ ${formatarValor(saldoPendenteDaTele(tele))}`
                        : "Informe valor e quem recebeu"}
                  </span>
                </span>
                <span className="text-lg">🟢</span>
              </button>

              <button
                type="button"
                disabled={Boolean(acaoSalvando)}
                onClick={() =>
                  void executarAcao("cobranca", () =>
                    alterarSituacaoCobranca(tele.id, "fim_semana")
                  )
                }
                className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition disabled:cursor-wait disabled:opacity-60 ${
                  situacaoCobranca === "fim_semana"
                    ? "border-blue-300 bg-blue-50 text-blue-800"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span>
                  <strong>Paga no fim da semana</strong>
                  <span className="mt-0.5 block text-xs opacity-75">Cobrança semanal pendente</span>
                </span>
                <span className="text-lg">🔵</span>
              </button>

              <button
                type="button"
                disabled={Boolean(acaoSalvando)}
                onClick={() =>
                  void executarAcao("cobranca", () =>
                    alterarSituacaoCobranca(tele.id, "precisa_cobrar")
                  )
                }
                className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition disabled:cursor-wait disabled:opacity-60 ${
                  situacaoCobranca === "precisa_cobrar"
                    ? "border-amber-300 bg-amber-50 text-amber-800"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span>
                  <strong>Precisa cobrar</strong>
                  <span className="mt-0.5 block text-xs opacity-75">
                    Pagamento pendente para cobrar agora
                  </span>
                </span>
                <span className="text-lg">🟡</span>
              </button>
            </div>
          </div>

          {/* Recebimento */}
          <div className="border-t border-slate-100 p-4">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
              Recebimento
            </p>

            <div className={`rounded-2xl border p-4 ${corRecebimento(tele.recebimento)}`}>
              <div className="mb-4 flex items-center justify-between gap-3">
                <strong className="text-sm">
                  {tele.recebimento === "escritorio"
                    ? "🔵 Recebido no escritório"
                    : tele.recebimento === "motoboy"
                      ? "🟢 Recebido pelo motoboy"
                      : "🟡 Pagamento pendente"}
                </strong>
              </div>

              <div className="space-y-2 text-sm">
                <LinhaValor
                  label="Forma de cobrança"
                  valor={rotuloFormaCobranca(tele.formaCobranca)}
                />

                <LinhaValor label="Status" valor={rotuloRecebimento(tele.recebimento)} />

                <LinhaValor
                  label="Recebedor"
                  valor={
                    tele.recebimento === "motoboy"
                      ? tele.motoboyRecebedor || tele.motoboy || "—"
                      : tele.recebimento === "escritorio"
                        ? "Escritório"
                        : "—"
                  }
                />

                <LinhaValor
                  label="Valor recebido"
                  valor={`R$ ${formatarValor(Number(tele.valorRecebido || 0))}`}
                />
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
                disabled={Boolean(acaoSalvando)}
                onClick={() => void executarAcao("concluir", () => concluirTele(tele.id))}
                className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60"
              >
                {acaoSalvando === "concluir" && <Loader2 size={16} className="animate-spin" />}
                {acaoSalvando === "concluir" ? "Concluindo..." : "Concluir entrega"}
              </button>
            )}

            {tele.status === "Entregue" && (
              <div className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-700">
                Entrega concluída
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function SituacaoCobrancaBadge({ situacao }: { situacao: SituacaoCobranca }) {
  const configuracao = {
    pago: {
      texto: "Pago",
      classes: "bg-emerald-100 text-emerald-700",
    },
    pago_parcial: {
      texto: "Pago parcialmente",
      classes: "bg-teal-100 text-teal-700",
    },
    fim_semana: {
      texto: "Fim da semana",
      classes: "bg-blue-100 text-blue-700",
    },
    precisa_cobrar: {
      texto: "Precisa cobrar",
      classes: "bg-amber-100 text-amber-700",
    },
  }[situacao];

  return (
    <span className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${configuracao.classes}`}>
      {configuracao.texto}
    </span>
  );
}

function ResumoPagamento({
  label,
  valor,
  destaque = false,
}: {
  label: string;
  valor: number;
  destaque?: boolean;
}) {
  return (
    <div className={`rounded-2xl p-3 text-center ${destaque ? "bg-amber-50" : "bg-slate-50"}`}>
      <p className="text-xs text-slate-500">{label}</p>
      <strong className={`mt-1 block text-sm ${destaque ? "text-amber-700" : "text-slate-800"}`}>
        R$ {valor.toFixed(2).replace(".", ",")}
      </strong>
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
