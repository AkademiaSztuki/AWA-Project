# Wgrywa 04_magic_link_tokens.sql do GCS i uruchamia import do Cloud SQL (tabela pod Magic Link).
# Użycie: .\run-magic-link-migration.ps1   (z katalogu infra/gcp)
# Zmienne z apps/frontend/.env.local lub infra/gcp/setup.env (PROJECT_ID, GCS_IMAGES_BUCKET lub bucket = awa-research-images-PROJECT_ID).

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
    Write-Host "Zmienne z: apps/frontend/.env.local" -ForegroundColor Gray
} elseif (Load-EnvFile $SetupPath) {
    Write-Host "Zmienne z: infra/gcp/setup.env" -ForegroundColor Gray
} else {
    Write-Host "Brak .env.local ani setup.env. Ustaw PROJECT_ID (i opcjonalnie GCS_IMAGES_BUCKET)." -ForegroundColor Red
    exit 1
}

$PROJECT_ID = $env:PROJECT_ID
$GCS_BUCKET = $env:GCS_IMAGES_BUCKET
if (-not $PROJECT_ID) { Write-Host "W .env.local ustaw PROJECT_ID." -ForegroundColor Red; exit 1 }
$BUCKET = if ($GCS_BUCKET) { $GCS_BUCKET } else { "awa-research-images-$PROJECT_ID" }

$SqlFile = Join-Path $InfraDir "sql\04_magic_link_tokens.sql"
if (-not (Test-Path $SqlFile)) {
    Write-Host "Brak pliku sql\04_magic_link_tokens.sql" -ForegroundColor Red
    exit 1
}

$GcsUri = "gs://$BUCKET/setup/04_magic_link_tokens.sql"
Write-Host "Upload: $SqlFile -> $GcsUri" -ForegroundColor Cyan
# gcloud storage cp zamiast gsutil (na Windows gsutil czesto ma Permission denied w Program Files)
gcloud storage cp $SqlFile $GcsUri --project=$PROJECT_ID
if ($LASTEXITCODE -ne 0) {
    Write-Host "Upload nie powiodl sie. Sprobuj: gcloud auth login, gcloud config set project $PROJECT_ID" -ForegroundColor Red
    exit 1
}

Write-Host "Import do Cloud SQL: awa-research-sql, baza awa_db..." -ForegroundColor Cyan
gcloud sql import sql awa-research-sql $GcsUri --database=awa_db --project=$PROJECT_ID
if ($LASTEXITCODE -ne 0) {
    Write-Host "Import nie powiodl sie. Sprawdz w konsoli GCP (SQL -> operacje / logi)." -ForegroundColor Red
    exit 1
}

Write-Host "Gotowe. Tabela magic_link_tokens utworzona w awa_db." -ForegroundColor Green
