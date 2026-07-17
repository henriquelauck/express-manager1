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
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
  const [rotaCalculada, setRotaCalculada] = useState<any>(null);
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

  function atualizarParada(index: number, campo: keyof Parada, valor: string) {
    setParadas(atualizarParadaService(paradas, clientes, locaisFrequentes, index, campo, valor));
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
        temRetorno: temRetorno(paradas),
      }),
    });

    const dados = await resposta.json();

    setCalculandoRota(false);

    if (!resposta.ok) {
      alert(dados.erro || "Erro ao calcular rota.");
      return;
    }

    setRotaCalculada(dados);
    setValorBase(formatarValor(dados.valorSugerido - calcularRetorno(solicitante, paradas)));
  }

  async function criarTele() {
    setSalvando(true);

    const resultado = await criarTelePeloOrquestrador({
      solicitante,
      dataTele,
      valorBase,
      observacaoGeral,
      paradas,
      distanciaKm: rotaCalculada?.distanciaKm ?? null,
      tempoMinutos: rotaCalculada?.duracaoMin ?? null,
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
          onRemover={removerParada}
          onAdicionar={adicionarParada}
        />

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Input label="Valor base" value={valorBase} onChange={setValorBase} />

          <Input label="Observação geral" value={observacaoGeral} onChange={setObservacaoGeral} />

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
              {rotaCalculada.polyline && rotaCalculada.pontos && (
                <MapaRota polyline={rotaCalculada.polyline} pontos={rotaCalculada.pontos} />
              )}

              <p>
                Distância: <strong>{rotaCalculada.distanciaKm.toFixed(1)} km</strong>
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

          <ResumoFinanceiro
            valorBase={converterValor(valorBase)}
            retorno={retornoAtual}
            espera={0}
            total={totalAtual}
            tipoRota={descobrirTipoRota(paradas)}
          />
        </div>

        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={criarTele}
            disabled={salvando}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-7 py-4 text-white shadow-sm disabled:opacity-50 md:w-auto"
          >
            {salvando ? "Salvando..." : "Continuar"}
            <ArrowRight size={22} />
          </button>
        </div>
      </div>
    </PageContainer>
  );
}
