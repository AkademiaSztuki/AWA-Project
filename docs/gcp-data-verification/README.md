# Weryfikacja zapisu danych (Google Cloud SQL + GCS)

Ten katalog zbiera **operacyjny zestaw** do wdrożeniowej kontroli zgodnie z planem projektu: zmienne środowiskowe, endpointy, zapytania SQL, checklisty UX (ścieżka pełna vs szybka) oraz [audyt stubów](stub-audit.md).

**CLI (PowerShell):** połączenie z Cloud SQL i eksport CSV — [CLI.md](CLI.md) oraz skrypty w [`infra/gcp/scripts/`](../../infra/gcp/scripts/).

## 1. Warunki wstępne (env-check)

| Zmienna | Wymagane | Uwagi |
|---------|----------|--------|
| `NEXT_PUBLIC_GCP_API_BASE_URL` | Tak | URL Cloud Run **bez** końcowego `/`. Bez tego `gcpApi` nie wyśle żądań. |
| `NEXT_PUBLIC_DISABLE_SESSION_SYNC` | Nie ustawiać na `1` | Wartość `1` wyłącza `saveSessionToGcp` — **brak zapisu profilu** w `participants`. |
| `NEXT_PUBLIC_GCP_PERSISTENCE_MODE` | Zalecane `primary` | Dokumentacja: [apps/frontend/VERCEL_ENV_VARIABLES.md](../../apps/frontend/VERCEL_ENV_VARIABLES.md) |

**Backend (Cloud Run / lokalnie)**

| Zmienna | Uwagi |
|---------|--------|
| `DATABASE_URL` | Połączenie do Cloud SQL |
| `CLOUD_SQL_CONNECTION_NAME` | Opcjonalnie: socket `/cloudsql/...` na Cloud Run |
| `GCS_IMAGES_BUCKET` | Bucket dla uploadów obrazów |

### Szybkie testy HTTP

Z poziomu `apps/frontend` skrypt **sam wczytuje** `.env` i `.env.local` (jak Next.js), więc wystarczy mieć tam `NEXT_PUBLIC_GCP_API_BASE_URL`:

```bash
cd apps/frontend
pnpm verify:gcp-health
```

Ręcznie (bash):

```bash
# Zamień BASE na produkcyjny URL backendu (jak w NEXT_PUBLIC_GCP_API_BASE_URL)
curl -sS "${BASE}/health"
curl -sS "${BASE}/api/debug/participants-auth-column"
```

Oczekiwane: `health` → JSON z `ok: true`; kolumna `auth_user_id` — typ zgodny z migracją (np. `text` po migracji UUID→TEXT).

### Logi Cloud Run

W konsoli GCP: **Cloud Run** → usługa `backend-gcp` → **Logi**.

- Przy starcie: `[db] connection mode: Cloud SQL socket` (gdy używasz socketu) lub tryb TCP z `DATABASE_URL`.
- Przy zapisie sesji: `[participants.session] incoming` z listą `keys` w `participantRow`.

---

## 2. Zapytania SQL (matrix + participants)

Plik: [verification-queries.sql](verification-queries.sql) — kontrole po `user_hash` / `auth_user_id`, kohorty `path_type`, implicit vs explicit, **`participant_matrix_entries`** (zapis po `/flow/generate` w trybie macierzy, sync z frontu).

**Zdarzenia behawioralne:** tabela `participant_research_events` (migracja [`infra/gcp/sql/12_participant_research_events.sql`](../../infra/gcp/sql/12_participant_research_events.sql)), endpoint `POST /api/research/events` — frontend wysyła m.in. `page_view_start` / `page_view_end`, `generation_initial`, `image_rating_detail` przez `logBehavioralEvent` w [`gcp-data.ts`](../../apps/frontend/src/lib/gcp-data.ts).

### Materiały: implicit (Tinder) vs explicit (krok „Materiały”)

| Kolumny | Źródło w aplikacji |
|---------|-------------------|
| `implicit_material_1..3` | `visualDNA.preferences.materials` po Tinderze (ukryte) |
| `explicit_material_1..3` | `colorsAndMaterials.topMaterials` po kroku Sensory „Materiały” |
| `sensory_texture` | Legacy — zapis = zwykle ten sam id co `explicit_material_1` |

Eksport CSV: widok [`optional_view_research_export.sql`](optional_view_research_export.sql) (`v_participants_research_export`).

```sql
-- Porównanie materiałów dla jednego uczestnika
SELECT user_hash,
       implicit_material_1, implicit_material_2, implicit_material_3,
       explicit_material_1, explicit_material_2, explicit_material_3,
       sensory_texture
FROM participants
WHERE user_hash = '<USER_HASH>';

-- Zgodność explicit z JSON eksportu sesji
SELECT user_hash,
       explicit_material_1,
       session_export_json->'colorsAndMaterials'->'topMaterials'->>0 AS export_explicit_material_1
FROM participants
WHERE user_hash = '<USER_HASH>';
```

