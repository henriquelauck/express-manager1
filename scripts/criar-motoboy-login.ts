import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "motoboy@expressmanager.com";
  const senha = "123456";

  const senhaHash = await bcrypt.hash(senha, 10);

  const usuario = await prisma.user.upsert({
    where: { email },
    update: {
      senhaHash,
      role: "MOTOBOY",
    },
    create: {
      nome: "Motoboy Teste",
      email,
      senhaHash,
      role: "MOTOBOY",
    },
  });

  await prisma.motoboy.upsert({
    where: { userId: usuario.id },
    update: {
      nome: "Motoboy Teste",
    },
    create: {
      nome: "Motoboy Teste",
      telefone: "",
      moto: "",
      placa: "",
      userId: usuario.id,
    },
  });

  console.log("Login de motoboy criado:");
  console.log("E-mail:", email);
  console.log("Senha:", senha);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });