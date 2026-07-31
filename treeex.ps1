param(
    [string]$Path = ".",
    [string[]]$Exclude = @("node_modules", ".git", "bin", "obj", "dist", "img")
)

function Show-Tree {
    param(
        [string]$CurrentPath,
        [string]$Indent = ""
    )

    # Obtener carpetas y archivos, excluyendo directorios indicados
    $items = Get-ChildItem -LiteralPath $CurrentPath -Force |
        Where-Object {
            if ($_.PSIsContainer) {
                $Exclude -notcontains $_.Name
            }
            else {
                $true
            }
        } |
        Sort-Object @{Expression="PSIsContainer";Descending=$true}, Name

    for ($i = 0; $i -lt $items.Count; $i++) {

        $item = $items[$i]
        $isLast = ($i -eq ($items.Count - 1))

        if ($isLast) {
            $branch = "\-- "
            $nextIndent = $Indent + "    "
        }
        else {
            $branch = "+-- "
            $nextIndent = $Indent + "|   "
        }

        Write-Output ($Indent + $branch + $item.Name)

        if ($item.PSIsContainer) {
            Show-Tree -CurrentPath $item.FullName -Indent $nextIndent
        }
    }
}

try {
    $root = Resolve-Path -LiteralPath $Path

    Write-Output $root.Path
    Show-Tree -CurrentPath $root.Path
}
catch {
    Write-Error "No se pudo acceder a la ruta '$Path'."
}

