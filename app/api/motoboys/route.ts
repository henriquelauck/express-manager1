import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type MotoboyBody = {
  id?: string;
  nome?: string;
  telefone?: string;
  moto?: string;
  placa?: string;
};

function normalizarTexto(valor: unknown) {
  return typeof valor === "string" ? valor.trim() : "";
}

function normalizarTelefone(valor: string) {
  return valor.replace(/\D/g, "");
}

function normalizarPlaca(valor: string) {
  return valor.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

function respostaErro(mensagem: string, status: number) {
  return NextResponse.json({ erro: mensagem }, { status });
}

async function encontrarDuplicidade({
  telefone,
  placa,
  ignorarId,
}: {
  telefone: string;
  placa: string;
  ignorarId?: string;
}) {
  const motoboys = await prisma.motoboy.findMany({
    where: ignorarId
      ? {
          id: {
            not: ignorarId,
          },
        }
      : undefined,
    select: {
      id: true,
      nome: true,
      telefone: true,
      placa: true,
    },
  });

  const telefoneNormalizado = normalizarTelefone(telefone);
  const placaNormalizada = normalizarPlaca(placa);

  return motoboys.find((motoboy) => {
    const telefoneExistente = normalizarTelefone(motoboy.telefone || "");

    const placaExistente = normalizarPlaca(motoboy.placa || "");

    return (
      (telefoneNormalizado && telefoneExistente === telefoneNormalizado) ||
      (placaNormalizada && placaExistente === placaNormalizada)
    );
  });
}

export async function GET() {
  try {
    const motoboys = await prisma.motoboy.findMany({
      orderBy: {
        nome: "asc",
      },
    });

    return NextResponse.json(motoboys);
  } catch (erro) {
    console.error("Erro ao buscar motoboys:", erro);

    return respostaErro("Não foi possível carregar os motoboys.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as MotoboyBody;

    const nome = normalizarTexto(body.nome);
    const telefone = normalizarTexto(body.telefone);
    const moto = normalizarTexto(body.moto);
    const placa = normalizarPlaca(normalizarTexto(body.placa));

    if (!nome || !telefone || !moto || !placa) {
      return respostaErro("Nome, telefone, moto e placa são obrigatórios.", 400);
    }

    const duplicado = await encontrarDuplicidade({
      telefone,
      placa,
    });

    if (duplicado) {
      const telefoneDuplicado =
        normalizarTelefone(duplicado.telefone || "") === normalizarTelefone(telefone);

      return respostaErro(
        telefoneDuplicado
          ? "Já existe um motoboy cadastrado com este telefone."
          : "Já existe um motoboy cadastrado com esta placa.",
        409
      );
    }

    const motoboy = await prisma.motoboy.create({
      data: {
        nome,
        telefone,
        moto,
        placa,
      },
    });

    return NextResponse.json(motoboy, { status: 201 });
  } catch (erro) {
    console.error("Erro ao cadastrar motoboy:", erro);

    return respostaErro("Não foi possível cadastrar o motoboy.", 500);
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as MotoboyBody;

    const id = normalizarTexto(body.id);
    const nome = normalizarTexto(body.nome);
    const telefone = normalizarTexto(body.telefone);
    const moto = normalizarTexto(body.moto);
    const placa = normalizarPlaca(normalizarTexto(body.placa));

    if (!id) {
      return respostaErro("O identificador do motoboy é obrigatório.", 400);
    }

    if (!nome || !telefone || !moto || !placa) {
      return respostaErro("Nome, telefone, moto e placa são obrigatórios.", 400);
    }

    const motoboyExistente = await prisma.motoboy.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
      },
    });

    if (!motoboyExistente) {
      return respostaErro("Motoboy não encontrado.", 404);
    }

    const duplicado = await encontrarDuplicidade({
      telefone,
      placa,
      ignorarId: id,
    });

    if (duplicado) {
      const telefoneDuplicado =
        normalizarTelefone(duplicado.telefone || "") === normalizarTelefone(telefone);

      return respostaErro(
        telefoneDuplicado
          ? "Já existe outro motoboy cadastrado com este telefone."
          : "Já existe outro motoboy cadastrado com esta placa.",
        409
      );
    }

    const motoboy = await prisma.motoboy.update({
      where: {
        id,
      },
      data: {
        nome,
        telefone,
        moto,
        placa,
      },
    });

    return NextResponse.json(motoboy);
  } catch (erro) {
    console.error("Erro ao atualizar motoboy:", erro);

    return respostaErro("Não foi possível atualizar o motoboy.", 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as MotoboyBody;
    const id = normalizarTexto(body.id);

    if (!id) {
      return respostaErro("O identificador do motoboy é obrigatório.", 400);
    }

    const motoboy = await prisma.motoboy.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        nome: true,
        userId: true,
        _count: {
          select: {
            teles: true,
            movimentos: true,
          },
        },
      },
    });

    if (!motoboy) {
      return respostaErro("Motoboy não encontrado.", 404);
    }

    const vinculos: string[] = [];

    if (motoboy.userId) {
      vinculos.push("um login vinculado");
    }

    if (motoboy._count.teles > 0) {
      vinculos.push(`${motoboy._count.teles} tele${motoboy._count.teles === 1 ? "" : "s"}`);
    }

    if (motoboy._count.movimentos > 0) {
      vinculos.push(
        `${motoboy._count.movimentos} movimento${
          motoboy._count.movimentos === 1 ? "" : "s"
        } financeiro${motoboy._count.movimentos === 1 ? "" : "s"}`
      );
    }

    if (vinculos.length > 0) {
      return respostaErro(
        `Não é possível excluir ${motoboy.nome}, pois existem ${vinculos.join(
          ", "
        )} vinculados a este motoboy.`,
        409
      );
    }

    await prisma.motoboy.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error("Erro ao excluir motoboy:", erro);

    return respostaErro("Não foi possível excluir o motoboy.", 500);
  }
}