### Preferencje: Tinder (tagi) vs `/setup/profile` (jawne)

Moduł: [`apps/frontend/src/lib/preferences/preference-comparison-registry.ts`](../../apps/frontend/src/lib/preferences/preference-comparison-registry.ts).

| Kolumny | Znaczenie |
|---------|-----------|
| `preference_comparison_json` | Macierz wymiarów: `implicitCanonical` / `explicitCanonical` / `match` / `matchScore` |
| `style_match` | Zgodność stylu (top implicit vs `explicit_style`) |
| `color_tokens_match_score` | Jaccard tokenów koloru (Tinder vs rozwinięta paleta jawna) |
| `biophilia_match` | Zgodność biofilii 0–3 |
| `nature_metaphor_match` | Zgodność metafory natury |

Migracje: [`infra/gcp/sql/18_preference_comparison.sql`](../../infra/gcp/sql/18_preference_comparison.sql), [`19_participant_swipes_metadata.sql`](../../infra/gcp/sql/19_participant_swipes_metadata.sql) — skrypt [`apply-migrations-18-19.ps1`](../../infra/gcp/scripts/apply-migrations-18-19.ps1).

```sql
SELECT user_hash,
       d->>'id' AS dimension,
       d->>'match' AS match,
       d->'implicitCanonical' AS implicit,
       d->'explicitCanonical' AS explicit
FROM participants,
     jsonb_array_elements(preference_comparison_json->'dimensions') AS d
WHERE user_hash = '<USER_HASH>';
```

### Historia jawnych preferencji (snapshots, migracja 20)

Tabela **`participant_preference_snapshots`** (append-only): nowy wiersz gdy zmieni się hash sygnatury jawnych pól albo przy milestone (`core_profile_complete`, `room_setup_complete`). Zwykły sync po generacji **bez** zmiany jawnych → brak duplikatu.

| Artefakt | Ścieżka |
|----------|---------|
| Migracja tabeli | [`infra/gcp/sql/20_participant_preference_snapshots.sql`](../../infra/gcp/sql/20_participant_preference_snapshots.sql) |
| Skrypt apply | [`infra/gcp/scripts/apply-migrations-20.ps1`](../../infra/gcp/scripts/apply-migrations-20.ps1) |
| Widoki BI | [`docs/gcp-data-verification/sql/20_preference_snapshots_views.sql`](sql/20_preference_snapshots_views.sql) |

```sql
-- Timeline zmian stylu jawnego
SELECT created_at, explicit_style, sensory_light, biophilia_score
FROM v_preference_snapshot_timeline
WHERE user_hash = '<USER_HASH>'
ORDER BY created_at;

-- Porównanie wersji N vs N-1 (macierz w JSON)
SELECT a.created_at,
       a.preference_comparison_json,
       b.preference_comparison_json
FROM participant_preference_snapshots a
JOIN participant_preference_snapshots b ON b.id = (
  SELECT id FROM participant_preference_snapshots
  WHERE user_hash = a.user_hash AND created_at < a.created_at
  ORDER BY created_at DESC
  LIMIT 1
)
WHERE a.user_hash = '<USER_HASH>';
```

Weryfikacja CLI (wymaga Cloud SQL proxy + `HASLO_BAZY` w `.env.local`):

```bash
cd apps/frontend
USER_HASH=user_xxx pnpm verify:preference-snapshots
```

---

## 3. Checklista UX — ścieżka **pełna** (`path_type = 'full'`)

Dla **jednej** sesji testowej zapisz `user_hash` i po każdym kroku: DevTools (sieć → Cloud Run, status 200) oraz odpowiednie zapytanie z `verification-queries.sql`.

| # | Ekran | Co potwierdzić |
|---|--------|----------------|
| 0 | Wybór ścieżki + logowanie | `POST /api/ensure`, `POST .../link-auth`; w `participants`: `path_type = 'full'` |
| 1 | `/setup/profile` (CoreProfileWizard) | Kolumny demografii, explicit, lifestyle, PRS, `current_step`, `core_profile_*` |
| 2 | `/setup/household`, `/setup/room/...` | `room_*`, ewent. `participant_spaces` |
| 3 | `/flow/inspirations` | `inspiration_*`, `participant_images` (type inspiration), obiekty GCS |
| 4 | `/flow/big-five` | `big5_*`, `big5_responses`, `big5_facets` |
| 5 | *(legacy `/flow/dna` removed)* | Tinder / implicit DNA: `CoreProfileWizard` → `participant_swipes` + `implicit_*` on `participants` |
| 6 | `/flow/photo` | `room_analysis_*`, obrazy `room_photo` w GCS |
| 7 | `/flow/generate` | `participant_generations`, obrazy `generated` w GCS; w trybie **6 obrazów**: `participant_matrix_entries` (URL-e http, bez base64 w DB) + w sieci `POST .../matrix/sync` |
| 8 | Ankiety | `POST /api/research/survey` → kolumny ankiet na `participants` |
| 9 | Zgoda | `research_consents` |
| 10 | Dashboard / reload | `fetchSessionSnapshotFromGcp` zgodny z DB |

