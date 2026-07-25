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
      where: {
        online: true,
      },
      select: {
        id: true,
        nome: true,
        telefone: true,
        moto: true,
        placa: true,
        latitude: true,
        longitude: true,
        precisaoLocalizacao: true,
        onlineDesde: true,
        localizacaoAtualizadaEm: true,
        _count: {
          select: {
            teles: {
              where: {
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
        const segundosSemAtualizar = atualizadaEm
          ? Math.max(0, Math.floor((agora - atualizadaEm.getTime()) / 1000))
          : null;

        return {
          id: motoboy.id,
          nome: motoboy.nome,
          telefone: motoboy.telefone,
          moto: motoboy.moto,
          placa: motoboy.placa,
          latitude: motoboy.latitude,
          longitude: motoboy.longitude,
          precisao: motoboy.precisaoLocalizacao,
          onlineDesde: motoboy.onlineDesde,
          localizacaoAtualizadaEm: motoboy.localizacaoAtualizadaEm,
          segundosSemAtualizar,
          localizacaoRecente: segundosSemAtualizar !== null && segundosSemAtualizar <= 120,
          telesEmAndamento: motoboy._count.teles,
        };
      })
    );
  } catch (erro) {
    console.error("Erro ao carregar motoboys online:", erro);

    return respostaErro("Não foi possível carregar os motoboys online.", 500);
  }
}
