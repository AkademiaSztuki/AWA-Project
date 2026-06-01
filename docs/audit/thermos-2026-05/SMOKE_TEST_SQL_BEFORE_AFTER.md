# Smoke test SQL — stan PRZED i PO przejściu flow

> **Skrót:** Uruchom zapytania **A** na świeżym uczestniku (incognito), przejdź flow z checklisty, potem te same zapytania **B** i porównaj z tabelą oczekiwań na końcu dokumentu.

Powiązane: [SMOKE_TEST.md](./SMOKE_TEST.md) (kroki UX w przeglądarce).

---

## Co będziesz robić (3 kroki)

1. **PRZED** — skopiuj `userHash` z przeglądarki, wklej do zapytań A, uruchom w Cloud SQL → zapisz wyniki (screenshot lub notatka).
2. **W TRAKCIE** — przejdź flow według checklisty poniżej; obserwuj Network (status 200 na API GCP).
3. **PO** — uruchom te same zapytania B, porównaj z tabelą „Oczekiwania” — puste lub zerowe tam, gdzie powinny być dane = problem do zgłoszenia.

---

## Wymagania wstępne

| Element | Opis |
|--------|------|
| **Baza** | Cloud SQL (PostgreSQL), baza np. `awa_db` — migracje z `infra/gcp/sql/` (w tym `12_participant_research_events.sql`, `14_session_export_json.sql`, `15_anon_usage.sql`). |
| **Dostęp** | [Google Cloud Console](https://console.cloud.google.com/sql) → instancja → **Cloud SQL Studio** / Query, **albo** lokalnie: `infra/gcp/scripts/cloud-sql-connect.ps1` (wymaga `gcloud` + `psql`). |
| **Środowisko app** | Staging/produkcja z ustawionym `NEXT_PUBLIC_GCP_API_BASE_URL`; **nie** ustawiaj `NEXT_PUBLIC_DISABLE_SESSION_SYNC=1`. |
| **Identyfikator testu** | `user_hash` — patrz sekcja poniżej. |

### Jak uzyskać `userHash`

1. Otwórz aplikację w **oknie incognito** (nowy uczestnik).
2. DevTools → **Application** → **Local Storage** → domena aplikacji.
3. Klucz `aura_session` → pole JSON **`userHash`** (np. `user_…`).
4. Skopiuj wartość i we wszystkich zapytaniach zamień `'WKLEJ_USER_HASH'` na ten literał (w apostrofach).

Alternatywa: jeśli znasz tylko e-mail po logowaniu Google, w SQL: `SELECT user_hash FROM participants WHERE auth_user_id = '…';`

### Opcjonalny filtr czasu (ostatnia godzina)

Jeśli w bazie jest dużo danych, do podglądu „świeżych” wierszy możesz dodać:

```sql
AND updated_at > NOW() - INTERVAL '1 hour'
```

(dostosuj nazwę kolumny: `created_at`, `swipe_timestamp`, `started_at` itd.)

### Anon cookie (tabele `aura_anon_*`)

Te tabele **nie** używają `user_hash`, tylko identyfikator sesji anonimowej:

- DevTools → **Application** → **Cookies** → cookie **`aura_anon_sid`**.
- W zapytaniach anon zamień `'WKLEJ_ANON_SID'` na wartość cookie.

---

## Zestaw A — PRZED flow (baseline)

Uruchom **przed** zgodą / swipami / generacją. Dla zupełnie nowej sesji incognito wiele wyników będzie **0 wierszy** lub **NULL** — to jest OK.

### A1. Uczestnik (`participants`)

```sql
SELECT
  user_hash,
  path_type,
  consent_timestamp,
  current_step,
  session_export_json IS NOT NULL AS has_session_export,
  jsonb_typeof(session_export_json) AS export_json_type,
  free_grant_used,
  free_grant_used_at,
  updated_at
FROM participants
WHERE user_hash = 'WKLEJ_USER_HASH';
```

**Oczekiwane PRZED:** brak wiersza **albo** wiersz bez `consent_timestamp`, `has_session_export = false`, `free_grant_used` false/null (dopóki nie było grant-free po OAuth).

### A2. Liczniki powiązane z `user_hash`

```sql
SELECT 'participant_swipes' AS tabela, COUNT(*)::int AS liczba
FROM participant_swipes WHERE user_hash = 'WKLEJ_USER_HASH'
UNION ALL
SELECT 'participant_generations', COUNT(*)::int
FROM participant_generations WHERE user_hash = 'WKLEJ_USER_HASH'
UNION ALL
SELECT 'participant_research_events', COUNT(*)::int
FROM participant_research_events WHERE user_hash = 'WKLEJ_USER_HASH'
UNION ALL
SELECT 'credit_transactions', COUNT(*)::int
FROM credit_transactions WHERE user_hash = 'WKLEJ_USER_HASH';
```

**Oczekiwane PRZED:** same zera (nowy uczestnik).

### A3. Ostatnie zdarzenia badawcze (podgląd)

```sql
SELECT event_type, created_at
FROM participant_research_events
WHERE user_hash = 'WKLEJ_USER_HASH'
ORDER BY created_at DESC
LIMIT 10;
```

**Oczekiwane PRZED:** 0 wierszy.

### A4. Anon — użycie ścieżki (cookie `aura_anon_sid`)

```sql
SELECT anon_session_id, path_scope, usage_count, first_used_at, updated_at
FROM aura_anon_path_usage
WHERE anon_session_id = 'WKLEJ_ANON_SID';
```

**Oczekiwane PRZED:** brak wierszy lub `usage_count = 0` (jeszcze bez generacji anon).

### A5. Anon — limit IP (informacyjnie)

Bez znajomości `ip_hash` trudno filtrować po uczestniku. Po teście anon możesz sprawdzić ostatnie wpisy:

```sql
SELECT ip_hash, window_start, count, updated_at
FROM aura_anon_ip_rate
ORDER BY updated_at DESC
LIMIT 5;
```

---

## Checklist — kroki flow i co **powinno** trafić do DB

Zaznaczaj w trakcie testu. Kolumna „Tabela” to miejsce, gdzie szukasz efektu po `user_hash` (chyba że zaznaczono inaczej).

| Krok | Akcja w UI | Oczekiwany zapis | Tabela / pole |
|------|------------|------------------|---------------|
| 1 | **Zgoda badawcza** (checkbox + art. 13) | Zapis profilu / sesji | `participants.consent_timestamp` **NOT NULL** |
| 2 | Nawigacja, page views | Zdarzenia behawioralne | `participant_research_events` (`page_view_start`, `page_view_end`, …) |
| 3 | **Swipe** (Tinder / DNA) | Każdy swipe | `participant_swipes` (+1 wiersz na swipe) |
| 4 | **Generacja** obrazu | Job generacji | `participant_generations` (+1 wiersz; status `finished` po sukcesie) |
| 4b | Generacja **anon** (ścieżka fast, bez logowania) | Limit 1× na `path_scope` | `aura_anon_path_usage.usage_count` ≥ 1; druga próba → **429** w API |
| 4c | Generacja anon (deduplikacja) | Idempotencja | `aura_anon_generation_dedup` (opcjonalnie, po stronie backendu) |
| 4d | Limit IP (anon) | Licznik 24h | `aura_anon_ip_rate.count` rośnie (hash IP — bez `user_hash`) |
| 5 | **Thanks** — eksport sesji | JSON jak „Pobierz dane” | `participants.session_export_json` **niepuste** (JSONB) |
| 6 | **OAuth + grant-free** (opcjonalnie) | Jednorazowe 600 kredytów | `participants.free_grant_used = true`, wiersze w `credit_transactions` (`type` grant / free) |

**Nie zapisuje się do Cloud SQL (tylko przeglądarka):** większość pól w `localStorage` (`aura_session`) do momentu syncu; przy wyłączonym sync (`NEXT_PUBLIC_DISABLE_SESSION_SYNC=1`) profil w `participants` **nie** będzie się aktualizował.

---

## Zestaw B — PO flow (te same zapytania)

Uruchom ponownie **A1–A4** (i opcjonalnie A5). Porównaj liczby i flagi z baseline.

### B1. Szybki diff liczników

```sql
-- Uruchom PO flow; porównaj z wynikiem A2 zapisanym PRZED
SELECT 'participant_swipes' AS tabela, COUNT(*)::int AS liczba
FROM participant_swipes WHERE user_hash = 'WKLEJ_USER_HASH'
UNION ALL
SELECT 'participant_generations', COUNT(*)::int
FROM participant_generations WHERE user_hash = 'WKLEJ_USER_HASH'
UNION ALL
SELECT 'participant_research_events', COUNT(*)::int
FROM participant_research_events WHERE user_hash = 'WKLEJ_USER_HASH';
```

### B2. Eksport sesji (Thanks)

```sql
SELECT
  user_hash,
  consent_timestamp,
  session_export_json IS NOT NULL AS has_export,
  length(session_export_json::text) AS export_chars
FROM participants
WHERE user_hash = 'WKLEJ_USER_HASH';
```

**Oczekiwane PO pełnym flow do Thanks:** `has_export = true`, `export_chars` > 2 (nie `{}`).

### B3. Ostatnie generacje i swipy (szczegóły)

```sql
SELECT id, job_type, status, started_at, finished_at
FROM participant_generations
WHERE user_hash = 'WKLEJ_USER_HASH'
ORDER BY started_at DESC
LIMIT 10;

SELECT image_id, direction, swipe_timestamp
FROM participant_swipes
WHERE user_hash = 'WKLEJ_USER_HASH'
ORDER BY swipe_timestamp DESC
LIMIT 10;
```

### B4. Kredyty (tylko po OAuth / płatnościach)

```sql
SELECT type, amount, source, created_at
FROM credit_transactions
WHERE user_hash = 'WKLEJ_USER_HASH'
ORDER BY created_at DESC
LIMIT 20;
```

---

## Tabela oczekiwań — PRZED vs PO

| Obszar | Kolumna / miara | PRZED (nowy incognito) | PO (po smoke flow) | Jeśli pusto / zero = problem |
|--------|-----------------|------------------------|---------------------|-------------------------------|
| Uczestnik | `participants` wiersz | Brak lub bez zgody | Wiersz istnieje | Brak wiersza po kilku krokach |
| Zgoda | `consent_timestamp` | NULL | Ustawiona data | NULL po akceptacji zgody |
| Eksport | `session_export_json` | NULL / false | JSONB wypełnione | NULL po ekranie Thanks |
| Swipy | `COUNT(*)` swipes | 0 | ≥ 1 jeśli był swipe | 0 po swipe |
| Generacje | `COUNT(*)` generations | 0 | ≥ 1 jeśli była generacja | 0 po generacji |
| Zdarzenia | `COUNT(*)` research_events | 0 | Rośnie przy nawigacji | 0 po wielu stronach |
| Anon ścieżka | `aura_anon_path_usage.usage_count` | 0 / brak wiersza | ≥ 1 po anon generate | Brak wzrostu po udanej generacji anon |
| Grant | `free_grant_used` | false/null | true po grant-free | false po udanym grant-free |
| Kredyty | `credit_transactions` | 0 wierszy | ≥ 1 po grant / zakupie | 0 po grant-free |
| IP anon | `aura_anon_ip_rate` | — | Może rosnąć globalnie | — (trudne per user; patrz A5) |

---

## Źródło zapytań (rozszerzone)

Pełniejszy zestaw kontrolny (matrix, obrazy, Big Five): [docs/gcp-data-verification/verification-queries.sql](../../gcp-data-verification/verification-queries.sql) — zamień `:user_hash` na `'WKLEJ_USER_HASH'`.

---

## Typowe problemy

| Objaw | Co sprawdzić |
|-------|----------------|
| Wszystko 0, Network OK | `NEXT_PUBLIC_DISABLE_SESSION_SYNC` — musi być wyłączone |
| Brak `user_hash` w logach backendu | `aura_session` w localStorage; inicjalizacja sesji |
| `session_export_json` NULL po Thanks | migracja `14_session_export_json.sql`; błąd w konsoli `[ThanksScreen] session_export_json save failed` |
| Anon 429 od razu | stary cookie `aura_anon_sid` — wyczyść cookies lub nowe incognito |
| `participant_research_events` puste | endpoint `POST /api/research/events`; filtr adblock / CORS |

---

*Dokument: audyt Thermos 2026-05 — weryfikacja zapisu Cloud SQL dla badacza bez doświadczenia DBA.*
