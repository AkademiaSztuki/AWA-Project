# Instrukcja krok po kroku: AWA na Google Cloud (kredyty EDU)

Poniżej masz **jedną listę rzeczy do wypełnienia** na początku, a potem **gotowe komendy do wklejenia** w terminalu. Możesz też uruchomić **jeden skrypt**, który zrobi prawie wszystko za Ciebie.

---

## Krok 0: Wypełnij te wartości raz

Otwórz plik **`infra/gcp/setup.env.example`**, skopiuj go jako **`setup.env`** (w tym samym folderze) i uzupełnij:

| Zmienna | Co wpisać | Gdzie to znaleźć |
|--------|-----------|-------------------|
| `PROJECT_ID` | Id Twojego projektu GCP (np. `awa-badania-2025`) | [Konsola GCP](https://console.cloud.google.com) → wybierz projekt lub utwórz nowy; ID widać na górze. |
| `BILLING_ACCOUNT` | ID konta rozliczeniowego z kredytami EDU | Billing → Manage billing accounts → skopiuj **ID konta** (np. `01234A-BCDEF5-678901`). |
| `REGION` | Region (zostaw `europe-west4` jeśli nie wiesz) | `europe-west4` = Holandia, niskie opóźnienia do Polski. |
| `HASLO_BAZY` | Silne hasło do użytkownika bazy Postgres | Wymyśl hasło (min. 12 znaków); zapisz je w menedżerze haseł. |

**Uwaga:** Plik `setup.env` jest w `.gitignore` – nie trafi do repozytorium (nie wrzucasz tam haseł).

---

## Krok 1: Zaloguj się i ustaw projekt

W terminalu (PowerShell lub **Git Bash** / WSL):

```powershell
# Zaloguj się do Google Cloud (otworzy się przeglądarka)
gcloud auth login

# Ustaw domyślny projekt
gcloud config set project TWOJ_PROJECT_ID
```

Zamień `TWOJ_PROJECT_ID` na wartość z `setup.env` (np. `awa-badania-2025`).

---

## Krok 2: Podłącz kredyty EDU do projektu

Jeśli **projekt już ma przypisane konto rozliczeniowe z kredytami EDU** – ten krok pomiń.

Jeśli tworzysz **nowy projekt** i chcesz go od razu podpiąć pod kredyty:

```powershell
# Utwórz nowy projekt (opcjonalnie)
gcloud projects create TWOJ_PROJECT_ID --name="AWA Research"

# Podłącz konto rozliczeniowe (wklej BILLING_ACCOUNT z setup.env)
gcloud beta billing projects link TWOJ_PROJECT_ID --billing-account=BILLING_ACCOUNT
```

Sprawdzenie: w konsoli wejdź w **Billing** → wybierz projekt → upewnij się, że widać kredyty i datę ważności.

---

## Krok 3: Włącz wymagane API (jedna komenda)

Wykonaj **raz na projekt**:

```powershell
gcloud services enable sqladmin.googleapis.com,run.googleapis.com,compute.googleapis.com,storage.googleapis.com,iam.googleapis.com,aiplatform.googleapis.com
```

Poczekaj, aż wszystkie API się włączą (ok. 1–2 minuty).

---

## Krok 4: Utwórz bazę Cloud SQL (PostgreSQL)

**4a. Utwórz instancję** (może potrwać kilka minut):

```powershell
gcloud sql instances create awa-research-sql --database-version=POSTGRES_15 --tier=db-f1-micro --region=europe-west4 --availability-type=zonal --storage-type=SSD --storage-auto-increase --backup-start-time=03:00
```

**4b. Utwórz bazę i użytkownika:**

```powershell
gcloud sql databases create awa_db --instance=awa-research-sql

gcloud sql users create awa_app --instance=awa-research-sql --password=HASLO_BAZY
```

Zamień `HASLO_BAZY` na hasło z `setup.env`.

**4c. Pobierz adres IP instancji** (potrzebny do `DATABASE_URL`):

```powershell
gcloud sql instances describe awa-research-sql --format="value(ipAddresses[0].ipAddress)"
```

Zapisz ten adres (np. `10.x.x.x` lub adres publiczny). Pełny connection string:

```text
postgresql://awa_app:HASLO_BAZY@ADRES_IP:5432/awa_db
```

**4d. Załaduj schemat tabel (tabele badawcze AWA):**

**Opcja A – w konsoli GCP (najprostsza):**

1. Wejdź w [Google Cloud Console](https://console.cloud.google.com) → **SQL** → kliknij instancję **awa-research-sql**.
2. W menu po lewej wybierz **Cloud Shell** (ikona terminala u góry) albo użyj przycisku **„Connect”** przy instancji.
3. Jeśli pojawi się opcja **„Open Cloud Shell”** i połączenie z bazą – w edytorze zapytań wklej **całą** zawartość pliku **`infra/gcp/sql/01_research_schema.sql`** (z repozytorium) i wykonaj.

**Opcja B – Cloud Shell + psql:**

1. W konsoli GCP uruchom **Cloud Shell** (ikona terminala).
2. W Cloud Shell możesz połączyć się z bazą przez proxy. Najpierw pobierz plik schematu (jeśli masz repo w Cloud Shell) albo wklej jego zawartość do pliku, np. `schema.sql`.
3. Połącz się z bazą (konsola często podaje gotową komendę „Connect using Cloud Shell”) i wykonaj: `\i schema.sql` lub wklej treść pliku i wykonaj.

**Opcja C – z własnego komputera (psql + Cloud SQL Proxy):**

```powershell
# Uruchom Cloud SQL Proxy w osobnym oknie (pobierz z Google, np. cloud-sql-proxy.exe)
# ./cloud-sql-proxy PROJECT_ID:europe-west4:awa-research-sql

# W katalogu projektu AWA
Get-Content infra\gcp\sql\01_research_schema.sql | psql "postgresql://awa_app:HASLO_BAZY@127.0.0.1:5432/awa_db"
```

Plik schematu: **`infra/gcp/sql/01_research_schema.sql`** w Twoim repozytorium.

---

## Krok 5: Utwórz bucket Cloud Storage na obrazy

```powershell
# Zamień TWOJ_PROJECT_ID na np. awa-badania-2025
$BUCKET = "awa-research-images-" + $env:PROJECT_ID
gsutil mb -l europe-west4 "gs://$BUCKET"
```

Jeśli nie masz `PROJECT_ID` w zmiennej środowiskowej:

```powershell
gsutil mb -l europe-west4 gs://awa-research-images-TWOJ_PROJECT_ID
```

Zapisz nazwę bucketa – przyda się jako `GCS_IMAGES_BUCKET` w backendzie.

---

## Krok 6: Konto serwisowe dla backendu (Cloud Run)

```powershell
gcloud iam service-accounts create awa-backend --display-name="AWA Backend Service"
```

Nadaj uprawnienia (zamień `TWOJ_PROJECT_ID` i `NAZWA_BUCKETA`):

```powershell
$PROJECT_ID = "TWOJ_PROJECT_ID"
$SA = "awa-backend@$PROJECT_ID.iam.gserviceaccount.com"

gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:$SA" --role="roles/cloudsql.client"
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:$SA" --role="roles/storage.objectAdmin"
gcloud projects add-iam-policy-binding $PROJECT_ID --member="serviceAccount:$SA" --role="roles/aiplatform.user"
```

---

## Krok 7: Wdrożenie backendu na Cloud Run

Z katalogu **głównego repozytorium AWA** (tam gdzie jest `apps/backend-gcp`):

```powershell
cd apps/backend-gcp
```

Przed pierwszym deployem zbuduj projekt:

```powershell
npm install
npm run build
```

Następnie (zamień placeholdery na swoje wartości):

```powershell
$PROJECT_ID = "TWOJ_PROJECT_ID"
$REGION = "europe-west4"
$SA = "awa-backend@$PROJECT_ID.iam.gserviceaccount.com"
$DATABASE_URL = "postgresql://awa_app:HASLO_BAZY@ADRES_IP_SQL:5432/awa_db"
$BUCKET = "awa-research-images-TWOJ_PROJECT_ID"

gcloud run deploy awa-backend-api --source=. --project=$PROJECT_ID --region=$REGION --service-account=$SA --allow-unauthenticated --set-env-vars="DATABASE_URL=$DATABASE_URL,GCS_IMAGES_BUCKET=$BUCKET"
```

Po wdrożeniu konsola pokaże **URL usługi** (np. `https://awa-backend-api-xxxxx-ew.a.run.app`). Ten adres ustaw we frontendzie jako **`NEXT_PUBLIC_GCP_API_BASE_URL`**.

**Jeśli build się nie powiedzie:** w [Cloud Console](https://console.cloud.google.com) → **Cloud Build** → **History** otwórz ostatni build i sprawdź logi (np. błąd TypeScript, brak uprawnień, problem z Dockerfile). Backend używa `Dockerfile` w `apps/backend-gcp` (build TypeScript w obrazie). Możesz też zbudować lokalnie: `docker build -t test .` w `apps/backend-gcp` (wymaga Dockera).

---

## Krok 8: Budżet i alerty (ochrona kredytów EDU)

```powershell
gcloud beta billing budgets create --billing-account=BILLING_ACCOUNT --display-name=awa-edu-budget --budget-filter-projects=projects/TWOJ_PROJECT_ID --amount-specified-amount-currency-code=USD --amount-specified-amount-units=100 --threshold-rules=percent=50 --threshold-rules=percent=75 --threshold-rules=percent=90
```

Zamień `BILLING_ACCOUNT` i `TWOJ_PROJECT_ID`. Kwotę (100 USD) dostosuj do wielkości kredytów. Powiadomienia (e-mail) ustawisz w konsoli w **Billing → Budgets & alerts**.

---

## Krok 9: Zmienne dla aplikacji

**Backend (Cloud Run)** – ustawiane przy deployu (Krok 7):

- `DATABASE_URL` – connection string do Cloud SQL  
- `GCS_IMAGES_BUCKET` – nazwa bucketa na obrazy  

**Frontend** (np. w `apps/frontend/.env.local`):

- `NEXT_PUBLIC_GCP_API_BASE_URL` – URL usługi Cloud Run (np. `https://awa-backend-api-xxxxx-ew.a.run.app`)  
- `NEXT_PUBLIC_GCP_PERSISTENCE_MODE=primary` – włącza tryb GCP (credits, spaces, uczestnicy, ankiety) zamiast Supabase.  
- Zmienne Google/Vertex (np. `GOOGLE_CLOUD_PROJECT`, `GOOGLE_AI_API_KEY`, credentials) – tak jak dziś w `lib/google-ai/client.ts`.

**Logowanie bezpośrednio przez Google (bez Supabase):** żeby nie używać Supabase do auth i uniknąć quota, ustaw w `.env.local`:
- `NEXT_PUBLIC_USE_GOOGLE_NATIVE_AUTH=1`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID=...` (OAuth 2.0 Client ID z GCP Console → APIs & Services → Credentials → Create → OAuth 2.0 Client ID, typ Web application; w origins dodaj `http://localhost:3000`, `https://www.project-ida.com`, ewentualnie `https://project-ida.com`).

Szczegóły i flow: **`docs/migration/auth-google-native.md`**.

**Jeśli nadal używasz Supabase OAuth:** przy stronie z quota wejdź w [Supabase Dashboard](https://supabase.com/dashboard) → projekt → **Authentication** → **Providers** → Google i sprawdź limit MAU / plan.

---

## Skrypt łączony (maksymalne odciążenie)

W folderze **`infra/gcp/`** jest skrypt **`uruchom-setup.ps1`**. Użycie:

1. Skopiuj **`setup.env.example`** do **`setup.env`** i uzupełnij wszystkie zmienne.
2. W PowerShell, z katalogu `infra/gcp/`:

```powershell
.\uruchom-setup.ps1
```

Skrypt wykona kroki 3–6 (API, Cloud SQL, bucket, konto serwisowe). **Krok 4d** (import schematu SQL) oraz **Krok 7** (deploy backendu) musisz zrobić samodzielnie – w instrukcji powyżej masz dokładne komendy.

---

## Szybka ściągawka – co gdzie

| Co | Gdzie / komenda |
|----|------------------|
| Projekt GCP | Konsola → wybór projektu; `gcloud config set project ID` |
| Kredyty EDU | Billing → Manage billing accounts |
| Baza danych | Cloud SQL → instancja `awa-research-sql`, baza `awa_db` |
| Obrazy | Cloud Storage → bucket `awa-research-images-*` |
| Backend API | Cloud Run → usługa `awa-backend-api` |
| Schemat tabel | `01_research_schema.sql` + `02_credits_billing.sql` – wykonaj na bazie `awa_db` (credits/subscriptions/webhook) |

Jeśli coś nie zadziała (np. brak uprawnień, błąd API), sprawdź: czy projekt ma podpięty billing, czy włączone są wymagane API i czy w komendach wszędzie wstawiłeś swoje `PROJECT_ID`, `BILLING_ACCOUNT` i hasło.
