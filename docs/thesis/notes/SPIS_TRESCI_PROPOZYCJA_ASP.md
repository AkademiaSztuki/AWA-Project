# Propozycja spisu treści — doktorat ASP (wersja 0.2)

**Status:** propozycja do konsultacji z promotorem  
**Data:** 2026-08-02  
**Branch:** `pisemna`  
**Autor:** Jakub Palka  
**Promotor:** prof. dr hab. Andreas Guskos  
**Uczelnia / dyscyplina:** Akademia Sztuki w Szczecinie — *Sztuki plastyczne i konserwacja dzieł sztuki*  
**Tytuł roboczy:** *IDA: projekt eksperymentalnej platformy badawczej do personalizacji koncepcji wnętrz na podstawie preferencji estetycznych wspomaganej sztuczną inteligencją*

---

## 0. Założenia tej propozycji (po przeglądzie projektu)

### Co projekt **jest** (w repo / produkcie)

1. **Artefakt RtD** — platforma IDA (flow Fast/Full, awatar, glass UI, macierz 6 źródeł).
2. **Instrumentarium preferencji** — PRS/mood grid, biophilia, Tinder (IAT-like), semantic differential, laddering, IPIP-NEO-120, inspiracje.
3. **Explainable personalization** — scoring → builder promptu (JSON v3) → generacja img2img.
4. **Linia generatywna:** Modal + FLUX (archiwum) → Vertex / Gemini Image („Nano Banana”) + Flash Lite (analiza pokoju/inspiracji).
5. **Ewaluacja terenowa** — dane w GCP; pytania RQ1–RQ6 (rewizja hipotez 2026-06-29).

### Czego **nie ma w kodzie**, a ma być w rozprawie (Twoja deklaracja + sens dla ASP)

Eksperymenty **poza produkcyjnym IDA** (pracownia autora):

- **ComfyUI** — testowanie modeli i grafów (SDXL / FLUX / warianty img2img, LoRA, ControlNet itd.),
- **kontrola geometrii przestrzeni:** mapy głębokości (*depth*), krawędzie, normal maps,
- **segmentacja** (m.in. **SAM / SAM2**) — maski mebli / ścian / stref do restylizacji,
- inne narzędzia CV typowe dla „AI dla architektury wnętrz”.

**Decyzja strukturalna:** te treści nie mogą być „wtrącone” do rozdziału o kodzie Next.js. Dostają **własny rozdział praktyki medialnej / pracowni generatywnej**, który:

- pokazuje kompetencję i proces artysty–projektanta,
- uzasadnia późniejsze wybory w IDA (dlaczego *prompt+photo* zamiast pełnego ControlNet w produkcie; jak rozumiesz wierność geometrii pokoju),
- broni doktoratu **na akademii sztuki**, a nie tylko w HCI.

### Co komisja ASP powinna zobaczyć w układzie

| Oczekiwanie ASP | Jak odpowiadamy w TOC |
|-----------------|------------------------|
| Artefakt i proces projektowy jako wkład | Rozdz. 6–8 (pracownia → IDA → dramaturgia) |
| Refleksja o obrazie, przestrzeni, autorstwie | Rozdz. 3–4, 9 |
| Język dyscypliny sztuki / designu | Rozdz. 1–2, 9 (nie sam żargon ML) |
| Powtarzalność / ewaluacja | Rozdz. 5, 10 (jako ewaluacja artefaktu) |
| Opis projektu jako całości | Rozdz. 7–8 + załączniki |

### Relacja do starego spisu (`SPIS_TRESCI_ROBOCZY.md`)

Stary układ (4 rozdziały teorii psychologicznej → metodologia → artefakt → wyniki) jest **zbyt „psychologiczno-HCI”** jak na ASP. Nowa propozycja:

- skraca psychologię do **ramy projektowania**,
- **podnosi** medium generatywne i ComfyUI,
- czyni **artefakt IDA** centrum rozprawy,
- empirię traktuje jako **ewaluację projektu**, nie jako jedyny dowód.

---

## 1. Teza (robocza, wersja pod ASP)

