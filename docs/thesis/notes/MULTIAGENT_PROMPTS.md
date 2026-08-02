# Prompty multi-agent — pogłębiony research + pisanie rozprawy IDA

**Jak używać:** skopiuj **PROMPT BAZOWY**, doklej **PROMPT PASU**, wklej do nowego agenta Cursor (branch `pisemna` / workspace z `docs/thesis/`).  
Jeden agent = jeden pas (`OWNER`). Nie odpalaj dwóch agentów na ten sam plik.

**Kanon folderu:** tylko `docs/thesis/`  
**Spis szczegółowy:** `notes/SPIS_TRESCI_SZCZEGOLOWY.md`  
**Słownik:** `GLOSSARY.md`

---

## PROMPT BAZOWY (doklej zawsze)

```text
Pracujesz nad rozprawą doktorską IDA na Akademii Sztuki w Szczecinie
(dyscyplina: sztuki plastyczne i konserwacja dzieł sztuki; promotor: prof. dr hab. Andreas Guskos; autor: Jakub Palka).
Branch: pisemna. Edytujesz WYŁĄCZNIE pliki w docs/thesis/.

ZANIM cokolwiek napiszesz, przeczytaj w tej kolejności:
1) docs/thesis/GLOSSARY.md
2) docs/thesis/AGENTS.md
3) docs/thesis/notes/SPIS_TRESCI_SZCZEGOLOWY.md  (Twój zakres sekcji)
4) docs/thesis/notes/HIPOTEZY_REWIZJA.md
5) docs/thesis/notes/SPIS_TRESCI_PROPOZYCJA_ASP.md
6) docs/thesis/skills/latex-thesis/SKILL.md
7) swój plik .tex (nagłówek OWNER/STATUS) oraz bibliography/references.bib

CEL: pogłębiony research + rozpisanie sekcji w LaTeX na poziomie roboczego draftu akademickiego
(nie outline z samym \Todo — chyba że brakuje danych empirycznych).

════════════════════════════════════════
ANTY-HALUCYNACJA I ŹRÓDŁA (BEZWZGLĘDNE)
════════════════════════════════════════
1. NIE wymyślaj publikacji, autorów, lat, DOI, cytatów, wyników statystycznych ani „sławnych badań”.
2. Każde twierdzenie merytoryczne spoza oczywistości musi mieć cytowanie LaTeX:
   \parencite{klucz} lub \textcite{klucz} oraz WPIS w docs/thesis/bibliography/references.bib.
3. Preferuj źródła wiarygodne: peer-review (czasopisma/konferencje), książki akademickie,
   oficjalne docs modeli, akty prawne. Unikaj blogów SEO / losowych Medium bez weryfikacji.
4. Zanim dodasz pozycję do .bib: zweryfikuj metadane (tytuł, autorzy, rok, DOI/URL) przez wyszukiwanie.
   Jeśli nie możesz zweryfikować — NIE cytuj. Wstaw \NeedsCite{opis czego szukasz} zamiast zmyślonego klucza.
5. Cytaty dosłowne tylko gdy masz pewność tekstu; inaczej parafraza + cite.
6. Nie przenoś automatycznie twierdzeń ze starych README projektu, jeśli GLOSSARY mówi inaczej
   (np. FLUX ≠ obecny silnik; macierz ma 6 źródeł; IPIP-NEO-120; PRS ≠ pre/post AI).
7. Oddzielaj jasno:
   - fakty z literatury (z cite),
   - opis artefaktu IDA (zgodny z kodem/docs kanonicznymi),
   - obserwacje pracowni ComfyUI autora (jako „opracowanie własne / praktyka autora”, nie jako paper),
   - hipotezy / RQ (bez udawania, że już udowodnione).
8. Stare H1–H5: tylko jako historia; oś empiryczna = RQ1–RQ6.

════════════════════════════════════════
TERMINOLOGIA
════════════════════════════════════════
- Trzymaj się GLOSSARY.md (IDA, Aura tylko historycznie, ASP = Akademia Sztuki w Szczecinie,
  Product-First / Research-Embedded / Minimalist Glass Design, 6 źródeł macierzy, Gemini produkcja,
  ComfyUI/SAM/depth = pracownia nie runtime).
- Nowy termin/skrót: najpierw zaproponuj dopisek do GLOSSARY.md (nie rozjeżdżaj synonimów).

════════════════════════════════════════
FORMA LATeX
════════════════════════════════════════
- Pisz po polsku (Abstract EN tylko jeśli OWNER=framing).
- Zachowaj \label{chNN:...} / fig:chNN: / tab:chNN:.
- Używaj \Todo{} tylko na realne braki; \NeedsCite{} na braki bibliograficzne; \AgentNote{} krótko.
- Tabele: booktabs. Sekcje zgodnie ze SPIS_TRESCI_SZCZEGOLOWY.
- Na końcu pliku zaktualizuj % STATUS: (outline|draft|review).

════════════════════════════════════════
RYCINY I OBRAZY
════════════════════════════════════════
- Gdy sekcja tego wymaga: dodaj figure w LaTeX z \caption{...} i \label{fig:chNN:...}.
- Pliki wrzucaj do docs/thesis/figures/ (podfoldery np. figures/comfyui/, figures/ida/).
- Nazwy: ch02-prs-dimensions.png, ch04-comfyui-graph.png, ch07-pipeline.pdf …
- W podpisie ZAWSZE źródło:
  „Opracowanie własne autora” ALBO pełne cytowanie źródła + zgoda/licencja jeśli nie własne.
- NIE wklejaj losowych obrazów z internetu bez sprawdzenia licencji.
- Jeśli nie masz jeszcze pliku graficznego: wstaw figure z \Todo{wstaw plik: ...} + opis co ma przedstawiać,
  ALBO wygeneruj prosty diagram (TikZ / opis ASCII w nocie) — ale nie zmyślaj screenshotów projektu.
- Dla ComfyUI/SAM/depth: preferuj materiały użytkownika; jeśli ich brak — opisz czego potrzebujesz
  w \Todo i nie udawaj, że masz screeny.

════════════════════════════════════════
RESEARCH WORKFLOW (zrób to naprawdę)
════════════════════════════════════════
1) Wypisz pytania researchowe dla swoich sekcji (5–15).
2) Wyszukaj i zweryfikuj źródła (DOI/arXiv/oficjalne docs).
3) Dopisz .bib.
4) Napisz prozę z przypisami/cytowaniami.
5) Dodaj tabele/ryciny lub placeholdery podpisane.
6) Zbuduj: cd docs/thesis && make chapter C=<plik-bez-ext>   (albo make pdf).
7) Jeśli build pada przez Twoje zmiany — napraw.
8) Na koniec wypisz krótki raport po polsku:
   - co napisane,
   - lista dodanych kluczy .bib,
   - lista rycin,
   - otwarte \NeedsCite / ryzyka halucynacji których uniknąłeś,
   - czego potrzebujesz od autora (np. screeny ComfyUI).

Commit message (EN), jeśli commitujesz: thesis(chXX): ...
Nie merguj do main. Nie edytuj apps/ ani infra/.
```

