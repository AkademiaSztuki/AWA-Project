# Spis treści roboczy — praca doktorska IDA

**Status:** wersja robocza 0.1  
**Data:** 2026-06-29  
**Branch:** `pisemna`  
**Autor:** Jakub Palka  
**Promotor:** prof. dr hab. Andreas Guskos  
**Uczelnia:** Akademia Sztuki w Szczecinie  

**Tytuł roboczy (z `/o-projecie`):**  
*IDA: projekt eksperymentalnej platformy badawczej do personalizacji koncepcji wnętrz na podstawie preferencji estetycznych wspomaganej sztuczną inteligencją*

---

## 1. Zadania wykonane przy opracowaniu tego dokumentu

| # | Zadanie | Źródła | Wynik |
|---|---------|--------|-------|
| 1 | Analiza celów i zakresu projektu IDA | `README.md`, `PODSUMOWANIE_PROJEKTU.md`, `docs/MASTER_PLAN.md`, `/o-projecie` | Zidentyfikowano 4 obszary badawcze, filozofię Product-First / Research-Embedded, hipotezy H1–H5 |
| 2 | Analiza historii i ewolucji technicznej | `git log`, `docs/architecture.md`, `DEEP_PERSONALIZATION_README.md`, migracja GCP | Odtworzono linię rozwoju: Aura → IDA, od prototypu flow do macierzy 6 źródeł generacji |
| 3 | Analiza artefaktu badawczego (platforma) | `apps/frontend`, `lib/prompt-synthesis/`, `infra/gcp/sql/` | Zmapowano instrumenty (PRS, IAT, IPIP-NEO-120), pipeline danych i syntezę promptów |
| 4 | Przegląd wytycznych struktury dysertacji | Wytyczne uczelni (ogólne), literatura HCI/RtD, praktyka dysertacji projektowych | Przyjęto model: teoria → metodologia → artefakt → ewaluacja empiryczna → dyskusja |
| 5 | Opracowanie spisu treści z uzasadnieniem | Synteza powyższych | Niniejszy dokument |

### Zadania otwarte (do wykonania z promotorem)

- [ ] Weryfikacja wymogów formalnych ASP Szczecin (szablon, liczba rozdziałów, forma: monografia vs cykl publikacji)
- [ ] Doprecyzowanie **głównej tezy doktorskiej** (jedno zdanie — obecnie rozproszone między H1–H5)
- [ ] Ustalenie docelowej wielkości próby (N) per hipoteza
- [ ] Decyzja: czy rozdział o implementacji technicznej jest osobnym rozdziałem, czy częścią metodologii / załącznika
- [ ] Mapowanie rozdziałów na planowane artykuły (CHI, DIS, czasopisma psychologii środowiskowej)

---

## 2. Kontekst projektu — skrót dla spisu treści

### 2.1. Czym jest IDA

IDA (*AI Interior Design Dialogue Research Platform*) to eksperymentalna platforma badawcza łącząca:

- **psychologię środowiskową** (PRS-11, biophilia, funkcja przestrzeni),
- **psychometrię** (Big Five / IPIP-NEO-120, facety),
- **badania preferencji** (implicit vs explicit, śledzenie behawioralne),
- **generatywne AI** (tłumaczenie profilu użytkownika na koncepcje wnętrz),
- **HCI / design** (zgamifikowane instrumenty, awatar IDA, glass UI).

Metodologia nadrzędna: **Research Through Design (RtD)** — artefakt (platforma) jest jednocześnie produktem i instrumentem badawczym.

### 2.2. Historia projektu (linia czasu)

| Okres | Etap | Znaczenie dla pracy |
|-------|------|---------------------|
| Początek repozytorium | Projekt **Aura** — struktura Next.js + Three.js | Geneza techniczna; w `docs/architecture.md` widać ewolucję nazewnictwa (Aura → IDA) |
| 2024 | Core flow: onboarding, Tinder (IAT), DNA, Ladder, PRS, generacja FLUX | Pierwsza wersja „research-embedded” ścieżki użytkownika |
| Październik 2025 | `MASTER_PLAN.md` — spójna wizja Product-First | Formalizacja filozofii i mapy flow (12 kroków ścieżki pełnej) |
| Styczeń 2025 | Branch *deep personalization*: Big Five, inspiracje, 4-warstwowa architektura danych | Rozszerzenie zakresu doktorski o osobowość i multi-session |
| 2025–2026 | IPIP-NEO-120 (120 pozycji, 30 facetów), macierz 6 źródeł generacji, ślepy wybór wariantu | **Kluczowy element empiryczny** — test H3, H4 w kontrolowanym eksperymencie |
| 2025–2026 | Migracja persistence: Supabase/Modal → **GCP** (Cloud SQL, Cloud Run) | Infrastruktura skalowalna pod zbieranie danych badawczych; opis w rozdziale metodologicznym / załączniku |
| 2026 | Produkcja: marketing, auth, billing — przy zachowaniu warstwy badawczej | Platforma jako „żywy” artefakt; uwaga etyczna i metodologiczna (mieszanie użytkowników komercyjnych i badawczych) |

