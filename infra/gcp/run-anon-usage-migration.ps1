# Upload 15_anon_usage.sql to GCS and import into Cloud SQL (same pattern as run-magic-link-migration.ps1).
# Usage (from infra/gcp): .\run-anon-usage-migration.ps1
# Requires: gcloud auth login, PROJECT_ID in apps/frontend/.env.local or infra/gcp/setup.env

param(
    [string] $InstanceName = "awa-research-sql",
    [string] $Database = "awa_db"
)

$ErrorActionPreference = "Continue"
$InfraDir = $PSScriptRoot
$RepoRoot = (Resolve-Path (Join-Path $InfraDir "..\..")).Path

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

$EnvLocalPath = Join-Path $RepoRoot "apps\frontend\.env.local"
$SetupPath = Join-Path $InfraDir "setup.env"

if (Load-EnvFile $EnvLocalPath) {
    Write-Host "Loaded env: apps/frontend/.env.local" -ForegroundColor Gray
} elseif (Load-EnvFile $SetupPath) {
    Write-Host "Loaded env: infra/gcp/setup.env" -ForegroundColor Gray
} else {
    Write-Host "Missing .env.local and setup.env. Set PROJECT_ID." -ForegroundColor Red
    exit 1
}

$PROJECT_ID = $env:PROJECT_ID
$GCS_BUCKET = $env:GCS_IMAGES_BUCKET
if (-not $PROJECT_ID) { Write-Host "Set PROJECT_ID in .env.local or setup.env." -ForegroundColor Red; exit 1 }
$BUCKET = if ($GCS_BUCKET) { $GCS_BUCKET } else { "awa-research-images-$PROJECT_ID" }

$SqlFile = Join-Path $InfraDir "sql\15_anon_usage.sql"
if (-not (Test-Path $SqlFile)) {
    Write-Host "Missing file: sql\15_anon_usage.sql" -ForegroundColor Red
    exit 1
}

$GcsUri = "gs://$BUCKET/setup/15_anon_usage.sql"
Write-Host "Upload: $SqlFile -> $GcsUri" -ForegroundColor Cyan
gcloud storage cp $SqlFile $GcsUri --project=$PROJECT_ID
if ($LASTEXITCODE -ne 0) {
    Write-Host "Upload failed. Try: gcloud auth login, gcloud config set project $PROJECT_ID" -ForegroundColor Red
    exit 1
}

Write-Host "Import into Cloud SQL: $InstanceName, database $Database..." -ForegroundColor Cyan
gcloud sql import sql $InstanceName $GcsUri --database=$Database --project=$PROJECT_ID
if ($LASTEXITCODE -ne 0) {
    Write-Host "Import failed. Check GCP Console (SQL -> operations / logs)." -ForegroundColor Red
    exit 1
}

Write-Host "Done. anon usage tables applied in $Database." -ForegroundColor Green
