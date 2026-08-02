# Glossary — kanoniczna terminologia rozprawy IDA

**Lokalizacja:** `docs/thesis/GLOSSARY.md` (jedyny kanon słownictwa)  
**Branch:** `pisemna`  
**Zasada:** zanim agent napisze prozę w `.tex`, czyta ten plik. Nie wymyślaj synonimów „na własną rękę”.

Powiązane pliki (nie dubluj definicji — tu jest źródło prawdy):

| Plik | Rola |
|------|------|
| `GLOSSARY.md` | **ten plik** — terminy, nazwy własne, zakazane warianty |
| `AGENTS.md` | ownership plików, workflow multi-agent |
| `metadata.tex` | tytuł, autor, promotor, uczelnia |
| `notes/SPIS_TRESCI_PROPOZYCJA_ASP.md` | aktualny spis treści (ASP) |
| `notes/HIPOTEZY_REWIZJA.md` | RQ1–RQ6 (nie stare H1–H5 jako oś) |
| `frontmatter/abbreviations.tex` | skróty w PDF — **musi być zgodny z tym glossary** |
| `bibliography/references.bib` | klucze cytowań |

---

## 1. Nazwy własne (pisownia sztywna)

| Kanon | Używaj | Nie używaj |
|-------|--------|------------|
| **IDA** | IDA (za pierwszym razem w rozdziale można rozwinąć) | Ida, I.D.A., „aplikacja Ida” |
| Pełna nazwa robocza | *AI Interior Design Dialogue Research Platform* | mieszać z „Aura” jako nazwą produktu |
| **Aura** | tylko w genealogii historycznej (poprzednik / early repo) | „platforma Aura” jako synonim IDA |
| **AWA-Project** | nazwa repozytorium GitHub | jako tytuł rozprawy |
| **Akademia Sztuki w Szczecinie** | zawsze tak | „Akademia Sztuk Pięknych”, „ASP Szczecin” w prozie formalnej* |
| Skrót uczelni w tekście roboczym | **ASP** = Akademia Sztuki w Szczecinie (po zdefiniowaniu) | mylić z „Akademią Sztuk Pięknych” bez dopowiedzenia |
| Autor | Jakub Palka | warianty pisowni |
| Promotor | prof. dr hab. Andreas Guskos | Guskoś, bez stopnia |

\* W starszych plikach repo bywa „ASP” / „Akademia Sztuk Pięknych” — w rozprawie **poprawiamy na kanon**.

---

## 2. Tytuł i dyscyplina

- **Tytuł rozprawy:** bierz wyłącznie z `metadata.tex` / `\ThesisTitle` (nie parafrazuj w abstrakcie bez synchronizacji).
- **Dyscyplina:** *Sztuki plastyczne i konserwacja dzieł sztuki*.
- **Metodologia nadrzędna:** **Research through Design (RtD)** — w PL: „badania przez projektowanie” (po pierwszym użyciu można skracać RtD).

---

## 3. Filozofia produktu (trzy hasła — zawsze razem, ta kolejność)

1. **Product-First**  
2. **Research-Embedded**  
3. **Minimalist Glass Design**

Nie zastępuj „Research-Embedded” przez „gamifikacja badań” ani „Product-First” przez „startup”.

---

## 4. Ścieżki użytkownika

| Kanon | Znaczenie |
|-------|-----------|
| **Full** / ścieżka pełna | głęboki flow badawczy (profil + Big Five + room + macierz…) |
| **Fast** / ścieżka szybka | skrócona ścieżka produktowa |

W kodzie: `path_type` / fasety Full vs Fast. W tekście PL: „ścieżka pełna (Full)” przy pierwszym użyciu w rozdziale.

---

## 5. Instrumenty badawcze (nazwy)

