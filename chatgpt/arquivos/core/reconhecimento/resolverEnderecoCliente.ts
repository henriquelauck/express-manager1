import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function resolverEnderecoCliente(nomeCliente: string) {
  const cliente = await prisma.cliente.findFirst({
    where: {
      nome: nomeCliente,
    },
  });

  if (!cliente) return null;

  return {
    endereco: cliente.endereco1,
    telefone: cliente.telefone,
  };
}
