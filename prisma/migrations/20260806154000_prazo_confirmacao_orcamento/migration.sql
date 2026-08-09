-- Início independente do prazo operacional após a confirmação do orçamento.
ALTER TABLE "Tele"
ADD COLUMN "confirmadaComoTeleEm" TIMESTAMP(3);
