-- CreateEnum
CREATE TYPE "public"."CanalAtendimentoIA" AS ENUM ('SIMULADOR', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "public"."StatusAtendimentoIA" AS ENUM ('ATIVO', 'AGUARDANDO_CLIENTE', 'AGUARDANDO_SISTEMA', 'AGUARDANDO_MOTOBOY', 'FINALIZADO', 'CANCELADO', 'TRANSFERIDO');

-- CreateTable
CREATE TABLE "public"."AtendimentoIA" (
    "id" TEXT NOT NULL,
    "canal" "public"."CanalAtendimentoIA" NOT NULL DEFAULT 'SIMULADOR',
    "telefoneRemetente" TEXT NOT NULL,
    "telefoneNormalizado" TEXT NOT NULL,
    "status" "public"."StatusAtendimentoIA" NOT NULL DEFAULT 'ATIVO',
    "etapa" TEXT NOT NULL,
    "aguardando" TEXT,
    "historico" JSONB NOT NULL,
    "operacao" JSONB NOT NULL,
    "estado" JSONB NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ultimaMensagemEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "encerradoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AtendimentoIA_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AtendimentoIA_canal_telefoneNormalizado_idx" ON "public"."AtendimentoIA"("canal" ASC, "telefoneNormalizado" ASC);

-- CreateIndex
CREATE INDEX "AtendimentoIA_status_updatedAt_idx" ON "public"."AtendimentoIA"("status" ASC, "updatedAt" ASC);

-- CreateIndex
CREATE INDEX "AtendimentoIA_telefoneNormalizado_ativo_idx" ON "public"."AtendimentoIA"("telefoneNormalizado" ASC, "ativo" ASC);

