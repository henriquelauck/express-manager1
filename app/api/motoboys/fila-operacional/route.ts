import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function respostaErro(mensagem: string, status: number) {
  return NextResponse.json({ erro: mensagem }, { status });
}

async function exigirAdministrador() {
  const cookieStore = await cookies();
  const userId = cookieStore.get("express_user_id")?.value;

  if (!userId) {
    return {
      autorizado: false as const,
      resposta: respostaErro("Não autenticado.", 401),
    };
  }

  const usuario = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      role: true,
    },
  });

  if (!usuario || usuario.role !== "ADMIN") {
    return {
      autorizado: false as const,
      resposta: respostaErro("Acesso restrito ao gestor.", 403),
    };
  }

  return {
    autorizado: true as const,
    usuario,
  };
}

function normalizarTexto(valor: string | null) {
  return valor?.trim() || "";
}

type ItemNovaOrdem = {
  id?: unknown;
  ordem?: unknown;
};

type CorpoReordenacao = {
  motoboyId?: unknown;
  itens?: unknown;
};

function lerNovaOrdem(body: CorpoReordenacao) {
  const motoboyId = typeof body.motoboyId === "string" ? body.motoboyId.trim() : "";

  if (!Array.isArray(body.itens)) {
    return {
      motoboyId,
      idsOrdenados: [] as string[],
      erro: "A lista de itens da fila é obrigatória.",
    };
  }

  const itens = body.itens as ItemNovaOrdem[];

  const itensNormalizados = itens.map((item, indice) => ({
    id: typeof item?.id === "string" ? item.id.trim() : "",
    ordem:
      typeof item?.ordem === "number" && Number.isInteger(item.ordem) ? item.ordem : indice + 1,
  }));

  if (itensNormalizados.some((item) => !item.id)) {
    return {
      motoboyId,
      idsOrdenados: [] as string[],
      erro: "Todos os itens da fila precisam ter um identificador válido.",
    };
  }

  const ordensInformadas = itensNormalizados.map((item) => item.ordem);
  const ordensUnicas = new Set(ordensInformadas);

  if (
    ordensUnicas.size !== ordensInformadas.length ||
    ordensInformadas.some((ordem) => ordem < 1)
  ) {
    return {
      motoboyId,
      idsOrdenados: [] as string[],
      erro: "A nova sequência possui posições inválidas ou repetidas.",
    };
  }

  const idsOrdenados = [...itensNormalizados]
    .sort((a, b) => a.ordem - b.ordem)
    .map((item) => item.id);

  return {
    motoboyId,
    idsOrdenados,
    erro: "",
  };
}

export async function GET(request: Request) {
  try {
    const autenticacao = await exigirAdministrador();

    if (!autenticacao.autorizado) {
      return autenticacao.resposta;
    }

    const url = new URL(request.url);
    const motoboyId = normalizarTexto(url.searchParams.get("motoboyId"));
    const incluirConcluidos = url.searchParams.get("incluirConcluidos") === "true";

    if (!motoboyId) {
      return respostaErro("O identificador do motoboy é obrigatório.", 400);
    }

    const motoboy = await prisma.motoboy.findUnique({
      where: {
        id: motoboyId,
      },
      select: {
        id: true,
        nome: true,
        online: true,
      },
    });

    if (!motoboy) {
      return respostaErro("Motoboy não encontrado.", 404);
    }

    const itens = await prisma.itemFilaOperacionalMotoboy.findMany({
      where: {
        motoboyId,
        status: incluirConcluidos
          ? {
              not: "CANCELADO",
            }
          : {
              in: ["PENDENTE", "EM_ANDAMENTO"],
            },
      },
      select: {
        id: true,
        ordem: true,
        status: true,
        iniciadaEm: true,
        concluidaEm: true,
        createdAt: true,
        updatedAt: true,
        tele: {
          select: {
            id: true,
            solicitante: true,
            tipoRota: true,
            status: true,
            statusAceite: true,
            etapaMotoboy: true,
            paradaAtualMotoboy: true,
            observacaoGeral: true,
            dataTele: true,
          },
        },
        parada: {
          select: {
            id: true,
            tipo: true,
            ordem: true,
            cliente: true,
            endereco: true,
            contato: true,
            observacao: true,
          },
        },
      },
      orderBy: [
        {
          ordem: "asc",
        },
        {
          createdAt: "asc",
        },
      ],
    });

    const itensFormatados = itens.map((item, indice) => ({
      ...item,
      posicao: indice + 1,
      bloqueado: item.status !== "PENDENTE",
    }));

    return NextResponse.json({
      motoboy,
      totalItens: itensFormatados.length,
      itemAtual:
        itensFormatados.find((item) => item.status === "EM_ANDAMENTO") ||
        itensFormatados.find((item) => item.status === "PENDENTE") ||
        null,
      itens: itensFormatados,
    });
  } catch (erro) {
    console.error("Erro ao carregar fila operacional do motoboy:", erro);

    return respostaErro("Não foi possível carregar a fila operacional do motoboy.", 500);
  }
}

