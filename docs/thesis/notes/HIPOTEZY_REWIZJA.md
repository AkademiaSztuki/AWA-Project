# Rewizja hipotez badawczych — stan na 2026-06-29

**Kontekst:** ~20 ukończonych profili (`core_profile_complete`); pilotaż, nie docelowa próba.  
**Źródła:** schemat Cloud SQL, aktualny flow (`full-flow-progress.ts`, `CoreProfileWizard`, `RoomSetup`, macierz 6 źródeł), `generation_feedback`, `preference_comparison_json`.  
**Wniosek wstępny:** hipotezy H1–H5 z `PODSUMOWANIE_PROJEKTU.md` pochodzą z wcześniejszej wizji projektu (październik 2024 / styczeń 2025). **Część z nich nie ma operacjonalizacji w obecnej bazie danych** albo wymaga N >> 20.

---

## 1. Co faktycznie zbieracie dziś (vs stara dokumentacja)

### Dane dostępne i persystowane

| Obszar | Co jest w DB / API | Gdzie w flow |
|--------|-------------------|--------------|
| **Implicit** | `participant_swipes`, `implicit_*`, `reaction_time_ms` | Tinder w Core Profile |
| **Explicit** | `explicit_*`, sensory, paleta, materiały | semantic_diff + sensory |
| **Porównanie imp. vs exp.** | `preference_comparison_json`, `style_match`, `color_tokens_match_score`, `biophilia_match` | po profilu |
| **Big Five** | `big5_*`, `big5_facets`, `big5_responses` | `/flow/big-five` (IPIP-NEO-120) |
| **Inspiracje** | `inspiration_*`, `participant_images` | krok inspiracji |
| **PRS (mood grid)** | `prs_ideal_*`, `prs_current_*`, `prs_target_*` | ideal w profilu; current/target w Room Setup |
| **Funkcja przestrzeni** | `room_activities`, `room_pain_points`, `ladder_*` | Room Setup |
| **Macierz 6 wariantów** | `participant_matrix_entries` (source, is_selected) | `/flow/generate` |
| **Ślepy wybór** | `blind_selection_made`, `generation_feedback.selected_source`, `selection_time_ms` | macierz |
| **Jakość / UX** | `sus_*`, `agency_*`, `satisfaction_*`, `clarity_*` | ankiety po flow |
| **Zdarzenia** | `participant_research_events` (page views, matrix_blind_selection) | behawioralne (ograniczone) |

### Czego NIE ma (a stare hipotezy zakładały)

| Element | Status | Skutek dla starych hipotez |
|---------|--------|---------------------------|
| **PRS pre/post po ekspozycji na AI** | Brak `prs_post_*`; `analyzePRSImprovement()` w kodzie zwraca pusty wynik (legacy usunięte) | **H2 nie do obrony** bez nowego pomiaru |
| **dwell_time, hesitation w DB** | W UI `dwellTime` ≈ `reactionTime` (uproszczenie); brak kolumn w `participant_swipes` | **H5 nie do obrony** w obecnej formie |
| **Walidacja konstruktu vs papierowa skala** | Brak równoległego PRS-11 / IPIP w wersji papierowej | **H1 wymaga innego designu** (lub staje się pilotażem feasibility) |
| **Satysfakcja powiązana z wyborem w macierzy** | `satisfaction_score` na poziomie uczestnika, nie per `selected_source` | H3 wymaga **nowej zmiennej zależnej** (wybór źródła, nie ogólna satysfakcja) |

---

## 2. Ocena starych hipotez H1–H5

| ID | Stara hipoteza | Werdykt | Dlaczego |
|----|----------------|---------|----------|
| **H1** | Zgamifikowane skale = ta sama ważność + wyższy completion | **Zastąpić / przeformułować** | Przy N≈20 nie zwalidujesz konstruktu psychometrycznie; masz natomiast dane o **ukończeniu flow** i jakości odpowiedzi |
| **H2** | AI poprawia PRS o ~1,8 pkt (pre/post) | **Odrzucić w obecnej formie** | Nie ma pomiaru post po generacji; PRS to obecnie **ideal / current / target**, nie test przed/po wizualizacji |
| **H3** | Implicit lepiej przewiduje satysfakcję niż explicit | **Zachować ideę, zmienić DV** | Macierz ślepa + `selected_source` to **lepszy wynik** niż ogólna satysfakcja; to rdzeń empiryczny projektu |
| **H4** | Big Five koreluje z preferencjami (r > 0,4) | **Przeformułować (słabsza, pilotażowa)** | Przy N=20 r>0,4 jest nierealistyczne jako hipoteza confirmatory; sensowne: **asocjacje eksploracyjne** lub związek z wyborem źródła `personality` |
| **H5** | Dwell + hesitation > sam swipe | **Odrzucić lub odłożyć** | Dane nie są zapisywane; tylko `reaction_time_ms` |

