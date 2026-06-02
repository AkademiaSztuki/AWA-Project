#Requires -Version 5.1
<#
.SYNOPSIS
  Stosuje wybrane migracje badawcze na Cloud SQL (przez proxy na localhost).

.DESCRIPTION
  Wymaga PGPASSWORD i dzialajacego Cloud SQL Auth Proxy (np. port 15432).
  Kolejnosc: session_image_ratings, research extensions + macierz, swipes dedupe, modification_prompt_log,
  research events, generation_feedback, session_export_json, anon_usage (15), blind_selection + dominant_tags (17).

  Backfill orphan space_id (16) — osobno: .\apply-migrations-16-17.ps1 -UserHash user_xxx (nie DDL).

  $env:PGPASSWORD = "..."
  cd ...\infra\gcp\scripts
  .\apply-research-migrations.ps1 -Port 15432
#>
param(
  [string] $DbHost = "127.0.0.1",
  [int] $Port = 5432,
  [string] $User = "awa_app",
  [string] $Database = "awa_db"
)

$ErrorActionPreference = "Stop"
$LogTag = "apply-research-migrations"

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
$files = @(
  "02_session_image_ratings.sql",
  "09_participant_research_extensions.sql",
  "10_participant_swipes_dedupe.sql",
  "11_participant_modification_prompt_log.sql",
  "12_participant_research_events.sql",
  "13_generation_feedback_project_id_text.sql",
  "14_session_export_json.sql",
  "15_anon_usage.sql",
  "17_blind_selection_and_dominant_tags.sql"
)

foreach ($f in $files) {
  $path = Join-Path $sqlDir $f
  if (-not (Test-Path $path)) {
    Write-Warning "Pomijam (brak pliku): $path"
    continue
  }
  Write-Host "${LogTag}: apply $f"
  & $psqlCmd -h $DbHost -p $Port -U $User -d $Database -v ON_ERROR_STOP=1 -f $path
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Migracja nieudana: $f (exit $LASTEXITCODE)"
    exit $LASTEXITCODE
  }
}

Write-Host "${LogTag}: done."