> Platforma IDA — jako artefakt Research through Design — pokazuje, że personalizacja koncepcji wnętrz może być projektowana jako **dialog estetyczny** (preferencje jawne/ukryte, nastrój, funkcja, osobowość) przełożony na **kontrolowaną syntezę obrazu**, a nie jako „czarna skrzynka” generatora. Praktyka z modelami dyfuzyjnymi (ComfyUI, kontrola geometrii, segmentacja) oraz produkcyjny pipeline IDA (synteza promptu → img2img) stanowią łącznie autorską metodę łączenia **projektowania wnętrz, psychologii środowiskowej i mediów generatywnych**.

Oś empiryczna (nie jedyna): **RQ2–RQ3** — rozbieżność implicit/explicit oraz wybór źródła w ślepej macierzy 6 wariantów (`HIPOTEZY_REWIZJA.md`).

---

## 2. Proponowany spis treści (szczegółowy)

### Część wstępna

0. Strona tytułowa (Akademia Sztuki w Szczecinie; dyscyplina; promotor)  
1. Spis treści  
2. Spis rycin, tabel, diagramów workflow  
3. Wykaz skrótów (RtD, PRS, IAT, IPIP, FLUX, ControlNet, SAM2, VLM, XAI…)  
4. Streszczenie (PL, ≤300 słów)  
5. Abstract (EN)

---

### Rozdział 1. Wprowadzenie — przestrzeń, preferencje, obraz generatywny

**Cel:** postawić problem **ze sztuki / architektury wnętrz**, nie katalog funkcji aplikacji.

1.1. Wnętrze jako doświadczenie i obraz — od projektu do wizualizacji  
1.2. Personalizacja estetyczna a „AI interior tools” (luka: brak dialogu badawczego)  
1.3. Problem rozbieżności deklaracji i zachowania w wyborach estetycznych  
1.4. Cel, zakres i pytania badawcze (RQ1–RQ6 — skrót; pełnia w rozdz. 5)  
1.5. Teza pracy  
1.6. Pozycja metodologiczna: Research through Design / research *through* / *for* / *into* design  
1.7. Wkład własny (projektowy, medialny, badawczy)  
1.8. Struktura rozprawy  

**Materiał z projektu:** `/o-projecie`, landing, tytuł, biografia autora (AW ASP, XR/AI, Syntopia).

---

### Rozdział 2. Projektowanie wnętrz, psychologia środowiskowa i doświadczenie przestrzeni

**Cel:** rama dyscyplinowa ASP + uzasadnienie PRS/biophilia/funkcji (bez „podręcznika psychologii”).

2.1. Architektura wnętrz wobec mediów cyfrowych i wizualizacji koncepcyjnych  
2.2. Środowiska regeneracyjne (ART/SRT) i percepcja wnętrza  
2.3. Postrzegana regeneracyjność (PRS) jako kategoria projektowa, nie tylko skala  
2.4. Biophilia i materiałowość — od teorii do parametrów obrazu wnętrza  
2.5. Nastrój, funkcja, rytuały domowe (PEO / pokrewne)  
2.6. Implikacje: co musi „wiedzieć” system personalizacji, zanim wygeneruje obraz  

**Powiązanie z IDA:** mood grid, biophilia, Room Setup, źródło `mixed_functional`.

---

### Rozdział 3. Preferencje estetyczne i osobowość jako tworzywo projektu

**Cel:** jeden zwarty rozdział zamiast trzech osobnych „teorii” — mniej HCI-handbook, więcej operacjonalizacji dla projektanta.

3.1. Preferencje jawne: deklaracja, semantic differential, rankingi, inspiracje  
3.2. Preferencje ukryte i behawioralne: IAT → gest Tindera; czas reakcji; limity pomiaru  
3.3. Rozbieżność implicit/explicit jako dramaturgia poznania własnego gustu  
3.4. Means-end laddering — od atrybutu do wartości w dialogu o pokoju  
3.5. Big Five / IPIP-NEO-120 — osobowość jako **hipoteza projektowa**, nie wyrok estetyczny  
3.6. Krytyka determinizmu „osobowość → styl”; etyczne granice personalizacji  
3.7. Model wieloźródłowy preferencji (mapa → macierz 6 źródeł)  