### 2.3. Pytania badawcze i hipotezy (z dokumentacji projektu)

| ID | Pytanie | Hipoteza robocza |
|----|---------|------------------|
| **H1** | Czy zgamifikowane skale zachowują ważność konstruktu? | Tak — porównywalna ważność + wyższy wskaźnik ukończenia |
| **H2** | Czy wizualizacje AI poprawiają postrzeganą regeneracyjność? | Tak — poprawa PRS pre/post (~1,8 pkt) |
| **H3** | Czy preferencje implicit lepiej przewidują satysfakcję niż explicit? | Tak — wyższa korelacja implicit z wyborem w macierzy |
| **H4** | Czy Big Five wiąże się z preferencjami wnętrz? | Tak — r > 0,4 dla O, C, E |
| **H5** | Czy wskaźniki behawioralne (dwell, hesitation) poprawiają predykcję? | Tak — model behawioralny > sam kierunek swipa |

### 2.4. Wkład doktorski (robocza definicja)

1. **Artefakt RtD** — platforma IDA jako model integracji badań psychologicznych z generatywnym AI w domenie wnętrz.
2. **Framework explainable personalization** — deterministyczna synteza promptów z cytowanymi mapowaniami (osobowość → parametry przestrzenne).
3. **Eksperyment ślepej macierzy 6 źródeł** — empiryczne porównanie kanałów danych (implicit, explicit, personality, mixed, mixed_functional, inspiration_reference).
4. **Walidacja zgamifikowanych instrumentów** w kontekście projektowania (nie kwestionariusza papierowego).
5. **Most psychologia środowiskowa ↔ generative AI** — PRS/biophilia/funkcja jako wejścia do generacji.

---

## 3. Wytyczne strukturalne — dlaczego taki układ

### 3.1. Ogólne zasady (literatura + praktyka dysertacji)

Praca doktorska powinna być **logicznym projektem badawczym**, nie katalogiem funkcji aplikacji. Struktura wynika z:

1. **Luki badawczej** — brak spójnych modeli łączących implicit/explicit/personality z generatywną personalizacją wnętrz w jednym artefakcie terenowym.
2. **Tezy / celu** — co doktorant udowadnia (nie tylko „co zbudował”).
3. **Metodologii powtarzalnej** — promotor i recenzenci muszą móc odtworzyć procedurę.
4. **Dyscypliny** — ASP Szczecin (architektura wnętrz / design) + elementy psychologii i HCI → rozdziały teoretyczne muszą **mostować** te dziedziny, nie być czystym przeglądem AI.

### 3.2. Dlaczego nie „jeden rozdział teoria + jeden badania”

Projekt IDA jest **zbyt wielowymiarowy** na dwuczęściowy schemat:

- Teoria psychologii środowiskowej (PRS, restorative environments),
- Teoria preferencji (implicit/explicit),
- Teoria osobowości (Big Five, facety),
- Teoria personalizacji AI / explainable HCI,
- Metodologia RtD,
- Opis artefaktu,
- Wyniki wielowątkowe (H1–H5).

Rozbicie na **4 rozdziały teoretyczne** + metodologia + artefakt + wyniki daje czytelniejszą narrację dla komisji interdyscyplinarnej.

### 3.3. Dlaczego osobny rozdział o artefakcie IDA

W dysertacjach **Research Through Design** i projektowych (design research) artefakt nie jest „załącznikiem”, lecz **centralnym wkładem metodologicznym**. Rozdział o IDA:

- uzasadnia decyzje projektowe (dlaczego Tinder, nie ankieta; dlaczego macierz 6 wariantów),
- pokazuje, jak teoria została **operacjonalizowana** w interfejsie,
- oddziela „co zbudowano” od „co zmierzono” (rozdział wyników).

