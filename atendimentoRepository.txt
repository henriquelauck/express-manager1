import type {
  Atendimento,
  EstadoAtendimento,
  MensagemAtendimento,
  OperacaoAtendimento,
  StatusAtendimento,
} from "@/core/ia/atendimento/sessao/Atendimento";
import { prisma } from "@/lib/prisma";
import {
  CanalAtendimentoIA,
  Prisma,
  StatusAtendimentoIA,
} from "@prisma/client";

export type CanalAtendimento =
  | "SIMULADOR"
  | "WHATSAPP";

function normalizarTelefone(telefone: string) {
  const numeros = String(telefone || "").replace(
    /\D/g,
    ""
  );

  if (
    numeros.startsWith("55") &&
    numeros.length >= 12
  ) {
    return numeros.slice(2);
  }

  return numeros;
}

function converterCanal(
  canal: CanalAtendimento
): CanalAtendimentoIA {
  return canal === "WHATSAPP"
    ? CanalAtendimentoIA.WHATSAPP
    : CanalAtendimentoIA.SIMULADOR;
}

function converterStatusParaPrisma(
  status: StatusAtendimento
): StatusAtendimentoIA {
  const mapa: Record<
    StatusAtendimento,
    StatusAtendimentoIA
  > = {
    ATIVO: StatusAtendimentoIA.ATIVO,

    AGUARDANDO_CLIENTE:
      StatusAtendimentoIA.AGUARDANDO_CLIENTE,

    AGUARDANDO_SISTEMA:
      StatusAtendimentoIA.AGUARDANDO_SISTEMA,

    AGUARDANDO_MOTOBOY:
      StatusAtendimentoIA.AGUARDANDO_MOTOBOY,

    FINALIZADO:
      StatusAtendimentoIA.FINALIZADO,

    CANCELADO:
      StatusAtendimentoIA.CANCELADO,

    TRANSFERIDO:
      StatusAtendimentoIA.TRANSFERIDO,
  };

  return mapa[status];
}

function converterStatusDoPrisma(
  status: StatusAtendimentoIA
): StatusAtendimento {
  const mapa: Record<
    StatusAtendimentoIA,
    StatusAtendimento
  > = {
    ATIVO: "ATIVO",

    AGUARDANDO_CLIENTE:
      "AGUARDANDO_CLIENTE",

    AGUARDANDO_SISTEMA:
      "AGUARDANDO_SISTEMA",

    AGUARDANDO_MOTOBOY:
      "AGUARDANDO_MOTOBOY",

    FINALIZADO: "FINALIZADO",

    CANCELADO: "CANCELADO",

    TRANSFERIDO: "TRANSFERIDO",
  };

  return mapa[status];
}

function converterJson<T>(valor: unknown): T {
  return valor as T;
}

function transformarRegistroEmAtendimento(
  registro: {
    id: string;
    telefoneRemetente: string;
    status: StatusAtendimentoIA;
    historico: Prisma.JsonValue;
    operacao: Prisma.JsonValue;
    estado: Prisma.JsonValue;
    createdAt: Date;
    updatedAt: Date;
  }
): Atendimento {
  return {
    id: registro.id,

    telefoneRemetente:
      registro.telefoneRemetente,

    criadoEm:
      registro.createdAt.toISOString(),

    atualizadoEm:
      registro.updatedAt.toISOString(),

    status: converterStatusDoPrisma(
      registro.status
    ),

    historico:
      converterJson<MensagemAtendimento[]>(
        registro.historico
      ),

    operacao:
      converterJson<OperacaoAtendimento>(
        registro.operacao
      ),

    estado:
      converterJson<EstadoAtendimento>(
        registro.estado
      ),
  };
}

function transformarEmJsonPrisma(
  valor: unknown
): Prisma.InputJsonValue {
  return JSON.parse(
    JSON.stringify(valor)
  ) as Prisma.InputJsonValue;
}

