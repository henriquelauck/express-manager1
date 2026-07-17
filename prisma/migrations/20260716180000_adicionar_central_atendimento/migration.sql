-- CreateEnum
CREATE TYPE "CanalConversaAtendimento" AS ENUM ('INTERNO', 'SIMULADOR', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "StatusConversaAtendimento" AS ENUM ('ABERTA', 'AGUARDANDO_CLIENTE', 'AGUARDANDO_EQUIPE', 'ENCERRADA');

-- CreateEnum
CREATE TYPE "AutorMensagemAtendimento" AS ENUM ('CLIENTE', 'HUMANO', 'IA', 'SISTEMA');

-- CreateEnum
CREATE TYPE "DirecaoMensagemAtendimento" AS ENUM ('ENTRADA', 'SAIDA', 'INTERNA');

-- CreateEnum
CREATE TYPE "TipoMensagemAtendimento" AS ENUM ('TEXTO', 'AUDIO', 'IMAGEM', 'DOCUMENTO', 'SISTEMA');

-- CreateTable
CREATE TABLE "ConversaAtendimento" (
    "id" TEXT NOT NULL,
    "canal" "CanalConversaAtendimento" NOT NULL DEFAULT 'INTERNO',
    "clienteId" TEXT,
    "telefoneRemetente" TEXT NOT NULL,
    "telefoneNormalizado" TEXT NOT NULL,
    "nomeExibicao" TEXT,
    "status" "StatusConversaAtendimento" NOT NULL DEFAULT 'ABERTA',
    "naoLidas" INTEGER NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ultimaMensagemEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConversaAtendimento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MensagemAtendimento" (
    "id" TEXT NOT NULL,
    "conversaId" TEXT NOT NULL,
    "autor" "AutorMensagemAtendimento" NOT NULL,
    "direcao" "DirecaoMensagemAtendimento" NOT NULL,
    "tipo" "TipoMensagemAtendimento" NOT NULL DEFAULT 'TEXTO',
    "conteudo" TEXT,
    "usuarioId" TEXT,
    "atendimentoId" TEXT,
    "teleId" TEXT,
    "idExterno" TEXT,
    "mediaUrl" TEXT,
    "mediaMimeType" TEXT,
    "mediaNomeArquivo" TEXT,
    "sugestaoIA" JSONB,
    "metadata" JSONB,
    "enviadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lidaEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MensagemAtendimento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ConversaAtendimento_telefoneNormalizado_ativo_idx" ON "ConversaAtendimento"("telefoneNormalizado", "ativo");

-- CreateIndex
CREATE INDEX "ConversaAtendimento_status_ultimaMensagemEm_idx" ON "ConversaAtendimento"("status", "ultimaMensagemEm");

-- CreateIndex
CREATE INDEX "ConversaAtendimento_canal_telefoneNormalizado_idx" ON "ConversaAtendimento"("canal", "telefoneNormalizado");

-- CreateIndex
CREATE INDEX "ConversaAtendimento_clienteId_updatedAt_idx" ON "ConversaAtendimento"("clienteId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MensagemAtendimento_idExterno_key" ON "MensagemAtendimento"("idExterno");

-- CreateIndex
CREATE INDEX "MensagemAtendimento_conversaId_enviadaEm_idx" ON "MensagemAtendimento"("conversaId", "enviadaEm");

-- CreateIndex
CREATE INDEX "MensagemAtendimento_atendimentoId_idx" ON "MensagemAtendimento"("atendimentoId");

-- CreateIndex
CREATE INDEX "MensagemAtendimento_teleId_idx" ON "MensagemAtendimento"("teleId");

-- CreateIndex
CREATE INDEX "MensagemAtendimento_autor_enviadaEm_idx" ON "MensagemAtendimento"("autor", "enviadaEm");

-- CreateIndex
CREATE INDEX "MensagemAtendimento_direcao_enviadaEm_idx" ON "MensagemAtendimento"("direcao", "enviadaEm");

-- AddForeignKey
ALTER TABLE "ConversaAtendimento" ADD CONSTRAINT "ConversaAtendimento_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MensagemAtendimento" ADD CONSTRAINT "MensagemAtendimento_conversaId_fkey" FOREIGN KEY ("conversaId") REFERENCES "ConversaAtendimento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MensagemAtendimento" ADD CONSTRAINT "MensagemAtendimento_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MensagemAtendimento" ADD CONSTRAINT "MensagemAtendimento_atendimentoId_fkey" FOREIGN KEY ("atendimentoId") REFERENCES "AtendimentoIA"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MensagemAtendimento" ADD CONSTRAINT "MensagemAtendimento_teleId_fkey" FOREIGN KEY ("teleId") REFERENCES "Tele"("id") ON DELETE SET NULL ON UPDATE CASCADE;