### 3.4. Dlaczego wyniki mogą być jednym rozdziałem z podrozdziałami per hipoteza

H1–H5 dotyczą tej samej próby i platformy. Wspólny rozdział wyników:

- ułatwia czytanie całości empirycznej,
- pozwala na wspólną sekcję o próbie, procedurze i statystyce,
- podrozdziały odpowiadają artykułom planowanym z `PODSUMOWANIE_PROJEKTU.md`.

Alternatywa do omówienia z promotorem: **dwa rozdziały wyników** (walidacja instrumentów H1 + regeneracyjność H2 | preferencje i osobowość H3–H5).

### 3.5. Forma: monografia vs cykl publikacji

Dokument zakłada **monografię zwartą** z możliwością późniejszego wydzielenia artykułów — bo:

- platforma jest jednym spójnym artefaktem,
- hipotezy współdzielą dane,
- cykl publikacji wymaga wcześniejszych druków i oświadczeń współautorów.

Jeśli ASP preferuje cykl — rozdziały 7–8 mogą stać się „opublikowanymi artykułami” w rozdziałach 9–12, a rozdziały 1–6 pozostają ramą wprowadzającą.

---

## 4. Spis treści roboczy (szczegółowy)

### Część wstępna

0. **Strona tytułowa**  
1. **Spis treści**  
2. **Spis rycin i tabel**  
3. **Spis skrótów i symboli** (PRS, IAT, IPIP, RtD, LLM, VLM itd.)  
4. **Streszczenie** (polski, ≤300 słów)  
5. **Abstract** (angielski)  

**Uzasadnienie:** Wymogi formalne uczelni; streszczenie musi odzwierciedlać układ: problem → cel → metoda → artefakt → wyniki → wnioski.

---

### Rozdział 1. Wprowadzenie

1.1. Tło: personalizacja wnętrz a sztuczna inteligencja generatywna  
1.2. Problem badawczy — rozbieżność deklaracji i zachowania w preferencjach estetycznych  
1.3. Luka badawcza — brak zintegrowanych, terenowych systemów łączących psychologię środowiskową, osobowość i generative AI  
1.4. Cel pracy i pytania badawcze (H1–H5)  
1.5. Teza główna pracy (robocza): *Zintegrowany artefakt badawczo-projektowy, operacjonalizujący wieloźródłowe preferencje użytkownika w explainable pipeline personalizacji, umożliwia empiryczną weryfikację predykcji implicit, explicit i personality w kontekście satysfakcji z koncepcji wnętrz generowanych przez AI*  
1.6. Zakres i ograniczenia (domena: koncepcje wnętrz mieszkalnych; ograniczenia modeli obrazu; próba dobrowolna online)  
1.7. Wkład własny autora  
1.8. Struktura rozprawy  

**Dlaczego tak:** Wprowadzenie musi postawić **problem naukowy**, nie opis aplikacji. Czytelnik (komisja ASP + recenzenci spoza IT) od razu widzi, że praca to nie „dokumentacja startupu”.

---

### Rozdział 2. Psychologia środowiskowa i percepcja wnętrz

2.1. Teoria środowisk regeneracyjnych (Attention Restoration Theory, Stress Reduction)  
2.2. Skala postrzeganej regeneracyjności PRS-11 — konstrukt i operacjonalizacja  
2.3. Biophilia w projektowaniu wnętrz (Kellert)  
2.4. Relacja człowiek–środowisko: model PEO (Person–Environment–Occupation)  
2.5. Nastrój, funkcja i kontekst użytkowania przestrzeni mieszkalnej  
2.6. Implikacje dla personalizacji — od potrzeb psychologicznych do parametrów projektowych  

**Dlaczego osobny rozdział:** PRS i biophilia to **rdzeń uzasadnienia** ścieżki pełnej IDA (nie tylko „ładne wnętrza”). Bez tego rozdziału macierz `mixed_functional` i hipoteza H2 są nieuzasadnione teoretycznie.

**Powiązanie z projektem:** `Survey1` / mood grid PRS, biophilia step, PRS post-test, `mixed_functional` w macierzy generacji.

---

### Rozdział 3. Preferencje estetyczne: jawne, ukryte i behawioralne

