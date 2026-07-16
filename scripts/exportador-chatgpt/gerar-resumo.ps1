function Gerar-ResumoProjeto {
    $ArquivosExportados = @(
        Get-ChildItem $PastaArquivos -Recurse -File
    )

    $TotalArquivos = $ArquivosExportados.Count
    $TotalLinhas = 0

    $ExtensoesTexto = @(
        ".ts",
        ".tsx",
        ".js",
        ".jsx",
        ".json",
        ".md",
        ".txt",
        ".prisma",
        ".mjs",
        ".cjs",
        ".css",
        ".ps1"
    )

    foreach ($Arquivo in $ArquivosExportados) {
        if ($ExtensoesTexto -contains $Arquivo.Extension.ToLower()) {
            try {
                $TotalLinhas += (
                    Get-Content $Arquivo.FullName -ErrorAction Stop
                ).Count
            }
            catch {
                Write-Host `
                    "Nao foi possivel contar: $($Arquivo.FullName)" `
                    -ForegroundColor DarkYellow
            }
        }
    }

    $VersaoProjeto = "Nao identificada"
    $VersaoNext = "Nao identificada"
    $VersaoPrisma = "Nao identificada"

    $PackageJsonPath = Join-Path $RaizProjeto "package.json"

    if (Test-Path $PackageJsonPath) {
        $PackageJson = Get-Content $PackageJsonPath -Raw |
            ConvertFrom-Json

        if ($PackageJson.version) {
            $VersaoProjeto = $PackageJson.version
        }

        if ($PackageJson.dependencies.next) {
            $VersaoNext = $PackageJson.dependencies.next
        }

        if ($PackageJson.devDependencies.prisma) {
            $VersaoPrisma = $PackageJson.devDependencies.prisma
        }
        elseif ($PackageJson.dependencies.prisma) {
            $VersaoPrisma = $PackageJson.dependencies.prisma
        }
        elseif ($PackageJson.dependencies.'@prisma/client') {
            $VersaoPrisma = $PackageJson.dependencies.'@prisma/client'
        }
    }

    $DataExportacao = Get-Date -Format "dd/MM/yyyy HH:mm:ss"

    $Resumo = @"
EXPRESS MANAGER
==========================================

Data da exportacao:
$DataExportacao

Versao do projeto:
$VersaoProjeto

Next.js:
$VersaoNext

Prisma:
$VersaoPrisma

Banco:
PostgreSQL / Neon

CONTEUDO EXPORTADO
==========================================

- Core da IA
- Atendimento
- Motor Operacional
- Reconhecimento
- Logistica
- Distribuicao
- APIs principais
- Biblioteca de IA
- Servicos
- Google Maps
- Documentacao
- Tipos
- Configuracoes principais
- Schema Prisma
- Arvore limpa do projeto

ESTATISTICAS
==========================================

Total de arquivos:
$TotalArquivos

Total aproximado de linhas:
$TotalLinhas

SEGURANCA
==========================================

Arquivos .env nao foram exportados.

Pastas ignoradas:
.git
.next
node_modules
.vercel
chatgpt
"@

    Set-Content `
        -Path $ArquivoResumo `
        -Value $Resumo `
        -Encoding UTF8

    return @{
        TotalArquivos = $TotalArquivos
        TotalLinhas = $TotalLinhas
    }
}