#Requires -Version 5.1
<#
  Tylko migracje 13 (generation_feedback project_id TEXT) i 14 (session_export_json).
  Wymaga PGPASSWORD lub HASLO_BAZY w apps/frontend/.env.local oraz działającego proxy (np. -Port 15432).

  .\apply-migrations-13-14.ps1 -Port 15432
#>
param(
  [string] $DbHost = "127.0.0.1",
  [int] $Port = 5432,
  [string] $User = "awa_app",
  [string] $Database = "awa_db"
)

$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
$EnvLocal = Join-Path $RepoRoot "apps\frontend\.env.local"
if (Test-Path $EnvLocal) {
  Get-Content $EnvLocal | ForEach-Object {
    if ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$' -and $_.Trim() -notmatch '^\#') {
      $key = $matches[1].Trim()
      $val = $matches[2].Trim().Trim('"').Trim("'")
      Set-Item -Path "Env:$key" -Value $val
    }
  }
}

if (-not $env:PGPASSWORD -and $env:HASLO_BAZY) {
  $env:PGPASSWORD = $env:HASLO_BAZY
}
if (-not $env:PGPASSWORD) {
  Write-Error "Ustaw PGPASSWORD lub HASLO_BAZY w apps/frontend/.env.local"
  exit 1
}

$psqlCmd = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psqlCmd) {
  $candidates = @(
    "C:\Program Files\PostgreSQL\17\bin\psql.exe",
    "C:\Program Files\PostgreSQL\16\bin\psql.exe",
    "C:\Program Files\PostgreSQL\15\bin\psql.exe"
  )
  $found = $candidates | Where-Object { Test-Path $_ } | Select-Object -First 1
  if (-not $found) {
    Write-Error "Brak psql w PATH."
    exit 1
  }
  $psqlCmd = $found
}

$gcpRoot = Split-Path $PSScriptRoot -Parent
$sqlDir = Join-Path $gcpRoot "sql"
foreach ($f in @("13_generation_feedback_project_id_text.sql", "14_session_export_json.sql")) {
  $path = Join-Path $sqlDir $f
  Write-Host "[apply-migrations-13-14] >>> $f"
  & $psqlCmd -h $DbHost -p $Port -U $User -d $Database -v ON_ERROR_STOP=1 -f $path
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Migracja nieudana: $f (exit $LASTEXITCODE)"
    exit $LASTEXITCODE
  }
}
Write-Host "[apply-migrations-13-14] Gotowe."