---

## PROMPT PASU: `framing` (rozdz. 1 + frontmatter)

```text
OWNER: framing

Zakres plików:
- docs/thesis/chapters/01-wprowadzenie.tex
- docs/thesis/frontmatter/abstract.tex
- docs/thesis/frontmatter/abbreviations.tex (sync z GLOSSARY — ostrożnie)
- NIE ruszaj metadata.tex bez wyraźnej prośby użytkownika

Zadanie:
1) Research pod rozdz. 1 ze SPIS_TRESCI_SZCZEGOLOWY (wizualizacja architektoniczna, GenAI+design surveys,
   RtD/Frayling/Zimmerman, dual-process/preferencje — tylko zweryfikowane źródła).
2) Rozpisz 1.1–1.8 na draft z cytowaniami; teza i RQ zgodnie z GLOSSARY + HIPOTEZY_REWIZJA.
3) Zaktualizuj streszczenie PL i Abstract EN tak, by nie obiecywały wyników, których nie ma.
4) Wykaz skrótów: uzupełnij brakujące skróty z Twojego tekstu (ComfyUI, SAM2, XAI…), spójnie z GLOSSARY.
5) Rycina opcjonalna: para koncepcja/wizualizacja — tylko jeśli jest plik lub jasny placeholder.

Unikaj katalogu funkcji IDA; to rozdział problemowy ze sztuki/designu.
```

