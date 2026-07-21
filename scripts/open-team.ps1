# Разворачивает все рабочие домены Ishbor по отдельным окнам консоли:
# frontend, backend, qa — каждое своя сессия Claude Code (см. open-role.ps1).
#
# Использование (из корня ishbor):
#   powershell -File scripts/open-team.ps1
#   powershell -File scripts/open-team.ps1 -Roles frontend,backend
#   powershell -File scripts/open-team.ps1 -WhatIf

param(
    [string[]]$Roles = @("frontend", "backend", "qa"),
    [switch]$WhatIf
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot
$OpenRolePath = Join-Path $PSScriptRoot "open-role.ps1"

$validRoles = @("frontend", "backend", "qa")
foreach ($r in $Roles) {
    if ($validRoles -notcontains $r) {
        throw "Неизвестная роль '$r'. Допустимые: $($validRoles -join ', ')"
    }
}

function Open-Window {
    param([string]$Label, [string[]]$InnerArgs)
    if ($WhatIf) {
        Write-Host "powershell.exe $($InnerArgs -join ' ')  [$Label]" -ForegroundColor DarkGray
        return
    }
    Start-Process powershell.exe -ArgumentList $InnerArgs -WorkingDirectory $RepoRoot
    Start-Sleep -Milliseconds 300
}

if ($WhatIf) {
    Write-Host "(-WhatIf: команды не выполняются, окна не открываются)" -ForegroundColor Yellow
}

Write-Host "Открываю команду ishbor: $($Roles -join ', ')..." -ForegroundColor Cyan

foreach ($r in $Roles) {
    $innerArgs = @("-NoExit", "-File", $OpenRolePath, "-Role", $r)
    Open-Window -Label $r -InnerArgs $innerArgs
}
