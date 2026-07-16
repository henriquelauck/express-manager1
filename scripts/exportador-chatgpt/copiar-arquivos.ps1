function Copiar-Pasta {
    param([string]$CaminhoRelativo)

    $Origem = Join-Path $RaizProjeto $CaminhoRelativo
    $Destino = Join-Path $PastaArquivos $CaminhoRelativo

    if (-not (Test-Path $Origem)) {
        Write-Host "Pasta nao encontrada: $CaminhoRelativo" -ForegroundColor DarkYellow
        return
    }

    New-Item `
        -ItemType Directory `
        -Path (Split-Path -Parent $Destino) `
        -Force | Out-Null

    Copy-Item $Origem $Destino -Recurse -Force

    Write-Host "Pasta copiada: $CaminhoRelativo" -ForegroundColor Green
}

function Copiar-Arquivo {
    param([string]$CaminhoRelativo)

    $Origem = Join-Path $RaizProjeto $CaminhoRelativo
    $Destino = Join-Path $PastaArquivos $CaminhoRelativo

    if (-not (Test-Path $Origem)) {
        Write-Host "Arquivo nao encontrado: $CaminhoRelativo" -ForegroundColor DarkYellow
        return
    }

    New-Item `
        -ItemType Directory `
        -Path (Split-Path -Parent $Destino) `
        -Force | Out-Null

    Copy-Item $Origem $Destino -Force

    Write-Host "Arquivo copiado: $CaminhoRelativo" -ForegroundColor Green
}

function Copiar-ArquivosDoProjeto {
    foreach ($Pasta in $PastasParaExportar) {
        Copiar-Pasta -CaminhoRelativo $Pasta
    }

    foreach ($Arquivo in $ArquivosParaExportar) {
        Copiar-Arquivo -CaminhoRelativo $Arquivo
    }
}