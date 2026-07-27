DO $$
BEGIN
  CREATE TYPE "StatusAceiteTele" AS ENUM (
    'NAO_ENVIADA',
    'AGUARDANDO_ACEITE',
    'ACEITA',
    'RECUSADA'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

ALTER TABLE "Tele"
  ADD COLUMN IF NOT EXISTS "statusAceite"
    "StatusAceiteTele" NOT NULL DEFAULT 'NAO_ENVIADA',

  ADD COLUMN IF NOT EXISTS "ordemMotoboy"
    INTEGER,

  ADD COLUMN IF NOT EXISTS "atribuidaAoMotoboyEm"
    TIMESTAMP(3),

  ADD COLUMN IF NOT EXISTS "aceitaPeloMotoboyEm"
    TIMESTAMP(3),

  ADD COLUMN IF NOT EXISTS "recusadaPeloMotoboyEm"
    TIMESTAMP(3),

  ADD COLUMN IF NOT EXISTS "motivoRecusaMotoboy"
    TEXT;

CREATE INDEX IF NOT EXISTS
  "Tele_motoboyId_statusAceite_ordemMotoboy_idx"
ON "Tele"("motoboyId", "statusAceite", "ordemMotoboy");

CREATE INDEX IF NOT EXISTS
  "Tele_statusAceite_atribuidaAoMotoboyEm_idx"
ON "Tele"("statusAceite", "atribuidaAoMotoboyEm");