-- CreateEnum
CREATE TYPE "public"."RecebedorFechamento" AS ENUM ('ESCRITORIO', 'MOTOBOY');

-- CreateEnum
CREATE TYPE "public"."StatusFechamento" AS ENUM ('ABERTO', 'FECHADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "public"."TipoMovimentoFinanceiro" AS ENUM ('CLIENTE', 'ESCRITORIO', 'AJUSTE');

-- AlterTable
ALTER TABLE "public"."Tele" ADD COLUMN     "dataTele" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "distanciaKm" DOUBLE PRECISION,
ADD COLUMN     "tempoMinutos" INTEGER;

-- CreateTable
CREATE TABLE "public"."FechamentoFinanceiro" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT,
    "clienteNome" TEXT NOT NULL,
    "dataInicio" TIMESTAMP(3) NOT NULL,
    "dataFim" TIMESTAMP(3) NOT NULL,
    "totalBruto" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "recebedorTipo" "public"."RecebedorFechamento" NOT NULL DEFAULT 'ESCRITORIO',
    "motoboyRecebedorId" TEXT,
    "motoboyRecebedorNome" TEXT,
    "status" "public"."StatusFechamento" NOT NULL DEFAULT 'ABERTO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FechamentoFinanceiro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FechamentoFinanceiroItem" (
    "id" TEXT NOT NULL,
    "fechamentoId" TEXT NOT NULL,
    "motoboyId" TEXT,
    "motoboyNome" TEXT NOT NULL,
    "totalBruto" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "valorRecebido" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "saldo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "recebedorTipo" "public"."RecebedorFechamento" NOT NULL DEFAULT 'ESCRITORIO',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FechamentoFinanceiroItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MovimentoFinanceiroMotoboy" (
    "id" TEXT NOT NULL,
    "motoboyId" TEXT NOT NULL,
    "tipo" "public"."TipoMovimentoFinanceiro" NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "descricao" TEXT,
    "teleId" TEXT,
    "fechamentoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clienteNome" TEXT,
    "dataReferenciaFim" TIMESTAMP(3),
    "dataReferenciaInicio" TIMESTAMP(3),

    CONSTRAINT "MovimentoFinanceiroMotoboy_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."FechamentoFinanceiro" ADD CONSTRAINT "FechamentoFinanceiro_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "public"."Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FechamentoFinanceiroItem" ADD CONSTRAINT "FechamentoFinanceiroItem_fechamentoId_fkey" FOREIGN KEY ("fechamentoId") REFERENCES "public"."FechamentoFinanceiro"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MovimentoFinanceiroMotoboy" ADD CONSTRAINT "MovimentoFinanceiroMotoboy_motoboyId_fkey" FOREIGN KEY ("motoboyId") REFERENCES "public"."Motoboy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Tele" ADD CONSTRAINT "Tele_fechamentoId_fkey" FOREIGN KEY ("fechamentoId") REFERENCES "public"."FechamentoFinanceiro"("id") ON DELETE SET NULL ON UPDATE CASCADE;