---

## PROMPT PASU: `theory-a` (rozdz. 2 + preferencje 3.x)

```text
OWNER: theory-a

Zakres plików:
- docs/thesis/chapters/02-psychologia-srodowiskowa.tex
- docs/thesis/chapters/03-preferencje-estetyczne.tex
- bibliography/references.bib (tylko dodawanie; nie kasuj cudzych wpisów)
- figures/ pod ch02/ch03 jeśli dodajesz ryciny

Zadanie — POGŁĘBIONY RESEARCH + DRAFT:
Rozdział 2 (całość 2.1–2.6): ART/SRT, PRS, biophilia, funkcja/nastrój, implikacje dla personalizacji obrazu.
Rozdział 3 (3.1–3.4 i szkielet 3.7): explicit, IAT→Tinder, rozbieżność, laddering, mapa do 6 źródeł.
Sekcje Big Five 3.5–3.6: napisz solidny draft ALBO zostaw spójny most do pliku 04-osobowosc.tex
(OWNER theory-b) — nie dubluj sprzecznych definicji.

Wymagane tabele/ryciny:
- tab: wymiary PRS ↔ IDA mood grid (z zaznaczeniem ideal/current/target)
- tab: instrument preferencji | źródło | forma IDA | limity pomiaru
- fig: schemat Tinder/IAT-like (opracowanie własne)

Ściśle: nie twierdź o PRS pre/post ani o dwell/hesitation w DB.
Seed do weryfikacji w .bib: kaplan1995restorative, hartig1997prs, kellert2008biophilic,
greenwald1998iat, kahneman2011thinking — popraw metadane jeśli błędne.
```

---

## PROMPT PASU: `theory-b` (osobowość + styki HCI/etyka; bez ComfyUI)

```text
OWNER: theory-b

Zakres plików:
- docs/thesis/chapters/04-osobowosc.tex  (Big Five / IPIP-NEO-120 / krytyka determinizmu)
- docs/thesis/chapters/05-ai-hci.tex     (RtD, XAI, etyka, gamifikacja, pozycjonowanie — BEZ udawania że to rozdz. ComfyUI)
- bibliography/references.bib

Uwaga strukturalna:
Docelowy „rozdział 4 ComfyUI” w spisie ASP to INNY temat (pas media-lab).
Ty rozwijasz osobowość + metodologiczno-etyczny kontekst GenAI/HCI pod artefakt.
Nie opisuj ComfyUI/SAM/depth jako części swojego zakresu poza krótkim odesłaniem.

Zadanie:
1) Research: Big Five + preferencje środowiskowe/estetyczne; IPIP-NEO; ryzyka determinizmu;
   explainable recommendation; ethics personality inference; Zimmerman RtD.
2) Draft z cytowaniami; kanon IPIP-NEO-120.
3) Tabela: domena/facet → hipoteza projektowa → ostrożność interpretacji.
4) W 05: sekcje etyka/RODO/XAI/RtD — spójne z rozdz. metodologii (nie sprzeczaj się z methods).
```

---

## PROMPT PASU: `media-lab` (rozdz. 4 ASP — ComfyUI, dyfuzja, SAM, depth)

```text
OWNER: media-lab

Zakres:
- Utwórz/edytuj docs/thesis/notes/drafts/04-medium-dyfuzyjne.md jako pełny szkic merytoryczny
  OR (jeśli istnieje) docs/thesis/chapters/04-medium-dyfuzyjne-comfyui.tex
- docs/thesis/figures/comfyui/ (ryciny)
- docs/thesis/bibliography/references.bib
- Nie twierdź, że ComfyUI/SAM2/ControlNet są w runtime produkcyjnym IDA.

Zadanie — NAJWAŻNIEJSZY RESEARCH MEDIALNY:
Rozpisz spis §4.1–4.8 ze SPIS_TRESCI_SZCZEGOLOWY:
- diffusion jako medium wizualizacji wnętrz (survey/papers zweryfikowane),
- T2I vs I2I i geometria pokoju,
- ComfyUI: modele, LoRA, img2img, multi-ref,
- depth / ControlNet / canny / normals,
- SAM / SAM2 (paper SAM + SAM2 — zweryfikuj autorów/DOI),
- inpainting / empty shell,
- VLM → brief,
- krytyka: AI look, halucynacje geometrii, autorstwo,
- checklista jakości.

Ryciny (obowiązkowo zaprojektuj podpisy; pliki dodaj jeśli są w repo lub poproś autora):
1) graf ComfyUI
2) porównanie modeli na tym samym room photo
3) depth overlay
4) maska SAM2 + wynik strefy
5) przykłady PORAŻEK geometrii
Podpis: „Opracowanie własne autora — pracownia generatywna” + data/okres jeśli znany.

W tekście MUST HAVE akapit oddzielający pracownię od produkcji IDA (Gemini/Vertex; wcześniej FLUX/Modal).

Jeśli brakuje screenów od autora: wypisz checklistę plików do dostarczenia; nie generuj fałszywych „screenshotów projektu”.
```

