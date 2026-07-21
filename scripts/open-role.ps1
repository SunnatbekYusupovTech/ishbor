# Открывает Claude Code сессию, "заточенную" под один из технических доменов
# Ishbor (frontend / backend / qa), в отдельном терминале — по образцу
# ролевых сессий AI-Studio, но адаптировано под реальный воркфлоу проекта
# (GitHub PR, доменное разделение backend/frontend, без agents/state.json).
#
# Использование (из корня ishbor):
#   powershell -File scripts/open-role.ps1 -Role frontend
#   powershell -File scripts/open-role.ps1 -Role backend -NewWindow
#   powershell -File scripts/open-role.ps1 -Role qa
#
# -NewWindow открывает роль в НОВОМ окне консоли вместо текущего терминала.

param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("frontend", "backend", "qa")]
    [string]$Role,

    [switch]$NewWindow
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $PSScriptRoot

$roles = @{
    frontend = @{
        Emoji   = "🧩"
        Title   = "Frontend-разработчик"
        Focus   = "frontend/src/** — Next.js 15 App Router, React 19, TypeScript, Tailwind, shadcn/ui, next-intl (uz/ru/en)"
        Context = @("CLAUDE.md", "frontend/CLAUDE.md")
        Notes   = "Новый текст — обязательно во все три messages/{uz,ru,en}.json. Path alias @/ -> src/."
    }
    backend = @{
        Emoji   = "⚙️"
        Title   = "Backend-разработчик"
        Focus   = "backend/src/** — Express 4, Mongoose 8, Zod-валидация, JWT, Socket.io"
        Context = @("CLAUDE.md", "backend/CLAUDE.md")
        Notes   = "Формат ответа API: { success, data } / { success: false, error }. MongoDB Atlas — только non-SRV строка подключения (SRV DNS в этом окружении не резолвится)."
    }
    qa = @{
        Emoji   = "🔍"
        Title   = "QA / ревьюер"
        Focus   = "Код не пишет — гоняет npm run lint / npm run build / npm run test -w backend, проверяет диффы перед PR, ищет баги и несоответствия CLAUDE.md"
        Context = @("CLAUDE.md", "backend/CLAUDE.md", "frontend/CLAUDE.md")
        Notes   = "Вердикт по задаче — коротким отчётом: что проверено, что сломано, воспроизведение."
    }
}

$cfg = $roles[$Role]

try { $Host.UI.RawUI.WindowTitle = "$($cfg.Emoji) $($cfg.Title) — ishbor" } catch {}

$contextFiles = ($cfg.Context -join ", ")

$startPrompt = @"
Ты — $($cfg.Title) $($cfg.Emoji) в проекте Ishbor (Skill Assessment + job board, Next.js/Express monorepo).
Работаешь в отдельном терминале напрямую с человеком.

Сначала прочитай: $contextFiles.

Зона фокуса: $($cfg.Focus)
Особенности домена: $($cfg.Notes)

Реальный воркфлоу проекта (не выдуманный протокол AI-Studio — здесь его нет):
- В main нет прямых пушей — только через PR, минимум 1 ревью.
- Ветка по задаче: feature/..., fix/..., content/....
- .env-файлы никогда не коммитятся.
- Любое ощутимое изменение — сразу обновляй соответствующий CLAUDE.md /
  docs/team/*.md в том же PR (см. таблицу в корневом CLAUDE.md, раздел
  "Hujjatlarni yangilab borish").
- Проект реально ведут три человека (Sardor, Fazilov, Hidoyatov — см.
  docs/team/README.md). Коммиты и PR — только от имени текущего
  пользователя (его git-identity уже настроена в этом репозитории);
  никогда не выступай от имени другого участника команды и не приписывай
  ему изменения.

Представься коротко (кто ты, чем можешь помочь по своему домену) и жди задачу.
"@

Write-Host "Запускаю $($cfg.Emoji) $($cfg.Title) (ishbor)..." -ForegroundColor Cyan

$claudeArgs = @($startPrompt)

if ($NewWindow) {
    $innerArgs = @("-NoExit", "-File", $PSCommandPath, "-Role", $Role)
    Start-Process powershell.exe -ArgumentList $innerArgs -WorkingDirectory $RepoRoot
} else {
    Push-Location $RepoRoot
    try {
        & claude @claudeArgs
    } finally {
        Pop-Location
    }
}