---

## 3. Proponowany zestaw pytań badawczych (zastępuje H1–H5)

Struktura: **pytanie główne (stabilne)** + **hipoteza robocza (do weryfikacji po większej próbie)** + **co mierzycie teraz przy N≈20**.

### RQ1 — Artefakt i zaangażowanie (zamiast starego H1)

**Pytanie:** Czy zintegrowany flow badawczy (RtD) umożliwia zebranie wielowymiarowego profilu bez katastrofalnego dropoutu?

**Hipoteza robocza (pilotaż):** Uczestnicy ścieżki `full` z `core_profile_complete` dostarczają komplet danych w ≥ X wymiarach (implicit, explicit, big5, room, macierz).

**Zmienne (masz je):**
- `core_profile_complete`, `current_step`, czas między `created_at` a `updated_at`
- `participant_research_events` (page_view)
- liczność wypełnienia pól (np. `big5_openness IS NOT NULL`, `preference_comparison_json IS NOT NULL`)

**Przy N=20:** analiza **opisowa** (completion funnel, % braków), nie test psychometryczny ważności konstruktu.

---

### RQ2 — Rozbieżność implicit vs explicit (rozwinięcie H3)

**Pytanie:** Czy i w jakim stopniu preferencje ukryte i jawne się rozchodzą, i czy ta rozbieżność wiąże się z zachowaniem w macierzy generacji?

**Hipotezy robocze:**
- **H2a:** Wyższy `mismatch` w `preference_comparison_json` → dłuższy `selection_time_ms` lub częstszy wybór źródeł `mixed` / `mixed_functional` (nie czystego `implicit` ani `explicit`).
- **H2b:** Gdy `style_match = false`, uczestnik rzadziej wybiera źródło `explicit` w ślepej macierzy.

**Zmienne:**
- `preference_comparison_json`, `style_match`, `color_tokens_match_score`
- `generation_feedback.selected_source`, `selection_time_ms`, `conflict_analysis`
- `participant_matrix_entries`

**Przy N=20:** opis rozkładów mismatch; **nie** regresja wielowymiarowa jako główny wniosek — raczej case studies + efekt wielkości do zaplanowania N.

---

### RQ3 — Skuteczność kanałów personalizacji (rdzeń nowej empiryki, zamiast H3)

**Pytanie:** Które źródło danych w macierzy 6 wariantów użytkownicy wybierają w trybie ślepym, i czy wybór zależy od profilu?

**Hipotezy robocze (confirmatory po zebraniu N ≥ 80–100):**
- **H3a:** Źródła `mixed` lub `mixed_functional` są wybierane częściej niż `implicit`, `explicit` lub `personality` pojedynczo.
- **H3b:** Uczestnicy z kompletnym Big Five (`has_complete_bigfive`) częściej wybierają wariant powiązany z `personality` lub `mixed`.
- **H3c:** Uczestnicy z ≥1 inspiracją częściej wybierają `inspiration_reference`.

**Zmienne:** `selected_source`, `generated_sources`, `has_complete_bigfive`, `inspirations_count`, `blind_selection_made`.

**Przy N=20:** **tabela częstości** wyborów per source — to już wartościowy wynik pilotażu (np. „mixed_functional 35%, implicit 10%…”).

---

### RQ4 — Osobowość a personalizacja (zamiast starego H4)

**Pytanie:** Czy cechy i facety Big Five wiążą się z parametrami estetycznymi profilu oraz z preferencją źródła `personality`?

**Hipotezy robocze (eksploracyjne przy małej próbie):**
- **H4a:** Wyższa `big5_openness` → wyższa `implicit_complexity` / bardziej eklektyczny `implicit_dominant_style`.
- **H4b:** Wyższa `big5_conscientiousness` → preferencje materiałów/uporządkowania w `explicit_*`.
- **H4c:** Wybór `personality` w macierzy koreluje z ekstremalnymi wartościami co najmniej jednej domeny (np. wysoka O lub N).

**Zmienne:** `big5_*`, `big5_facets`, `implicit_*`, `explicit_*`, `selected_source`.

**Przy N=20:** heatmapy korelacji z **szerokimi przedziałami ufności**; w rozprawie jasno: „eksploracja pilotażowa”.

---

### RQ5 — PRS jako luka do pokrycia funkcjonalnego (zamiast starego H2)

**Pytanie:** Czy odległość między stanem obecnym a docelowym PRS (`prs_current` → `prs_target`) wiąże się z preferencją wariantów uwzględniających funkcję przestrzeni?

**Hipoteza robocza:**
- **H5a:** Większa euklidesowa odległość PRS (current vs target) → częstszy wybór `mixed_functional` w macierzy.

