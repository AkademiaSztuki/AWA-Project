# Gdzie szukać rozmów Cursor (lokalnie)

Dokument pomocniczy do `HISTORIA_PROJEKTU_Z_ROZMOW_AGENTOW.md`. Odczyt z dysku użytkownika **JakubPalka**, 2026-10-01 (aktualizacja po skanie backupów).

## Dwa różne magazyny

| Typ | Gdzie szukać | Format | Zakres lokalny (ten PC) |
|-----|----------------|--------|-------------------------|
| **Transkrypty agenta (pełne JSONL)** | `C:\Users\JakubPalka\.cursor\projects\c-Users-JakubPalka-Desktop-AWA-Project\agent-transcripts\` | `{uuid}\{uuid}.jsonl` | **164** wątków, mtime **2026-03-05 … 2026-10-01** |
| | `…\c-Users-JakubPalka-Desktop-AWA-Project-docs-thesis\agent-transcripts\` | j.w. | **4** wątki, **2026-10-01** |
| | `…\c-Users-JakubPalka-Desktop-AWA-Project-docs-thesis-thesis-code-workspace\agent-transcripts\` | j.w. | **1** wątek, **2026-10-01** |
| **Sidebar (tytuły, „1y”) + wyszukiwarka** | `C:\Users\JakubPalka\AppData\Roaming\Cursor\User\globalStorage\conversation-search.db` (+ przy otwartym Cursorze: `.db-wal`, `.db-shm`) | SQLite: `conversations` (`fts_rowid` → `conversation_fts.rowid`), FTS: `title`, `body`, `branches` | **880** wierszy; `updated_at` **2025-07-07 … 2026-10-01**; **741** `source=local`, **139** `cloud-cache`; **~355** wątków AWA/IDA (heurystyka score ≥ 9) |
| **Backup stanu UI (nie historia czatu)** | `…\globalStorage\state.vscdb.backup` | SQLite VS Code | metadane rozszerzeń — **nie** dodatkowe rozmowy względem `conversation-search.db` |
| **Stan UI / workspace (nie pełna historia)** | `AppData\Roaming\Cursor\User\workspaceStorage\27dbc8d094106f362ed4898be8915bd5\` → folder AWA (`workspace.json`: `AWA-Project`) | `state.vscdb`, `anysphere.cursor-retrieval\` | metadane paneli Composer, indeks plików — **nie** zamiennik transkryptów |
| | `…\workspaceStorage\5aa6e4feeeb7478cf852804873beff57\` → `thesis.code-workspace` | j.w. | jak wyżej |
| **Runtime Electron** | `C:\Users\JakubPalka\AppData\Local\Cursor\` | gł. `AgentStores\` | na tym PC brak czytelnego `User Data\…\IndexedDB` z historią czatu — **nie** używać jako magazynu rozmów |
| **Snapshoty / backup edytora** | `Roaming\Cursor\snapshots\state\state.db`, `Roaming\Cursor\Backups\` | SQLite / pliki | autosave UI i planów — **nie** FTS rozmów |
| **Śledzenie kodu** | `C:\Users\JakubPalka\.cursor\ai-tracking\ai-code-tracking.db` | SQLite | metryki edycji — **nie** transkrypty |

**Wniosek:** rozmowy z etykietą **„1y”** (np. „Futurystyczna asystentka”, „Wyślij zmiany na githuba”) są **lokalnie w indeksie** `conversation-search.db`, ale **nie** mają plików w `agent-transcripts` (np. UUID `41da62f6-…` → brak podfolderu z JSONL). Pełna treść starszych wątków często wymaga **otwarcia w UI Cursor** (konto + sieć); FTS ma skrócony `body` (średnio **~24 KB** dla `source=local`, **~5 KB** dla `cloud-cache`), nie pełny zapis agentowy.

## Archiwa i synchronizacja (lokal / cloud-cache)

Skan dysku (read-only, **2026-10-01**): kanoniczny indeks to `conversation-search.db` (**~63 MB** + WAL **~9,5 MB** przy otwartym Cursorze). Tabela `conversations` ma m.in. pola: `source`, `scope`, `id`, `title`, `branches`, `updated_at`, `is_archived`, `root_fingerprint`, `cache_fingerprint`. Powiązanie z treścią: `conversations.fts_rowid` → `conversation_fts` (kolumny `title`, `body`, `branches`). Dodatkowe tabele techniczne: `conversation_search_candidates`, `conversation_search_reconciliation`, `conversation_search_settings` — synchronizacja/indeks, nie osobny magazyn „drugiej kopii” czatu do ręcznego eksportu.

| `source` | Liczba wpisów (ten PC) | `scope` | Średnia długość `body` w FTS | Interpretacja |
|----------|------------------------|---------|------------------------------|---------------|
| **local** | **741** | puste (`''`) | **~23,6 KB** | indeks zapisany lokalnie; tytuł + fragment rozmowy; główne źródło wyszukiwarki „1y” |
| **cloud-cache** | **139** | hash workspace (`50dcd398…`) | **~4,8 KB** | **metadane + skrót** wątków zsynchronizowanych z konta Cursor; `id` często z prefiksem `bc-` (np. `bc-bd5f2d81-…`); **nie** zastępuje pełnego JSONL agenta |

**Lokal vs chmura (bez publicznego API eksportu):** Cursor nie udostępnia w tej instalacji jawnego API „pobierz całą historię”. Lokalnie masz: (1) indeks FTS, (2) transkrypty agenta od ~03/2026 w `.cursor/projects/…/agent-transcripts/`, (3) wpisy `cloud-cache` jako **podgrzany cache** tytułów/skrótów po sync. Otwarcie wątku w panelu czatu może **dociągnąć** treść z usługi online — przy braku sieci starszy wątek może być niedostępny mimo tytułu w DB. **139** wpisów `cloud-cache` to **wyłącznie** ten typ (brak duplikatu jako `local` z tym samym UUID); ok. **21** z nich pasuje heurystyką AWA/IDA (score ≥ 5), m.in. wątki o branchu `pisemna`, share/referral — nie są to „utracone” wątki AWA, lecz **wariant indeksu** po synchronizacji.

| Magazyn | Czy backup „wchodzi cały czas”? | Zawartość względem rozmów |
|---------|-----------------------------------|---------------------------|
| `conversation-search.db` (+ WAL) | tak — przy pracy Cursor | **główny** lokalny indeks; kopiuj plik do `%TEMP%` przy zamkniętym Cursorze |
| `state.vscdb.backup` (global + workspace) | okresowo | metadane VS Code/Cursor — **nie** dodatkowe rozmowy |
| `Backups\` pod Roaming | autosave edytora | fragmenty plików / plan — **nie** historia czatu |
| `snapshots/state/state.db` | mały, częsty zapis | stan snapshotów — **nie** FTS rozmów |
| `agent-transcripts\{uuid}\` | przy sesjach agenta | **najpełniejszy** lokalny zapis od ~03/2026 dla danego workspace |

**Rekomendacja eksportu (doktorat / `HISTORIA`):**

1. **Wątki z JSONL:** skopiuj cały folder `agent-transcripts` dla workspace AWA + thesis (read-only archiwum).
2. **Wątki tylko w FTS (2025–02/2026):** w UI Cursor otwórz po `id` z SQL → ręczny zapis do `notes/drafts/transcripts/{uuid}-{slug}.md` (wzór: istniejące 50 eksportów).
3. **Indeks masowy:** `Copy-Item` `conversation-search.db` → `%TEMP%` → zapytania SQL (tytuł, data, `source`, `LENGTH(body)`); dołącz do `HISTORIA` jako tabela UUID, nie jako treść merytoryczna.
4. **Cloud-cache:** traktuj jako **spis uzupełniający** i przypomnienie tytułów po sync; przy ważnym wątku z `bc-…` i tak wykonaj eksport z UI lub JSONL, jeśli istnieje.
5. **Nie polegaj** na `Backups\`, `state.vscdb.backup` ani `ai-code-tracking.db` jako na historii decyzji projektu.

## Jak wyeksportować / otworzyć stare rozmowy

1. **Cursor → wyszukiwarka rozmów** (Search w panelu historii): frazy z tytułu — trafiają w `conversation_fts`.
2. **Kliknąć wątek** — treść ładuje się z usługi Cursor (przy braku sieci starsze wątki mogą być niedostępne mimo tytułu w indeksie).
3. **Ręcznie:** zaznaczenie całości w panelu czatu → kopiuj do `notes/drafts/` lub nowego `.jsonl`.
4. **Indeks tylko (tytuły + fragmenty):** read-only SQL na kopii `conversation-search.db` (zalecane: Cursor zamknięty lub `Copy-Item` do `%TEMP%`) — join: `conversations.fts_rowid = conversation_fts.rowid` — **nie** zastępuje pełnego transkryptu agenta.
5. **Eksporty robocze:** `docs/thesis/notes/drafts/transcripts/{uuid}-{slug}.md` — top 50 wątków z FTS (oznaczone gdy body jest skrótem indeksu).

Narzędzie **`SearchConversations`** nie występuje w namespace `cursor` w tej sesji (dostępny jest m.in. `cursor-app-control` / `rename_chat`, bez przeszukiwania historii).

## Uzupełnienie `HISTORIA_PROJEKTU` o okres „1y”

1. W Cursorze wyszukać kluczowe tytuły (github, Aura, asystentka, Modal, FLUX).
2. Dla każdej rozmowy: skopiować treść lub zapisać eksport do `docs/thesis/notes/drafts/transcripts/` z nazwą `{uuid}-{slug}.md`.
3. Z `conversation-search.db` (kopia): `SELECT id, title, datetime(updated_at/1000,'unixepoch') FROM conversations WHERE title LIKE '%…%'` — spis UUID i dat do tabeli w `HISTORIA`.
4. Luki **2024 – wczesna 2025:** `git log`, README, dokumenty repo (jak w sekcji „Ważna luka źródłowa” w HISTORII).

## Ścieżki AWA (skrót)

- Indeks sidebar: `C:\Users\JakubPalka\AppData\Roaming\Cursor\User\globalStorage\conversation-search.db`
- Transkrypty agentów: `C:\Users\JakubPalka\.cursor\projects\c-Users-JakubPalka-Desktop-AWA-Project\agent-transcripts\`
- Workspace hash (root): `27dbc8d094106f362ed4898be8915bd5`
- Workspace hash (thesis): `5aa6e4feeeb7478cf852804873beff57`
