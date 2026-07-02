import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET() {
  const email = "motoboy@expressmanager.com";
  const senha = "123456";

  const senhaHash = await bcrypt.hash(senha, 10);

  const usuario = await prisma.user.upsert({
    where: { email },
    update: {
      nome: "Motoboy Teste",
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

  const motoboy = await prisma.motoboy.upsert({
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

  return NextResponse.json({
    ok: true,
    email,
    senha,
    usuario,
    motoboy,
  });
}