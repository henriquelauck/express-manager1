"use client";

import { MapaRota } from "@/components/maps";
import { ListaParadas, ResumoFinanceiro } from "@/components/nova-tele";
import Input from "@/components/ui/Input";
import PageContainer from "@/components/ui/PageContainer";
import PageHeader from "@/components/ui/PageHeader";
import { useExpressManager } from "@/context/ExpressManagerContext";
import { useParadas } from "@/hooks/useParadas";
import { obterEnderecosSugestoes } from "@/lib/services/enderecos.service";
import { obterLocaisFrequentes } from "@/lib/services/locais.service";
import { atualizarParadaService } from "@/lib/services/paradas.service";
import {
  calcularRetorno,
  calcularTotal,
  converterValor,
  descobrirTipoRota,
  formatarValor,
  temRetorno,
} from "@/lib/services/tele.service";
import { gerarId } from "@/lib/utils/id";
import { criarTelePeloOrquestrador } from "@/orchestrator";
import type { Parada } from "@/types/Parada";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  MapPinned,
  Route,
  Send,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type RotaAlternativa = {
  id: number;
  distanciaKm: number;
  duracaoMin: number;
  valorSugerido: number;
  polyline: string | null;
};

type ResultadoRotaCalculada = {
  distanciaKm: number;
  duracaoMin: number;
  valorSugerido: number;
  enderecosEncontrados: string[];
  polyline: string | null;
  pontos: {
    lat: number;
    lng: number;
    endereco: string;
  }[];
  rotasAlternativas: RotaAlternativa[];
};

type DadosNovaTeleIA = {
  solicitante: string;
  observacaoGeral: string;
  paradas: {
    tipo: Parada["tipo"];
    cliente: string;
    endereco: string;
    contato: string;
    observacao: string;
  }[];
};

