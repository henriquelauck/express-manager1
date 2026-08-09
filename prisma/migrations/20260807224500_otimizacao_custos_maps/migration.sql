CREATE TABLE "CacheGeocodificacao" (
    "id" TEXT NOT NULL,
    "enderecoNormalizado" TEXT NOT NULL,
    "enderecoOriginal" TEXT NOT NULL,
    "enderecoFormatado" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ultimoUsoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CacheGeocodificacao_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UsoApiExterna" (
    "id" TEXT NOT NULL,
    "fornecedor" TEXT NOT NULL,
    "servico" TEXT NOT NULL,
    "sku" TEXT,
    "origem" TEXT,
    "quantidade" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UsoApiExterna_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CacheGeocodificacao_enderecoNormalizado_key"
ON "CacheGeocodificacao"("enderecoNormalizado");

CREATE INDEX "CacheGeocodificacao_ultimoUsoEm_idx"
ON "CacheGeocodificacao"("ultimoUsoEm");

CREATE INDEX "UsoApiExterna_createdAt_idx"
ON "UsoApiExterna"("createdAt");

CREATE INDEX "UsoApiExterna_fornecedor_servico_createdAt_idx"
ON "UsoApiExterna"("fornecedor", "servico", "createdAt");
