# Spis treści szczegółowy — rozprawa IDA (ASP)

**Status:** kanon roboczy do pisania multi-agentowego  
**Data:** 2026-08-02  
**Branch:** `pisemna`  
**Folder kanoniczny:** `docs/thesis/`  
**Słownik:** `GLOSSARY.md` · **Prompty:** `notes/MULTIAGENT_PROMPTS.md`  
**RQ:** wyłącznie RQ1–RQ6 (`notes/HIPOTEZY_REWIZJA.md`)  
**Silnik produkcji IDA:** Gemini / Vertex (nie FLUX). **ComfyUI/SAM/depth:** pracownia autora.

Każdy podrozdział ma: cel → treść → źródła (kierunki researchu) → ryciny/tabele → OWNER → plik.

---

## Część wstępna

| Element | Treść | OWNER | Plik |
|---------|--------|-------|------|
| Strona tytułowa | AS w Szczecinie, tytuł z `metadata.tex`, promotor Guskos | framing | `frontmatter/title.tex` |
| Streszczenie PL | ≤300 słów: problem→cel→metoda→artefakt→wyniki→wnioski | framing | `frontmatter/abstract.tex` |
| Abstract EN | lustrzane | framing | j.w. |
| Wykaz skrótów | sync z `GLOSSARY.md` | framing | `frontmatter/abbreviations.tex` |
| Spisy rycin/tabel | generowane LaTeX | — | `main.tex` |

---

## Rozdział 1. Wprowadzenie — przestrzeń, preferencje, obraz generatywny

**OWNER:** `framing` · **Plik:** `chapters/01-wprowadzenie.tex`  
**Cel rozdziału:** problem ze sztuki / architektury wnętrz; teza; mapa pracy. Bez katalogu feature’ów.

### 1.1. Wnętrze jako doświadczenie i obraz
- **Treść:** od projektu wnętrza do wizualizacji koncepcyjnej; obraz jako medium decyzji estetycznej.
- **Research:** literatura o wizualizacji architektonicznej, representation in design, kultura renderu.
- **Szukaj m.in.:** architectural visualization history; design representation Schön; „rendering culture”.
- **Rycina:** opcjonalnie — para foto pokoju vs wizualizacja koncepcyjna (własna, podpisana).

### 1.2. Personalizacja estetyczna a konsumenckie „AI interior tools”
- **Treść:** luka: narzędzia generują „ładnie”, rzadko badają preferencje / dialog / powtarzalność.
- **Research:** przegląd kategorii produktów (bez reklamowych claimów bez źródła); papers o GenAI + interior/architecture.
- **Szukaj:** generative AI interior design survey; text-to-image architecture review (2023–2026).

### 1.3. Rozbieżność deklaracji i zachowania
- **Treść:** problem dual-process / implicit vs explicit w wyborach estetycznych → uzasadnienie IDA.
- **Źródła kanoniczne do zweryfikowania:** Kahneman; Greenwald IAT; literatura preference construction.
- **Zakaz:** twierdzić, że IDA „udowodniło” dominację implicit — to RQ2/RQ3 do ewaluacji.

### 1.4. Cel, zakres, pytania (RQ1–RQ6 — skrót)
- Pełna operacjonalizacja w rozdz. 5; tu lista + jedno zdanie na RQ.
- **Źródło wewnętrzne:** `HIPOTEZY_REWIZJA.md` (nie stare H1–H5).

### 1.5. Teza główna
- Tekst z `SPIS_TRESCI_PROPOZYCJA_ASP.md` §1 / `GLOSSARY` — jedna wersja, bez parafraz rozjeżdżających sens.

### 1.6. Pozycja metodologiczna (RtD)
- Frayling / Zimmerman / research through–for–into design.
- **Źródła:** Zimmerman et al. 2007 CHI (już w `.bib`); Frayling 1993/94; ewentualnie Gaver, Koskinen.

### 1.7. Wkład własny
- (a) pracownia medialna ComfyUI/CV, (b) artefakt IDA, (c) ewaluacja terenowa RQ, (d) explainable brief.
- Bez zawyżania N ani claimów psychometrycznych.

