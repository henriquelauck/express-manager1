$RaizProjeto = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)

$PastaExportacao = Join-Path $RaizProjeto "chatgpt"
$PastaArquivos = Join-Path $PastaExportacao "arquivos"

$ArquivoArvore = Join-Path $PastaExportacao "arvore.txt"
$ArquivoResumo = Join-Path $PastaExportacao "RESUMO_PROJETO.txt"
$ArquivoZip = Join-Path $RaizProjeto "chatgpt-express-manager.zip"

$PastasParaExportar = @(
    "app\api\ia",
    "app\api\teles",
    "app\api\clientes",
    "app\api\motoboys",
    "app\laboratorio-ia",
    "core\ia",
    "core\reconhecimento",
    "core\logistica",
    "core\distribuicao",
    "lib\ai",
    "lib\services",
    "lib\google-maps",
    "docs",
    "types"
)

$ArquivosParaExportar = @(
    "package.json",
    "tsconfig.json",
    "next.config.ts",
    "prisma.config.ts",
    "eslint.config.mjs",
    "README.md",
    "AGENTS.md",
    "CLAUDE.md",
    "lib\prisma.ts",
    "lib\whatsapp.ts",
    "prisma\schema.prisma"
)

$PastasIgnoradas = @(
    ".git",
    ".next",
    "node_modules",
    "chatgpt",
    ".vercel"
)

$ArquivosIgnorados = @(
    ".env",
    ".env.local",
    ".env.production",
    ".env.development",
    "tsconfig.tsbuildinfo",
    "chatgpt-express-manager.zip"
)