import { prisma } from "@/lib/prisma";
import { FormaCobranca } from "@prisma/client";
import { NextResponse } from "next/server";

type ClienteBody = {
  id?: string;
  nome?: string;
  telefone?: string;
  endereco1?: string;
  endereco2?: string;
  formaCobranca?: string;
};

function normalizarFormaCobranca(
  valor: unknown,
  fallback: FormaCobranca = FormaCobranca.SEMANAL
): FormaCobranca {
  if (typeof valor !== "string") {
    return fallback === FormaCobranca.NA_HORA ? FormaCobranca.NA_HORA : FormaCobranca.SEMANAL;
  }

  const valorNormalizado = valor.trim().toUpperCase();

  if (valorNormalizado === FormaCobranca.NA_HORA) {
    return FormaCobranca.NA_HORA;
  }

  return FormaCobranca.SEMANAL;
}

function normalizarTexto(valor: unknown) {
  return typeof valor === "string" ? valor.trim() : "";
}

function respostaErro(mensagem: string, status: number) {
  return NextResponse.json({ erro: mensagem }, { status });
}

async function clienteDuplicado({
  nome,
  telefone,
  ignorarId,
}: {
  nome: string;
  telefone: string;
  ignorarId?: string;
}) {
  return prisma.cliente.findFirst({
    where: {
      AND: [
        ignorarId ? { id: { not: ignorarId } } : {},
        {
          OR: [
            {
              nome: {
                equals: nome,
                mode: "insensitive",
              },
            },
            {
              telefone,
            },
          ],
        },
      ],
    },
    select: {
      id: true,
      nome: true,
      telefone: true,
    },
  });
}

export async function GET() {
  try {
    const clientes = await prisma.cliente.findMany({
      orderBy: {
        nome: "asc",
      },
    });

    return NextResponse.json(clientes);
  } catch (erro) {
    console.error("Erro ao buscar clientes:", erro);

    return respostaErro("Não foi possível carregar os clientes.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ClienteBody;

    const nome = normalizarTexto(body.nome);
    const telefone = normalizarTexto(body.telefone);
    const endereco1 = normalizarTexto(body.endereco1);
    const endereco2 = normalizarTexto(body.endereco2);

    if (!nome || !telefone || !endereco1) {
      return respostaErro("Nome, telefone e endereço principal são obrigatórios.", 400);
    }

    const duplicado = await clienteDuplicado({
      nome,
      telefone,
    });

    if (duplicado) {
      const campo = duplicado.telefone === telefone ? "telefone" : "nome";

      return respostaErro(`Já existe um cliente cadastrado com este ${campo}.`, 409);
    }

    const cliente = await prisma.cliente.create({
      data: {
        nome,
        telefone,
        endereco1,
        endereco2,
        formaCobranca: normalizarFormaCobranca(body.formaCobranca),
      },
    });

    return NextResponse.json(cliente, { status: 201 });
  } catch (erro) {
    console.error("Erro ao cadastrar cliente:", erro);

    return respostaErro("Não foi possível cadastrar o cliente.", 500);
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as ClienteBody;

    const id = normalizarTexto(body.id);
    const nome = normalizarTexto(body.nome);
    const telefone = normalizarTexto(body.telefone);
    const endereco1 = normalizarTexto(body.endereco1);
    const endereco2 = normalizarTexto(body.endereco2);

    if (!id) {
      return respostaErro("O identificador do cliente é obrigatório.", 400);
    }

    if (!nome || !telefone || !endereco1) {
      return respostaErro("Nome, telefone e endereço principal são obrigatórios.", 400);
    }

    const clienteExistente = await prisma.cliente.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        formaCobranca: true,
      },
    });

    if (!clienteExistente) {
      return respostaErro("Cliente não encontrado.", 404);
    }

    const duplicado = await clienteDuplicado({
      nome,
      telefone,
      ignorarId: id,
    });

    if (duplicado) {
      const campo = duplicado.telefone === telefone ? "telefone" : "nome";

      return respostaErro(`Já existe outro cliente cadastrado com este ${campo}.`, 409);
    }

    const cliente = await prisma.cliente.update({
      where: {
        id,
      },
      data: {
        nome,
        telefone,
        endereco1,
        endereco2,
        formaCobranca: normalizarFormaCobranca(body.formaCobranca, clienteExistente.formaCobranca),
      },
    });

    return NextResponse.json(cliente);
  } catch (erro) {
    console.error("Erro ao atualizar cliente:", erro);

    return respostaErro("Não foi possível atualizar o cliente.", 500);
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as ClienteBody;
    const id = normalizarTexto(body.id);

    if (!id) {
      return respostaErro("O identificador do cliente é obrigatório.", 400);
    }

    const cliente = await prisma.cliente.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        nome: true,
        _count: {
          select: {
            teles: true,
            fechamentos: true,
          },
        },
      },
    });

    if (!cliente) {
      return respostaErro("Cliente não encontrado.", 404);
    }

    if (cliente._count.teles > 0 || cliente._count.fechamentos > 0) {
      const vinculos = [
        cliente._count.teles > 0
          ? `${cliente._count.teles} tele${cliente._count.teles === 1 ? "" : "s"}`
          : null,
        cliente._count.fechamentos > 0
          ? `${cliente._count.fechamentos} fechamento${cliente._count.fechamentos === 1 ? "" : "s"}`
          : null,
      ]
        .filter(Boolean)
        .join(" e ");

      return respostaErro(
        `Não é possível excluir ${cliente.nome}, pois existem ${vinculos} vinculados a este cliente.`,
        409
      );
    }

    await prisma.cliente.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (erro) {
    console.error("Erro ao excluir cliente:", erro);

    return respostaErro("Não foi possível excluir o cliente.", 500);
  }
}