---

## PROMPT PASU: `methods` (metodologia + załączniki etyczno-instrumentalne)

```text
OWNER: methods

Zakres plików:
- docs/thesis/chapters/06-metodologia.tex   (= treść rozdz. 5 w spisie ASP)
- docs/thesis/backmatter/appendix-a-schema.tex
- docs/thesis/backmatter/appendix-b-instruments.tex
- docs/thesis/backmatter/appendix-e-variables.tex
- docs/thesis/backmatter/appendix-f-consent.tex
- bibliography/references.bib

Zadanie:
1) Research metodologiczny: RtD jako argument; field evaluation; etyka badań online; RODO art.13.
2) Rozpisz 5.1–5.8 ze spisu szczegółowego z cytowaniami.
3) Tabela instrumentów (master) + tabela RQ1–6 | zmienne | plan analizy przy małym N vs docelowym N
   — 1:1 z HIPOTEZY_REWIZJA.md.
4) Rycina: diagram procedury Fast/Full + punkt ślepej macierzy.
5) Załączniki A/B/E/F: szkice merytoryczne bez PII/sekretów; zgodność nazw zmiennych z GLOSSARY/kodem.
6) Nie wymyślaj N ani wyników — wyniki to pas empirical.
```

---

## PROMPT PASU: `artifact` (koncepcja + budowa IDA + rationale)

```text
OWNER: artifact

Zakres plików:
- docs/thesis/chapters/07-artefakt-ida.tex
- docs/thesis/chapters/05-ai-hci.tex (tylko jeśli przenosisz/czyszczysz opis techniczny — nie dubluj media-lab)
- docs/thesis/backmatter/appendix-c-mappings.tex
- docs/thesis/backmatter/appendix-d-prompts.tex
- docs/thesis/figures/ida/
- bibliography/references.bib
Źródła wewnętrzne do przeczytania (to NIE są publikacje, ale kanon opisu artefaktu):
- apps/frontend/src/lib/prompt-synthesis/modes.ts (przez search w repo)
- docs/MASTER_PLAN.md, docs/IDA_DIALOGUE_SCRIPT.md
- docs/archive/MODAL_README.md (genealogia)
- GLOSSARY §8 pipeline

Zadanie — OPIS PROJEKTU + RESEARCH KONTEKSTOWY:
Rozpisz spis §6–8 (koncepcja, budowa, rationale) w 07-artefakt-ida.tex jako spójny draft:
- filozofia Product-First / Research-Embedded / Glass
- awatar jako mediacja
- pipeline scoring→JSON v3→Gemini img2img
- macierz DOKŁADNIE 6 źródeł (nazwy z GLOSSARY)
- empty shell produktowy vs pracownia (odesłanie do media-lab)
- ewolucja Aura→IDA, FLUX/Modal→Gemini/Vertex
- kompromisy i odrzucone ścieżki
- autorstwo z modelem (tu wolno dodać literaturę design/AI authorship z cite)

Ryciny obowiązkowe (screenshoty własne / diagramy):
- architektura systemu
- user flow
- pipeline syntezy promptu
- schemat ślepej macierzy 6 źródeł
- 1–2 ekrany UI (glass) z podpisem „screen z platformy IDA — opracowanie własne”

Załącznik C/D: realne przykłady mapowań/promptów — bez sekretów API; zanonimizowane.
Zakaz: ComfyUI jako runtime; FLUX jako obecny silnik; macierz 5 źródeł.
```

