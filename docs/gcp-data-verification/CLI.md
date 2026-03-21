# Baza Cloud SQL z poziomu CLI (Windows / PowerShell)

**Looker Studio** (wykresy w przeglądarce) **nie ma** oficjalnego CLI do tworzenia raportów — konfigurujesz źródło danych w UI.  
Z **CLI** możesz natomiast: połączyć się z bazą, uruchomić SQL i **wyeksportować CSV**, który potem wrzucisz do Arkuszy Google lub zaimportujesz w Looker Studio.

---

## Projekt GCP (AWA — ten, którego używasz)

W `.env` / zmiennych lokalnych masz np.:

```text
GOOGLE_CLOUD_PROJECT=project-a2c75857-73b0-4982-acf
```

**Ustaw aktywny projekt w `gcloud` (PowerShell):**

```powershell
gcloud config set project project-a2c75857-73b0-4982-acf
gcloud config get-value project
```

**Cloud SQL — *connection name*** (do proxy) ma postać `PROJECT_ID:REGION:INSTANCE_NAME`. Dla tego projektu przykład (region i nazwa instancji **sprawdź** w [Console → SQL](https://console.cloud.google.com/sql/instances?project=project-a2c75857-73b0-4982-acf) → instancja → pole *Connection name*):

```powershell
# Przykład — podmień REGION i INSTANCE jeśli u Ciebie inne niż w infra/README
$env:CLOUD_SQL_CONNECTION_NAME = "project-a2c75857-73b0-4982-acf:europe-west4:awa-research-sql"
```

Lista instancji w tym projekcie:

```powershell
gcloud sql instances list --project=project-a2c75857-73b0-4982-acf
```

---

## Wymagania

- [Google Cloud SDK](https://cloud.google.com/sdk/docs/install) (`gcloud`)
- Konto z dostępem do projektu i Cloud SQL
- Opcja A: **`psql`** (klient PostgreSQL) — np. z [instalacji PostgreSQL](https://www.postgresql.org/download/windows/) lub tylko „Command Line Tools”
- Opcja B (eksport CSV): **Cloud SQL Auth Proxy** — [instrukcja](https://cloud.google.com/sql/docs/postgres/connect-auth-proxy#install)

---

## Nazwa „project-ida” vs ID w konsoli

W GCP **Project name** (np. `project-ida`) to tylko etykieta w UI. **`gcloud` i API używają Project ID** — u Ciebie: `project-a2c75857-73b0-4982-acf`. To się **zgadza** z tym, co masz w CLI; nie muszą być takie same stringi.

---

## Rozwiązywanie problemów (Windows / PowerShell)

### `ERROR: Psql client not found`

`gcloud sql connect` uruchamia lokalny program **`psql`**. Bez niego połączenie się nie uda.

1. Zainstaluj klienta PostgreSQL (jedna z opcji):
   - [Oficjalny installer](https://www.postgresql.org/download/windows/) — zaznacz **Command Line Tools**.
   - Albo `winget` (dostępność pakietów się zmienia): `winget search postgresql`
2. Zamknij i otwórz terminal, sprawdź:

```powershell
psql --version
```

3. Jeśli `psql` jest zainstalowany, ale „nie znaleziono”: dodaj folder `bin` (np. `C:\Program Files\PostgreSQL\16\bin`) do **PATH** w zmiennych środowiskowych Windows.

**Bez instalacji `psql`:** użyj **Cloud Shell** w przeglądarce (ikona `>_` w górnym pasku GCP) — tam `psql` jest dostępny; możesz też użyć samego **Cloud SQL Auth Proxy** + `psql` po zainstalowaniu klienta.

### `The term 'project-a2c75857-73b0-4982-acf:europe-west4:...' is not recognized`

**Connection name** to nie polecenie. W PowerShell **najpierw przypisz go do zmiennej** (w cudzysłowie):

```powershell
$env:CLOUD_SQL_CONNECTION_NAME = "project-a2c75857-73b0-4982-acf:europe-west4:awa-research-sql"
cd infra\gcp\scripts
.\cloud-sql-proxy.ps1
```

Sam tekst z dwukropkami wklejony jako jedna linia **bez** `$env:... = ` PowerShell traktuje jak nazwę komendy — stąd błąd.

---

## 1. Logowanie i projekt

```powershell
gcloud auth login
gcloud auth application-default login
gcloud config set project project-a2c75857-73b0-4982-acf
```

---

## 2. Interaktywna sesja `psql` (bez proxy)

Najprostsza metoda — Google zestawia tunel za Ciebie:

```powershell
cd infra\gcp\scripts
$env:GCP_SQL_INSTANCE_NAME = "awa-research-sql"   # swoja nazwa instancji
.\cloud-sql-connect.ps1
```

Albo ręcznie:

```powershell
gcloud sql connect awa-research-sql --user=awa_app --database=awa_db
```

Podasz hasło użytkownika (np. `awa_app`) przy pierwszym połączeniu. W `psql` możesz wykonywać `SELECT` (np. na `public.participants`).

---

## 3. Tunel Cloud SQL Auth Proxy + eksport CSV (pod „wykresy”)

**Okno 1** — ustaw *connection name* (GCP Console → SQL → instancja → **Connection name**):

```powershell
# Musi byc 1:1 z polem "Connection name" w GCP Console (SQL -> instancja)
$env:CLOUD_SQL_CONNECTION_NAME = "project-a2c75857-73b0-4982-acf:europe-west4:awa-research-sql"
cd infra\gcp\scripts
.\cloud-sql-proxy.ps1
```

Jeśli nie masz `cloud-sql-proxy` w PATH, pobierz plik `.exe` z dokumentacji Google i zapisz jako `infra\gcp\scripts\cloud-sql-proxy.exe`.

**Okno 2** — hasło i eksport:

```powershell
cd infra\gcp\scripts
$env:PGPASSWORD = "HASLO_UZYTKOWNIKA_BAZY"
.\cloud-sql-export-csv.ps1 -OutFile "$HOME\Desktop\participants-export.csv"
```

Plik CSV otwierasz w **Excel / Arkusze Google** (wykresy) albo **File → Import** w Looker Studio jako źródło „Upload” / później połączenie bezpośrednie z PostgreSQL.

---

## 4. Skrypty w repozytorium

| Plik | Rola |
|------|------|
| [`infra/gcp/scripts/cloud-sql-connect.ps1`](../../infra/gcp/scripts/cloud-sql-connect.ps1) | `gcloud sql connect` — interaktywne `psql` |
| [`infra/gcp/scripts/cloud-sql-proxy.ps1`](../../infra/gcp/scripts/cloud-sql-proxy.ps1) | Tunel localhost → Cloud SQL |
| [`infra/gcp/scripts/cloud-sql-export-csv.ps1`](../../infra/gcp/scripts/cloud-sql-export-csv.ps1) | `\copy` z `participants` do CSV |

---

## 5. Looker Studio bez CLI (dla porównania)

Żeby wykresy były **na żywo** z bazą: Looker Studio → nowe źródło → **PostgreSQL** → host (publiczny IP instancji lub połączenie przez proxy w sieci), lub najpierw **BigQuery** + replikacja danych.  
CLI służy tu głównie do **weryfikacji** i **eksportu**; raport nadal tworzysz w UI.

---

## 6. Backend health (API, nie baza)

```powershell
cd apps\frontend
pnpm verify:gcp-health
```

Sprawdza Cloud Run (`/health`), nie zawartość tabel.
