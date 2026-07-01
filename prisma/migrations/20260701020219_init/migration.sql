-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'MOTOBOY', 'CLIENTE');

-- CreateEnum
CREATE TYPE "StatusTele" AS ENUM ('AGUARDANDO_CLIENTE', 'AGUARDANDO_MOTOBOY', 'EM_ROTA', 'ENTREGUE');

-- CreateEnum
CREATE TYPE "TipoParada" AS ENUM ('ENTREGA', 'COLETA', 'TROCAR', 'ENTREGA_E_COLETA');

-- CreateEnum
CREATE TYPE "Recebimento" AS ENUM ('PENDENTE', 'ESCRITORIO', 'MOTOBOY');

-- CreateEnum
CREATE TYPE "FormaCobranca" AS ENUM ('NA_HORA', 'SEMANAL', 'QUINZENAL', 'MENSAL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT,
    "role" "Role" NOT NULL DEFAULT 'ADMIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT,
    "endereco1" TEXT,
    "endereco2" TEXT,
    "formaCobranca" "FormaCobranca" NOT NULL DEFAULT 'SEMANAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Motoboy" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT,
    "moto" TEXT,
    "placa" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Motoboy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tele" (
    "id" TEXT NOT NULL,
    "clienteId" TEXT,
    "solicitante" TEXT NOT NULL,
    "motoboyId" TEXT,
    "motoboyNome" TEXT,
    "status" "StatusTele" NOT NULL DEFAULT 'AGUARDANDO_CLIENTE',
    "tipoRota" TEXT NOT NULL,
    "valorBase" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "retorno" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "espera" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "recebimento" "Recebimento" NOT NULL DEFAULT 'PENDENTE',
    "formaCobranca" "FormaCobranca" NOT NULL DEFAULT 'SEMANAL',
    "valorRecebido" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dataRecebimento" TIMESTAMP(3),
    "motoboyRecebedor" TEXT,
    "fechamentoId" TEXT,
    "observacaoGeral" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tele_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Parada" (
    "id" TEXT NOT NULL,
    "teleId" TEXT NOT NULL,
    "tipo" "TipoParada" NOT NULL,
    "cliente" TEXT NOT NULL,
    "endereco" TEXT NOT NULL,
    "contato" TEXT,
    "observacao" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Parada_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Motoboy_userId_key" ON "Motoboy"("userId");

-- AddForeignKey
ALTER TABLE "Motoboy" ADD CONSTRAINT "Motoboy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tele" ADD CONSTRAINT "Tele_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tele" ADD CONSTRAINT "Tele_motoboyId_fkey" FOREIGN KEY ("motoboyId") REFERENCES "Motoboy"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parada" ADD CONSTRAINT "Parada_teleId_fkey" FOREIGN KEY ("teleId") REFERENCES "Tele"("id") ON DELETE CASCADE ON UPDATE CASCADE;
