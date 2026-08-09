ALTER TABLE "MotoboyPontuacao"
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'ATIVA',
ADD COLUMN "pontosOriginais" INTEGER,
ADD COLUMN "descricaoOriginal" TEXT,
ADD COLUMN "editadoEm" TIMESTAMP(3),
ADD COLUMN "editadoPor" TEXT,
ADD COLUMN "anuladoEm" TIMESTAMP(3),
ADD COLUMN "anuladoPor" TEXT,
ADD COLUMN "motivoAnulacao" TEXT;

UPDATE "MotoboyPontuacao"
SET
  "pontosOriginais" = "pontos",
  "descricaoOriginal" = "descricao"
WHERE "pontosOriginais" IS NULL OR "descricaoOriginal" IS NULL;

CREATE INDEX "MotoboyPontuacao_status_ocorridoEm_idx"
ON "MotoboyPontuacao"("status", "ocorridoEm");
