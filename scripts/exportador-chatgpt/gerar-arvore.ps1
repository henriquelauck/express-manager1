function Gerar-ArvoreInterna {
    param(
        [string]$Caminho,
        [string]$Prefixo = ""
    )

    $Itens = @(
        Get-ChildItem -LiteralPath $Caminho -Force |
            Where-Object {
                if ($_.PSIsContainer) {
                    $PastasIgnoradas -notcontains $_.Name
                }
                else {
                    $ArquivosIgnorados -notcontains $_.Name
                }
            } |
            Sort-Object `
                @{ Expression = { -not $_.PSIsContainer } },
                Name
    )

    for ($Indice = 0; $Indice -lt $Itens.Count; $Indice++) {
        $Item = $Itens[$Indice]
        $EhUltimo = $Indice -eq ($Itens.Count - 1)

        if ($EhUltimo) {
            $Conector = "\---"
            $NovoPrefixo = "$Prefixo    "
        }
        else {
            $Conector = "+---"
            $NovoPrefixo = "$Prefixo|   "
        }

        Add-Content `
            -Path $ArquivoArvore `
            -Value "$Prefixo$Conector$($Item.Name)" `
            -Encoding UTF8

        if ($Item.PSIsContainer) {
            Gerar-ArvoreInterna `
                -Caminho $Item.FullName `
                -Prefixo $NovoPrefixo
        }
    }
}

function Gerar-ArvoreProjeto {
    Set-Content `
        -Path $ArquivoArvore `
        -Value "EXPRESS MANAGER" `
        -Encoding UTF8

    Gerar-ArvoreInterna -Caminho $RaizProjeto

    Write-Host "Arvore do projeto gerada." -ForegroundColor Green
}