| Kanon | Opis krótki | Forma w IDA |
|-------|-------------|-------------|
| **PRS** | Perceived Restorativeness Scale / postrzegana regeneracyjność | mood grid; w danych: `prs_ideal_*`, `prs_current_*`, `prs_target_*` |
| **Biophilia** | dawka biophilii (wizualna) | 4 poziomy / opcje |
| **IAT-like / Tinder** | adaptacja Implicit Association Test do swipe | `/flow/tinder`, `participant_swipes` |
| **Semantic differential** | skale semantyczne (explicit) | slidery |
| **Laddering** | means-end laddering | Room Setup: aktywności, pain points, ladder |
| **IPIP-NEO-120** | Big Five + 30 facetów (120 pozycji) | `/flow/big-five` |
| **Big Five** | model Wielkiej Piątki (OCEAN) | domeny + facety |

**Zakaz:** pisać „IPIP-60” jako stan obecny platformy (legacy docs — produkcja = **IPIP-NEO-120**).

**PRS — precyzja empiryczna:** w obecnej platformie to **ideal / current / target**, **nie** klasyczny pre/post po ekspozycji na AI (patrz `HIPOTEZY_REWIZJA.md`). Nie twierdź, że mierzycie H2 pre/post, dopóki nie dodacie kroku pomiarowego.

---

## 6. Pytania badawcze (tylko RQ1–RQ6)

Stare **H1–H5** z `PODSUMOWANIE_PROJEKTU.md` = **archiwum**. W prozie rozprawy używaj:

| ID | Skrót tematu |
|----|----------------|
| **RQ1** | feasibility / completion flow RtD |
| **RQ2** | rozbieżność implicit vs explicit ↔ zachowanie w macierzy |
| **RQ3** | wybór źródła w ślepej macierzy 6 wariantów (**rdzeń empiryczny**) |
| **RQ4** | Big Five / facety ↔ estetyka i wybór `personality` (eksploracyjnie) |
| **RQ5** | odległość PRS current→target ↔ wybór `mixed_functional` |
| **RQ6** | agency / clarity / satisfaction (UX artefaktu) |

Jeśli musisz wspomnieć stare H1–H5: wyraźnie jako „wcześniejsza formuła / zarzucona operacjonalizacja”.

---

## 7. Macierz generacji — dokładnie 6 źródeł

Kanon kodu (`GenerationSource` / `modes.ts`):

1. `implicit`  
2. `explicit`  
3. `personality`  
4. `mixed`  
5. `mixed_functional`  
6. `inspiration_reference`  

W PL (propozycja stałych określeń):

| Klucz | PL |
|-------|-----|
| `implicit` | wariant preferencji ukrytych |
| `explicit` | wariant preferencji jawnych |
| `personality` | wariant osobowościowy |
| `mixed` | wariant mieszany |
| `mixed_functional` | wariant mieszany z funkcją przestrzeni |
| `inspiration_reference` | wariant referencji inspiracji |

**Zakaz:** „macierz 5 obrazów/źródeł” jako stan obecny (stary dokument `GENERATION_MATRIX_5_IMAGES.md`). Pisz **6 źródeł**.

Eksperyment: **ślepy wybór** / *blind selection* (`blind_selection_made`, `selected_source`).

---

## 8. Pipeline AI — warstwy (żeby się nie rozsypało)

### 8.1. Produkcja IDA (stan obecny)

| Element | Kanon |
|---------|--------|
| Generacja obrazu | **Gemini** (Vertex AI), model roboczy w kodzie: `gemini-3.1-flash-image` |
| Nazwa kodowa w projekcie | „Nano Banana” — tylko w przypisie/technicznie; w prozie ASP preferuj **Gemini Image / Vertex AI** |
| Analiza pokoju / inspiracji | Gemini Flash Lite (VLM) |
| Synteza briefu | `prompt-synthesis` (scoring → builder JSON v3) |
| Persistence badań | **GCP** (Cloud SQL, Cloud Run, GCS) — nie generuje obrazów |

### 8.2. Genealogia (historia)

