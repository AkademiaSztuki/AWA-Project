# Grant credits via GCS + gcloud sql import (no direct TCP from your laptop to Cloud SQL public IP).
# Use when: psql / grant-dev-credits.cjs returns ETIMEDOUT to the instance IP.
#
# Usage (from infra/gcp):
#   .\grant-dev-credits-cloud.ps1 -UserHash "user_cfdei3t4dhmmotzdlb" -Amount 500000
#
# Requires: gcloud auth login, PROJECT_ID in apps/frontend/.env.local or infra/gcp/setup.env

param(
    [Parameter(Mandatory = $true)]
    [string] $UserHash,
    [int] $Amount = 500000,
    [string] $InstanceName = "awa-research-sql",
    [string] $Database = "awa_db"
)

$ErrorActionPreference = "Continue"

if ($UserHash -notmatch '^user_[a-zA-Z0-9_]+$') {
    Write-Error "UserHash must match ^user_[a-zA-Z0-9_]+$"
    exit 1
}
if ($Amount -lt 1 -or $Amount -gt 10000000) {
    Write-Error "Amount must be between 1 and 10000000"
    exit 1
}

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

$stamp = [DateTime]::UtcNow.ToString("yyyyMMddHHmmss")
$LocalSql = Join-Path $env:TEMP "awa-grant-dev-$stamp.sql"
$GcsObject = "setup/grant-dev-$stamp.sql"
$GcsUri = "gs://$BUCKET/$GcsObject"

$sql = @"
INSERT INTO participants (user_hash, auth_user_id, consent_timestamp, updated_at)
VALUES ('$UserHash', NULL, NOW(), NOW())
ON CONFLICT (user_hash) DO UPDATE SET updated_at = NOW();

INSERT INTO credit_transactions (user_hash, type, amount, source, generation_id, expires_at)
VALUES ('$UserHash', 'grant', $Amount, 'dev_manual_grant', NULL, NULL);
"@

Set-Content -Path $LocalSql -Value $sql -Encoding utf8
Write-Host "Upload: $LocalSql -> $GcsUri" -ForegroundColor Cyan
gcloud storage cp $LocalSql $GcsUri --project=$PROJECT_ID
if ($LASTEXITCODE -ne 0) {
    Write-Host "Upload failed. Try: gcloud auth login, gcloud config set project $PROJECT_ID" -ForegroundColor Red
    exit 1
}

Write-Host "Import into Cloud SQL: $InstanceName, database $Database..." -ForegroundColor Cyan
gcloud sql import sql $InstanceName $GcsUri --database=$Database --project=$PROJECT_ID --quiet
if ($LASTEXITCODE -ne 0) {
    Write-Host "Import failed. Check GCP Console (SQL -> operations / logs)." -ForegroundColor Red
    exit 1
}

Remove-Item -LiteralPath $LocalSql -Force -ErrorAction SilentlyContinue
Write-Host "Done. Granted $Amount credits to $UserHash (source dev_manual_grant)." -ForegroundColor Green