---

## PROMPT PASU: `empirical` (wyniki + dyskusja + wnioski)

```text
OWNER: empirical

Zakres plików:
- docs/thesis/chapters/08-wyniki.tex
- docs/thesis/chapters/09-dyskusja.tex
- docs/thesis/chapters/10-wnioski.tex
- bibliography/references.bib

Zadanie:
1) Jeśli NIE masz dostępu do realnych danych eksportu: rozpisz rozdz. wyników jako SZKIELET
   z jasnymi \Todo{wstaw wynik z eksportu: ...} i opisem metod prezentacji — ZERO zmyślonych liczb.
2) Jeśli user dostarczy dane/tabele: wstaw wyniki RQ1–RQ6 zgodnie z HIPOTEZY_REWIZJA;
   wykresy jako figures z podpisami; ostrożne sformułowania przy małym N („pilotaż”, „opisowo”).
3) Dyskusja: interpretacja wobec teorii (rozdz. 2–4) + wkład dla ASP/design + etyka + limity + dalsze badania.
   Tu wolno (i trzeba) cytować literaturę — research pogłębiony, bez overclaim.
4) Wnioski: odpowiedzi na RQ, oryginalność w dyscyplinie sztuk, rekomendacje praktyczne.

Ryciny: lejek completion; rozkład selected_source; tylko z danych.
```

---

## PROMPT PASU: `coordinator` (spójność, main.tex, glossary)

```text
OWNER: coordinator

Zakres:
- docs/thesis/main.tex, preamble.tex, GLOSSARY.md, AGENTS.md, Makefile
- scalanie konfliktów .bib / terminów
- ewentualna przebudowa numeracji chapters pod SPIS_TRESCI_SZCZEGOLOWY
  (np. dodanie chapters/04-medium-dyfuzyjne-comfyui.tex i \include)

Zadanie:
1) Sprawdź niespójności terminologiczne względem GLOSSARY (FLUX/Gemini, 5 vs 6 źródeł, IPIP, PRS).
2) Zintegruj draft media-lab do main.tex jeśli gotowy.
3) Upewnij się że make pdf przechodzi.
4) Nie pisz całych rozdziałów merytorycznych za inne pasy — tylko spójność i infrastruktura.
5) Raport: lista konfliktów do decyzji użytkownika/promotora.
```

---

## Gotowiec: uruchomienie 5 agentów równolegle (rekomendowane pierwsze okno)

| # | Pas | Fokus pierwszego sprintu |
|---|-----|---------------------------|
| 1 | `theory-a` | rozdz. 2–3 teoria przestrzeni i preferencji |
| 2 | `media-lab` | rozdz. 4 ComfyUI/SAM/depth |
| 3 | `methods` | metodologia + RQ tables |
| 4 | `artifact` | opis IDA + pipeline + macierz |
| 5 | `framing` | wprowadzenie (lepiej jak 1–4 mają draft) **albo równolegle szkielet** |

`empirical` odpalaj gdy są dane albo świadomie tylko na dyskusję literaturową / szkielet wyników.

---

## Mini-prompt „tylko research memo” (opcjonalny, przed pisaniem .tex)

```text
Nie edytuj jeszcze .tex. Zrób research memo w docs/thesis/notes/drafts/research-<OWNER>.md:
dla każdej sekcji ze SPIS_TRESCI_SZCZEGOLOWY w Twoim zakresie podaj:
- claim do udowodnienia,
- 3–8 zweryfikowanych źródeł (pełny APA-like + DOI),
- cytat/parafraza robocza,
- propozycję ryciny,
- ryzyka / sprzeczności w literaturze.
Zero zmyślonych pozycji. Potem dopiero pisz LaTeX.
```

---

## Checklist użytkownika przed wysłaniem agentów

- [ ] Branch `pisemna`, folder `docs/thesis/`
- [ ] Wrzucone screeny ComfyUI/SAM/depth do `figures/comfyui/` (dla media-lab)
- [ ] Ewentualny eksport danych pilotażu (dla empirical)
- [ ] Każdy agent ma inny OWNER
- [ ] Wklejony PROMPT BAZOWY + PROMPT PASU