3.1. Preferencje jawne (explicit) — deklaracje, semantic differential, rankingi  
3.2. Preferencje ukryte (implicit) — IAT i adaptacje w HCI  
3.3. Rozbieżności implicit vs explicit — znaczenie dla projektowania  
3.4. Wskaźniki behawioralne: czas reakcji, dwell time, hesitation, velocity  
3.5. Means-end laddering — od atrybutów do wartości i potrzeb  
3.6. Inspiracje wizualne jako źródło preferencji (upload, analiza obrazu)  
3.7. Synteza — model wieloźródłowy preferencji w IDA  

**Dlaczego osobny rozdział:** H3 i H5 wymagają **głębokiego umocowania** w psychologii poznawczej i metodologii pomiaru. Tinder w IDA to nie „gimmick”, lecz operacjonalizacja IAT.

**Powiązanie z projektem:** `/flow/tinder`, semantic differential, laddering, `participant_swipes`, `preference_comparison_json`, `conflict-analysis.ts`.

---

### Rozdział 4. Osobowość a preferencje przestrzenne

4.1. Model Wielkiej Piątki (Big Five) — konstrukt i stabilność  
4.2. IPIP i IPIP-NEO-120 — facety jako poziom szczegółowości  
4.3. Literatura: osobowość a preferencje środowiskowe i estetyczne  
4.4. Mapowanie domen i facetów na parametry wnętrz (kolory, złożoność, funkcja, harmonia)  
4.5. Krytyka i ograniczenia: korelacje vs przyczynowość; ryzyko determinizmu  
4.6. Uzasadnienie włączenia osobowości do pipeline personalizacji IDA  

**Dlaczego osobny rozdział:** Big Five to **najbardziej kontrowersyjny** element dla komisji artystycznej — wymaga starannej argumentacji i cytowań (`research-mappings.ts`, Gosling, Nasar, Graham). Wydzielenie chroni przed mieszaniem z rozdziałem o preferencjach.

**Powiązanie z projektem:** IPIP-NEO-120, `facet-derivation.ts`, źródło `personality` w macierzy, dashboard Big Five.

---

### Rozdział 5. Sztuczna inteligencja generatywna i personalizacja w HCI

5.1. Generatywne modele obrazu w kontekście architektury wnętrz  
5.2. Od promptu do koncepcji — ograniczenia i możliwości modeli (FLUX / Gemini)  
5.3. Explainable AI i transparentność w systemach rekomendacyjnych  
5.4. Research Through Design — artefakt jako metoda badawcza  
5.5. Gamifikacja instrumentów psychologicznych w interfejsie cyfrowym  
5.6. Etyka badań online, RODO, świadoma zgoda, anonimizacja  
5.7. Pozycjonowanie IDA względem istniejących narzędzi AI do wnętrz  

**Dlaczego ten rozdział:** Łączy **metodologię projektową (RtD)** z **technologią AI** i **etyką** — bez tego rozdział o implementacji wyglądałby jak inżynieria bez kontekstu naukowego.

**Powiązanie z projektem:** filozofia z `MASTER_PLAN.md`, onboarding/consent, `user_hash`, dokumentacja GCP, `/o-projecie`.

---

### Rozdział 6. Metodologia badań

6.1. Paradygmat badawczy: Research Through Design + badania ewaluacyjne terenowe  
6.2. Projekt badania — fazy: pilotaż, główne zbieranie danych, analiza  
6.3. Uczestnicy — kryteria włączenia, dobór, wielkość próby (docelowa N per hipoteza)  
6.4. Procedura — ścieżka Fast vs Full; kontekst eksperymentalny macierzy 6 wariantów  
6.5. Instrumenty pomiarowe — tabela: narzędzie | źródło naukowe | forma w IDA | zmienne  
6.6. Zmienne zależne i niezależne (mapowanie na H1–H5)  
6.7. Analiza statystyczna — planowane testy (korelacje, regresja, porównania pre/post, porównania modeli predykcyjnych)  
6.8. Wiarygodność i trafność — strategia walidacji zgamifikowanych skal (H1)  
6.9. Ograniczenia metodologiczne (self-selection online, brak randomizacji laboratoryjnej)  
6.10. Etyka i RODO — zgoda, wycofanie, przechowywanie (Cloud SQL), anonimizacja  

**Dlaczego przed artefaktem:** Recenzent najpierw ocenia, **czy badanie jest poprawne**, potem jak platforma je realizuje. Procedura musi być opisana niezależnie od kodu.

**Powiązanie z projektem:** `participant_research_events`, `generation_feedback`, `docs/gcp-data-verification/`, skill `research-data`.

---

