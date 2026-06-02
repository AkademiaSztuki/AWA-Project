#Requires -Version 5.1
<#
  Migrations 18 (preference_comparison_json) and 19 (participant_swipes metadata).

  .\apply-migrations-18-19.ps1 -Port 15432
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

$SqlDir = Join-Path $RepoRoot "infra\gcp\sql"
$files = @(
  "18_preference_comparison.sql",
  "19_participant_swipes_metadata.sql"
)

foreach ($f in $files) {
  $path = Join-Path $SqlDir $f
  Write-Host "Applying $f ..."
  & psql -h $DbHost -p $Port -U $User -d $Database -v ON_ERROR_STOP=1 -f $path
  if ($LASTEXITCODE -ne 0) { throw "Failed: $f" }
}

Write-Host "Migrations 18-19 applied."