### 1.8. Struktura rozprawy
- Mapa rozdziałów 2–10 w ½–1 stronie.

**STATUS docelowy po passie research:** `draft` (nie `final`).

---

## Rozdział 2. Projektowanie wnętrz, psychologia środowiskowa, doświadczenie przestrzeni

**OWNER:** `theory-a` · **Plik:** `chapters/02-psychologia-srodowiskowa.tex`  
**Cel:** rama ASP — przestrzeń i regeneracyjność jako kategorie projektowe.

### 2.1. Architektura wnętrz wobec mediów cyfrowych
- Cyfrowa wizualizacja w praktyce AW; status „koncepcji” vs dokumentacji.
- **Research:** design media; digital design practice interiors.

### 2.2. Środowiska regeneracyjne (ART / SRT)
- Kaplan ART; Ulrich SRT (stress reduction) — **cytaty z pierwotnych / przeglądów peer-review**.
- **Szukaj:** Kaplan 1995; Ulrich 1984/1991; reviews restorative environments.

### 2.3. PRS jako kategoria projektowa
- Hartig / Pasini — skala i wymiary; w IDA: ideal/current/target (nie pre/post AI).
- **Rycina/tabela:** wymiary PRS ↔ elementy mood grid w IDA.
- **Zakaz:** opisywać pomiar post-AI jako istniejący.

### 2.4. Biophilia i materiałowość
- Kellert biophilic design; przełożenie na parametry obrazu (zieleń, światło, materiał).
- **Źródła:** Kellert 2008 (+ nowsze reviews 2010s–2020s).

### 2.5. Nastrój, funkcja, rytuały domowe
- Funkcja pokoju, aktywności, pain points; PEO lub pokrewne ramy — tylko jeśli cytujesz konkretną pracę.
- **Powiązanie IDA:** Room Setup, laddering → `mixed_functional`.

### 2.6. Implikacje dla personalizacji obrazu
- Checklist: co system musi wiedzieć przed generacją (nastrój, funkcja, biophilia, geometria pokoju).
- **Tabela:** wejście projektowe → parametr briefu / źródła macierzy.

**Seed bib (weryfikuj DOI przed użyciem):** `kaplan1995restorative`, `hartig1997prs`, `kellert2008biophilic` w `references.bib`.

---

## Rozdział 3. Preferencje estetyczne i osobowość jako tworzywo projektu

**OWNER:** `theory-a` (+ `theory-b` dla Big Five w rozdz. 5)  
**Plik:** `chapters/03-preferencje-estetyczne.tex`  
**Cel:** operacjonalizacja dla projektanta; model wieloźródłowy.

### 3.1. Preferencje jawne (explicit)
- Semantic differential (Osgood — weryfikuj źródło), rankingi, upload inspiracji.
- **IDA:** slidery, paleta, materiały.

### 3.2. Preferencje ukryte i behawioralne
- IAT (Greenwald 1998 — w `.bib`); adaptacje HCI; swipe jako gest.
- Limity: `reaction_time_ms` jest; dwell/hesitation **nie** w DB — nie twierdź inaczej.
- **Rycina:** schemat Tinder-flow (własny diagram).

### 3.3. Rozbieżność implicit vs explicit
- Dual process; preference construction; konflikt jako dramaturgia poznania gustu.
- Most do RQ2.

### 3.4. Means-end laddering
- Reynolds & Gutman 1988 (weryfikuj); od atrybutu → konsekwencja → wartość.
- **IDA:** ladder w Room Setup.

### 3.5. Big Five / IPIP-NEO-120
- John/Soto lub Costa & McCrae — **peer-review**; IPIP jako instrument.
- Kanon: **IPIP-NEO-120** (nie IPIP-60 jako stan obecny).
- Osobowość = hipoteza projektowa, nie wyrok.

### 3.6. Krytyka determinizmu i etyka
- Ryzyko stereotypizacji stylu; zgoda; transparentność.
- **Research:** ethics of personality-based recommendation; fair ML (ostrożnie, z cytatami).

### 3.7. Model wieloźródłowy → macierz 6 źródeł
- Mapa: źródło danych → klucz `GenerationSource` (dokładnie 6 z `GLOSSARY`).
- **Tabela obowiązkowa** + odsyłacz do rozdz. 7.