### Rozdział 7. Projekt i implementacja platformy IDA

7.1. Założenia projektowe — Product-First, Research-Embedded, minimalistyczny UI  
7.2. Architektura systemu — frontend, backend GCP, generacja obrazów, przepływ danych  
7.3. Awatar IDA jako element dialogu badawczego (nie tylko dekoracja)  
7.4. Ścieżka użytkownika — od onboardingu do feedbacku (diagram flow)  
7.5. Warstwy danych: profil użytkownika → gospodarstwo → pokój → sesja  
7.6. Pipeline syntezy promptów: scoring → builder → (opcjonalnie) refinement  
7.7. Macierz sześciu źródeł generacji — logika ślepego wyboru  
7.8. Ewolucja techniczna projektu (Aura → IDA; Modal/Supabase → GCP) — skrót chronologiczny  
7.9. Decyzje projektowe a kompromisy (np. długość ścieżki pełnej vs rezygnacja)  

**Dlaczego osobny rozdział:** To **serce wkładu projektowego** doktoratu na ASP. Tu pokazujesz kompetencje autora jako projektanta-badacza. Techniczne detale (schemat SQL, API) mogą trafić do załączników.

**Uwaga:** Unikać suchego wykazu plików — każda podsekcja kończy się **uzasadnieniem badawczym** decyzji.

---

### Rozdział 8. Wyniki badań

8.1. Charakterystyka próby i jakość danych (completion rate, attrition)  
8.2. **H1** — walidacja zgamifikowanych instrumentów (PRS grid, biophilia, Tinder)  
8.3. **H2** — PRS pre/post po ekspozycji na wizualizacje AI  
8.4. **H3** — implicit vs explicit vs satysfakcja (macierz, wybór ślepy)  
8.5. **H4** — Big Five / facety a preferencje i wybór wariantów personality  
8.6. **H5** — predykcja z wskaźników behawioralnych  
8.7. Analizy dodatkowe — konflikty preferencji, ścieżka Fast vs Full  
8.8. Podsumowanie wyników — tabela: hipoteza | wynik | istotność  

**Dlaczego jeden rozdział:** Wspólna próba, wspólna platforma, spójna statystyka. Podrozdziały = hipotezy.

**Status:** Rozdział **do uzupełnienia po zbieraniu danych** — w konspekcie zaznaczyć jako „szkielet”.

---

### Rozdział 9. Dyskusja

9.1. Interpretacja wyników w świetle literatury (rozdz. 2–5)  
9.2. Wkład metodologiczny RtD — co wnosi artefakt IDA  
9.3. Wkład praktyczny — implikacje dla projektowania wnętrz i narzędzi AI  
9.4. Ograniczenia (próba, kultura, język PL/EN, jakość generacji AI)  
9.5. Zagrożenia etyczne (personalizacja oparta na osobowości, przejrzystość algorytmu)  
9.6. Kierunki dalszych badań (multi-room, VR, longitudinalne badania)  

**Dlaczego osobna dyskusja:** Rozdział wyników = fakty; dyskusja = **znaczenie** i konfrontacja z tezą. Wymóg standardowy wytycznych doktorskich.

---

### Rozdział 10. Wnioski końcowe

10.1. Realizacja celu pracy  
10.2. Odpowiedź na pytania badawcze  
10.3. Oryginalność i naukowy wkład pracy  
10.4. Rekomendacje dla projektantów, badaczy HCI i psychologii środowiskowej  

**Dlaczego krótki rozdział:** Synteza bez powtarzania dyskusji — zgodnie z wytycznymi (2–5 wniosków uogólniających).

---

### Część końcowa

- **Bibliografia** (Vancouver lub wymagany przez ASP styl)  
- **Załączniki** (propozycja):
  - A. Schemat bazy danych badawczych (uproszczony)
  - B. Treść kwestionariuszy / ekranów (PRS grid, przykładowe itemy IPIP)
  - C. Mapowanie facetów → parametry promptu (z `research-mappings`)
  - D. Przykładowe prompty i warianty macierzy
  - E. Lista zmiennych eksportowanych do analizy
  - F. Zgoda badawcza / klauzula informacyjna (wersja skrócona)
  - G. Wykaz publikacji / komunikatów konferencyjnych (jeśli powstaną)

**Dlaczego załączniki:** Część techniczna i proceduralna **nie pęcznieje** rozdziałów merytorycznych; spełnia wymóg powtarzalności badań.

