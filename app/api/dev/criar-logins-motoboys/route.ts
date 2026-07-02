import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

const motoboys = [
  { nome: "Kaua", email: "kaua@expressmanager.com" },
  { nome: "Willian", email: "willian@expressmanager.com" },
  { nome: "Eduardo", email: "eduardo@expressmanager.com" },
];

export async function GET() {
  const senha = "123456";
  const senhaHash = await bcrypt.hash(senha, 10);

  const criados = [];

  for (const item of motoboys) {
    const usuario = await prisma.user.upsert({
      where: { email: item.email },
      update: {
        nome: item.nome,
        senhaHash,
        role: "MOTOBOY",
      },
      create: {
        nome: item.nome,
        email: item.email,
        senhaHash,
        role: "MOTOBOY",
      },
    });

    const motoboyExistente = await prisma.motoboy.findFirst({
      where: { nome: item.nome },
    });

    let motoboy;

    if (motoboyExistente) {
      motoboy = await prisma.motoboy.update({
        where: { id: motoboyExistente.id },
        data: { userId: usuario.id },
      });
    } else {
      motoboy = await prisma.motoboy.create({
        data: {
          nome: item.nome,
          telefone: "",
          moto: "",
          placa: "",
          userId: usuario.id,
        },
      });
    }

    criados.push({
      nome: item.nome,
      email: item.email,
      senha,
      motoboyId: motoboy.id,
    });
  }

  return NextResponse.json({
    ok: true,
    logins: criados,
  });
}