**Seed bib:** `greenwald1998iat`, `kahneman2011thinking`, `john2008bigfive`.

---

## Rozdział 4. AI dyfuzyjna dla architektury wnętrz — medium i praktyka

**OWNER:** `media-lab` · **Plik:** `chapters/04-medium-dyfuzyjne-comfyui.tex` + zał. G  
**Cel:** rozdział ze sztuki mediów; ComfyUI; depth; SAM2; krytyka medium.

### 4.1. GenAI jako medium wizualizacji wnętrz
- Survey / kluczowe papers 2022–2026 o diffusion w architekturze/designie.
- **Zakaz:** cytować nieistniejące paper titles — tylko zweryfikowane DOI/arXiv.

### 4.2. T2I vs I2I — geometria pokoju jako problem projektowy
- Zachowanie layoutu, perspektyw, otworów; failure modes.
- **Ryciny:** 2–3 pary „udana / nieudana geometria” (własne z pracowni).

### 4.3. Pracownia ComfyUI
- **4.3.1** Porównanie modeli (SDXL / FLUX / edycyjne) — tabela kryteriów (wierność, styl, czas, kontrola).  
- **4.3.2** LoRA / adapters — charakter vs wierność.  
- **4.3.3** img2img + multi-reference.  
- **Ryciny obowiązkowe:** screenshot grafu ComfyUI; grid porównań modeli.  
- **Źródła:** dokumentacja modeli (Stability, Black Forest Labs, papiery FLUX/SDXL) + własne eksperymenty jako „materiały własne / obserwacje pracowni” (nie udawać peer-review).

### 4.4. Kontrola struktury przestrzeni
- **4.4.1 Depth maps** — po co w wnętrzach; typowe błędy.  
- **4.4.2 ControlNet / canny / normals** — conditioning.  
- **4.4.3 SAM / SAM2** — maski mebli/ścian/stref; paper Kirillov SAM + Ravi et al. SAM 2 (weryfikuj metadane).  
- **Ryciny:** depth overlay; maska SAM; wynik restylizacji strefy.

### 4.5. Inpainting / empty shell
- Od maski do „pustej skorupy”; most do rozwiązania produktowego IDA (prompt systemowy empty shell bez pełnego ControlNet).
- Jasno oddziel **pracownię** od **runtime IDA**.

### 4.6. VLM → brief projektowy
- Rola opisu przestrzeni; w IDA: Flash Lite analyze-room / inspiration.
- **Research:** papers VLM + design (ostrożnie z claimami).

### 4.7. Krytyka medium
- Halucynacje geometrii; „AI look”; autorstwo; odpowiedzialność projektanta.
- **Research:** critical AI & design; authorship generative art (np. liter. z design research / media theory — z DOI).

### 4.8. Checklista jakości wizualizacji koncepcyjnej
- Autorskie kryteria (geometria, światło, materiał, zgodność z briefem, czytelność funkcji).

**Załącznik G (portfolio):** `figures/comfyui/` — grafy, depth, SAM, porażki.

---

## Rozdział 5. Metodologia — RtD i ewaluacja terenowa

**OWNER:** `methods` · **Plik:** `chapters/06-metodologia.tex` *(numer pliku legacy — treść = rozdz. metodologii)*  
**Cel:** powtarzalność; etyka; RQ.

### 5.1. RtD: artefakt = argument
- Zimmerman + uzupełnienia (np. design research methodology books — z cytatem).

### 5.2. Trzy warstwy dowodu
- (A) pracownia, (B) artefakt IDA, (C) ewaluacja użytkowników.

### 5.3. Fazy badania
- Pilotaż (~N opisowe) → główne zbieranie → analiza.

### 5.4. Uczestnicy, RODO, zgoda
- Consent version; `user_hash`; wycofanie.
- **Źródła:** RODO art. 13 (akt prawny); wytyczne etyczne badań online (np. AoIR — weryfikuj).
- Załącznik F.

### 5.5. Procedura Fast vs Full; ślepa macierz
- Diagram procedury (rycina obowiązkowa).

