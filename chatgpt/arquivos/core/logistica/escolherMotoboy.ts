import { avaliarMotoboys } from "@/core/distribuicao";
import type { Motoboy } from "@/types/Motoboy";
import type { Tele } from "@/types/Tele";

export type SugestaoMotoboy = {
  motoboy: Motoboy | null;
  score: number;
  motivo: string;
  alternativas: Motoboy[];
};

export function escolherMotoboyIdeal(motoboys: Motoboy[], teles: Tele[]): SugestaoMotoboy {
  const ranking = avaliarMotoboys(motoboys, teles);

  if (ranking.length === 0) {
    return {
      motoboy: null,
      score: 0,
      motivo: "Nenhum motoboy cadastrado.",
      alternativas: [],
    };
  }

  return {
    motoboy: ranking[0].motoboy,
    score: ranking[0].score,
    motivo: `Possui ${ranking[0].quantidadeTelesAtivas} teles ativas.`,
    alternativas: ranking.slice(1, 4).map((item) => item.motoboy),
  };
}