export default function NovaTelePage() {
  const router = useRouter();
  const { clientes, teles, recarregarDados } = useExpressManager();
  const [solicitante, setSolicitante] = useState("");
  const [dataTele, setDataTele] = useState(new Date().toISOString().split("T")[0]);
  const [valorBase, setValorBase] = useState("14,00");
  const [observacaoGeral, setObservacaoGeral] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [calculandoRota, setCalculandoRota] = useState(false);
  const [rotaCalculada, setRotaCalculada] = useState<ResultadoRotaCalculada | null>(null);
  const [rotaSelecionadaId, setRotaSelecionadaId] = useState<number | null>(null);
  const { paradas, setParadas, adicionarParada, removerParada } = useParadas();

  useEffect(() => {
    const salvo = sessionStorage.getItem("express-manager:nova-tele-ia");

    if (!salvo) return;

    try {
      const dados = JSON.parse(salvo) as DadosNovaTeleIA;

      /* eslint-disable react-hooks/set-state-in-effect */

      if (dados.solicitante) {
        setSolicitante(dados.solicitante);
      }

      if (dados.observacaoGeral) {
        setObservacaoGeral(dados.observacaoGeral);
      }

      if (Array.isArray(dados.paradas) && dados.paradas.length > 0) {
        setParadas(
          dados.paradas.map((parada) => ({
            id: gerarId(),
            tipo: parada.tipo,
            cliente: parada.cliente || "",
            endereco: parada.endereco || "",
            contato: parada.contato || "",
            observacao: parada.observacao || "",
          }))
        );
      }

      /* eslint-enable react-hooks/set-state-in-effect */
    } catch (error) {
      console.error("Erro ao carregar dados da IA:", error);
    } finally {
      sessionStorage.removeItem("express-manager:nova-tele-ia");
    }
  }, [setParadas]);

  const locaisFrequentes = obterLocaisFrequentes(teles, solicitante);

  const enderecosSugestoes = obterEnderecosSugestoes(clientes, teles);

  function invalidarRotaCalculada() {
    setRotaCalculada(null);
    setRotaSelecionadaId(null);
  }

  function alterarSolicitante(novoSolicitante: string) {
    setSolicitante(novoSolicitante);
    invalidarRotaCalculada();
  }

  function atualizarParada(index: number, campo: keyof Parada, valor: string) {
    setParadas(atualizarParadaService(paradas, clientes, locaisFrequentes, index, campo, valor));

    if (campo === "tipo" || campo === "cliente" || campo === "endereco") {
      invalidarRotaCalculada();
    }
  }

  function adicionarNovaParada() {
    adicionarParada();
    invalidarRotaCalculada();
  }

  function removerParadaDaRota(index: number) {
    removerParada(index);
    invalidarRotaCalculada();
  }

  async function calcularRota() {
    if (calculandoRota) {
      return;
    }

    const enderecosIncompletos = paradas.some((parada) => !parada.endereco.trim());

    if (enderecosIncompletos) {
      alert("Preencha o endereço de todas as paradas.");
      return;
    }

    if (paradas.length < 2) {
      alert("Adicione pelo menos duas paradas para calcular a rota.");
      return;
    }

    setCalculandoRota(true);

    try {
      const resposta = await fetch("/api/maps/calcular-rota", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          paradas: paradas.map((parada) => ({
            endereco: parada.endereco,
          })),
          temRetorno: temRetorno(paradas),
        }),
      });

      let dados: ResultadoRotaCalculada | { erro?: string };

      try {
        dados = (await resposta.json()) as ResultadoRotaCalculada;
      } catch {
        alert("O servidor retornou uma resposta inválida ao calcular a rota.");
        return;
      }

      if (!resposta.ok) {
        const mensagemErro = "erro" in dados && dados.erro ? dados.erro : "Erro ao calcular rota.";

        alert(mensagemErro);
        return;
      }

      if ("erro" in dados) {
        alert(dados.erro || "Erro ao calcular rota.");
        return;
      }

      if (
        typeof dados.distanciaKm !== "number" ||
        typeof dados.duracaoMin !== "number" ||
        typeof dados.valorSugerido !== "number"
      ) {
        alert("Os dados recebidos da rota estão incompletos.");
        return;
      }

      const rotasDisponiveis =
        Array.isArray(dados.rotasAlternativas) && dados.rotasAlternativas.length > 0
          ? dados.rotasAlternativas
          : [
              {
                id: 0,
                distanciaKm: dados.distanciaKm,
                duracaoMin: dados.duracaoMin,
                valorSugerido: dados.valorSugerido,
                polyline: dados.polyline,
              },
            ];

      const rotaPrincipal = rotasDisponiveis[0];

      setRotaCalculada({
        ...dados,
        rotasAlternativas: rotasDisponiveis,
      });
      setRotaSelecionadaId(rotaPrincipal.id);
      setValorBase(
        formatarValor(rotaPrincipal.valorSugerido - calcularRetorno(solicitante, paradas))
      );
    } catch (error) {
      console.error("Erro ao calcular rota:", error);
      alert("Não foi possível calcular a rota. Verifique sua conexão e tente novamente.");
    } finally {
      setCalculandoRota(false);
    }
  }

  async function criarTele() {
    setSalvando(true);

    const resultado = await criarTelePeloOrquestrador({
      solicitante,
      dataTele,
      valorBase,
      observacaoGeral,
      paradas,
      distanciaKm: rotaSelecionada?.distanciaKm ?? null,
      tempoMinutos: rotaSelecionada?.duracaoMin ?? null,
    });

    if (!resultado.sucesso) {
      alert(resultado.erros.join("\n"));
      setSalvando(false);
      return;
    }

    if (resultado.avisos.length > 0) {
      console.warn("Avisos ao criar tele:", resultado.avisos);
    }

    await recarregarDados();

    setSalvando(false);
    router.push("/teles");
  }

  const retornoAtual = calcularRetorno(solicitante, paradas);

  const rotaSelecionada =
    rotaCalculada?.rotasAlternativas.find((rota) => rota.id === rotaSelecionadaId) ??
    rotaCalculada?.rotasAlternativas[0] ??
    null;

  function selecionarRota(rota: RotaAlternativa) {
    setRotaSelecionadaId(rota.id);
    setValorBase(formatarValor(rota.valorSugerido - calcularRetorno(solicitante, paradas)));
  }

  const totalAtual = calcularTotal(valorBase, retornoAtual, 0);

  return (
    <PageContainer>
      <div className="mb-8">
        <PageHeader titulo="Nova Tele" descricao="Cadastre uma nova operação." />
      </div>

      <div className="bg-white rounded-3xl p-4 md:p-8 shadow-sm border border-slate-100 max-w-5xl">
        <div className="mb-8">
          <label className="text-sm font-medium text-slate-600">Cliente solicitante</label>

          <select
            value={solicitante}
            onChange={(e) => alterarSolicitante(e.target.value)}
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
          <label className="text-sm font-medium text-slate-600">Data da tele</label>

          <input
            type="date"
            value={dataTele}
            onChange={(e) => setDataTele(e.target.value)}
            className="w-full mt-2 h-14 rounded-xl border border-slate-200 px-4 outline-none focus:border-emerald-500"
          />
        </div>

        <h2 className="text-2xl font-bold mb-4">Rota</h2>

        <ListaParadas
          paradas={paradas}
          clientes={clientes}
          locaisFrequentes={
            locaisFrequentes as {
              cliente: string;
              endereco: string;
              contato: string;
            }[]
          }
          onAtualizar={atualizarParada}
          onRemover={removerParadaDaRota}
          onAdicionar={adicionarNovaParada}
        />

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Input label="Valor base" value={valorBase} onChange={setValorBase} />

          <div className="md:col-span-2">
            <div className="flex items-center justify-between gap-3">
              <label className="text-sm font-medium text-slate-600">Observação geral</label>

              <span className="text-xs text-slate-400">Opcional</span>
            </div>

            <div className="relative mt-2">
              <FileText size={18} className="absolute left-4 top-4 text-slate-400" />

              <textarea
                value={observacaoGeral}
                onChange={(event) => setObservacaoGeral(event.target.value)}
                rows={4}
                placeholder="Informações gerais da operação para o gestor ou motoboy."
                className="min-h-28 w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 pl-11 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={calcularRota}
            disabled={calculandoRota}
            className="w-full md:col-span-2 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {calculandoRota ? "Calculando rota..." : "Calcular rota"}
          </button>

          {rotaCalculada && rotaSelecionada && (
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm md:col-span-2">
              <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/70 px-5 py-5 md:flex-row md:items-center md:justify-between md:px-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                    <MapPinned size={22} />
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Rota calculada</h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Confira o trajeto e escolha a melhor opção.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start rounded-full bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-700 md:self-auto">
                  <CheckCircle2 size={16} />
                  Rota confirmada
                </div>
              </div>

              <div className="p-5 md:p-6">
                {rotaSelecionada.polyline && rotaCalculada.pontos.length > 0 && (
                  <MapaRota polyline={rotaSelecionada.polyline} pontos={rotaCalculada.pontos} />
                )}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <ResumoRota
                    icon={<Route size={19} />}
                    label="Distância"
                    value={`${rotaSelecionada.distanciaKm.toFixed(1)} km`}
                  />

                  <ResumoRota
                    icon={<Clock3 size={19} />}
                    label="Tempo estimado"
                    value={`${rotaSelecionada.duracaoMin} min`}
                  />

                  <ResumoRota
                    icon={<CheckCircle2 size={19} />}
                    label="Valor sugerido"
                    value={`R$ ${formatarValor(rotaSelecionada.valorSugerido)}`}
                  />
                </div>

                <div className="mt-6">
                  <div className="mb-4">
                    <h4 className="font-bold text-slate-900">Opções de trajeto</h4>
                    <p className="mt-1 text-sm text-slate-500">
                      A opção selecionada define o mapa, a distância, o tempo e o valor sugerido.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {rotaCalculada.rotasAlternativas.map((rota, index) => {
                      const selecionada = rota.id === rotaSelecionada.id;

                      return (
                        <button
                          key={rota.id}
                          type="button"
                          onClick={() => selecionarRota(rota)}
                          aria-pressed={selecionada}
                          className={`rounded-2xl border p-4 text-left transition ${
                            selecionada
                              ? "border-emerald-500 bg-emerald-50 shadow-sm ring-2 ring-emerald-100"
                              : "border-slate-200 bg-white hover:border-emerald-300 hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <strong className="text-slate-900">Rota {index + 1}</strong>
                              <p className="mt-1 text-xs text-slate-500">
                                Opção de trajeto do Google Maps
                              </p>
                            </div>

                            <span
                              className={`flex h-8 w-8 items-center justify-center rounded-full ${
                                selecionada
                                  ? "bg-emerald-600 text-white"
                                  : "bg-slate-100 text-slate-400"
                              }`}
                            >
                              <CheckCircle2 size={17} />
                            </span>
                          </div>

                          <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
                            <div>
                              <span className="block text-xs text-slate-400">Distância</span>
                              <strong className="mt-1 block text-slate-700">
                                {rota.distanciaKm.toFixed(1)} km
                              </strong>
                            </div>

                            <div>
                              <span className="block text-xs text-slate-400">Tempo</span>
                              <strong className="mt-1 block text-slate-700">
                                {rota.duracaoMin} min
                              </strong>
                            </div>

                            <div>
                              <span className="block text-xs text-slate-400">Valor</span>
                              <strong className="mt-1 block text-slate-700">
                                R$ {formatarValor(rota.valorSugerido)}
                              </strong>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {rotaCalculada.enderecosEncontrados.length > 0 && (
                  <div className="mt-6 rounded-2xl bg-slate-50 p-4">
                    <p className="font-semibold text-slate-800">
                      Endereços reconhecidos pelo Google
                    </p>

                    <div className="mt-3 space-y-3">
                      {rotaCalculada.enderecosEncontrados.map((endereco, index) => (
                        <div
                          key={`${endereco}-${index}`}
                          className="flex items-start gap-3 text-sm text-slate-600"
                        >
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-emerald-700 shadow-sm">
                            {index + 1}
                          </span>
                          <span className="pt-0.5">{endereco}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          <ResumoFinanceiro
            valorBase={converterValor(valorBase)}
            retorno={retornoAtual}
            espera={0}
            total={totalAtual}
            tipoRota={descobrirTipoRota(paradas)}
          />
        </div>

        <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/70 px-5 py-5 md:flex-row md:items-center md:justify-between md:px-6">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <CheckCircle2 size={22} />
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900">Finalizar cadastro</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Revise os dados acima antes de criar a tele.
                </p>
              </div>
            </div>

            <span className="self-start rounded-full bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm md:self-auto">
              {paradas.length} {paradas.length === 1 ? "parada" : "paradas"}
            </span>
          </div>

          <div className="flex flex-col gap-5 p-5 md:flex-row md:items-center md:justify-between md:p-6">
            <div className="space-y-2 text-sm text-slate-600">
              <p>
                <strong className="text-slate-900">Solicitante:</strong>{" "}
                {solicitante || "Não selecionado"}
              </p>

              <p>
                <strong className="text-slate-900">Data:</strong>{" "}
                {dataTele
                  ? new Date(`${dataTele}T12:00:00`).toLocaleDateString("pt-BR")
                  : "Não informada"}
              </p>

              <p>
                <strong className="text-slate-900">Total:</strong> R$ {formatarValor(totalAtual)}
              </p>
            </div>

            <button
              type="button"
              onClick={criarTele}
              disabled={salvando}
              className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-7 py-4 font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto"
            >
              {salvando ? (
                <>
                  <Loader2 size={21} className="animate-spin" />
                  Criando tele...
                </>
              ) : (
                <>
                  <Send size={20} />
                  Criar tele
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </div>
        </section>
      </div>
    </PageContainer>
  );
}

type ResumoRotaProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
};

function ResumoRota({ icon, label, value }: ResumoRotaProps) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-700 shadow-sm">
        {icon}
      </div>

      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <strong className="mt-1 block text-slate-900">{value}</strong>
      </div>
    </div>
  );
}