### 5.6. Instrumenty — tabela master
- Kolumny: narzędzie | źródło naukowe | forma IDA | zmienne | limity.
- Załącznik B.

### 5.7. RQ1–RQ6 i plan analiz
- 1:1 z `HIPOTEZY_REWIZJA.md`.
- **Tabela:** RQ | hipoteza robocza | zmienne | test przy małym N vs docelowym N.

### 5.8. Ograniczenia
- Self-selection; brak lab; rozdz. 4 ≠ RCT; N pilotażu.

---

## Rozdział 6. Koncepcja IDA — intencja i dramaturgia

**OWNER:** `artifact` · **Plik:** część `chapters/07-artefakt-ida.tex` (sekcje koncepcyjne) + materiały `MASTER_PLAN`, `IDA_DIALOGUE_SCRIPT`  
**Cel:** IDA jako dzieło / doświadczenie.

### 6.1. Product-First · Research-Embedded · Minimalist Glass Design
### 6.2. Dialog, nie kalkulator stylu
### 6.3. Awatar / przewodniczka jako postać mediująca
- Rycina: still awatara + podpis roli (nie „maskotka”).
### 6.4. Język wizualny (glass, typografia, ruch)
- Rycina: moodboard UI / 2–3 ekrany (własne screenshoty).
### 6.5. Gamifikacja skal jako gest projektowy
### 6.6. Fast vs Full — kompromis głębokość/dostępność
### 6.7. Pozycjonowanie vs konsumenckie AI

**Research zewnętrzny:** gamification in research instruments; character-based interfaces in HCI — z cytatami.  
**Wewnętrzny:** `docs/MASTER_PLAN.md`, `docs/IDA_DIALOGUE_SCRIPT.md`, landing.

---

## Rozdział 7. Budowa artefaktu — pipeline i macierz

**OWNER:** `artifact` · **Plik:** `chapters/07-artefakt-ida.tex` (+ seed z `_archive-05-ai-hci.tex`)  
**Cel:** opis projektu z uzasadnieniem; zgodność z kodem.

### 7.1. Architektura systemu (koncepcyjnie)
- Frontend · GCP · Vertex generacja — **rycina architektury**.

### 7.2. Ścieżka użytkownika (diagram flow)
### 7.3. Warstwy danych USER→HOUSEHOLD→ROOM→SESSION
### 7.4. Analiza zdjęcia i inspiracji (VLM)
### 7.5. Synteza promptu (scoring → JSON v3 → `preserve` geometrii)
- Schemat pipeline — rycina obowiązkowa.
- Cytowanie mapowań: załącznik C; kod `prompt-synthesis/`.

### 7.6. Macierz 6 źródeł — definicje + logika wag
- Tabela 6 wariantów; **zero „pięciu źródeł”**.

### 7.7. Ślepy wybór — dramaturgia i zmienne
### 7.8. Empty shell w produkcie vs maski w pracowni (§4)
### 7.9. Ewolucja Aura→IDA; FLUX/Modal→Gemini/Vertex
- Oś czasu — rycina/tabela.
### 7.10. Co z ComfyUI weszło / czego świadomie nie ma w produkcie

**Zakaz halucynacji stacku:** nie opisuj ComfyUI/SAM jako runtime IDA; nie pisz FLUX jako obecnego silnika.

---

## Rozdział 8. Design rationale — decyzje i kompromisy

**OWNER:** `artifact` · **Plik:** rozbudowa `07` lub osobny plik po decyzji coordinatora  
**Cel:** rozdział „ASP-owy” — proces, odrzucenia, autorstwo.

### 8.1. Kryteria sukcesu artefaktu
### 8.2. Iteracje i ścieżki odrzucone (MiniCPM, osobny refine LLM, parametry FLUX w UI…)
### 8.3. Kompromisy (długość flow, wierność skali, kontrola geometrii)
### 8.4. Autorstwo przy współtworzeniu z modelem
### 8.5. Status wizualizacji (koncepcja / mood / dokumentacja)
### 8.6. Portfolio przebiegów IDA (ryciny sekwencyjne, zanonimizowane)

---

