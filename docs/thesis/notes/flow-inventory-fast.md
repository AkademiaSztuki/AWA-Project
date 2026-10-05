# Inwentarz wizualny — ścieżka szybka IDA (Fast path)

**Źródło:** [https://www.project-ida.com/](https://www.project-ida.com/)  
**Viewport zrzutów:** 1440×900 (Playwright, `scripts/capture-fast-flow.mjs`)  
**Data rejestracji:** 2026-10-04  
**Uwaga:** bez danych uczestnika; demografia przykładowa (25–34, kobieta, licencjat, Polska); zdjęcie — **Przykład 1**; styl — **Skandynawski**.

## Kolejność kroków (logika produktu)

Landing → wybór ścieżki → onboarding (zgoda + demografia) → upload pokoju → wybór stylu → generacja → wynik (+ modal konta) → powrót do wyboru ścieżki z `fast_completed=true`.

---

## Pliki (katalog)

| # | Plik | URL (typowy) |
|---|------|----------------|
| 1 | `ch07-flow-quick-01-landing.png` | `/` |
| 2 | `ch07-flow-quick-02-path-selection.png` | `/flow/path-selection` |
| 3 | `ch07-flow-quick-03-onboarding-consent.png` | `/flow/onboarding` |
| 3d | `ch07-flow-quick-03-onboarding-consent-dialog.png` | `/flow/onboarding` (rozwinięte szczegóły) |
| 4 | `ch07-flow-quick-04-demographics.png` | `/flow/onboarding` (krok demografii) |
| 5 | `ch07-flow-quick-05-room-upload.png` | `/flow/fast-track` |
| 11 | `ch07-flow-quick-11-room-sample-selected.png` | `/flow/fast-track` |
| 6 | `ch07-flow-quick-06-style-selection.png` | `/flow/style-selection` |
| 7 | `ch07-flow-quick-07-generating.png` | `/flow/fast-generate` |
| 12 | `ch07-flow-quick-12-generation-ready.png` | `/flow/fast-generate` |
| 8 | `ch07-flow-quick-08-result.png` | `/flow/fast-generate` |
| 8d | `ch07-flow-quick-08-result-dialog.png` | `/flow/fast-generate` (modal) |
| 9 | `ch07-flow-quick-09-completion.png` | `/flow/path-selection?fast_completed=true` |

**Brak w rejestrze (stan produkcji 2026-10-04):**

- `ch07-flow-quick-01-landing-dialog.png` — overlay awatarki z przyciskiem „Pomiń dialog” **nie pojawił się** w sesji Playwright (ani po `localStorage.clear()`, ani po wejściu w funnel). W notatkach historycznych opisywany; do ewentualnego uzupełnienia ręcznie przy pierwszej wizycie w przeglądarce.
- `ch07-flow-quick-10-lifestyle.png` — **osobny ekran stylu życia nie występuje** na szybkiej ścieżce (po demografii aplikacja przechodzi od razu do `/flow/fast-track`).
- `ch07-flow-quick-13-satisfaction-rating.png` — **osobny kadr skali 1–5 nie został uchwycony**: po zakończeniu generacji UI pokazuje głównie podgląd obrazu; copy etapu mówi o ocenie, lecz kontrolki oceny nie były widoczne w viewporcie przed modalem konta (możliwa zmiana UI lub element poza kadrem).

---

## Opisy ekranów

### `ch07-flow-quick-01-landing.png`

- **URL:** `https://www.project-ida.com/`
- **Ekran:** Marketingowy landing IDA — karuzela przykładowych wizualizacji, CTA „Stwórz moje wnętrze”, „Zobacz jak działa”.
- **Akcje użytkownika:** wejście w funnel; opcjonalnie przewijanie / karuzela.
- **Dalej:** link **Stwórz moje wnętrze** → `/flow/path-selection` (lub bezpośrednio w flow, zależnie od sesji).
- **Dialogi:** brak na zrzucie.

### `ch07-flow-quick-02-path-selection.png`

- **URL:** `https://www.project-ida.com/flow/path-selection`
- **Ekran:** **Wybierz swoją ścieżkę** — karty *Szybka ścieżka* (3–5 min) i *Pełne doświadczenie* (20–30 min).
- **Akcje:** wybór trybu; nawigacja globalna (Zaloguj, PL/EN).
- **Dalej (Fast):** klik **Szybka ścieżka** → `/flow/onboarding`.
- **Dialogi:** brak.

### `ch07-flow-quick-03-onboarding-consent.png`

- **URL:** `https://www.project-ida.com/flow/onboarding`
- **Ekran:** **Etap 1/4 — Start**; formularz **Zgoda na udział w badaniu** (administrator, cel, zakres danych, dobrowolność, prawa, zdjęcia); checkbox niezaznaczony.
- **Akcje:** odczyt informacji; zaznaczenie **Akceptuję wszystkie warunki i wyrażam zgodę**; opcjonalnie **Dowiedz się więcej**; **← Wstecz** (wybór ścieżki).
- **Dalej:** po akceptacji — **Dalej →** (demografia, nadal onboarding).
- **Dialogi:** brak (ekran bazowy).

### `ch07-flow-quick-03-onboarding-consent-dialog.png`

- **URL:** ten sam (`/flow/onboarding`)
- **Ekran:** rozwinięta sekcja **Szczegóły zgód** (akordeon po **Dowiedz się więcej**): podstawa prawna, zakres, odbiorcy, retencja, prawa; stopka z linkami Polityka / Regulamin / Kontakt.
- **Akcje:** zwijanie sekcji; linki prawne (otwierają treść poza krokiem — nie nawigować w automacie).
- **Dalej:** powrót do skróconego widoku zgody → checkbox → **Dalej →**.
- **Dialogi:** traktować jako **dialog/sheet szczegółów zgody** (osobny plik `-dialog`).

### `ch07-flow-quick-04-demographics.png`

- **URL:** `https://www.project-ida.com/flow/onboarding` (krok po zgodzie)
- **Ekran:** **Kilka szybkich pytań** — przedział wieku, płeć, wykształcenie (dropdown), kraj (Polska).
- **Akcje:** wybór chipów / list; **← Wstecz**; **Kontynuuj →** (aktywne po wypełnieniu wymaganych pól).
- **Dalej:** **Kontynuuj →** → `/flow/fast-track` (etap 2/4).
- **Dialogi:** brak.

### `ch07-flow-quick-05-room-upload.png`

- **URL:** `https://www.project-ida.com/flow/fast-track`
- **Ekran:** **Etap 2/4 — Twoja przestrzeń**; upload zdjęcia (drag-and-drop lub plik); **Przykładowe zdjęcia** (3 miniatury).
- **Akcje:** własny plik lub **Przykład 1**; globalna nawigacja.
- **Dalej:** wybór przykładu → ekran potwierdzenia (plik 11) → **Dalej** → `/flow/style-selection`.
- **Dialogi:** brak na zrzucie (overlay „Pomiń dialog” nie wystąpił).

### `ch07-flow-quick-11-room-sample-selected.png`

- **URL:** `https://www.project-ida.com/flow/fast-track`
- **Ekran:** podgląd **Wybrane zdjęcie**; etykieta **IDA wykryła: Pokój dzienny**; akcje **Zmień typ pomieszczenia**, **Zmień zdjęcie**, **Usuń meble (Zalecane)**, **Dalej**.
- **Akcje:** opcjonalna segmentacja mebli; kontynuacja bez usuwania mebli (ścieżka rejestru).
- **Dalej:** **Dalej** → `/flow/style-selection`.
- **Dialogi:** brak.

### `ch07-flow-quick-06-style-selection.png`

- **URL:** `https://www.project-ida.com/flow/style-selection`
- **Ekran:** **Etap 3/4 — Styl**; siatka stylów; **Skandynawski** zaznaczony (ptaszek).
- **Akcje:** zmiana stylu; **← Wstecz**.
- **Dalej:** **Generuj** / **Dalej** → `/flow/fast-generate`.
- **Dialogi:** brak.

### `ch07-flow-quick-07-generating.png`

- **URL:** `https://www.project-ida.com/flow/fast-generate`
- **Ekran:** **Etap 4/4 — Generacja**; karta postępu (~50%, „Generuję obrazek z AI…”, szacowany czas).
- **Akcje:** oczekiwanie (użytkownik nie klika Next).
- **Dalej:** automatycznie → stan „Gotowe!” (plik 12) → podgląd wyniku (plik 8).
- **Dialogi:** brak.
- **Uwaga:** **stan ładowania**, nie finalny obraz.

### `ch07-flow-quick-12-generation-ready.png`

- **URL:** `/flow/fast-generate`
- **Ekran:** ta sama karta postępu przy **100%**, tekst **Gotowe!** / „Przygotowuję środowisko AI” — jeszcze **bez** dużego podglądu wygenerowanego wnętrza.
- **Akcje:** oczekiwanie.
- **Dalej:** przejście do widoku wyniku.
- **Dialogi:** brak.
- **Uwaga:** **stan pośredni ładowania** (nie mylić z `08-result`).

### `ch07-flow-quick-08-result.png`

- **URL:** `/flow/fast-generate`
- **Ekran:** **Etap 4/4** z **podglądem wygenerowanego wnętrza** (duży render w ramce, m.in. ikona „serce”); awatar IDA po lewej.
- **Akcje:** ocena / zapis (zależnie od buildu); wejście w modal konta.
- **Dalej:** po obsłudze modala konta → `/flow/path-selection?fast_completed=true`.
- **Dialogi:** modal konta pojawia się **nad** tym widokiem (osobny plik `-dialog`).

### `ch07-flow-quick-08-result-dialog.png`

- **URL:** `/flow/fast-generate` (overlay)
- **Ekran:** modal **Zapisz na koncie** — **Kontynuuj bez konta**, **Kontynuuj z Google**, formularz e-mail/hasło (zakładki Zaloguj / Utwórz konto / Magic link).
- **Akcje:** logowanie (pominięte w rejestrze) lub **Kontynuuj bez konta**.
- **Dalej:** **Kontynuuj bez konta** → redirect na wybór ścieżki z flagą ukończenia fast.
- **Dialogi:** **modal konta** (wymagany osobny zrzut).

### `ch07-flow-quick-09-completion.png`

- **URL:** `https://www.project-ida.com/flow/path-selection?fast_completed=true`
- **Ekran:** ponownie **Wybierz swoją ścieżkę** (po ukończeniu szybkiej ścieżki); copy zachęty do **Pełnego doświadczenia** w stopce awatarki. **Brak osobnego ekranu „dziękuję”** — koniec fast path = powrót do selektora z parametrem URL.
- **Akcje:** start pełnej ścieżki lub ponowna szybka (zależnie od reguł sesji).
- **Dalej:** poza zakresem fast path (full experience → `/setup/profile` itd.).
- **Dialogi:** brak.

---

## Regeneracja

```powershell
cd docs/thesis/scripts
npm install
node capture-fast-flow.mjs
```

Czas: ok. 2–3 min (w tym generacja AI na produkcji).
