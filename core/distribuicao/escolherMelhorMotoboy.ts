import type { Motoboy } from "@/types/Motoboy";
import type { Tele } from "@/types/Tele";
import { calcularScoreMotoboy, type MotivoScore } from "./calcularScoreMotoboy";

export type AvaliacaoMotoboy = {
  motoboy: Motoboy;
  quantidadeTelesAtivas: number;
  score: number;
  motivos: MotivoScore[];
};

export function avaliarMotoboys(motoboys: Motoboy[], teles: Tele[]): AvaliacaoMotoboy[] {
  return motoboys
    .map((motoboy) => {
      const resultado = calcularScoreMotoboy(motoboy, teles);

      return {
        motoboy,
        quantidadeTelesAtivas: resultado.telesAtivas,
        score: resultado.score,
        motivos: resultado.motivos,
      };
    })
    .sort((a, b) => {
      if (a.score !== b.score) {
        return b.score - a.score;
      }

      return a.motoboy.nome.localeCompare(b.motoboy.nome, "pt-BR");
    });
}

export function escolherMelhorMotoboy(motoboys: Motoboy[], teles: Tele[]): AvaliacaoMotoboy | null {
  return avaliarMotoboys(motoboys, teles)[0] || null;
}