## Rozdział 9. Ewaluacja empiryczna

**OWNER:** `empirical` · **Plik:** `chapters/08-wyniki.tex`  
**Cel:** wyniki bez nadinterpretacji; przy małym N — opisowe.

### 9.1. Próba i lejek (RQ1)
### 9.2. Implicit vs explicit (RQ2)
### 9.3. Wybory w macierzy (RQ3) — wynik główny
### 9.4. Osobowość — eksploracje (RQ4)
### 9.5. PRS gap ↔ `mixed_functional` (RQ5)
### 9.6. Agency / clarity / satisfaction (RQ6)
### 9.7. Tabela zbiorcza RQ | wynik | ograniczenie

**Ryciny:** lejek, bar chart `selected_source`, heatmapy tylko z realnych danych.  
**Zakaz:** zmyślanie liczb / p-value.

---

## Rozdział 10. Dyskusja i wnioski

**OWNER:** `empirical` + `framing` · **Pliki:** `09-dyskusja.tex`, `10-wnioski.tex`

### 10.1–10.6 Dyskusja
- Interpretacja wobec rozdz. 2–4; wkład dla AW / design research / HCI; medium dyfuzyjne; etyka; limity; dalsze badania (powrót SAM/depth? XR?).

### 10.7–10.10 Wnioski
- Odpowiedzi na RQ; oryginalność w dyscyplinie sztuk; rekomendacje; ciąg dalszy.

---

## Załączniki

| ID | Treść | OWNER |
|----|--------|-------|
| A | Schemat DB (uproszczony) | methods |
| B | Instrumenty / ekrany | methods |
| C | Mapowanie facetów → prompt | artifact |
| D | Przykładowe prompty × 6 źródeł | artifact |
| E | Słownik zmiennych | methods |
| F | Zgoda (skrót) | methods |
| **G** | **Portfolio ComfyUI** (grafy, depth, SAM, porażki) | media-lab |
| **H** | Przebiegi IDA (screenshoty) | artifact |

---

## Mapowanie plików LaTeX (po Fazie 0 — kanon)

| Treść merytoryczna | Plik | OWNER |
|--------------------|------|-------|
| Rozdz. 1 | `chapters/01-wprowadzenie.tex` | framing |
| Rozdz. 2 | `chapters/02-psychologia-srodowiskowa.tex` | theory-a |
| Rozdz. 3 | `chapters/03-preferencje-estetyczne.tex` | theory-a |
| Rozdz. 4 medium/ComfyUI | `chapters/04-medium-dyfuzyjne-comfyui.tex` | media-lab |
| Rozdz. 5 osobowość | `chapters/05-osobowosc.tex` | theory-b |
| Rozdz. 6 metodologia | `chapters/06-metodologia.tex` | methods |
| Rozdz. 7–8 artefakt | `chapters/07-artefakt-ida.tex` | artifact |
| Rozdz. 9 wyniki | `chapters/08-wyniki.tex` | empirical |
| Rozdz. 10 dyskusja/wnioski | `09-dyskusja.tex` + `10-wnioski.tex` | empirical |
| Zał. G ComfyUI | `backmatter/appendix-g-comfyui.tex` | media-lab |
| Zał. H przebiegi IDA | `backmatter/appendix-h-ida-flows.tex` | artifact |
| Archiwum | `chapters/_archive-05-ai-hci.tex` | nie w `\include` |

---

## Definition of Done — podrozdział

- [ ] Zgodność z `GLOSSARY.md`
- [ ] Każde twierdzenie naukowe ma `\parencite{...}` / `\cite` z wpisem w `references.bib` (DOI sprawdzony)
- [ ] Brak zmyślonych paperów; przy braku źródła: `\NeedsCite{...}` albo usunięcie claimu
- [ ] Opis IDA zgodny z kodem / `HIPOTEZY_REWIZJA.md`
- [ ] Ryciny w `figures/` z `\caption` + `\label{fig:chNN:...}` + źródło w podpisie („opracowanie własne” / cytat)
- [ ] `make chapter C=...` lub `make pdf` przechodzi
- [ ] `STATUS` zaktualizowany (`outline`→`draft`)
