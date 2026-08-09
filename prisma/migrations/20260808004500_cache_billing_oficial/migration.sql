CREATE TABLE "CacheBillingApi" (
    "id" TEXT NOT NULL,
    "chave" TEXT NOT NULL,
    "projeto" TEXT NOT NULL,
    "dataReferencia" TEXT NOT NULL,
    "total" DOUBLE PRECISION,
    "moeda" TEXT,
    "itens" JSONB,
    "erro" TEXT,
    "consultadoEm" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CacheBillingApi_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CacheBillingApi_chave_key" ON "CacheBillingApi"("chave");
CREATE INDEX "CacheBillingApi_consultadoEm_idx" ON "CacheBillingApi"("consultadoEm");
CREATE INDEX "CacheBillingApi_projeto_dataReferencia_idx" ON "CacheBillingApi"("projeto", "dataReferencia");
