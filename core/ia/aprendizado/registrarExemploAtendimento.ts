import { prisma } from "@/lib/prisma";

type RegistrarExemploAtendimentoParams = {
  atendimentoId?: string | null;

  teleId?: string | null;

  telefoneRemetente: string;

  solicitante?: string | null;

  mensagemCliente: string;

  respostaHumana?: string | null;

  interpretacaoIA?: unknown;

  sugestaoIA?: unknown;

  operacaoFinal?: unknown;
};

export async function registrarExemploAtendimento({
  atendimentoId,
  teleId,
  telefoneRemetente,
  solicitante,
  mensagemCliente,
  respostaHumana,
  interpretacaoIA,
  sugestaoIA,
  operacaoFinal,
}: RegistrarExemploAtendimentoParams) {
  const configuracao = await prisma.configuracaoAprendizadoIA.findFirst({
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!configuracao || configuracao.modo === "DESATIVADO") {
    return null;
  }

  return prisma.exemploAtendimentoIA.create({
    data: {
      atendimentoId: atendimentoId ?? null,

      teleId: teleId ?? null,

      telefoneRemetente,

      solicitante: solicitante ?? null,

      mensagemCliente,

      respostaHumana: respostaHumana ?? null,

      interpretacaoIA:
        interpretacaoIA === undefined ? undefined : JSON.parse(JSON.stringify(interpretacaoIA)),

      sugestaoIA: sugestaoIA === undefined ? undefined : JSON.parse(JSON.stringify(sugestaoIA)),

      operacaoFinal:
        operacaoFinal === undefined ? undefined : JSON.parse(JSON.stringify(operacaoFinal)),
    },
  });
}
