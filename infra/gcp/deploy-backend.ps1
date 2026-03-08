# Deploy backendu AWA na Cloud Run z połączeniem do Cloud SQL przez socket.
# Użycie: .\deploy-backend.ps1   (z katalogu infra/gcp)
# Zmienne bierze z apps/frontend/.env.local (albo z infra/gcp/setup.env jeśli brak .env.local).
# Potrzebne w pliku: PROJECT_ID, REGION, HASLO_BAZY, CLOUD_SQL_CONNECTION_NAME, ewentualnie GCS_IMAGES_BUCKET.

$ErrorActionPreference = "Continue"
$InfraDir = $PSScriptRoot
$RepoRoot = (Resolve-Path (Join-Path $InfraDir "..\..")).Path
$BackendDir = Join-Path $RepoRoot "apps\backend-gcp"

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
    Write-Host "Brak apps/frontend/.env.local ani infra/gcp/setup.env. Dodaj PROJECT_ID, REGION, HASLO_BAZY, CLOUD_SQL_CONNECTION_NAME." -ForegroundColor Red
    exit 1
}

$PROJECT_ID = $env:PROJECT_ID
$REGION = $env:REGION
$HASLO_BAZY = $env:HASLO_BAZY
$CLOUD_SQL_CONNECTION_NAME = $env:CLOUD_SQL_CONNECTION_NAME
$GCS_BUCKET = $env:GCS_IMAGES_BUCKET

if (-not $PROJECT_ID) { Write-Host "W .env.local (lub setup.env) ustaw PROJECT_ID." -ForegroundColor Red; exit 1 }
if (-not $REGION) { $REGION = "europe-west4" }
if (-not $CLOUD_SQL_CONNECTION_NAME) {
    $CLOUD_SQL_CONNECTION_NAME = "${PROJECT_ID}:${REGION}:awa-research-sql"
    Write-Host "CLOUD_SQL_CONNECTION_NAME ustawione na: $CLOUD_SQL_CONNECTION_NAME" -ForegroundColor Gray
}
if (-not $HASLO_BAZY) { Write-Host "W .env.local ustaw HASLO_BAZY (haslo uzytkownika awa_app)." -ForegroundColor Red; exit 1 }

$DATABASE_URL = "postgresql://awa_app:$HASLO_BAZY@localhost:5432/awa_db"
$BUCKET = if ($GCS_BUCKET) { $GCS_BUCKET } else { "awa-research-images-$PROJECT_ID" }
$SA = "awa-backend@${PROJECT_ID}.iam.gserviceaccount.com"
$MAGIC_LINK_FRONTEND = $env:MAGIC_LINK_FRONTEND_URL

# Jedna zmienna --set-env-vars ze wszystkimi wartosciami (drugi --set-env-vars nadpisalby poprzedni)
$EnvVars = "DATABASE_URL=$DATABASE_URL,CLOUD_SQL_CONNECTION_NAME=$CLOUD_SQL_CONNECTION_NAME,GCS_IMAGES_BUCKET=$BUCKET"
if ($MAGIC_LINK_FRONTEND) { $EnvVars += ",MAGIC_LINK_FRONTEND_URL=$MAGIC_LINK_FRONTEND" }

Write-Host "Deploy: awa-backend-api, region $REGION, Cloud SQL: $CLOUD_SQL_CONNECTION_NAME" -ForegroundColor Cyan
Push-Location $BackendDir
try {
    gcloud run deploy awa-backend-api --source=. --project=$PROJECT_ID --region=$REGION --service-account=$SA --allow-unauthenticated --add-cloudsql-instances=$CLOUD_SQL_CONNECTION_NAME --set-env-vars="$EnvVars"
} finally {
    Pop-Location
}