export async function buscarAtendimentoAtivo({
  telefoneRemetente,
  canal = "SIMULADOR",
}: {
  telefoneRemetente: string;
  canal?: CanalAtendimento;
}): Promise<Atendimento | null> {
  const telefoneNormalizado =
    normalizarTelefone(telefoneRemetente);

  if (!telefoneNormalizado) {
    return null;
  }

  const registro =
    await prisma.atendimentoIA.findFirst({
      where: {
        telefoneNormalizado,

        canal: converterCanal(canal),

        ativo: true,
      },

      orderBy: {
        updatedAt: "desc",
      },
    });

  if (!registro) {
    return null;
  }

  return transformarRegistroEmAtendimento(
    registro
  );
}

export async function criarAtendimentoPersistido({
  atendimento,
  canal = "SIMULADOR",
}: {
  atendimento: Atendimento;
  canal?: CanalAtendimento;
}): Promise<Atendimento> {
  const telefoneNormalizado =
    normalizarTelefone(
      atendimento.telefoneRemetente
    );

  const registro =
    await prisma.atendimentoIA.create({
      data: {
        id: atendimento.id,

        canal: converterCanal(canal),

        telefoneRemetente:
          atendimento.telefoneRemetente,

        telefoneNormalizado,

        status: converterStatusParaPrisma(
          atendimento.status
        ),

        etapa: atendimento.estado.etapa,

        aguardando:
          atendimento.estado.aguardando,

        historico: transformarEmJsonPrisma(
          atendimento.historico
        ),

        operacao: transformarEmJsonPrisma(
          atendimento.operacao
        ),

        estado: transformarEmJsonPrisma(
          atendimento.estado
        ),

        ativo: true,

        ultimaMensagemEm: new Date(),
      },
    });

  return transformarRegistroEmAtendimento(
    registro
  );
}

export async function salvarAtendimento({
  atendimento,
  canal = "SIMULADOR",
}: {
  atendimento: Atendimento;
  canal?: CanalAtendimento;
}): Promise<Atendimento> {
  const telefoneNormalizado =
    normalizarTelefone(
      atendimento.telefoneRemetente
    );

  const registro =
    await prisma.atendimentoIA.upsert({
      where: {
        id: atendimento.id,
      },

      create: {
        id: atendimento.id,

        canal: converterCanal(canal),

        telefoneRemetente:
          atendimento.telefoneRemetente,

        telefoneNormalizado,

        status: converterStatusParaPrisma(
          atendimento.status
        ),

        etapa: atendimento.estado.etapa,

        aguardando:
          atendimento.estado.aguardando,

        historico: transformarEmJsonPrisma(
          atendimento.historico
        ),

        operacao: transformarEmJsonPrisma(
          atendimento.operacao
        ),

        estado: transformarEmJsonPrisma(
          atendimento.estado
        ),

        ativo: true,

        ultimaMensagemEm: new Date(),
      },

      update: {
        telefoneRemetente:
          atendimento.telefoneRemetente,

        telefoneNormalizado,

        status: converterStatusParaPrisma(
          atendimento.status
        ),

        etapa: atendimento.estado.etapa,

        aguardando:
          atendimento.estado.aguardando,

        historico: transformarEmJsonPrisma(
          atendimento.historico
        ),

        operacao: transformarEmJsonPrisma(
          atendimento.operacao
        ),

        estado: transformarEmJsonPrisma(
          atendimento.estado
        ),

        ultimaMensagemEm: new Date(),
      },
    });

  return transformarRegistroEmAtendimento(
    registro
  );
}

export async function encerrarAtendimento({
  atendimentoId,
  status = "FINALIZADO",
}: {
  atendimentoId: string;
  status?: Extract<
    StatusAtendimento,
    "FINALIZADO" | "CANCELADO" | "TRANSFERIDO"
  >;
}) {
  const registro =
    await prisma.atendimentoIA.update({
      where: {
        id: atendimentoId,
      },

      data: {
        status: converterStatusParaPrisma(
          status
        ),

        ativo: false,

        encerradoEm: new Date(),

        ultimaMensagemEm: new Date(),
      },
    });

  return transformarRegistroEmAtendimento(
    registro
  );
}