**Powiązanie z IDA:** Tinder, slidery, laddering, Big Five, `preference_comparison_json`.

---

### Rozdział 4. Sztuczna inteligencja dyfuzyjna dla architektury wnętrz — medium i praktyka

**Cel:** rozdział **ze sztuki mediów / praktyki obrazu** — tu wchodzi ComfyUI, modele, SAM2, depth. To opisuje Twoją pracownię i stan dziedziny, nie tylko stack produkcyjny IDA.

4.1. Generatywne modele obrazu jako nowe medium wizualizacji wnętrz  
4.2. Od text-to-image do image-to-image: zachowanie geometrii pokoju jako problem projektowy  
4.3. **Pracownia ComfyUI** — grafy, iteracje, testowanie modeli (autorski proces)  
  4.3.1. Dobór i porównanie modeli (m.in. linie SDXL / FLUX / warianty edycyjne)  
  4.3.2. LoRA / style adapters — kontrola „charakteru” wizualizacji vs wierność zdjęciu  
  4.3.3. Workflow img2img i multi-reference (inspiracje jako referencje)  
4.4. **Kontrola struktury przestrzeni**  
  4.4.1. Mapy głębokości (*depth*) i ich znaczenie dla zachowania układu pomieszczenia  
  4.4.2. Krawędzie / normal maps / inne conditioningi (ControlNet i pokrewne)  
  4.4.3. Segmentacja (**SAM / SAM2**) — maski mebli, ścian, stref; restylizacja selektywna  
4.5. Inpainting, „empty shell” i usuwanie warstwy wyposażenia — od maski do promptu systemowego  
4.6. VLM / opis przestrzeni — od „zrozumienia zdjęcia” do briefu projektowego  
4.7. Krytyka medium: halucynacje geometrii, estetyka „AI look”, autorstwo i odpowiedzialność projektanta  
4.8. Synteza: kryteria jakości wizualizacji koncepcyjnej wnętrza (checklista autorska)  

**Uwaga metodologiczna (wpisać w tekście wprost):**  
eksperymenty ComfyUI/SAM2/depth stanowią **warstwę praktyki i badań wstępnych autora**; produkcyjny IDA operuje uproszczonym, skalowalnym pipeline’em (najpierw FLUX/Modal, obecnie Gemini Image + synteza promptu). Rozdział 4 uzasadnia *wiedzę praktyczną*, rozdział 7–8 — *artefakt terenowy*.

**Materiał do załącznika / portfolio rycin:** screeny grafów ComfyUI, porównania depth/SAM, przed–po, nieudane geometrie (ważne dla ASP!).

---

### Rozdział 5. Metodologia — Research through Design i ewaluacja terenowa

**Cel:** procedura badawcza czytelna dla komisji interdyscyplinarnej.

5.1. RtD jako metoda: artefakt = argument  
5.2. Trzy warstwy dowodu w tej pracy: (A) proces/pracownia, (B) artefakt IDA, (C) ewaluacja użytkowników  
5.3. Projekt badania: pilotaż → zbieranie → analiza  
5.4. Uczestnicy, etyka, RODO, zgoda  
5.5. Procedura Fast vs Full; ślepa macierz 6 źródeł jako eksperyment *w formie*  
5.6. Instrumenty — tabela: narzędzie | tradycja | forma w IDA | zmienne  
5.7. Pytania RQ1–RQ6 i plan analiz (zgodnie z `HIPOTEZY_REWIZJA.md`)  
5.8. Ograniczenia (N, self-selection, brak lab randomizacji; rozdział 4 ≠ eksperyment kontrolowany)  

---

### Rozdział 6. Koncepcja platformy IDA — od intencji projektowej do dramaturgii doświadczenia

**Cel:** „co to jest jako dzieło / produkt badawczy” zanim wejdziemy w implementację.

