"use client";

import MapaPreviewFilaOperacional from "@/components/maps/MapaPreviewFilaOperacional";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ListOrdered,
  Loader2,
  LockKeyhole,
  MapPin,
  RefreshCw,
  Save,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type StatusItemFila = "PENDENTE" | "EM_ANDAMENTO" | "CONCLUIDO" | "CANCELADO";

type ItemFilaOperacional = {
  id: string;
  ordem: number;
  posicao: number;
  status: StatusItemFila;
  bloqueado: boolean;
  iniciadaEm?: string | null;
  concluidaEm?: string | null;
  tele: {
    id: string;
    solicitante: string;
    tipoRota: string;
    status: string;
    statusAceite: string;
    etapaMotoboy?: string | null;
    paradaAtualMotoboy: number;
    observacaoGeral?: string | null;
    dataTele?: string | null;
  };
  parada: {
    id: string;
    tipo: string;
    ordem: number;
    cliente: string;
    endereco: string;
    contato?: string | null;
    observacao?: string | null;
  };
};

type RespostaFila = {
  motoboy: {
    id: string;
    nome: string;
    online: boolean;
  };
  totalItens: number;
  itemAtual: ItemFilaOperacional | null;
  itens: ItemFilaOperacional[];
};

type FilaOperacionalMotoboyProps = {
  motoboyId: string | null;
  motoboyNome?: string | null;
};

function textoTipoParada(tipo: string) {
  const textos: Record<string, string> = {
    COLETA: "Coleta",
    ENTREGA: "Entrega",
    TROCAR: "Troca",
    ENTREGA_E_COLETA: "Entrega e coleta",
    RETORNO: "Retorno",
  };

  return textos[tipo] || tipo.replaceAll("_", " ");
}

async function lerErro(resposta: Response, fallback: string) {
  try {
    const dados = await resposta.json();
    return typeof dados?.erro === "string" ? dados.erro : fallback;
  } catch {
    return fallback;
  }
}

