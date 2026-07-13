-- CreateTable
CREATE TABLE "ImportacaoPlanilha" (
    "id" TEXT NOT NULL,
    "nomeArquivo" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "quantidade" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportacaoPlanilha_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaturamentoHistoricoCliente" (
    "id" TEXT NOT NULL,
    "importacaoId" TEXT NOT NULL,
    "clienteId" TEXT,
    "clienteNomeOriginal" TEXT NOT NULL,
    "dataReferencia" TIMESTAMP(3) NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FaturamentoHistoricoCliente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FaturamentoHistoricoCliente_clienteId_dataReferencia_idx" ON "FaturamentoHistoricoCliente"("clienteId", "dataReferencia");

-- CreateIndex
CREATE INDEX "FaturamentoHistoricoCliente_clienteNomeOriginal_dataReferen_idx" ON "FaturamentoHistoricoCliente"("clienteNomeOriginal", "dataReferencia");

-- CreateIndex
CREATE UNIQUE INDEX "FaturamentoHistoricoCliente_importacaoId_clienteNomeOrigina_key" ON "FaturamentoHistoricoCliente"("importacaoId", "clienteNomeOriginal", "dataReferencia");

-- AddForeignKey
ALTER TABLE "FaturamentoHistoricoCliente" ADD CONSTRAINT "FaturamentoHistoricoCliente_importacaoId_fkey" FOREIGN KEY ("importacaoId") REFERENCES "ImportacaoPlanilha"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaturamentoHistoricoCliente" ADD CONSTRAINT "FaturamentoHistoricoCliente_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
