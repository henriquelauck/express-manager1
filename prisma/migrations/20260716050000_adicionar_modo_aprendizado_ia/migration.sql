-- CreateEnum
CREATE TYPE "ModoAprendizadoIA" AS ENUM ('DESATIVADO', 'OBSERVACAO', 'SUGESTAO', 'AUTOMATICO');

-- CreateEnum
CREATE TYPE "StatusExemploAprendizadoIA" AS ENUM ('PENDENTE_REVISAO', 'APROVADO', 'CORRIGIDO', 'DESCARTADO');

-- CreateEnum
CREATE TYPE "StatusDuvidaAprendizadoIA" AS ENUM ('PENDENTE', 'RESPONDIDA', 'DESCARTADA');

-- CreateTable
CREATE TABLE "ConfiguracaoAprendizadoIA" (
    "id" TEXT NOT NULL,
    "modo" "ModoAprendizadoIA" NOT NULL DEFAULT 'DESATIVADO',
    "confiancaMinimaSugestao" DOUBLE PRECISION NOT NULL DEFAULT 0.75,
    "confiancaMinimaAutomatico" DOUBLE PRECISION NOT NULL DEFAULT 0.95,
    "quantidadeMinimaExemplos" INTEGER NOT NULL DEFAULT 5,
    "permitirPerguntasIA" BOOLEAN NOT NULL DEFAULT true,
    "respostasPorAudio" BOOLEAN NOT NULL DEFAULT false,
    "atualizacoesPorAudio" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConfiguracaoAprendizadoIA_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExemploAtendimentoIA" (
    "id" TEXT NOT NULL,
    "atendimentoId" TEXT,
    "teleId" TEXT,
    "telefoneRemetente" TEXT NOT NULL,
    "solicitante" TEXT,
    "mensagemCliente" TEXT NOT NULL,
    "respostaHumana" TEXT,
    "interpretacaoIA" JSONB,
    "sugestaoIA" JSONB,
    "operacaoFinal" JSONB,
    "status" "StatusExemploAprendizadoIA" NOT NULL DEFAULT 'PENDENTE_REVISAO',
    "aprovado" BOOLEAN NOT NULL DEFAULT false,
    "corrigido" BOOLEAN NOT NULL DEFAULT false,
    "observacaoHumana" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExemploAtendimentoIA_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DuvidaAprendizadoIA" (
    "id" TEXT NOT NULL,
    "exemploId" TEXT,
    "solicitante" TEXT,
    "contexto" JSONB,
    "perguntaIA" TEXT NOT NULL,
    "respostaHumana" TEXT,
    "status" "StatusDuvidaAprendizadoIA" NOT NULL DEFAULT 'PENDENTE',
    "respondidaEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DuvidaAprendizadoIA_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExemploAtendimentoIA_status_createdAt_idx" ON "ExemploAtendimentoIA"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ExemploAtendimentoIA_solicitante_createdAt_idx" ON "ExemploAtendimentoIA"("solicitante", "createdAt");

-- CreateIndex
CREATE INDEX "ExemploAtendimentoIA_atendimentoId_idx" ON "ExemploAtendimentoIA"("atendimentoId");

-- CreateIndex
CREATE INDEX "ExemploAtendimentoIA_teleId_idx" ON "ExemploAtendimentoIA"("teleId");

-- CreateIndex
CREATE INDEX "DuvidaAprendizadoIA_status_createdAt_idx" ON "DuvidaAprendizadoIA"("status", "createdAt");

-- CreateIndex
CREATE INDEX "DuvidaAprendizadoIA_exemploId_idx" ON "DuvidaAprendizadoIA"("exemploId");
