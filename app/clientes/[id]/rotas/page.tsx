"use client";

import PageContainer from "@/components/ui/PageContainer";
import PageHeader from "@/components/ui/PageHeader";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Clock3,
  History,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Route,
  Save,
  Trash2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type Cliente = {
  id: string;
  nome: string;
};

type ParadaRota = {
  id?: string;
  ordem: number;
  tipo: string;
  cliente: string;
  endereco: string;
  contato?: string | null;
  observacao?: string | null;
};

type RotaGerenciada = {
  id: string;
  solicitante: string;
  nome: string;
  paradas: ParadaRota[];
  origem: "salva" | "historico";
  assinaturaHistorica?: string | null;
  quantidadeUsos?: number | null;
  ultimaUtilizacao?: string | null;
};

const TIPOS = ["Entrega", "Coleta", "Trocar", "Entrega e coleta", "Retorno"];

function novaParada(ordem: number): ParadaRota {
  return {
    ordem,
    tipo: "Entrega",
    cliente: "",
    endereco: "",
    contato: "",
    observacao: "",
  };
}

function formatarData(data?: string | null) {
  if (!data) return "Sem data";

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
  }).format(new Date(data));
}

export default function GerenciarRotasClientePage() {
  const params = useParams<{ id: string }>();
  const clienteId = params?.id;

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [rotas, setRotas] = useState<RotaGerenciada[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [rotaEditando, setRotaEditando] = useState<RotaGerenciada | null>(null);
  const [nome, setNome] = useState("");
  const [paradas, setParadas] = useState<ParadaRota[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [excluindoId, setExcluindoId] = useState<string | null>(null);

  const carregarRotas = useCallback(async () => {
    if (!clienteId) return;

    setCarregando(true);
    setErro("");

    try {
      const respostaClientes = await fetch("/api/clientes", { cache: "no-store" });
      const clientes = await respostaClientes.json();

      if (!respostaClientes.ok || !Array.isArray(clientes)) {
        throw new Error("Não foi possível carregar o solicitante.");
      }

      const encontrado = clientes.find((item: Cliente) => item.id === clienteId);

      if (!encontrado) {
        throw new Error("Solicitante não encontrado.");
      }

      setCliente(encontrado);

      const respostaRotas = await fetch(
        `/api/rotas-salvas?solicitante=${encodeURIComponent(
          encontrado.nome
        )}&incluirHistorico=1`,
        { cache: "no-store" }
      );
      const dadosRotas = await respostaRotas.json();

      if (!respostaRotas.ok) {
        throw new Error(dadosRotas?.erro || "Não foi possível carregar as rotas.");
      }

      setRotas(Array.isArray(dadosRotas) ? dadosRotas : []);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível carregar as rotas.");
    } finally {
      setCarregando(false);
    }
  }, [clienteId]);

  useEffect(() => {
    void carregarRotas();
  }, [carregarRotas]);

  const rotasSalvas = useMemo(
    () => rotas.filter((rota) => rota.origem === "salva"),
    [rotas]
  );
  const rotasHistoricas = useMemo(
    () => rotas.filter((rota) => rota.origem === "historico"),
    [rotas]
  );

  function abrirNovaRota() {
    if (!cliente) return;

    setRotaEditando({
      id: "",
      solicitante: cliente.nome,
      nome: "",
      paradas: [novaParada(0), novaParada(1)],
      origem: "salva",
    });
    setNome("");
    setParadas([novaParada(0), novaParada(1)]);
  }

  function abrirEdicao(rota: RotaGerenciada) {
    setRotaEditando(rota);
    setNome(rota.nome);
    setParadas(
      rota.paradas.map((parada, ordem) => ({
        ...parada,
        ordem,
        contato: parada.contato || "",
        observacao: parada.observacao || "",
      }))
    );
  }

  function fecharEdicao() {
    if (salvando) return;
    setRotaEditando(null);
    setNome("");
    setParadas([]);
  }

  function atualizarParada(index: number, campo: keyof ParadaRota, valor: string) {
    setParadas((atuais) =>
      atuais.map((parada, i) => (i === index ? { ...parada, [campo]: valor } : parada))
    );
  }

  function moverParada(index: number, direcao: -1 | 1) {
    const destino = index + direcao;

    if (destino < 0 || destino >= paradas.length) return;

    setParadas((atuais) => {
      const copia = [...atuais];
      [copia[index], copia[destino]] = [copia[destino], copia[index]];
      return copia.map((parada, ordem) => ({ ...parada, ordem }));
    });
  }

  function adicionarParada() {
    setParadas((atuais) => [...atuais, novaParada(atuais.length)]);
  }

  function removerParada(index: number) {
    if (paradas.length <= 1) {
      alert("A rota precisa ter pelo menos uma parada.");
      return;
    }

    setParadas((atuais) =>
      atuais.filter((_, i) => i !== index).map((parada, ordem) => ({ ...parada, ordem }))
    );
  }

  async function salvarRota() {
    if (!cliente || !rotaEditando || salvando) return;

    const nomeLimpo = nome.trim();

    if (!nomeLimpo) {
      alert("Informe o nome da rota.");
      return;
    }

    if (paradas.length === 0 || paradas.some((parada) => !parada.endereco.trim())) {
      alert("Preencha o endereço de todas as paradas.");
      return;
    }

    setSalvando(true);

    try {
      const resposta = await fetch("/api/rotas-salvas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: rotaEditando.origem === "salva" ? rotaEditando.id || null : null,
          solicitante: cliente.nome,
          nome: nomeLimpo,
          assinaturaHistorica:
            rotaEditando.origem === "historico"
              ? rotaEditando.assinaturaHistorica
              : null,
          paradas,
        }),
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(dados?.erro || "Não foi possível salvar a rota.");
      }

      fecharEdicao();
      await carregarRotas();
      alert(
        rotaEditando.origem === "historico"
          ? "Rota antiga convertida e salva com sucesso."
          : "Rota salva com sucesso."
      );
    } catch (error) {
      alert(error instanceof Error ? error.message : "Não foi possível salvar a rota.");
    } finally {
      setSalvando(false);
    }
  }

  async function excluirRota(rota: RotaGerenciada) {
    if (!cliente || excluindoId) return;

    const mensagem =
      rota.origem === "historico"
        ? `Ocultar a rota antiga “${rota.nome}”? O histórico das teles não será apagado.`
        : `Excluir a rota salva “${rota.nome}”?`;

    if (!window.confirm(mensagem)) return;

    setExcluindoId(rota.id);

    try {
      const parametros = new URLSearchParams();

      if (rota.origem === "historico") {
        parametros.set("solicitante", cliente.nome);
        parametros.set("assinaturaHistorica", rota.assinaturaHistorica || "");
      } else {
        parametros.set("id", rota.id);
      }

      const resposta = await fetch(`/api/rotas-salvas?${parametros.toString()}`, {
        method: "DELETE",
      });
      const dados = await resposta.json();

      if (!resposta.ok) {
        throw new Error(dados?.erro || "Não foi possível excluir a rota.");
      }

      await carregarRotas();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Não foi possível excluir a rota.");
    } finally {
      setExcluindoId(null);
    }
  }

  if (carregando) {
    return (
      <PageContainer>
        <div className="flex min-h-[60vh] items-center justify-center gap-3 text-slate-500">
          <Loader2 className="animate-spin" size={22} />
          Carregando rotas...
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Link
        href="/clientes"
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700"
      >
        <ArrowLeft size={17} />
        Voltar para clientes
      </Link>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <PageHeader
          titulo={`Rotas de ${cliente?.nome || "solicitante"}`}
          descricao="Edite rotas salvas e também rotas antigas encontradas no histórico."
        />

        <button
          type="button"
          onClick={abrirNovaRota}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 font-semibold text-white hover:bg-emerald-700"
        >
          <Plus size={19} />
          Criar nova rota
        </button>
      </div>

      {erro && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          {erro}
        </div>
      )}

      <section className="mt-8">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-xl bg-blue-100 p-2 text-blue-700">
            <Route size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Rotas salvas</h2>
            <p className="text-sm text-slate-500">
              Rotas oficiais disponíveis na tela Nova Tele.
            </p>
          </div>
        </div>

        <ListaRotas
          rotas={rotasSalvas}
          vazio="Nenhuma rota oficial salva."
          excluindoId={excluindoId}
          onEditar={abrirEdicao}
          onExcluir={excluirRota}
        />
      </section>

      <section className="mt-10">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
            <History size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Rotas antigas do histórico</h2>
            <p className="text-sm text-slate-500">
              Clique em editar para converter uma rota antiga em rota salva oficial.
            </p>
          </div>
        </div>

        <ListaRotas
          rotas={rotasHistoricas}
          vazio="Nenhuma rota antiga encontrada ou todas já foram organizadas."
          excluindoId={excluindoId}
          onEditar={abrirEdicao}
          onExcluir={excluirRota}
        />
      </section>

      {rotaEditando && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-slate-950/60 p-4">
          <div className="mx-auto my-4 max-w-5xl rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 md:p-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {rotaEditando.origem === "historico"
                    ? "Editar e converter rota antiga"
                    : rotaEditando.id
                      ? "Editar rota salva"
                      : "Criar nova rota"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  As observações de cada parada também aparecerão para o motoboy.
                </p>
              </div>

              <button
                type="button"
                onClick={fecharEdicao}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 p-5 md:p-6">
              <div>
                <label className="text-sm font-semibold text-slate-700">Nome da rota</label>
                <input
                  value={nome}
                  onChange={(event) => setNome(event.target.value)}
                  placeholder="Ex.: Coleta laboratório e entrega central"
                  className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-4 outline-none focus:border-emerald-500"
                />
              </div>

              {paradas.map((parada, index) => (
                <article
                  key={`${rotaEditando.id || "nova"}-${index}`}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <strong className="text-slate-900">Parada {index + 1}</strong>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => moverParada(index, -1)}
                        disabled={index === 0}
                        className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 disabled:opacity-30"
                        aria-label="Mover parada para cima"
                      >
                        <ArrowUp size={17} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moverParada(index, 1)}
                        disabled={index === paradas.length - 1}
                        className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 disabled:opacity-30"
                        aria-label="Mover parada para baixo"
                      >
                        <ArrowDown size={17} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removerParada(index)}
                        className="rounded-lg border border-red-200 bg-white p-2 text-red-600 hover:bg-red-50"
                        aria-label="Remover parada"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Campo label="Tipo">
                      <select
                        value={parada.tipo}
                        onChange={(event) => atualizarParada(index, "tipo", event.target.value)}
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3"
                      >
                        {TIPOS.map((tipo) => (
                          <option key={tipo}>{tipo}</option>
                        ))}
                      </select>
                    </Campo>

                    <Campo label="Cliente/local">
                      <input
                        value={parada.cliente}
                        onChange={(event) =>
                          atualizarParada(index, "cliente", event.target.value)
                        }
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3"
                      />
                    </Campo>

                    <Campo label="Endereço">
                      <input
                        value={parada.endereco}
                        onChange={(event) =>
                          atualizarParada(index, "endereco", event.target.value)
                        }
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3"
                      />
                    </Campo>

                    <Campo label="Contato">
                      <input
                        value={parada.contato || ""}
                        onChange={(event) =>
                          atualizarParada(index, "contato", event.target.value)
                        }
                        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3"
                      />
                    </Campo>

                    <div className="md:col-span-2">
                      <Campo label="Observação fixa para esta parada">
                        <textarea
                          value={parada.observacao || ""}
                          onChange={(event) =>
                            atualizarParada(index, "observacao", event.target.value)
                          }
                          rows={3}
                          placeholder="Ex.: retirar na recepção, ligar antes, cobrar produto..."
                          className="w-full rounded-xl border border-slate-200 bg-white p-3"
                        />
                      </Campo>
                    </div>
                  </div>
                </article>
              ))}

              <button
                type="button"
                onClick={adicionarParada}
                className="inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Plus size={18} />
                Adicionar parada
              </button>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 p-5 sm:flex-row sm:justify-end md:p-6">
              <button
                type="button"
                onClick={fecharEdicao}
                disabled={salvando}
                className="h-12 rounded-xl border border-slate-200 px-5 font-semibold text-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={salvarRota}
                disabled={salvando}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 font-semibold text-white disabled:opacity-60"
              >
                {salvando ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                {rotaEditando.origem === "historico"
                  ? "Converter e salvar"
                  : "Salvar rota"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageContainer>
  );
}