export async function PUT(request: Request) {
  try {
    const autenticacao = await exigirAdministrador();

    if (!autenticacao.autorizado) {
      return autenticacao.resposta;
    }

    const body = (await request.json()) as CorpoReordenacao;
    const { motoboyId, idsOrdenados, erro } = lerNovaOrdem(body);

    if (erro) {
      return respostaErro(erro, 400);
    }

    if (!motoboyId) {
      return respostaErro("O identificador do motoboy é obrigatório.", 400);
    }

    const motoboy = await prisma.motoboy.findUnique({
      where: {
        id: motoboyId,
      },
      select: {
        id: true,
      },
    });

    if (!motoboy) {
      return respostaErro("Motoboy não encontrado.", 404);
    }

    const itensAtivos = await prisma.itemFilaOperacionalMotoboy.findMany({
      where: {
        motoboyId,
        status: {
          in: ["PENDENTE", "EM_ANDAMENTO"],
        },
      },
      select: {
        id: true,
        ordem: true,
        status: true,
        teleId: true,
        parada: {
          select: {
            ordem: true,
          },
        },
      },
      orderBy: [
        {
          ordem: "asc",
        },
        {
          createdAt: "asc",
        },
      ],
    });

    const itensEmAndamento = itensAtivos.filter((item) => item.status === "EM_ANDAMENTO");
    const itensPendentes = itensAtivos.filter((item) => item.status === "PENDENTE");

    if (idsOrdenados.length !== itensPendentes.length) {
      return respostaErro("A nova sequência precisa conter todos os itens pendentes da fila.", 400);
    }

    const idsRecebidos = new Set(idsOrdenados);

    if (idsRecebidos.size !== idsOrdenados.length) {
      return respostaErro("A nova sequência possui itens repetidos.", 400);
    }

    const idsPendentes = new Set(itensPendentes.map((item) => item.id));

    if (idsOrdenados.some((id) => !idsPendentes.has(id))) {
      return respostaErro(
        "A nova sequência contém um item inexistente, concluído, cancelado ou pertencente a outro motoboy.",
        400
      );
    }

    const itemPorId = new Map(itensPendentes.map((item) => [item.id, item]));
    const ultimaOrdemDaParadaPorTele = new Map<string, number>();

    for (const id of idsOrdenados) {
      const item = itemPorId.get(id);

      if (!item) {
        return respostaErro("Item da fila não encontrado.", 400);
      }

      const ultimaOrdem = ultimaOrdemDaParadaPorTele.get(item.teleId);

      if (ultimaOrdem !== undefined && item.parada.ordem < ultimaOrdem) {
        return respostaErro(
          "A sequência é inválida: as etapas de uma mesma tele precisam respeitar a ordem original das paradas.",
          400
        );
      }

      ultimaOrdemDaParadaPorTele.set(item.teleId, item.parada.ordem);
    }

    const ordemInicial = itensEmAndamento.length + 1;

    await prisma.$transaction(
      idsOrdenados.map((id, indice) =>
        prisma.itemFilaOperacionalMotoboy.update({
          where: {
            id,
          },
          data: {
            ordem: ordemInicial + indice,
          },
        })
      )
    );

    /*
     * Pode existir mais de uma rota já iniciada.
     * Mantemos todas no começo da visualização, na ordem em que já estavam.
     */
    if (itensEmAndamento.length > 0) {
      await prisma.$transaction(
        itensEmAndamento.map((item, indice) =>
          prisma.itemFilaOperacionalMotoboy.update({
            where: {
              id: item.id,
            },
            data: {
              ordem: indice + 1,
            },
          })
        )
      );
    }

    const filaAtualizada = await prisma.itemFilaOperacionalMotoboy.findMany({
      where: {
        motoboyId,
        status: {
          in: ["PENDENTE", "EM_ANDAMENTO"],
        },
      },
      select: {
        id: true,
        ordem: true,
        status: true,
        teleId: true,
        paradaId: true,
      },
      orderBy: [
        {
          ordem: "asc",
        },
        {
          createdAt: "asc",
        },
      ],
    });

    return NextResponse.json({
      sucesso: true,
      mensagem: "Fila operacional atualizada com sucesso.",
      itens: filaAtualizada.map((item, indice) => ({
        ...item,
        posicao: indice + 1,
      })),
    });
  } catch (erro) {
    console.error("Erro ao reordenar fila operacional do motoboy:", erro);

    return respostaErro("Não foi possível atualizar a fila operacional do motoboy.", 500);
  }
}