6.1. Filozofia: Product-First · Research-Embedded · Minimalist Glass Design  
6.2. IDA jako dialog, nie kalkulator stylu  
6.3. Awatar / przewodniczka — postać mediująca (głos, obecność, rytuał przejść)  
6.4. Język wizualny: glass, typografia, ruch, zakaz szumu (emoji/ikony) — decyzje formalne  
6.5. Gamifikacja skal jako gest projektowy (mood grid, dawki biophilii, Tinder)  
6.6. Dual path Fast/Full — kompromis między głębokością a dostępnością  
6.7. Pozycjonowanie wobec konsumenckich AI do wnętrz  

**Materiał:** `MASTER_PLAN.md`, `IDA_DIALOGUE_SCRIPT.md`, marketing entry, design system.

---

### Rozdział 7. Budowa artefaktu — architektura doświadczenia i synteza koncepcji

**Cel:** opis projektu (to, o co prosisz: „żeby to był też opis projektu”), ale zawsze z uzasadnieniem badawczo-projektowym.

7.1. Architektura systemu (frontend, GCP, generacja obrazów) — poziom koncepcyjny  
7.2. Ścieżka użytkownika: zgoda → profil → pokój → macierz → feedback (diagram)  
7.3. Warstwy danych: użytkownik → gospodarstwo → pokój → sesja  
7.4. Analiza zdjęcia pokoju i inspiracji (VLM) jako wejście do briefu  
7.5. Pipeline syntezy promptów: scoring → builder (JSON v3, `preserve` geometrii) → generacja  
7.6. Macierz sześciu źródeł: `implicit`, `explicit`, `personality`, `mixed`, `mixed_functional`, `inspiration_reference`  
7.7. Ślepy wybór i dramaturgia „odkrywania” własnych preferencji  
7.8. Empty shell / restylizacja — jak IDA rozwiązuje problem mebli bez pełnego stacku ControlNet  
7.9. Ewolucja techniczna jako proces twórczy: Aura → IDA; FLUX/Modal → Gemini/Vertex  
7.10. Relacja rozdz. 4 → 7: które wnioski z ComfyUI weszły do produktu, które świadomie odrzucono (skalowalność, UX, powtarzalność badania)

**Kluczowe pliki do cytowania:** `prompt-synthesis/*`, `google-ai/client.ts`, `modes.ts`, archiwum `docs/archive/modal-backend/`.

---

### Rozdział 8. IDA jako opisane dzieło — dokumentacja decyzji i kompromisów

**Cel:** rozdział „projektowy” typowy dla ASP (design rationale), oddzielony od suchej implementacji.

8.1. Kryteria sukcesu artefaktu (estetyczne, etyczne, badawcze, produktowe)  
8.2. Iteracje i odrzucone ścieżki (MiniCPM, osobny LLM refine, parametry FLUX strength/steps w UI…)  
8.3. Kompromisy: długość flow vs dropout; wierność skali vs przyjemność; kontrola geometrii vs prostota  
8.4. Autorstwo przy współtworzeniu z modelem — kto jest autorem koncepcji wnętrza?  
8.5. Status wizualizacji: koncepcja / mood image / dokumentacja projektowa  
8.6. Portfolio wybranych przebiegów (ryciny: wejście → macierz → wybór)  

*Uwaga:* jeśli promotor woli mniej rozdziałów, 6–8 można scalić do dwóch („Koncepcja” + „Realizacja”). Przy doktoracie ASP **warto utrzymać osobny rozdział rationale**.

---

### Rozdział 9. Dyskusja — sztuka, design, technologia

9.1. Interpretacja ewaluacji (skrót wyników — pełne tabele w rozdz. 10) w świetle rozdz. 2–4  
9.2. Wkład dla architektury wnętrz i praktyki projektowej  
9.3. Wkład dla design research / HCI (macierz źródeł, explainable brief)  
9.4. Medium dyfuzyjne: co zmienia w kulturze wizualizacji przestrzeni  
9.5. Etyka: osobowość, manipulacja gustem, RODO, transparentność  
9.6. Ograniczenia pracy i artefaktu  
9.7. Kierunki: głębsza kontrola geometrii (powrót wniosków z SAM/depth?), VR/XR, badania longitudinalne  

