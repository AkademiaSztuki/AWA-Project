#Requires -Version 5.1
<#
  Migration 17 (blind_selection_made, implicit_dominant_tags) and optional backfill 16 (orphan space_id).

  Requires PGPASSWORD or HASLO_BAZY in apps/frontend/.env.local and Cloud SQL Auth Proxy.

  Schema only (deploy):
    .\apply-migrations-16-17.ps1 -Port 15432

  Schema + backfill for one user:
    .\apply-migrations-16-17.ps1 -Port 15432 -UserHash user_3i8srks2toampv7eptm

  Without proxy (gcloud import):
    .\apply-migrations-16-17.ps1 -GcloudImport

  Migration 16 is a data backfill (UPDATE), not DDL. Run after space UUID fix in frontend.
#>
param(
  [string] $DbHost = "127.0.0.1",
  [int] $Port = 5432,
  [string] $User = "awa_app",
  [string] $Database = "awa_db",
  [string] $UserHash = "",
  [switch] $SkipSchema,
  [switch] $GcloudImport,
  [string] $InstanceName = "awa-research-sql"
)

$ErrorActionPreference = "Stop"
$LogTag = "apply-migrations-16-17"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
$EnvLocal = Join-Path $RepoRoot "apps\frontend\.env.local"
$SetupEnv = Join-Path (Split-Path $PSScriptRoot -Parent) "setup.env"

function Load-EnvFile($Path) {
  if (-not (Test-Path $Path)) { return $false }
  Get-Content $Path | ForEach-Object {
    if ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$' -and $_.Trim() -notmatch '^\#') {
      $key = $matches[1].Trim()
      $val = $matches[2].Trim().Trim('"').Trim("'")
      Set-Item -Path "Env:$key" -Value $val
    }
  }
  return $true
}

if (Load-EnvFile $EnvLocal) {
  Write-Host "${LogTag}: loaded apps/frontend/.env.local" -ForegroundColor Gray
} elseif (Load-EnvFile $SetupEnv) {
  Write-Host "${LogTag}: loaded infra/gcp/setup.env" -ForegroundColor Gray
}

if (-not $env:PGPASSWORD -and $env:HASLO_BAZY) {
  $env:PGPASSWORD = $env:HASLO_BAZY
}

$gcpRoot = Split-Path $PSScriptRoot -Parent
$sqlDir = Join-Path $gcpRoot "sql"
$schemaFile = Join-Path $sqlDir "17_blind_selection_and_dominant_tags.sql"

if ($GcloudImport) {
  $PROJECT_ID = $env:PROJECT_ID
  if (-not $PROJECT_ID) {
    Write-Error "GcloudImport requires PROJECT_ID in .env.local or setup.env"
    exit 1
  }
  if (-not (Test-Path $schemaFile)) {
    Write-Error "Missing file: $schemaFile"
    exit 1
  }
  $GCS_BUCKET = if ($env:GCS_IMAGES_BUCKET) { $env:GCS_IMAGES_BUCKET } else { "awa-research-images-$PROJECT_ID" }
  $GcsUri = "gs://$GCS_BUCKET/setup/17_blind_selection_and_dominant_tags.sql"
  Write-Host "${LogTag}: upload -> $GcsUri" -ForegroundColor Cyan
  gcloud storage cp $schemaFile $GcsUri --project=$PROJECT_ID
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  Write-Host "${LogTag}: gcloud sql import (schema 17)..." -ForegroundColor Cyan
  gcloud sql import sql $InstanceName $GcsUri --database=$Database --project=$PROJECT_ID --quiet
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  Write-Host "${LogTag}: schema 17 applied via gcloud import." -ForegroundColor Green
  if ($UserHash) {
    Write-Warning "${LogTag}: backfill 16 needs psql via proxy; rerun without -GcloudImport and with -UserHash"
  }
  exit 0
}

if (-not $env:PGPASSWORD) {
  Write-Error "Set PGPASSWORD or HASLO_BAZY in apps/frontend/.env.local"
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
    Write-Error "psql not found. Use -GcloudImport for schema 17 without a local client."
    exit 1
  }
  $psqlCmd = $found
}

function Invoke-PsqlFile($path) {
  $leaf = Split-Path $path -Leaf
  Write-Host "${LogTag}: apply $leaf"
  & $psqlCmd -h $DbHost -p $Port -U $User -d $Database -v ON_ERROR_STOP=1 -f $path
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Migration failed: $path (exit $LASTEXITCODE)"
    exit $LASTEXITCODE
  }
}

if (-not $SkipSchema) {
  if (-not (Test-Path $schemaFile)) {
    Write-Error "Missing file: $schemaFile"
    exit 1
  }
  Invoke-PsqlFile $schemaFile
}

if ($UserHash) {
  if ($UserHash -notmatch '^user_[a-z0-9]+$') {
    Write-Error "UserHash must match user_[a-z0-9]+"
    exit 1
  }
  Write-Host "${LogTag}: backfill 16 (orphan space_id) for $UserHash"
  $backfillSql = @'
UPDATE participant_images pi
SET space_id = def.space_id
FROM (
  SELECT ps.id AS space_id
  FROM participant_spaces ps
  WHERE ps.user_hash = '__USER_HASH__'
  ORDER BY ps.is_default DESC, ps.created_at ASC
  LIMIT 1
) def
WHERE pi.user_hash = '__USER_HASH__'
  AND def.space_id IS NOT NULL
  AND (
    pi.space_id IS NULL
    OR pi.space_id NOT IN (
      SELECT id FROM participant_spaces ps2 WHERE ps2.user_hash = pi.user_hash
    )
  );
'@ -replace '__USER_HASH__', $UserHash
  & $psqlCmd -h $DbHost -p $Port -U $User -d $Database -v ON_ERROR_STOP=1 -c $backfillSql
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Backfill 16 failed (exit $LASTEXITCODE)"
    exit $LASTEXITCODE
  }
  Write-Host "${LogTag}: backfill 16 done for $UserHash"
}

Write-Host "${LogTag}: done."