type CorpoSincronizacao = {
  motoboyId?: unknown;
};

export async function POST(request: Request) {
  try {
    const autenticacao = await exigirAdministrador();

    if (!autenticacao.autorizado) {
      return autenticacao.resposta;
    }

    let body: CorpoSincronizacao = {};

    try {
      body = (await request.json()) as CorpoSincronizacao;
    } catch {
      body = {};
    }

    const motoboyId = typeof body.motoboyId === "string" ? body.motoboyId.trim() : "";

    if (motoboyId) {
      const motoboyExiste = await prisma.motoboy.findUnique({
        where: {
          id: motoboyId,
        },
        select: {
          id: true,
        },
      });

      if (!motoboyExiste) {
        return respostaErro("Motoboy não encontrado.", 404);
      }
    }

    const telesAceitas = await prisma.tele.findMany({
      where: {
        motoboyId: motoboyId
          ? motoboyId
          : {
              not: null,
            },
        statusAceite: "ACEITA",
        status: {
          not: "ENTREGUE",
        },
      },
      select: {
        id: true,
        motoboyId: true,
        ordemMotoboy: true,
        paradaAtualMotoboy: true,
        paradas: {
          select: {
            id: true,
            ordem: true,
          },
          orderBy: {
            ordem: "asc",
          },
        },
        itensFilaOperacional: {
          select: {
            paradaId: true,
          },
        },
      },
      orderBy: [
        {
          motoboyId: "asc",
        },
        {
          ordemMotoboy: "asc",
        },
        {
          createdAt: "asc",
        },
      ],
    });

    const telesPorMotoboy = new Map<string, Array<(typeof telesAceitas)[number]>>();

    for (const tele of telesAceitas) {
      if (!tele.motoboyId) {
        continue;
      }

      const lista = telesPorMotoboy.get(tele.motoboyId) || [];
      lista.push(tele);
      telesPorMotoboy.set(tele.motoboyId, lista);
    }

    let totalCriados = 0;
    let totalTelesSincronizadas = 0;

    for (const [idMotoboy, teles] of telesPorMotoboy) {
      const maiorOrdemAtual = await prisma.itemFilaOperacionalMotoboy.aggregate({
        where: {
          motoboyId: idMotoboy,
          status: {
            in: ["PENDENTE", "EM_ANDAMENTO"],
          },
        },
        _max: {
          ordem: true,
        },
      });

      let proximaOrdem = Number(maiorOrdemAtual._max.ordem || 0) + 1;

      for (const tele of teles) {
        const paradasJaRegistradas = new Set(
          tele.itensFilaOperacional.map((item) => item.paradaId)
        );

        const indiceAtual = Math.max(0, tele.paradaAtualMotoboy || 0);
        const paradasPendentes = tele.paradas
          .slice(indiceAtual)
          .filter((parada) => !paradasJaRegistradas.has(parada.id));

        if (paradasPendentes.length === 0) {
          continue;
        }

        const resultado = await prisma.itemFilaOperacionalMotoboy.createMany({
          data: paradasPendentes.map((parada) => ({
            motoboyId: idMotoboy,
            teleId: tele.id,
            paradaId: parada.id,
            ordem: proximaOrdem++,
            status: "PENDENTE",
          })),
          skipDuplicates: true,
        });

        if (resultado.count > 0) {
          totalCriados += resultado.count;
          totalTelesSincronizadas += 1;
        }
      }
    }

    return NextResponse.json({
      sucesso: true,
      mensagem:
        totalCriados > 0
          ? "Teles aceitas sincronizadas com a fila operacional."
          : "Nenhuma etapa pendente precisava ser sincronizada.",
      totalTelesSincronizadas,
      totalItensCriados: totalCriados,
    });
  } catch (erro) {
    console.error("Erro ao sincronizar fila operacional:", erro);

    return respostaErro(
      "Não foi possível sincronizar as teles aceitas com a fila operacional.",
      500
    );
  }
}