| Etap | Kanon |
|------|--------|
| Wczesna generacja | **FLUX** na **Modal** (archiwum: `docs/archive/modal-backend/`) |
| Wczesna persistence | Supabase (legacy) |
| Przejście | Modal/Supabase → **GCP + Vertex** |

W tekście: „w fazie X używano FLUX/Modal; obecnie produkcja opiera się na Gemini/Vertex”.  
**Zakaz:** opisywać FLUX jako aktualny silnik produkcyjny.

### 8.3. Pracownia autora (poza produkcją IDA)

| Element | Kanon |
|---------|--------|
| **ComfyUI** | środowisko eksperymentów autora (test modeli, grafy) — **nie** jest runtime IDA |
| **SAM / SAM2** | segmentacja (maski) w pracowni / badaniach wstępnych |
| **Depth map** / ControlNet / canny / normal | kontrola geometrii w pracowni |
| Relacja do IDA | rozdz. o medium: wnioski → decyzje; produkt IDA = uproszczony, skalowalny pipeline |

Formuła obowiązkowa przy pierwszym użyciu w rozdziale:

> Eksperymenty w ComfyUI (w tym …) stanowią warstwę praktyki autora; produkcyjny artefakt IDA realizuje generację przez …

---

## 9. Preferencje — pary terminów

| EN | PL kanoniczny |
|----|----------------|
| explicit preferences | preferencje **jawne** |
| implicit preferences | preferencje **ukryte** |
| behavioral metrics | wskaźniki **behawioralne** |
| mismatch / conflict | rozbieżność / konflikt preferencji |

Nie mieszaj „ukryte” z „nieświadome” bez definicji (IAT ≠ psychoanaliza).

---

## 10. Artefakt i UI

| Kanon | Uwagi |
|-------|--------|
| **Artefakt badawczy IDA** | preferowany tytuł rozdziału o platformie (nie „implementacja systemu”) |
| **Awatar IDA** / przewodniczka | mediująca postać dialogu; nie „chatbot dekoracyjny” |
| **Glass / glassmorphism** | język wizualny |
| Explainable personalization / explainable pipeline | synteza promptu z cytowalnymi mapowaniami |

---

## 11. Dane — warstwy

Kanon: **USER → HOUSEHOLD → ROOM → SESSION**  
(PL: użytkownik → gospodarstwo domowe → pokój → sesja)

Anonimizacja: `user_hash` (nie logować PII w rozprawie).

---

## 12. Skróty — minimum do synchronizacji z `abbreviations.tex`

AI, ASP, Big Five, ComfyUI, ControlNet, FLUX, GCP, HCI, IAT, IDA, IPIP-NEO-120, LLM, PRS, RQ, RtD, SAM/SAM2, VLM, XAI, Vertex AI.

Nowe skróty: **najpierw wpisz tu**, potem do `abbreviations.tex`.

---

## 13. Reguły spójności dla agentów

1. **Czytaj** `GLOSSARY.md` + swój `OWNER` z `AGENTS.md` przed edycją `.tex`.  
2. Nowy termin / skrót / nazwa modelu → **PR najpierw w GLOSSARY** (pas `coordinator` lub uzgodnienie), potem w rozdziale.  
3. Nie wprowadzaj czwartego synonimu tej samej rzeczy (np. „generator”, „silnik”, „model obrazu” — wybierz kontekstowo, ale silnik produkcyjny nazywaj zgodnie z §8).  
4. Liczebność macierzy, wersja IPIP, silnik generacji — w razie wątpliwości **ten plik wygrywa** ze starymi README w `main`.  
5. Spis treści: kanon narracji = `notes/SPIS_TRESCI_PROPOZYCJA_ASP.md` (nie stary spis psychologiczny, chyba że użytkownik wróci do niego).  
6. Po większej zmianie terminu: zaktualizuj też `frontmatter/abbreviations.tex`.

---

## 14. Changelog glossary

| Wersja | Data | Zmiana |
|--------|------|--------|
| 0.1 | 2026-08-02 | Pierwsza wersja — kanon pod multi-agent na `pisemna` |