**Uwaga:** To **nie** jest „czy AI leczy regeneracyjność” — to lepiej pasuje do obecnych danych. Jeśli promotor chce klasyczny pre/post PRS po ekspozycji na wizualizacje — **trzeba dodać krok pomiarowy** (np. po wyborze w macierzy: „Gdzie na mapie nastroju jest teraz ta wizualizacja?”).

---

### RQ6 — Doświadczenie użytkownika systemu (nowe, wspiera tezę RtD)

**Pytanie:** Czy uczestnicy postrzegają proces jako zrozumiały i dający poczucie sprawczości (agency) przy jednoczesnym zebraniu danych badawczych?

**Hipotezy robocze:**
- **H6a:** `agency_score` i `clarity_score` korelują dodatnio z `satisfaction_score`.
- **H6b:** Ścieżka `full` ma wyższe `satisfaction_score` niż `fast` (jeśli masz wystarczająco fast-tracków).

**Zmienne:** ankiety SUS/agency/satisfaction/clarity, `path_type`.

---

## 4. Co zrobić z ~20 profilami teraz

### Analiza pilotażowa (warto zrobić od razu)

1. **Lejek ukończenia** — ilu ma: profil → big5 → room → macierz → blind selection → ankiety.
2. **Rozkład `selected_source`** — czy macierz w ogóle działa badawczo.
3. **Rozkład mismatch** — `style_match`, średni `matchScore` z `preference_comparison_json`.
4. **Jakość danych** — % swipów z `reaction_time_ms`; liczba swipów per user.
5. **Outliery** — profile bez macierzy mimo `core_profile_complete` (bug czy dropout).

### Czego NIE obiecywać w rozprawie na tym N

- Potwierdzenia r > 0,4 dla Big Five
- Walidacji psychometrycznej zgamifikowanego PRS vs PRS-11
- Testów mediacji wielopoziomowych

### Docelowe N (orientacyjnie, do planu z promotorem)

| Badanie | Orientacyjne N |
|---------|----------------|
| Rozkład wyborów macierzy (χ²) | 50–80 |
| Regresja: mismatch → selected_source | 100+ |
| Korelacje Big Five (5 domen) | 80–150 |
| PRS pre/post (jeśli dodacie pomiar) | 60–100 |

---

## 5. Rekomendowana główna teza doktorska (po rewizji)

**Robocza wersja:**

> Praca doktorska wykazuje, że eksperymentalna platforma IDA — łącząca wieloźródłowy profil preferencji (implicit, explicit, osobowość, funkcja przestrzeni) z generatywną personalizacją i ślepą macierzą wariantów — stanowi metodologicznie spójny artefakt Research Through Design oraz umożliwia empiryczne badanie rozbieżności preferencji i skuteczności kanałów personalizacji w kontekście projektowania wnętrz wspomaganego AI.

Empirycznie: **RQ2 + RQ3** jako oś wyników; RQ1 i RQ6 jako uzasadnienie feasibility; RQ4–RQ5 jako eksploracja / rozszerzenie.

---

## 6. Ewentualne zmiany w produkcie (jeśli chcesz wrócić do starych tematów)

| Cel badawczy | Zmiana w IDA |
|--------------|--------------|
| PRS po ekspozycji (stary H2) | Krok po wyborze w macierzy: mood grid „gdzie jest ta wizualizacja?” → `prs_post_x/y` |
| H5 behawioralny | Zapisywać `dwell_time_ms`, `hesitation_count` w `participant_swipes` |
| H1 walidacja konstruktu | Podpróba z równoległym PRS-11 online (niezgamifikowany) — osobna kohorta |
| Silniejsza H3 | Powiązać `satisfaction_*` z konkretną sesją macierzy (`session_id`) |

---

## 7. Mapowanie: stara → nowa numeracja

| Stare | Nowe | Uwagi |
|-------|------|-------|
| H1 | RQ1 + H6 | Feasibility + UX, nie psychometria konstruktu |
| H2 | RQ5 (+ opcjonalny pomiar post) | PRS gap, nie pre/post AI |
| H3 | RQ2 + RQ3 | Macierz ślepa jako DV |
| H4 | RQ4 | Eksploracyjnie + wybór `personality` |
| H5 | *(odłożone)* | Wymaga instrumentacji |

---

## 8. Następne kroki

- [ ] Uruchomić agregaty na produkcji (proxy + SQL) — potwierdzić liczby: complete / blind / matrix per user
- [ ] Omówić z promotorem: **czy dodajemy PRS post**, czy rezygnujemy z wątku regeneracyjności po AI
- [ ] Zaktualizować `SPIS_TRESCI_ROBOCZY.md` — rozdział wyników pod RQ1–RQ6
- [ ] Spisać `PLAN_ANALIZY.md` przed pełnym opracowaniem danych (ochrona przed HARKing)

---

*Wersja 0.1 — do iteracji po pierwszej analizie kohorty pilotażowej.*
