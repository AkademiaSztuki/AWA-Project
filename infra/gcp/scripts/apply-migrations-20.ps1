#Requires -Version 5.1
<#
  Migration 20: participant_preference_snapshots + participants.current_space_id

  .\apply-migrations-20.ps1 -Port 15432
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
      if (-not [string]::IsNullOrEmpty($val)) { Set-Item -Path "env:$key" -Value $val }
    }
  }
}

if (-not $env:PGPASSWORD -and $env:HASLO_BAZY) { $env:PGPASSWORD = $env:HASLO_BAZY }
if (-not $env:PGPASSWORD) { throw "Set PGPASSWORD or HASLO_BAZY in apps/frontend/.env.local" }

$psql = $env:PSQL_PATH
if (-not $psql) {
  $pg17 = "C:\Program Files\PostgreSQL\17\bin\psql.exe"
  if (Test-Path $pg17) { $psql = $pg17 } else { $psql = "psql" }
}

$path = Join-Path $RepoRoot "infra\gcp\sql\20_participant_preference_snapshots.sql"
Write-Host "Applying 20_participant_preference_snapshots.sql ..."
& $psql -h $DbHost -p $Port -U $User -d $Database -v ON_ERROR_STOP=1 -f $path
if ($LASTEXITCODE -ne 0) { throw "Failed: migration 20" }

Write-Host "Migration 20 applied."
