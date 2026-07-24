import { z } from "zod";

const CondicaoSolicitanteSchema = z.object({
  tipo: z.literal("SOLICITANTE_IGUAL"),

  valor: z.string().trim().min(1),
});

const CondicaoTextoParadaSchema = z.object({
  tipo: z.literal("TEXTO_PARADA_CONTEM"),

  valor: z.string().trim().min(1),
});

const CondicaoTipoParadaSchema = z.object({
  tipo: z.literal("TIPO_PARADA_IGUAL"),

  valor: z.enum(["COLETA", "ENTREGA", "TROCA", "ENTREGA_E_COLETA", "OUTRA"]),
});

export const CondicaoConhecimentoOperacionalSchema = z.discriminatedUnion("tipo", [
  CondicaoSolicitanteSchema,
  CondicaoTextoParadaSchema,
  CondicaoTipoParadaSchema,
]);

const AcaoDefinirClienteParadaSchema = z.object({
  tipo: z.literal("DEFINIR_CLIENTE_PARADA"),

  indiceParada: z.number().int().min(0),

  cliente: z.string().trim().min(1),
});

const AcaoDefinirTipoParadaSchema = z.object({
  tipo: z.literal("DEFINIR_TIPO_PARADA"),

  indiceParada: z.number().int().min(0),

  valor: z.enum(["COLETA", "ENTREGA", "TROCA", "ENTREGA_E_COLETA", "OUTRA"]),
});

const AcaoDefinirRetornoSchema = z.object({
  tipo: z.literal("DEFINIR_RETORNO"),

  valor: z.boolean(),
});

const AcaoAdicionarAvisoSchema = z.object({
  tipo: z.literal("ADICIONAR_AVISO"),

  mensagem: z.string().trim().min(1),
});

export const AcaoConhecimentoOperacionalSchema = z.discriminatedUnion("tipo", [
  AcaoDefinirClienteParadaSchema,
  AcaoDefinirTipoParadaSchema,
  AcaoDefinirRetornoSchema,
  AcaoAdicionarAvisoSchema,
]);

export const RegraConhecimentoOperacionalSchema = z.object({
  versao: z.literal(1),

  condicoes: z.array(CondicaoConhecimentoOperacionalSchema).min(1),

  acoes: z.array(AcaoConhecimentoOperacionalSchema).min(1),
});

export type RegraConhecimentoOperacional = z.infer<typeof RegraConhecimentoOperacionalSchema>;

export type CondicaoConhecimentoOperacional = z.infer<typeof CondicaoConhecimentoOperacionalSchema>;

export type AcaoConhecimentoOperacional = z.infer<typeof AcaoConhecimentoOperacionalSchema>;
