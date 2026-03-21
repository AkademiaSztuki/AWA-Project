# Audyt stubów (frontend → brak zapisu w GCP)

Funkcje w [`apps/frontend/src/lib/gcp-data.ts`](../../apps/frontend/src/lib/gcp-data.ts): **część jest pusta** (legacy / no-op) — wywołanie zwraca sukces lub „nic”, bez INSERT do Cloud SQL.

## Brak persystencji w bazie

| Funkcja | Stan | Skutek |
|---------|------|--------|
| `logBehavioralEvent` | no-op | [`apps/frontend/src/app/api/log/route.ts`](../../apps/frontend/src/app/api/log/route.ts) zwraca `success: true` — **brak tabeli zdarzeń** |
| `saveDnaSnapshot`, `saveLadderPathRows`, `saveLadderSummary` | no-op | Brak osobnych tabel; DNA/ladder muszą być w `SessionData` → `POST /api/session` → kolumny `participants` (implicit, `ladder_path`, …) |
| `saveImageRatingEvent` | no-op | Oceny w `generate` / `fast-generate` **nie** trafiają do dedykowanej tabeli, chyba że zmapujecie je do `SessionData` / innej tabeli później |
| `startPageView` / `endPageView` | no-op | Brak telemetrii page views w DB |
| `saveGenerationSet`, `saveGeneratedImages`, `getOrCreateProjectId` | legacy / null | Nie używać `projectId` jako klucza badawczego |

## Co robić przy weryfikacji

1. Dla każdego zdarzenia z powyższej listy: sprawdźcie, czy **ta sama informacja** pojawia się w `participants` (przez `mapSessionDataToParticipant`) albo w tabelach (`participant_swipes`, `participant_generations`, `research_*`).
2. Jeśli **nie** — dane badawcze są **niezapisane**; przed zbiorem danych: albo akceptujecie brak, albo implementujecie zapis (np. rozszerzenie `POST /api/session` lub nowa tabela).

## Powiązanie z planem

- **Implicit / explicit** w `participants` — nadal ważne; stuby nie zastępują kolumn `implicit_*` / `explicit_*`.
- **Zachowania szczegółowe** (swipy) — są w `participant_swipes` o ile wywoływane jest `saveParticipantSwipes` → GCP.
