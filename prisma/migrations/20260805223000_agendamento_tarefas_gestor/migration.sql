CREATE TABLE IF NOT EXISTS "RegraTarefaGestor" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL DEFAULT '',
    "hora" INTEGER NOT NULL DEFAULT 19,
    "minuto" INTEGER NOT NULL DEFAULT 0,
    "diasSemana" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "recorrente" BOOLEAN NOT NULL DEFAULT true,
    "dataUnica" TIMESTAMP(3),
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "tipoCondicao" TEXT NOT NULL DEFAULT 'NENHUMA',
    "solicitanteFiltro" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegraTarefaGestor_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "TarefaGestor"
ADD COLUMN IF NOT EXISTS "regraId" TEXT,
ADD COLUMN IF NOT EXISTS "chaveOcorrencia" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "TarefaGestor_chaveOcorrencia_key"
ON "TarefaGestor"("chaveOcorrencia");

CREATE INDEX IF NOT EXISTS "TarefaGestor_regraId_concluida_idx"
ON "TarefaGestor"("regraId", "concluida");

CREATE INDEX IF NOT EXISTS "RegraTarefaGestor_ativa_hora_minuto_idx"
ON "RegraTarefaGestor"("ativa", "hora", "minuto");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'TarefaGestor_regraId_fkey'
    ) THEN
        ALTER TABLE "TarefaGestor"
        ADD CONSTRAINT "TarefaGestor_regraId_fkey"
        FOREIGN KEY ("regraId")
        REFERENCES "RegraTarefaGestor"("id")
        ON DELETE SET NULL
        ON UPDATE CASCADE;
    END IF;
END $$;