export default function FilaOperacionalMotoboy({
  motoboyId,
  motoboyNome,
}: FilaOperacionalMotoboyProps) {
  const [fila, setFila] = useState<RespostaFila | null>(null);
  const [itensPendentes, setItensPendentes] = useState<ItemFilaOperacional[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [alterado, setAlterado] = useState(false);

  const itemEmAndamento = useMemo(
    () => fila?.itens.find((item) => item.status === "EM_ANDAMENTO") || null,
    [fila]
  );

  const itemIdsPrevia = useMemo(
    () => [
      ...(itemEmAndamento ? [itemEmAndamento.id] : []),
      ...itensPendentes.map((item) => item.id),
    ],
    [itemEmAndamento, itensPendentes]
  );

  const carregarFila = useCallback(async () => {
    if (!motoboyId) {
      setFila(null);
      setItensPendentes([]);
      setErro("");
      setMensagem("");
      setAlterado(false);
      return;
    }

    setCarregando(true);
    setErro("");

    try {
      const resposta = await fetch(
        `/api/motoboys/fila-operacional?motoboyId=${encodeURIComponent(motoboyId)}`,
        {
          cache: "no-store",
        }
      );

      if (!resposta.ok) {
        throw new Error(await lerErro(resposta, "Não foi possível carregar a fila operacional."));
      }

      const dados = (await resposta.json()) as RespostaFila;
      const pendentes = Array.isArray(dados.itens)
        ? dados.itens.filter((item) => item.status === "PENDENTE")
        : [];

      setFila(dados);
      setItensPendentes(pendentes);
      setAlterado(false);
    } catch (erroCarregamento) {
      setFila(null);
      setItensPendentes([]);
      setErro(
        erroCarregamento instanceof Error
          ? erroCarregamento.message
          : "Não foi possível carregar a fila operacional."
      );
    } finally {
      setCarregando(false);
    }
  }, [motoboyId]);

  useEffect(() => {
    void carregarFila();
  }, [carregarFila]);

  function moverItem(indiceAtual: number, deslocamento: -1 | 1) {
    const novoIndice = indiceAtual + deslocamento;

    if (novoIndice < 0 || novoIndice >= itensPendentes.length) {
      return;
    }

    setItensPendentes((itensAtuais) => {
      const novosItens = [...itensAtuais];
      const [itemMovido] = novosItens.splice(indiceAtual, 1);
      novosItens.splice(novoIndice, 0, itemMovido);
      return novosItens;
    });

    setMensagem("");
    setErro("");
    setAlterado(true);
  }

  async function sincronizarFila() {
    if (!motoboyId || sincronizando) {
      return;
    }

    setSincronizando(true);
    setErro("");
    setMensagem("");

    try {
      const resposta = await fetch("/api/motoboys/fila-operacional", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          motoboyId,
        }),
      });

      if (!resposta.ok) {
        throw new Error(await lerErro(resposta, "Não foi possível sincronizar as teles atuais."));
      }

      const dados = await resposta.json();
      setMensagem(
        typeof dados?.mensagem === "string" ? dados.mensagem : "Fila sincronizada com sucesso."
      );

      await carregarFila();
    } catch (erroSincronizacao) {
      setErro(
        erroSincronizacao instanceof Error
          ? erroSincronizacao.message
          : "Não foi possível sincronizar as teles atuais."
      );
    } finally {
      setSincronizando(false);
    }
  }

  async function salvarOrdem() {
    if (!motoboyId || salvando || !alterado) {
      return;
    }

    setSalvando(true);
    setErro("");
    setMensagem("");

    try {
      const resposta = await fetch("/api/motoboys/fila-operacional", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          motoboyId,
          itens: itensPendentes.map((item, indice) => ({
            id: item.id,
            ordem: indice + 1,
          })),
        }),
      });

      if (!resposta.ok) {
        throw new Error(await lerErro(resposta, "Não foi possível salvar a nova sequência."));
      }

      const dados = await resposta.json();
      setMensagem(
        typeof dados?.mensagem === "string"
          ? dados.mensagem
          : "Fila operacional atualizada com sucesso."
      );

      await carregarFila();
    } catch (erroSalvamento) {
      setErro(
        erroSalvamento instanceof Error
          ? erroSalvamento.message
          : "Não foi possível salvar a nova sequência."
      );
    } finally {
      setSalvando(false);
    }
  }

  if (!motoboyId) {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 text-slate-900">
          <ListOrdered className="h-5 w-5" />
          <h3 className="font-bold">Fila operacional</h3>
        </div>

        <p className="mt-2 text-sm text-slate-500">
          Selecione um motoboy no mapa para visualizar e reorganizar as etapas pendentes.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-slate-900">
              <ListOrdered className="h-5 w-5" />
              <h3 className="font-bold">Fila operacional</h3>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              {motoboyNome || fila?.motoboy.nome || "Motoboy selecionado"}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void carregarFila()}
            disabled={carregando || salvando || sincronizando}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${carregando ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        </div>
      </div>

      <div className="space-y-3 p-4">
        {erro && (
          <div className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{erro}</span>
          </div>
        )}

        {mensagem && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
            {mensagem}
          </div>
        )}

        {carregando ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Carregando fila...
          </div>
        ) : (
          <>
            {itemIdsPrevia.length > 0 && (
              <MapaPreviewFilaOperacional motoboyId={motoboyId} itemIds={itemIdsPrevia} />
            )}

            {itemEmAndamento && (
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-blue-700">
                  <LockKeyhole className="h-4 w-4" />
                  Etapa em andamento
                </div>

                <p className="font-semibold text-slate-900">
                  {textoTipoParada(itemEmAndamento.parada.tipo)} —{" "}
                  {itemEmAndamento.tele.solicitante}
                </p>

                <p className="mt-1 flex items-start gap-1.5 text-sm text-slate-600">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{itemEmAndamento.parada.endereco}</span>
                </p>
              </div>
            )}

            {itensPendentes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center">
                <p className="text-sm font-semibold text-slate-700">
                  Nenhuma etapa pendente encontrada.
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Sincronize para importar teles que já estavam aceitas antes da criação da fila
                  operacional.
                </p>

                <button
                  type="button"
                  onClick={() => void sincronizarFila()}
                  disabled={sincronizando}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sincronizando ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Sincronizar teles atuais
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {itensPendentes.map((item, indice) => (
                  <article
                    key={item.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                  >
                    <div className="flex gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                        {indice + 1 + (itemEmAndamento ? 1 : 0)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900">
                          {textoTipoParada(item.parada.tipo)} — {item.tele.solicitante}
                        </p>

                        <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">
                          Tele {item.tele.id.slice(-6)} · Parada {item.parada.ordem}
                        </p>

                        <p className="mt-2 flex items-start gap-1.5 text-sm text-slate-600">
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                          <span>{item.parada.endereco}</span>
                        </p>

                        {item.parada.cliente && (
                          <p className="mt-1 text-sm text-slate-500">{item.parada.cliente}</p>
                        )}
                      </div>

                      <div className="flex shrink-0 flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => moverItem(indice, -1)}
                          disabled={indice === 0 || salvando}
                          title="Subir etapa"
                          className="rounded-lg border border-slate-200 bg-white p-2 text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => moverItem(indice, 1)}
                          disabled={indice === itensPendentes.length - 1 || salvando}
                          title="Descer etapa"
                          className="rounded-lg border border-slate-200 bg-white p-2 text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {itensPendentes.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => void sincronizarFila()}
                  disabled={sincronizando || salvando || alterado}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sincronizando ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  Sincronizar
                </button>

                <button
                  type="button"
                  onClick={() => void salvarOrdem()}
                  disabled={!alterado || salvando || sincronizando}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {salvando ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Salvar sequência
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
