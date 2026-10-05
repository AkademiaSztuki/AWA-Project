# Inwentarz ekranów — ścieżka pełna (Full Experience)

Wygenerowano: 2026-10-04 · produkcja [`https://www.project-ida.com`](https://www.project-ida.com) · viewport 1440×900 · skrypt `scripts/capture-full-flow.mjs` (Playwright/Chromium).

## Mapa tras (kod: `apps/frontend/src/lib/flow/full-flow-progress.ts`)

| Indeks paska (0–11) | Ekran produktowy | Trasa |
|---------------------|------------------|--------|
| 0–1 | Poznajmy się / O Tobie | `/setup/profile` (`consent`, `demographics`, `lifestyle`) |
| 2–4 | Gust (Tinder, klimat, zmysły) | `/setup/profile` (`tinder_swipes`, `semantic_diff`, `sensory_tests`) |
| 5 | Inspiracje | `/flow/inspirations` |
| 6 | Osobowość (IPIP-NEO-120) | `/flow/big-five` |
| 7–9 | Przestrzeń (zdjęcie, potrzeby, PRS) | `/setup/room/[householdId]?step=…` |
| 10 | Generacja (macierz 6 źródeł) | `/flow/generate` |
| 11 | Domknięcie (ankiety) | `/flow/survey1` → `/flow/survey2` → `/flow/thanks` |

Wybór ścieżki: `/flow/path-selection` → Full ustawia `path_type=full` i prowadzi do `/setup/profile` (`path-navigation.ts`).

---

## Sekwencja zrzutów

### ch07-flow-full-01-landing.png

- **URL:** `https://www.project-ida.com/`
- **Widoczne:** Landing IDA, CTA „Stwórz moje wnętrze”, awatar AWA.
- **Cel (badanie/produkt):** Wejście Product-First; użytkownik wybiera rytm Full vs Fast (RQ1, lejek).
- **Następny krok:** `/flow/path-selection`

### ch07-flow-full-02-path-selection.png

- **URL:** `https://www.project-ida.com/flow/path-selection`
- **Widoczne:** Karty *Szybka ścieżka* vs *Pełne Doświadczenie* (~15–20 min), copy badań i głębokiej personalizacji.
- **Cel (badanie/produkt):** Operacjonalizacja `path_type` (`full` \| `fast`) — macierz 6 źródeł i IPIP tylko w Full.
- **Następny krok:** „Zacznij Pełne Doświadczenie” → `/setup/profile`

### ch07-flow-full-03-profile-consent.png

- **URL:** `https://www.project-ida.com/setup/profile`
- **Widoczne:** Zgoda badawcza (RODO), master-checkbox, pasek 12 kroków Full.
- **Cel (badanie/produkt):** Etyka i zgoda przed danymi psychometrycznymi / behawioralnymi.
- **Następny krok:** Demografia (`?step=demographics` w wizardzie)

### ch07-flow-full-04-profile-demographics.png

- **URL:** `https://www.project-ida.com/setup/profile`
- **Widoczne:** Przedział wieku, płeć, wykształcenie, kraj (bez pól wolnych PII).
- **Cel (badanie/produkt):** Zmienne kontrolne próby i kontekst demograficzny.
- **Następny krok:** Styl życia

### ch07-flow-full-05-profile-lifestyle.png

- **URL:** `https://www.project-ida.com/setup/profile`
- **Widoczne:** Pytania o sytuację mieszkaniową, „vibe” życia, cele (chipy).
- **Cel (badanie/produkt):** Kontekst funkcjonalny pod Room Setup i syntezę promptów.
- **Następny krok:** Wnętrzarski Tinder

### ch07-flow-full-06-tinder-intro.png

- **URL:** `https://www.project-ida.com/setup/profile`
- **Widoczne:** Instrukcja Tindera (Nie/Tak, „Rozpocznij”).
- **Cel (badanie/produkt):** Preferencje ukryte (IAT-like) → kanał `implicit` (RQ2–RQ3).
- **Następny krok:** Talia swipe

### ch07-flow-full-07-tinder-swipe.png

- **URL:** `https://www.project-ida.com/setup/profile`
- **Widoczne:** Karta wnętrza po starcie talii (przyciski „Podoba mi się” / odrzucenie).
- **Cel (badanie/produkt):** Dokumentacja gestu i czasu reakcji w UI.
- **Następny krok:** Dalsze swipe do końca talii

### ch07-flow-full-08-tinder-complete.png

- **URL:** `https://www.project-ida.com/setup/profile`
- **Widoczne:** Ten sam ekran co w `07` — **Wnętrzarski Tinder**, etap **3/12**, postęp talii **1/30** (karta wnętrza, X / serce). *Nazwa pliku sugeruje koniec talii; kadr tego nie pokazuje.*
- **Cel (badanie/produkt):** Dokumentacja gestu swipe na początku talii (kanał `implicit`).
- **Następny krok:** Dalsze swipe w talii → potem semantic differential

### ch07-flow-full-09-semantic-mood.png

- **URL:** `https://www.project-ida.com/setup/profile`
- **Widoczne:** Ponownie karta **Tindera** (3/12, 1/30) — *nie* skale semantyczne ani pary ciepło/jasność/złożoność.
- **Cel (badanie/produkt):** Duplikat kadru `07`/`08` w tej serii zrzutów; docelowo: kanał `semanticDifferential`.
- **Następny krok:** Po talii → pary obrazów; w tym pliku — kontynuacja Tindera

### ch07-flow-full-10-sensory.png

- **URL:** `https://www.project-ida.com/setup/profile`
- **Widoczne:** Ponownie karta **Tindera** (3/12, 1/30) — *nie* pakiet zmysłowy ani pasek podkroków 1–7.
- **Cel (badanie/produkt):** Duplikat kadru Tindera; docelowo: `sensoryPreferences`, `biophiliaScore`.
- **Następny krok:** Po gustach → modal logowania (soft) lub `/flow/inspirations`

### ch07-flow-full-11-inspirations.png

- **URL:** `https://www.project-ida.com/flow/inspirations`
- **Widoczne:** Upload 1–10 inspiracji (w runie dokumentacyjnym: 1 plik fixture).
- **Cel (badanie/produkt):** Kanał `inspiration` w macierzy 6 źródeł; tagowanie obrazów.
- **Następny krok:** `/flow/big-five`

### ch07-flow-full-12-big-five-intro.png

- **URL:** `https://www.project-ida.com/flow/big-five`
- **Widoczne:** Nagłówek IPIP-NEO-120, opis 120 pytań, pasek 0%.
- **Cel (badanie/produkt):** Psychometria Big Five → kanał `personality` (RQ4/RQ5).
- **Następny krok:** Pozycje Likerta 1–5

### ch07-flow-full-13-big-five-item.png

- **URL:** `https://www.project-ida.com/flow/big-five`
- **Widoczne:** Reprezentatywna pozycja (pytanie + skala); pozostałe 119 pozycji speed-run w skrypcie.
- **Cel (badanie/produkt):** Pokazanie obciążenia czasowego bez 120 rycin.
- **Następny krok:** Ekran wyników

### ch07-flow-full-14-big-five-results.png

- **URL:** `https://www.project-ida.com/flow/big-five`
- **Widoczne:** Radar domen, „Kontynuuj” / „Pomiń”.
- **Cel (badanie/produkt):** Zapis `bigFive.scores` do GCP; feedback dla uczestnika.
- **Następny krok:** `/setup/room?step=photo_upload`

### ch07-flow-full-15-room-photo.png

- **URL:** `https://www.project-ida.com/setup/room/household-1791130869674` (ID sesji anonimowej — nie PII)
- **Widoczne:** Upload zdjęcia pokoju / przykładowe stocki.
- **Cel (badanie/produkt):** Kotwica geometryczna + VLM analizy przestrzeni.
- **Następny krok:** `preference_source` i dalsze kroki Room Setup

### ch07-flow-full-16-room-preference-source.png

- **URL:** `https://www.project-ida.com/setup/room/household-1791130869674`
- **Widoczne:** Wybór źródła preferencji dla pokoju (profil vs uzupełnienie).
- **Cel (badanie/produkt):** Jawne preferencje funkcjonalne przed PRS i aktywnościami.
- **Następny krok:** `preference_questions`, `prs_current`, `activities`, `prs_target`, `summary` (patrz luki)

### ch07-flow-full-17-generate-matrix-loading.png

- **URL:** `https://www.project-ida.com/flow/generate`
- **Widoczne:** **„Porównaj wizje (1/3)”** — etap **11/12** (*Generowanie wnętrza*): jedna odblokowana miniatura wizji, dwie zablokowane („Załóż konto, aby odblokować”), copy o 6 wizjach i kredytach. *Nie* ekran ładowania syntezy.
- **Cel (badanie/produkt):** Bramka konta przy pierwszej wizji z puli 6; częściowy wgląd w wybór przed pełną ślepą macierzą (RQ3).
- **Następny krok:** „Wybieram tę wizję” lub logowanie → pełniejsza siatka / ankiety

### ch07-flow-full-18-generate-matrix.png

- **URL:** `https://www.project-ida.com/flow/generate`
- **Widoczne:** Ten sam kadr co `17` — **„Porównaj wizje”** z jedną odblokowaną i dwoma zablokowanymi wizjami. *Nie* ułożona ślepa macierz 6 miniatur obok siebie.
- **Cel (badanie/produkt):** Ten sam stan produktowy co `17`; docelowo pomiar `selected_source`, `blind_selection_made`.
- **Następny krok:** Wybór wizji lub odblokowanie kontem → `/flow/survey1`

### ch07-flow-full-19-login-nudge-dialog.png

- **URL:** (modal na `/flow/generate` lub po Big Five)
- **Widoczne:** Soft gate logowania („Kontynuuj bez konta” / kredyty).
- **Cel (badanie/produkt):** Product-First vs utrwalenie sesji badawczej na koncie.
- **Następny krok:** Kontynuacja anonimowa lub OAuth

### ch07-flow-full-20-survey-sus.png

- **URL:** `https://www.project-ida.com/flow/survey1`
- **Widoczne:** Kwestionariusz SUS (10 pozycji) po generacji.
- **Cel (badanie/produkt):** RQ1 — użyteczność po długim flow Full.
- **Następny krok:** `/flow/survey2` (brak zrzutu — patrz luki)

---

## Luki w tej serii (do uzupełnienia)

| Brakujący ekran | Trasa docelowa | Uwagi |
|-----------------|----------------|--------|
| Room: pytania preferencji | `?step=preference_questions` | Skrypt skrócił Room Setup po 2 krokach |
| Room: PRS bieżący | `?step=prs_current` | Mood grid / PRS current |
| Room: aktywności | `?step=activities` | |
| Room: PRS docelowy | `?step=prs_target` | |
| Room: podsumowanie | `?step=summary` | Przejście do `/flow/generate` |
| Ankieta 2 | `/flow/survey2` | Clarity / agency / satysfakcja |
| Podziękowanie | `/flow/thanks` | `currentStep=thanks` |

## Blokery techniczne (run 2026-10-04)

- **Macierz 6 obrazów:** w runie dokumentacyjnym `17`/`18` utrwalają **Porównaj wizje** z bramką konta (1/3 widoczne), nie loader ani pełną siatkę 6 — ponowny capture po zalogowaniu lub dłuższym oczekiwaniu na API.
- **Automatyzacja Room Setup:** szybkie „Dalej” przeskoczyło środkowe kroki — uzupełnić ręcznie przez `?step=` lub rozbudować skrypt.

## Pliki w `figures/ida/flow-full/`

20 ekranów + 1 dialog (`ch07-flow-full-01` … `ch07-flow-full-20`, plus `ch07-flow-full-19-login-nudge-dialog.png`).
