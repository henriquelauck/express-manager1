import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function respostaErro(mensagem: string, status: number) {
  return NextResponse.json({ erro: mensagem }, { status });
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get("express_user_id")?.value;

    if (!userId) {
      return respostaErro("Não autenticado.", 401);
    }

    const usuario = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        role: true,
      },
    });

    if (!usuario || usuario.role !== "ADMIN") {
      return respostaErro("Acesso permitido somente ao gestor.", 403);
    }

    const motoboys = await prisma.motoboy.findMany({
      select: {
        id: true,
        nome: true,
        telefone: true,
        moto: true,
        placa: true,
        online: true,
        latitude: true,
        longitude: true,
        precisaoLocalizacao: true,
        onlineDesde: true,
        localizacaoAtualizadaEm: true,
        itensFilaOperacional: {
          where: {
            status: {
              in: ["PENDENTE", "EM_ANDAMENTO"],
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
          select: {
            id: true,
            ordem: true,
            status: true,
            iniciadaEm: true,
            updatedAt: true,
            tele: {
              select: {
                id: true,
                solicitante: true,
                status: true,
                statusAceite: true,
                etapaMotoboy: true,
                ordemMotoboy: true,
                aceitaPeloMotoboyEm: true,
                rotaColetaIniciadaEm: true,
                chegouNaColetaEm: true,
                entregaIniciadaEm: true,
                chegouNaEntregaEm: true,
                paradas: {
                  orderBy: {
                    ordem: "asc",
                  },
                  select: {
                    id: true,
                    ordem: true,
                    tipo: true,
                    cliente: true,
                    endereco: true,
                    contato: true,
                    observacao: true,
                  },
                },
              },
            },
          },
        },
        _count: {
          select: {
            teles: {
              where: {
                statusAceite: "ACEITA",
                status: {
                  not: "ENTREGUE",
                },
              },
            },
          },
        },
      },
      orderBy: [
        {
          online: "desc",
        },
        {
          localizacaoAtualizadaEm: "desc",
        },
        {
          nome: "asc",
        },
      ],
    });

    const agora = Date.now();

    return NextResponse.json(
      motoboys.map((motoboy) => {
        const atualizadaEm = motoboy.localizacaoAtualizadaEm;

        const itemEmAndamento =
          motoboy.itensFilaOperacional
            .filter((item) => item.status === "EM_ANDAMENTO")
            .sort((itemA, itemB) => {
              const inicioA = itemA.iniciadaEm?.getTime() ?? 0;
              const inicioB = itemB.iniciadaEm?.getTime() ?? 0;

              if (inicioA !== inicioB) {
                return inicioB - inicioA;
              }

              return itemB.updatedAt.getTime() - itemA.updatedAt.getTime();
            })[0] || null;

        const itemPendenteSugerido =
          motoboy.itensFilaOperacional.find((item) => item.status === "PENDENTE") || null;

        const itemAtual = itemEmAndamento || itemPendenteSugerido;
        const teleAtual = itemAtual?.tele || null;

        const segundosSemAtualizar = atualizadaEm
          ? Math.max(0, Math.floor((agora - atualizadaEm.getTime()) / 1000))
          : null;

        const possuiCoordenadas =
          typeof motoboy.latitude === "number" && typeof motoboy.longitude === "number";

        return {
          id: motoboy.id,
          nome: motoboy.nome,
          telefone: motoboy.telefone,
          moto: motoboy.moto,
          placa: motoboy.placa,
          online: motoboy.online,
          latitude: motoboy.latitude,
          longitude: motoboy.longitude,
          precisao: motoboy.precisaoLocalizacao,
          onlineDesde: motoboy.onlineDesde,
          localizacaoAtualizadaEm: motoboy.localizacaoAtualizadaEm,
          segundosSemAtualizar,
          possuiCoordenadas,
          localizacaoRecente:
            motoboy.online &&
            possuiCoordenadas &&
            segundosSemAtualizar !== null &&
            segundosSemAtualizar <= 120,
          telesEmAndamento: motoboy._count.teles,
          teleAtual: teleAtual
            ? {
                id: teleAtual.id,
                solicitante: teleAtual.solicitante,
                status: teleAtual.status,
                statusAceite: teleAtual.statusAceite,
                etapaMotoboy: teleAtual.etapaMotoboy,
                ordemMotoboy: teleAtual.ordemMotoboy,
                aceitaPeloMotoboyEm: teleAtual.aceitaPeloMotoboyEm,
                rotaColetaIniciadaEm: teleAtual.rotaColetaIniciadaEm,
                chegouNaColetaEm: teleAtual.chegouNaColetaEm,
                entregaIniciadaEm: teleAtual.entregaIniciadaEm,
                chegouNaEntregaEm: teleAtual.chegouNaEntregaEm,
                paradas: teleAtual.paradas,
                itemFilaId: itemAtual?.id || null,
                itemFilaStatus: itemAtual?.status || null,
                rotaAtiva: itemAtual?.status === "EM_ANDAMENTO",
              }
            : null,
        };
      })
    );
  } catch (erro) {
    console.error("Erro ao carregar localizações dos motoboys:", erro);

    return respostaErro("Não foi possível carregar as localizações dos motoboys.", 500);
  }
}
