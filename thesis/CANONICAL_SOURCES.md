# Kanoniczne źródła dla pisania pracy

AI i autor pracy powinni opierać fakty na poniższej hierarchii. Przy sprzeczności — wyższy poziom wygrywa.

## Hierarchia zaufania

### Poziom 1 — prawda dla pracy

- `thesis/GLOSSARY.md`
- `docs/canon/**`
- `thesis/*.md` (Twoja redakcja)

### Poziom 2 — weryfikacja techniczna (kod)

- `apps/frontend/src/lib/gcp-data.ts` — persistence
- `apps/frontend/src/lib/flow/fast-flow-progress.ts` — ścieżka fast
- `apps/frontend/src/lib/flow/full-flow-progress.ts` — ścieżka full
- `apps/frontend/src/app/o-projecie/page.tsx` — instytucja, zakres badawczy
- `infra/gcp/sql/01_research_schema.sql` — model danych
- `apps/backend-gcp/src/routes/` — API badawcze

### Poziom 3 — pomocnicze (po weryfikacji vs kod)

- `apps/frontend/supabase/RESEARCH_DATA_DICTIONARY.md` — słownik kolumn eksportu
- `DASHBOARD_DATA_INVENTORY.md` — inwentaryzacja pól w flow
- `GENERATION_MATRIX_5_IMAGES.md` — macierz 5 generacji
- `IPIP_QUESTIONNAIRE_FIXES.md` — walidacja kwestionariusza
- `docs/IDA_DIALOGUE_SCRIPT.md` — skrypt dialogów
- `apps/frontend/src/lib/prompt-synthesis/SCORING_AUDIT.md` — audyt scoringu

### Poziom 4 — ZAKAZANE jako źródło faktów

Nie cytować w pracy bez ponownej weryfikacji w kodzie:

| Plik / katalog | Powód |
|----------------|-------|
| `docs/archive/PODSUMOWANIE_PROJEKTU.md` | Stary stack, zła uczelnia |
| `docs/archive/DATA_LINEAGE.md` | Pipeline Modal |
| `docs/archive/DEEP_PERSONALIZATION_README.md` | Legacy stack |
| `docs/archive/COST_ANALYSIS_*.md` | Cennik Modal GPU |
| `docs/archive/**` | Zarchiwizowane (w tym powyższe) |
| `docs/audit/**` | Audyt bezpieczeństwa, nie metodologia |
| `docs/migration/**` | Runbooki migracji |
| `apps/frontend/supabase/**` | Archiwum schematu Supabase |
| `docs/archive/migration/supabase-auth-setup.md` | Supabase auth (legacy) |
| `LOCAL_SETUP.md`, `OAUTH_FIX_NOW.md` | Ops jednorazowy |

Te pliki mogą być w repo, ale są wykluczone z indeksu Cursor (`.cursorignore`).

## Mapowanie rozdział → canon

| Rozdział | Pliki canon |
|----------|-------------|
| Wstęp, kontekst | `institution-and-project.md`, `GLOSSARY.md` |
| Metodologia RTD | `institution-and-project.md`, `user-flow.md` |
| Zmienne i dane | `research-variables.md`, `data-model.md` |
| Narzędzie IDA | `system-overview.md`, `user-flow.md`, `personalization-pipeline.md` |
| Wyniki | `research-variables.md` + eksporty CSV (poza repo) |

## Zasady dla AI

1. Nie wymyślaj cytowań bibliograficznych — używaj `[Autor, rok — DO UZUPEŁNIENIA]`.
2. Twierdzenia o implementacji oznaczaj `[WERYFIKACJA_KOD]` do czasu fact-checku.
3. Instytucja: **Akademia Sztuki w Szczecinie** (nie ASP Warszawa).
4. Produkt: **IDA** (nie Aura jako nazwa produktu).
5. Persistence: **GCP** (nie Supabase / Modal w produkcji).
