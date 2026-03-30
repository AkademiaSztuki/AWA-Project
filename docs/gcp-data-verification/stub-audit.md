# Audyt stubów (frontend → brak zapisu w GCP)

Funkcje w [`apps/frontend/src/lib/gcp-data.ts`](../../apps/frontend/src/lib/gcp-data.ts): **część jest pusta** (legacy / no-op) — wywołanie zwraca sukces lub „nic”, bez INSERT do Cloud SQL.

## Zaimplementowane (Cloud SQL)

| Funkcja | Gdzie trafia |
|---------|----------------|
| `logBehavioralEvent` | `POST /api/research/events` → tabela **`participant_research_events`** (migracja `infra/gcp/sql/12_participant_research_events.sql`) |
| `startPageView` / `endPageView` | Zdarzenia `page_view_start` / `page_view_end` w **`participant_research_events`** |
| `saveImageRatingEvent` | Zdarzenie `image_rating_detail` w **`participant_research_events`** |
| `saveDeviceContext` | Zdarzenie `device_context` w **`participant_research_events`** |
| `getOrCreateProjectId` | Zwraca **`user_hash`** (kompatybilność ze starym nazewnictwem `projectId`) |

[`apps/frontend/src/app/api/log/route.ts`](../../apps/frontend/src/app/api/log/route.ts) akceptuje `userHash` lub `projectId` i wywołuje `logBehavioralEvent`.

## Nadal brak persystencji w bazie (stuby / null)

| Funkcja | Stan | Skutek |
|---------|------|--------|
| `saveDnaSnapshot`, `saveLadderPathRows`, `saveLadderSummary` | no-op | Brak osobnych tabel; DNA/ladder muszą być w `SessionData` → `POST /api/session` → kolumny `participants` (implicit, `ladder_path`, …) |
| `saveGenerationSet`, `saveGeneratedImages` | legacy / null | Stare tabele usunięte; obrazy i joby przez `participant_generations` / GCS |
| `saveTinderSwipes`, `saveTinderExposures`, `saveTinderSwipesDetailed` | no-op | Swipy badawcze: **`saveParticipantSwipes`** → `participant_swipes` |

## Co robić przy weryfikacji

1. Dla każdego zdarzenia z listy stubów: sprawdźcie, czy **ta sama informacja** pojawia się w `participants` (przez `mapSessionDataToParticipant`) albo w tabelach (`participant_swipes`, `participant_generations`, `research_*`).
2. Zdarzenia drobnoziarniste: `SELECT * FROM participant_research_events WHERE user_hash = '…' ORDER BY created_at DESC`.

## Powiązanie z planem

- **Implicit / explicit** w `participants` — nadal ważne; stuby nie zastępują kolumn `implicit_*` / `explicit_*`.
- **Zachowania szczegółowe** (swipy) — są w `participant_swipes` o ile wywoływane jest `saveParticipantSwipes` → GCP.
