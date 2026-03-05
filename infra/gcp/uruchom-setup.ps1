# Skrypt konfiguruje GCP pod AWA: API, Cloud SQL, bucket, konto serwisowe.
# Użycie: skopiuj setup.env.example do setup.env, uzupełnij, potem: .\uruchom-setup.ps1
# Wymaga: gcloud (zalogowany: gcloud auth login), ustawiony projekt.

# Continue zamiast Stop - gcloud.ps1 na Windowsie wypisuje komunikaty na stderr,
# co PowerShell traktuje jako blad i przerywa skrypt. Przy Continue skrypt dojedzie do konca.
$ErrorActionPreference = "Continue"
$InfraDir = $PSScriptRoot

# Ładuj zmienne z setup.env
$SetupPath = Join-Path $InfraDir "setup.env"
if (-not (Test-Path $SetupPath)) {
    Write-Host "Brak pliku setup.env. Skopiuj setup.env.example do setup.env i uzupełnij wartości." -ForegroundColor Red
    exit 1
}
Get-Content $SetupPath | ForEach-Object {
    if ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$' -and $_.Trim() -notmatch '^\#') {
        $key = $matches[1].Trim()
        $val = $matches[2].Trim().Trim('"').Trim("'")
        Set-Item -Path "Env:$key" -Value $val
    }
}

$PROJECT_ID = $env:PROJECT_ID
$BILLING_ACCOUNT = $env:BILLING_ACCOUNT
$REGION = $env:REGION
$HASLO_BAZY = $env:HASLO_BAZY

if (-not $PROJECT_ID) { Write-Host "W setup.env ustaw PROJECT_ID." -ForegroundColor Red; exit 1 }
if (-not $REGION) { $REGION = "europe-west4" }

Write-Host "Projekt: $PROJECT_ID, Region: $REGION" -ForegroundColor Cyan
# gcloud pod Windows potrafi wypisywać 'Updated property [core/project].' jako NativeCommandError,
# co przy ErrorActionPreference=Stop przerywa skrypt mimo poprawnego działania.
try {
    gcloud config set project $PROJECT_ID | Out-Null
} catch {
    Write-Host "Uwaga: gcloud config set project zglosil blad PowerShell (NativeCommandError), ale zwykle oznacza to tylko komunikat tekstowy. Kontynuuje." -ForegroundColor Gray
}

# --- Krok 3: Włącz API (POMINIĘTE, jeśli już włączone w konsoli) ---
Write-Host "`n[Krok 3] Włączanie API (pominiete - zakladam, ze API sa juz wlaczone w konsoli)..." -ForegroundColor Yellow
# Jeśli musisz wlaczyc API z poziomu CLI, odkomentuj linie ponizej:
# gcloud services enable sqladmin.googleapis.com,run.googleapis.com,compute.googleapis.com,storage.googleapis.com,iam.googleapis.com,aiplatform.googleapis.com --project=$PROJECT_ID

# --- Krok 4: Cloud SQL ---
Write-Host "`n[Krok 4] Tworzenie instancji Cloud SQL (moze potrwac kilka minut)..." -ForegroundColor Yellow
$InstanceName = "awa-research-sql"

# Prostsze podejscie: zawsze probujemy stworzyc instancje.
# Jesli juz istnieje, gcloud zwroci blad, ktory traktujemy jako informacyjny.
try {
    gcloud sql instances create $InstanceName `
        --database-version=POSTGRES_15 `
        --tier=db-f1-micro `
        --region=$REGION `
        --availability-type=zonal `
        --storage-type=SSD `
        --storage-auto-increase `
        --backup-start-time=03:00 `
        --project=$PROJECT_ID 2>$null
    Write-Host "Instancja $InstanceName zostala utworzona (lub trwa jej tworzenie)." -ForegroundColor Green
} catch {
    Write-Host "Nie udalo sie utworzyc instancji $InstanceName przez CLI. Sprawdz w konsoli Cloud SQL, czy instancja juz istnieje lub czy masz uprawnienia." -ForegroundColor Gray
}

Write-Host "Tworzenie bazy awa_db i uzytkownika awa_app..." -ForegroundColor Yellow
gcloud sql databases create awa_db --instance=$InstanceName --project=$PROJECT_ID 2>$null
if ($LASTEXITCODE -ne 0) { Write-Host "Baza awa_db może już istnieć, kontynuuję." -ForegroundColor Gray }
if (-not $HASLO_BAZY) { Write-Host "Uwaga: HASLO_BAZY puste - uzytkownik awa_app moze juz istniec lub ustaw haslo recznie." -ForegroundColor Gray }
if ($HASLO_BAZY) {
    gcloud sql users create awa_app --instance=$InstanceName --password=$HASLO_BAZY --project=$PROJECT_ID 2>$null
    if ($LASTEXITCODE -ne 0) { Write-Host "Użytkownik awa_app może już istnieć." -ForegroundColor Gray }
}

$SqlIp = gcloud sql instances describe $InstanceName --format="value(ipAddresses[0].ipAddress)" --project=$PROJECT_ID
Write-Host "Adres IP Cloud SQL: $SqlIp" -ForegroundColor Green
Write-Host "DATABASE_URL (do backendu): postgresql://awa_app:HASLO_BAZY@${SqlIp}:5432/awa_db" -ForegroundColor Cyan

# --- Krok 5: Bucket GCS ---
Write-Host "`n[Krok 5] Tworzenie bucketa Cloud Storage..." -ForegroundColor Yellow
$BucketName = "awa-research-images-$PROJECT_ID"
$BucketExists = gsutil ls "gs://$BucketName" 2>$null
if ($LASTEXITCODE -ne 0) {
    gsutil mb -l $REGION "gs://$BucketName" -p $PROJECT_ID
    Write-Host "Bucket utworzony: $BucketName" -ForegroundColor Green
} else {
    Write-Host "Bucket $BucketName już istnieje." -ForegroundColor Gray
}

# --- Krok 6: Konto serwisowe ---
Write-Host "`n[Krok 6] Konto serwisowe awa-backend i uprawnienia..." -ForegroundColor Yellow
$SA = "awa-backend@${PROJECT_ID}.iam.gserviceaccount.com"
$SaExists = gcloud iam service-accounts describe $SA --project=$PROJECT_ID 2>$null
if ($LASTEXITCODE -ne 0) {
    gcloud iam service-accounts create awa-backend --display-name="AWA Backend Service" --project=$PROJECT_ID
}
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:$SA" --role="roles/cloudsql.client" --quiet
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:$SA" --role="roles/storage.objectAdmin" --quiet
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:$SA" --role="roles/aiplatform.user" --quiet
Write-Host "Konto serwisowe gotowe: $SA" -ForegroundColor Green

Write-Host "`n--- Koniec skryptu ---" -ForegroundColor Green
Write-Host "Dalej zrób ręcznie:" -ForegroundColor Yellow
Write-Host "1. Zaladuj schemat tabel: wykonaj plik sql/01_research_schema.sql na bazie awa_db (Cloud Console SQL lub psql)."
Write-Host "2. Deploy backendu: cd apps/backend-gcp, ustaw DATABASE_URL i GCS_IMAGES_BUCKET, potem gcloud run deploy (szczegoly w INSTRUKCJA_PL.md)."
Write-Host "3. Opcjonalnie: budzet alertow - komenda w INSTRUKCJA_PL.md (Krok 8)."
