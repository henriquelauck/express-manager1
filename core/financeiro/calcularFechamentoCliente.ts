import type { Motoboy } from "@/types/Motoboy";
import type { Tele } from "@/types/Tele";

export type DistribuicaoFechamento = {
  motoboyId: string | null;
  motoboyNome: string;
  quantidade: number;
  total: number;
};

export type ResultadoFechamentoCliente = {
  clienteNome: string;
  telesEmAberto: Tele[];
  quantidadeTeles: number;
  totalBruto: number;
  distribuicoes: DistribuicaoFechamento[];
};

function normalizarData(data: string | Date | null | undefined): string {
  if (!data) return "";

  const dataConvertida = new Date(data);

  if (Number.isNaN(dataConvertida.getTime())) {
    return "";
  }

  return dataConvertida.toISOString().slice(0, 10);
}

export function calcularSaldoTele(tele: Tele): number {
  const total = Number(tele.total || 0);
  const valorRecebido = Number(tele.valorRecebido || 0);

  return Math.max(total - valorRecebido, 0);
}

export function calcularFechamentoCliente(
  clienteNome: string,
  dataInicio: string,
  dataFim: string,
  teles: Tele[],
  motoboys: Motoboy[]
): ResultadoFechamentoCliente {
  const telesEmAberto = teles.filter((tele) => {
    if (tele.solicitante !== clienteNome) {
      return false;
    }

    if (calcularSaldoTele(tele) <= 0.009) {
      return false;
    }

    const dataTele = normalizarData(tele.dataTele);

    if (!dataTele) {
      return false;
    }

    if (dataInicio && dataTele < dataInicio) {
      return false;
    }

    if (dataFim && dataTele > dataFim) {
      return false;
    }

    return true;
  });

  const totalBruto = telesEmAberto.reduce((total, tele) => total + calcularSaldoTele(tele), 0);

  const grupos = new Map<string, DistribuicaoFechamento>();

  for (const tele of telesEmAberto) {
    const motoboyNome = String(tele.motoboy || "").trim() || "Sem motoboy";

    const chave = motoboyNome.toLowerCase();

    const motoboy = motoboys.find((item) => item.nome.trim().toLowerCase() === chave);

    const grupoAtual = grupos.get(chave);

    if (grupoAtual) {
      grupoAtual.quantidade += 1;
      grupoAtual.total += calcularSaldoTele(tele);
      continue;
    }

    grupos.set(chave, {
      motoboyId: motoboy?.id || null,
      motoboyNome,
      quantidade: 1,
      total: calcularSaldoTele(tele),
    });
  }

  return {
    clienteNome,
    telesEmAberto,
    quantidadeTeles: telesEmAberto.length,
    totalBruto,
    distribuicoes: Array.from(grupos.values()),
  };
}