---

## 5. Mapowanie: rozdziały ↔ elementy platformy ↔ hipotezy

| Element platformy IDA | Rozdział teoretyczny | Rozdział metody / artefakt | Hipoteza |
|----------------------|----------------------|----------------------------|----------|
| PRS mood grid pre/post | Rozdz. 2 | Rozdz. 6, 7 | H2 |
| Biophilia (4 opcje) | Rozdz. 2 | Rozdz. 6, 7 | H1 |
| Tinder / IAT + behavioral tracking | Rozdz. 3 | Rozdz. 6, 7 | H3, H5 |
| Semantic differential, sensory | Rozdz. 3 | Rozdz. 7 | H3 |
| Laddering | Rozdz. 3 | Rozdz. 7 | — (wspiera mixed_functional) |
| IPIP-NEO-120 | Rozdz. 4 | Rozdz. 6, 7 | H4 |
| Macierz 6 źródeł, ślepy wybór | Rozdz. 5 | Rozdz. 7 | H3, H4 |
| Prompt synthesis / explainability | Rozdz. 5 | Rozdz. 7 | wkład metodologiczny |
| Onboarding / consent / GCP | Rozdz. 5 | Rozdz. 6 | etyka |
| Awatar IDA, glass UI | Rozdz. 5 | Rozdz. 7 | H1 (gamifikacja) |

---

## 6. Proponowana kolejność pisania (harmonogram roboczy)

| Kolejność | Rozdział | Uzasadnienie |
|-----------|----------|--------------|
| 1 | Rozdz. 6 Metodologia (szkic) | Ustalasz procedurę zanim zbierzesz pełne dane |
| 2 | Rozdz. 7 Artefakt IDA | Opisujesz to, co już działa — materiał „na gotowo” |
| 3 | Rozdz. 2–5 Teoria | Piszesz w miarę przeglądu literatury; wspiera metodologię |
| 4 | Rozdz. 1 Wprowadzenie | Łatwiej na końcu, gdy znasz dokładny zakres |
| 5 | Rozdz. 8 Wyniki | Po zebraniu i analizie danych |
| 6 | Rozdz. 9–10 Dyskusja i wnioski | Na końcu |
| 7 | Streszczenia, spisy, załączniki | Formalia |

---

## 7. Otwarte decyzje do konsultacji z promotorem

1. **Tytuł rozdz. 7** — „Projekt platformy IDA” vs „Artefakt badawczy IDA” (drugi lepiej brzmi na ASP).
2. **Główna teza** — czy centrum ciężkości to RtD + artefakt, czy empiryczna dominacja H3 (implicit vs explicit)?
3. **Rozdział techniczny** — ile kodu / schematów w tekście głównym vs załącznik?
4. **Fast Track** — czy uwzględnić w metodologii jako grupę kontrolną „niskiego zaangażowania”?
5. **Dyscyplina naukowa** — dopasowanie słownictwa (architektura wnętrz vs nauki o sztuce vs informatyka).
6. **Publikacje** — czy rozdział 8 ma odzwierciedlać plan 4 artykułów z `DEEP_PERSONALIZATION_README.md`?

---

## 8. Źródła wewnętrzne projektu (do cytowania przy pisaniu)

| Dokument | Zastosowanie w pracy |
|----------|---------------------|
| `PODSUMOWANIE_PROJEKTU.md` | Hipotezy, struktura danych, wkład naukowy |
| `docs/MASTER_PLAN.md` | Flow użytkownika, instrumenty, filozofia |
| `DEEP_PERSONALIZATION_README.md` | Architektura 4 warstw, plan publikacji |
| `docs/archive/deep-personalization-architecture.md` | Szczegóły pipeline promptów |
| `apps/frontend/src/app/o-projecie/page.tsx` | Tytuł, promotor, zakres badawczy |
| `apps/frontend/src/lib/prompt-synthesis/` | Operacjonalizacja mapowań |
| `infra/gcp/sql/01_research_schema.sql` | Schemat danych badawczych |
| `docs/gcp-data-verification/` | Procedury weryfikacji i eksportu |

---

## 9. Wersjonowanie tego dokumentu

| Wersja | Data | Zmiany |
|--------|------|--------|
| 0.1 | 2026-06-29 | Pierwsza wersja robocza po analizie projektu i wytycznych |

---

*Dokument roboczy — do iteracji z promotorem. Nie stanowi ostatecznego konspektu formalnego.*