function ListaRotas({
  rotas,
  vazio,
  excluindoId,
  onEditar,
  onExcluir,
}: {
  rotas: RotaGerenciada[];
  vazio: string;
  excluindoId: string | null;
  onEditar: (rota: RotaGerenciada) => void;
  onExcluir: (rota: RotaGerenciada) => void;
}) {
  if (rotas.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-slate-500">
        {vazio}
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {rotas.map((rota) => (
        <article key={rota.id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-bold text-slate-900">{rota.nome}</h3>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
                    rota.origem === "historico"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {rota.origem === "historico" ? "Antiga" : "Salva"}
                </span>
              </div>

              {rota.origem === "historico" && (
                <p className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <History size={14} />
                    {rota.quantidadeUsos || 1} uso(s)
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock3 size={14} />
                    Última: {formatarData(rota.ultimaUtilizacao)}
                  </span>
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onEditar(rota)}
                className="rounded-xl border border-blue-200 p-2.5 text-blue-700 hover:bg-blue-50"
                aria-label={`Editar ${rota.nome}`}
              >
                <Pencil size={18} />
              </button>
              <button
                type="button"
                onClick={() => onExcluir(rota)}
                disabled={excluindoId === rota.id}
                className="rounded-xl border border-red-200 p-2.5 text-red-600 hover:bg-red-50 disabled:opacity-50"
                aria-label={`Excluir ${rota.nome}`}
              >
                {excluindoId === rota.id ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Trash2 size={18} />
                )}
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {rota.paradas.map((parada, index) => (
              <div
                key={parada.id || `${rota.id}-${index}`}
                className="flex items-start gap-3 rounded-xl bg-slate-50 p-3"
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-600">
                  {index + 1}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800">
                    {parada.cliente || parada.tipo}
                  </p>
                  <p className="mt-1 flex items-start gap-1 text-xs leading-5 text-slate-500">
                    <MapPin size={13} className="mt-0.5 shrink-0" />
                    {parada.endereco}
                  </p>
                  {parada.observacao && (
                    <p className="mt-1 text-xs font-medium text-amber-700">
                      Obs.: {parada.observacao}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  );
}
