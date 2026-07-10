import type { Motoboy } from "@/types/Motoboy";
import type { Tele } from "@/types/Tele";

export type MotivoScore = {
  descricao: string;
  pontos: number;
};

function teleEstaAtiva(tele: Tele) {
  return tele.status !== "Entregue";
}

function telePertenceAoMotoboy(tele: Tele, motoboy: Motoboy) {
  if (tele.motoboyId) {
    return tele.motoboyId === motoboy.id;
  }

  return String(tele.motoboy).trim().toLowerCase() === motoboy.nome.trim().toLowerCase();
}

export function calcularScoreMotoboy(motoboy: Motoboy, teles: Tele[]) {
  const telesAtivas = teles.filter(
    (tele) => teleEstaAtiva(tele) && telePertenceAoMotoboy(tele, motoboy)
  ).length;

  const motivos: MotivoScore[] = [
    {
      descricao: "Pontuação inicial",
      pontos: 100,
    },
  ];

  if (telesAtivas > 0) {
    motivos.push({
      descricao: `${telesAtivas} tele(s) ativa(s)`,
      pontos: -(telesAtivas * 10),
    });
  }

  const scoreCalculado = motivos.reduce((total, motivo) => total + motivo.pontos, 0);

  const score = Math.max(0, scoreCalculado);

  return {
    score,
    telesAtivas,
    motivos,
  };
}
