$ErrorActionPreference = "Stop"

$PastaModulos = Join-Path $PSScriptRoot "exportador-chatgpt"

. (Join-Path $PastaModulos "config.ps1")
. (Join-Path $PastaModulos "copiar-arquivos.ps1")
. (Join-Path $PastaModulos "gerar-arvore.ps1")
. (Join-Path $PastaModulos "gerar-resumo.ps1")

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host " EXPORTADOR DO EXPRESS MANAGER" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

if (Test-Path $PastaExportacao) {
    Write-Host "Removendo exportacao anterior..." -ForegroundColor Yellow
    Remove-Item $PastaExportacao -Recurse -Force
}

if (Test-Path $ArquivoZip) {
    Remove-Item $ArquivoZip -Force
}

New-Item `
    -ItemType Directory `
    -Path $PastaArquivos `
    -Force | Out-Null

Copiar-ArquivosDoProjeto

Write-Host ""
Write-Host "Gerando arvore limpa..." -ForegroundColor Cyan
Gerar-ArvoreProjeto

Write-Host ""
Write-Host "Gerando resumo..." -ForegroundColor Cyan
$Estatisticas = Gerar-ResumoProjeto

Write-Host ""
Write-Host "Compactando exportacao..." -ForegroundColor Cyan

Compress-Archive `
    -Path "$PastaExportacao\*" `
    -DestinationPath $ArquivoZip `
    -Force

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host " EXPORTACAO CONCLUIDA" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "ZIP criado:" -ForegroundColor White
Write-Host $ArquivoZip -ForegroundColor Cyan
Write-Host ""
Write-Host "Arquivos: $($Estatisticas.TotalArquivos)"
Write-Host "Linhas: $($Estatisticas.TotalLinhas)"
Write-Host ""