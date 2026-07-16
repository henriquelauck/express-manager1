-- CreateEnum
CREATE TYPE "CategoriaConhecimentoIA" AS ENUM ('INTERPRETACAO', 'REGRA_OPERACIONAL', 'RESPOSTA_CLIENTE', 'ORCAMENTO', 'DESPACHO', 'MOTOBOY', 'COBRANCA', 'OUTRO');

-- CreateEnum
CREATE TYPE "StatusConhecimentoIA" AS ENUM ('SUGERIDO', 'APROVADO', 'REJEITADO', 'ARQUIVADO');

-- CreateEnum
CREATE TYPE "OrigemConhecimentoIA" AS ENUM ('CORRECAO_HUMANA', 'EXEMPLOS_APROVADOS', 'ANALISE_IA', 'REGRA_MANUAL');

-- CreateTable
CREATE TABLE "ConhecimentoIA" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "categoria" "CategoriaConhecimentoIA" NOT NULL,
    "status" "StatusConhecimentoIA" NOT NULL DEFAULT 'SUGERIDO',
    "origem" "OrigemConhecimentoIA" NOT NULL,
    "solicitante" TEXT,
    "regra" JSONB,
    "confianca" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "quantidadeExemplos" INTEGER NOT NULL DEFAULT 0,
    "exemploIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "observacaoHumana" TEXT,
    "aprovadoPor" TEXT,
    "aprovadoEm" TIMESTAMP(3),
    "ativo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConhecimentoIA_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConhecimentoIA_status_createdAt_idx" ON "ConhecimentoIA"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ConhecimentoIA_categoria_status_idx" ON "ConhecimentoIA"("categoria", "status");

-- CreateIndex
CREATE INDEX "ConhecimentoIA_solicitante_status_idx" ON "ConhecimentoIA"("solicitante", "status");

-- CreateIndex
CREATE INDEX "ConhecimentoIA_ativo_categoria_idx" ON "ConhecimentoIA"("ativo", "categoria");
