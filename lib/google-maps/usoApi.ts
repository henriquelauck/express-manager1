import { prisma } from "@/lib/prisma";

type RegistroUso = {
  servico: string;
  sku?: string;
  origem?: string;
  quantidade?: number;
};

export async function registrarUsoGoogle({
  servico,
  sku,
  origem,
  quantidade = 1,
}: RegistroUso) {
  try {
    await prisma.usoApiExterna.create({
      data: {
        fornecedor: "GOOGLE_MAPS",
        servico,
        sku: sku || null,
        origem: origem || null,
        quantidade: Math.max(1, Math.round(quantidade)),
      },
    });
  } catch (erro) {
    console.error("Falha ao registrar uso de API externa:", erro);
  }
}
