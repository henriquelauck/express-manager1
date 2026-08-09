CREATE TABLE "MotoboyPontuacao" (
    "id" TEXT NOT NULL,
    "motoboyId" TEXT NOT NULL,
    "teleId" TEXT,
    "tipo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "pontos" INTEGER NOT NULL,
    "origem" TEXT NOT NULL DEFAULT 'MANUAL',
    "ocorridoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "criadoPor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MotoboyPontuacao_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MotoboyPontuacao_motoboyId_ocorridoEm_idx"
ON "MotoboyPontuacao"("motoboyId", "ocorridoEm");

CREATE INDEX "MotoboyPontuacao_tipo_ocorridoEm_idx"
ON "MotoboyPontuacao"("tipo", "ocorridoEm");

CREATE INDEX "MotoboyPontuacao_teleId_idx"
ON "MotoboyPontuacao"("teleId");

ALTER TABLE "MotoboyPontuacao"
ADD CONSTRAINT "MotoboyPontuacao_motoboyId_fkey"
FOREIGN KEY ("motoboyId") REFERENCES "Motoboy"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