---

## 4. Checklista UX — ścieżka **szybka** (`path_type = 'fast'`)

Osobna sesja (`user_hash` innym sufiksem). **Nie** oczekuj tych samych wypełnionych kolumn co w pełnej ścieżce — tylko kroków faktycznie odwiedzonych.

| # | Ekran | Co potwierdzić |
|---|--------|----------------|
| 0 | Path selection | `path_type = 'fast'` |
| 1 | `/flow/onboarding` | `POST /api/session` — tylko pola zebranych w onboarding |
| 2 | `/flow/fast-generate` | `participant_generations`, GCS, ewent. ankiety jeśli użytkownik wszedł |
| 3+ | Opcjonalnie ankiety / inne | Jak w pełnej ścieżce |

---

## 5. Jawne vs ukryte preferencje (implicit / explicit)

Zapytania pomocnicze: sekcja „Implicit vs explicit” w [verification-queries.sql](verification-queries.sql). Kolumny są mapowane w [apps/frontend/src/lib/participants-mapper.ts](../../apps/frontend/src/lib/participants-mapper.ts).

---

## 6. Zapis sesji — poprawka wyścigu (race-check)

`useSessionData` zapisuje do GCP po `updateSession` używając **`getSessionStoreSnapshot()`** (zsynchronizowany stan wspólnego store), zamiast `{ ...sessionData, ...updates }` z przestarzałego closure Reacta. Zobacz: [apps/frontend/src/hooks/useSessionData.ts](../../apps/frontend/src/hooks/useSessionData.ts).

---

## 7. Opcjonalny widok SQL (wykresy / eksport)

Jednorazowo w Cloud SQL można utworzyć widok z kolumnami implicit/explicit i ankietami: [optional_view_research_export.sql](optional_view_research_export.sql). Ułatwia eksport do narzędzi BI bez zmiany aplikacji.

---

## 8. Migracje Cloud SQL (deploy)

| Plik SQL | Typ | Kiedy uruchomić |
|----------|-----|-----------------|
| [`15_anon_usage.sql`](../../infra/gcp/sql/15_anon_usage.sql) | DDL | Limity anon — [`run-anon-usage-migration.ps1`](../../infra/gcp/run-anon-usage-migration.ps1) lub pełny `apply-research-migrations.ps1` |
| [`16_backfill_orphan_image_space_ids.sql`](../../infra/gcp/sql/16_backfill_orphan_image_space_ids.sql) | **Backfill danych** (UPDATE) | Po fixie `space_id` w Room Setup / dashboardzie — **nie** w standardowej kolejce DDL |
| [`17_blind_selection_and_dominant_tags.sql`](../../infra/gcp/sql/17_blind_selection_and_dominant_tags.sql) | DDL | Kolumny `blind_selection_made`, `implicit_dominant_tags` na `participants` — **wymagane na deploy** |

### Opcja A — gcloud import (bez lokalnego `psql` / proxy)

```powershell
cd infra\gcp
.\run-blind-dominant-tags-migration.ps1
# lub anon usage:
.\run-anon-usage-migration.ps1
```

Wymaga: `gcloud auth login`, `PROJECT_ID` w `apps/frontend/.env.local`.

### Opcja B — Cloud SQL Auth Proxy + psql

**Okno 1** — proxy:

```powershell
$env:CLOUD_SQL_CONNECTION_NAME = "project-a2c75857-73b0-4982-acf:europe-west4:awa-research-sql"
cd infra\gcp\scripts
.\cloud-sql-proxy.ps1 -ListenPort 15432
```

**Okno 2** — migracje (hasło z `.env.local` → `HASLO_BAZY`):

```powershell
cd infra\gcp\scripts
.\apply-research-migrations.ps1 -Port 15432
# tylko 17 (+ opcjonalny backfill 16 dla jednego user_hash):
.\apply-migrations-16-17.ps1 -Port 15432
.\apply-migrations-16-17.ps1 -Port 15432 -UserHash user_3i8srks2toampv7eptm
```

### Weryfikacja po migracji 17

```powershell
cd apps\frontend
pnpm verify:gcp-health
$env:USER_HASH = "user_3i8srks2toampv7eptm"
pnpm verify:participant-full
```

W SQL: `SELECT blind_selection_made, implicit_dominant_tags FROM participants WHERE user_hash = '...'`.

---

## 9. Artefakty końcowe (zbiór badawczy)

- Dwa arkusze: sesja **full** + sesja **fast** (zrzuty Network + timestampy).
- Tabela expected vs actual dla kolumn `participants` i powiązanych tabel.
- Decyzja z [stub-audit.md](stub-audit.md).