---

### Rozdział 10. Ewaluacja empiryczna (pilotaż i plan główny)

**Cel:** nie „chować” wyników, ale **nie pozwalać im zdominować** doktoratu ze sztuki.

10.1. Charakterystyka próby i lejek ukończenia (RQ1)  
10.2. Rozbieżność implicit/explicit (RQ2)  
10.3. Wybory w ślepej macierzy 6 źródeł (RQ3) — wynik główny  
10.4. Osobowość — eksploracje (RQ4)  
10.5. PRS current→target a `mixed_functional` (RQ5)  
10.6. Agency / clarity / satisfaction (RQ6)  
10.7. Podsumowanie: tabela RQ | wynik | ograniczenie  

*Alternatywa kolejności (do decyzji z promotorem):* zamienić 9↔10 (najpierw wyniki, potem dyskusja) — klasycznie akademicko. Wariant powyżej lepiej czyta się na ASP (najpierw znaczenie, potem tabele) **tylko jeśli** wyniki są krótko zapowiedziane wcześniej; bezpieczniej: **10 = wyniki, 9 = dyskusja** w klasycznym porządku.  
**Rekomendacja finalna:** przy oddaniu użyć porządku klasycznego: **… 8 artefakt → 9 wyniki → 10 dyskusja → 11 wnioski**. Poniżej wariant skondensowany do 10 rozdziałów roboczych.

---

### Rozdział 11 (lub zakończenie rozdz. 10). Wnioski

11.1. Realizacja celu i odpowiedź na pytania  
11.2. Oryginalność wkładu w dyscyplinie sztuk  
11.3. Rekomendacje dla projektantów wnętrz, twórców narzędzi AI i badaczy  
11.4. Ciąg dalszy praktyki i badań  

---

### Część końcowa

- **Bibliografia** (styl do ustalenia z ASP; roboczo: autorsko-roczny)  
- **Załączniki**  
  - A. Schemat danych badawczych (uproszczony)  
  - B. Instrumenty / treść ekranów (skróty, licencje)  
  - C. Mapowanie facetów → parametry promptu  
  - D. Przykładowe prompty i 6 wariantów macierzy  
  - E. Słownik zmiennych  
  - F. Zgoda badawcza (skrót)  
  - **G. Portfolio pracowni ComfyUI** — wybrane grafy, porównania modeli, depth/SAM, nieudane geometrie  
  - **H. Wybrane przebiegi IDA** (anonymized screenshots / sekwencje)

---

## 3. Wariant skondensowany (jeśli ASP limituje objętość)

| Rozdz. | Tytuł |
|--------|--------|
| 1 | Wprowadzenie |
| 2 | Przestrzeń, regeneracyjność, preferencje (teoria projektowa) |
| 3 | Medium: AI dyfuzyjne, ComfyUI, kontrola geometrii (SAM2, depth…) |
| 4 | Metodologia RtD + ewaluacja |
| 5 | Artefakt IDA — koncepcja, dramaturgia, awatar |
| 6 | Realizacja — pipeline, macierz 6 źródeł, ewolucja FLUX→Gemini |
| 7 | Wyniki ewaluacji (RQ1–6) |
| 8 | Dyskusja i wnioski |

Załącznik G (ComfyUI) zostaje **obowiązkowy** także w wariancie krótkim.

---

## 4. Mapowanie: nowy TOC ↔ obecne pliki LaTeX

| Nowy rozdział | Proponowany plik | Pas agenta |
|---------------|------------------|------------|
| 1 Wprowadzenie | `chapters/01-wprowadzenie.tex` | framing |
| 2 Przestrzeń / psych. środowiskowa | `02-psychologia-srodowiskowa.tex` (przepić tytuł) | theory-a |
| 3 Preferencje + osobowość | scalenie `03`+`04` → np. `03-preferencje-i-osobowosc.tex` | theory-a / theory-b |
| 4 Medium dyfuzyjne + ComfyUI | **nowy** `04-medium-dyfuzyjne-comfyui.tex` | **media-lab** (nowy pas) |
| 5 Metodologia | `06-metodologia.tex` → przenieść numerację | methods |
| 6 Koncepcja IDA | wydzielić z `07` | artifact |
| 7 Budowa / pipeline | reszta `07` + AI z `05` | artifact |
| 8 Design rationale | **nowy** lub sekcje `07`/`08` | artifact |
| 9–10 Wyniki + dyskusja | `08`, `09` | empirical |
| Wnioski | `10-wnioski.tex` | empirical |

