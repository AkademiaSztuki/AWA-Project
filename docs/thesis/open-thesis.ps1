# Open IDA thesis workspace in a NEW Cursor window + ensure LaTeX Workshop
# Run from anywhere on your PC (PowerShell):
#   irm  ...  OR just:
#   cd path\to\AWA-Project
#   .\docs\thesis\open-thesis.ps1

$ErrorActionPreference = "Stop"
$ThesisDir = $PSScriptRoot
$Workspace = Join-Path $ThesisDir "thesis.code-workspace"

function Find-CursorCli {
  $candidates = @(
    (Get-Command cursor -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source),
    "$env:LOCALAPPDATA\Programs\cursor\Cursor.exe",
    "$env:LOCALAPPDATA\Programs\Cursor\Cursor.exe",
    "$env:ProgramFiles\Cursor\Cursor.exe"
  ) | Where-Object { $_ -and (Test-Path $_) }
  return $candidates | Select-Object -First 1
}

$cursor = Find-CursorCli
if (-not $cursor) {
  Write-Host "Nie znaleziono Cursor CLI/EXE. Otworz recznie folder:" -ForegroundColor Yellow
  Write-Host "  $ThesisDir"
  Write-Host "Albo: File -> Open Workspace from File -> docs/thesis/thesis.code-workspace"
  exit 1
}

Write-Host "Cursor: $cursor"
Write-Host "Workspace: $Workspace"

# Install LaTeX Workshop (idempotent)
try {
  if ($cursor -like "*.exe") {
    & $cursor --install-extension James-Yu.latex-workshop
  } else {
    & $cursor --install-extension James-Yu.latex-workshop
  }
} catch {
  Write-Host "Instalacja rozszerzenia przez CLI nie wyszla - zainstaluj James-Yu.latex-workshop z panelu Extensions." -ForegroundColor Yellow
}

# New window with thesis workspace
if ($cursor -like "*.exe") {
  Start-Process -FilePath $cursor -ArgumentList @("-n", "`"$Workspace`"")
} else {
  & $cursor -n $Workspace
}

Write-Host ""
Write-Host "Gotowe. W nowym oknie otworz docs/thesis/main.tex i zbuduj: Ctrl+Alt+B (Build) albo Save (auto-build)."
Write-Host "Wymagane lokalnie: TeX Live/MiKTeX z latexmk + biber + lualatex."
