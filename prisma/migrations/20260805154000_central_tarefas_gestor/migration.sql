ALTER TYPE "TipoTarefaGestor" ADD VALUE IF NOT EXISTS 'MANUAL';

DROP INDEX IF EXISTS "TarefaGestor_tipo_dataReferencia_key";

CREATE INDEX IF NOT EXISTS "TarefaGestor_tipo_dataReferencia_idx"
ON "TarefaGestor"("tipo", "dataReferencia");