**Nowy OWNER w `AGENTS.md`:** `media-lab` — rozdz. o ComfyUI/SAM/depth + załącznik G (nie rusza kodu `apps/`).

---

## 5. Czego świadomie **nie** robimy

1. Nie udajemy, że ComfyUI/SAM2 są w produkcyjnym IDA — opisujemy je jako **pracownię i genealogię decyzji**.  
2. Nie piszemy doktoratu jako dokumentacji startupu (billing, kredyty — tylko kontekst infrastrukturalny).  
3. Nie zostawiamy starych H1–H5 jako głównej osi (zastąpione przez RQ1–6).  
4. Nie rozdmuchujemy rozdziału o Big Five ponad miarę — na ASP to wątek wspierający.

---

## 6. Materiały, które trzeba **dostarczyć do rozdz. 4 / zał. G** (od Ciebie)

Checklist do zbierania (nawet lokalnie do `docs/thesis/figures/comfyui/`):

- [ ] 3–6 reprezentatywnych grafów ComfyUI (export PNG/JSON)  
- [ ] porównania: ten sam room photo × różne modele  
- [ ] przykłady depth / canny / SAM2 mask → wynik  
- [ ] przykłady **porażek geometrii** (ważne krytycznie)  
- [ ] krótka notatka: które wnioski przeniosłeś do IDA, które odrzuciłeś i dlaczego  
- [ ] daty / okres eksperymentów (dla chronologii Aura→IDA)

Bez tego rozdział 4 będzie pusty narracyjnie — a to właśnie on „trzyma” doktorat po stronie sztuki mediów.

---

## 7. Pytania do promotora (priorytet)

1. Czy akceptuje **osobny rozdział praktyki ComfyUI/CV** jako równorzędny wobec ewaluacji użytkowników?  
2. Monografia zwarta vs cykl publikacji?  
3. Tytuł rozdziału o IDA: „Artefakt badawczy” vs „Projekt platformy”?  
4. Czy wracamy do pomiaru PRS *po* ekspozycji na wizualizację (mocniejszy wątek regeneracyjności)?  
5. Wymagany styl bibliografii / szablon ASP?  
6. Czy portfolio ComfyUI ma charakter załącznika, czy części wystawy / aneksu artystycznego?

---

## 8. Rekomendowana kolejność pisania (multi-agent)

| Kolejność | Rozdział | Pas |
|-----------|----------|-----|
| 1 | 4 Medium + ComfyUI (szkielet + miejsce na ryciny) | `media-lab` |
| 2 | 6–7 Koncepcja i budowa IDA | `artifact` |
| 3 | 5 Metodologia + RQ | `methods` |
| 4 | 2–3 Teoria projektowa | `theory-a` / `theory-b` |
| 5 | 1 Wprowadzenie | `framing` |
| 6 | 10 Wyniki (gdy dane) | `empirical` |
| 7 | 9 Dyskusja + wnioski | `empirical` + `framing` |

---

## 9. Werdykt

**Proponuję przejść ze spisu „psychologia → HCI → apka → statystyka” na spis:**

**przestrzeń i doświadczenie → medium generatywne (ComfyUI/SAM/depth) → metoda RtD → artefakt IDA (opis projektu) → ewaluacja → dyskusja w dyscyplinie sztuk.**

To lepiej broni doktoratu na Akademii Sztuki, respektuje realny kod IDA i jednocześnie daje miejsce na Twoją praktykę z modelami dyfuzyjnymi.

---

*Dokument roboczy — następny krok po akceptacji: przebudowa `main.tex` + plików rozdziałów i aktualizacja `AGENTS.md` (pas `media-lab`).*
