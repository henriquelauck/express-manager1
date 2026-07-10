import {
  calcularRetorno,
  calcularTotal,
  converterValor,
  descobrirTipoRota,
  formatarValor,
} from "@/lib/services/tele.service";
import type { Tele } from "@/types/Tele";
import { validarFinanceiro } from "./tele/validarFinanceiro";
import type { CriarTeleInput, ResultadoOrquestrador } from "./types";

export async function criarTelePeloOrquestrador(
  dados: CriarTeleInput
): Promise<ResultadoOrquestrador<Tele>> {
  const erros: string[] = [];
  const avisos: string[] = [];

  if (!dados.solicitante.trim()) {
    erros.push("Cliente solicitante não informado.");
  }

  if (!dados.dataTele) {
    erros.push("Data da tele não informada.");
  }

  if (dados.paradas.length === 0) {
    erros.push("Nenhuma parada foi informada.");
  }

  if (dados.paradas.some((parada) => !parada.cliente.trim() || !parada.endereco.trim())) {
    erros.push("Todas as paradas precisam possuir cliente e endereço.");
  }

  const financeiro = validarFinanceiro(dados.valorBase);

  erros.push(...financeiro.erros);
  avisos.push(...financeiro.avisos);

  if (erros.length > 0) {
    return {
      sucesso: false,
      dados: null,
      erros,
      avisos,
    };
  }

  const valorBase = converterValor(dados.valorBase);
  const retorno = calcularRetorno(dados.solicitante, dados.paradas);
  const espera = 0;
  const total = calcularTotal(valorBase, retorno, espera);

  try {
    const resposta = await fetch("/api/teles", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        dataTele: dados.dataTele,
        solicitante: dados.solicitante,

        motoboyId: null,
        motoboy: "",
        status: "Aguardando cliente",

        valorBase,
        retorno,
        espera,
        total,

        distanciaKm: dados.distanciaKm ?? null,
        tempoMinutos: dados.tempoMinutos ?? null,

        recebimento: "pendente",
        formaCobranca: "semanal",
        valorRecebido: 0,
        motoboyRecebedor: null,
        fechamentoId: null,

        observacaoGeral: dados.observacaoGeral,
        paradas: dados.paradas,

        tipoRota: descobrirTipoRota(dados.paradas),
        valor: formatarValor(total),
      }),
    });

    const respostaDados = await resposta.json();

    if (!resposta.ok) {
      return {
        sucesso: false,
        dados: null,
        erros: [respostaDados?.erro || "Erro ao salvar a tele."],
        avisos,
      };
    }

    return {
      sucesso: true,
      dados: respostaDados as Tele,
      erros: [],
      avisos,
    };
  } catch (error) {
    return {
      sucesso: false,
      dados: null,
      erros: [error instanceof Error ? error.message : "Erro de comunicação ao salvar a tele."],
      avisos,
    };
  }
}
