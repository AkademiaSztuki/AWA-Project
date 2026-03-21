# Weryfikacja zapisu danych (Google Cloud SQL + GCS)

Ten katalog zbiera **operacyjny zestaw** do wdrożeniowej kontroli zgodnie z planem projektu: zmienne środowiskowe, endpointy, zapytania SQL, checklisty UX (ścieżka pełna vs szybka) oraz [audyt stubów](stub-audit.md).

**CLI (PowerShell):** połączenie z Cloud SQL i eksport CSV — [CLI.md](CLI.md) oraz skrypty w [`infra/gcp/scripts/`](../../infra/gcp/scripts/).

## 1. Warunki wstępne (env-check)

| Zmienna | Wymagane | Uwagi |
|---------|----------|--------|
| `NEXT_PUBLIC_GCP_API_BASE_URL` | Tak | URL Cloud Run **bez** końcowego `/`. Bez tego `gcpApi` nie wyśle żądań. |
| `NEXT_PUBLIC_DISABLE_SESSION_SYNC` | Nie ustawiać na `1` | Wartość `1` wyłącza `saveFullSessionToSupabase` — **brak zapisu profilu** w `participants`. |
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

## 2. Zapytania SQL (matrix)

Plik: [verification-queries.sql](verification-queries.sql) — kontrole po `user_hash` / `auth_user_id`, kohorty `path_type`, implicit vs explicit.

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
| 5 | `/flow/dna` | `participant_swipes`; po sesji: `implicit_*`, `tinder_*`, ladder |
| 6 | `/flow/photo` | `room_analysis_*`, obrazy `room_photo` w GCS |
| 7 | `/flow/generate` | `participant_generations`, obrazy `generated` w GCS |
| 8 | Ankiety | `POST /api/research/survey` → kolumny ankiet na `participants` |
| 9 | Zgoda | `research_consents` |
| 10 | Dashboard / reload | `fetchLatestSessionSnapshot` zgodny z DB |

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

## 8. Artefakty końcowe (zbiór badawczy)

- Dwa arkusze: sesja **full** + sesja **fast** (zrzuty Network + timestampy).
- Tabela expected vs actual dla kolumn `participants` i powiązanych tabel.
- Decyzja z [stub-audit.md](stub-audit.md).
