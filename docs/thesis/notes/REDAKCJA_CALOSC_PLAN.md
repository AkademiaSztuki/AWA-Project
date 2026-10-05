# Plan redakcji całości rozprawy (2026-10-04)

Dokument wewnętrzny. Podstawa: commit `99ed463` (stan sprzed redakcji), kanon: `GLOSSARY.md`, `HIPOTEZY_REWIZJA.md`, `07c-redakcja-petla.md`, `data/analysis-2026-10-01.json`.

## 1. Głos narracji

| Część | Forma |
|-------|-------|
| Rozdz. 2, 3, 5 (teoria) | Trzecia osoba, strona czynna, nazwisko jako podmiot („Kaplan opisuje”, „Ulrich pokazuje”). Bez bezosobowego „zostanie wykazane” i bez „ja”. |
| Rozdz. 4 (medium) | Literatura (Rombach, Zhang, Kirillov, Ravi) w trzeciej osobie. Obserwacje z pracowni ComfyUI to praktyka autora, więc pierwsza osoba liczby pojedynczej („porównałem”, „w pracowni stwierdziłem”). |
| Rozdz. 1 | Stan wiedzy w trzeciej osobie; cel, teza, wkład i struktura w pierwszej osobie liczby pojedynczej. |
| Rozdz. 6, 7, 7c | Pierwsza osoba liczby pojedynczej wszędzie tam, gdzie opisuję własną procedurę, własny artefakt i własne decyzje projektowe. Dawne „opisujemy / zakładamy” z 07c zamieniam na „opisuję / zakładam”. |
| Rozdz. 8 (wyniki) | Rzeczowo. Liczby, daty i liczebności bez zmian (snapshot 2026-10-01, `data/analysis-2026-10-01.json`). Pierwsza osoba tylko przy decyzjach analitycznych („podaję”, „nie raportuję”). |
| Rozdz. 9, 10 | Własna interpretacja w pierwszej osobie; inni badacze w trzeciej. |

Reguła skrócona: **cudze ustalenia — trzecia osoba; własna metoda, artefakt i praktyka — „ja”.**

## 2. Zamrożone terminy

IDA, Fast, Full, RQ1–RQ6 (brzmienie z `HIPOTEZY_REWIZJA.md`), Big Five, IPIP-NEO-120, macierz (sześć źródeł: `implicit`, `explicit`, `personality`, `mixed`, `mixed_functional`, `inspiration_reference`), PRS (ideal / current / target), Product-First, Research-Embedded, Minimalist Glass Design, ComfyUI (pracownia, nie runtime IDA), Gemini Image / Vertex AI (produkcja), FLUX/Modal (genealogia), ślepy wybór.
Zamieniam kalki, gdy istnieje zwykłe polskie słowo: *mismatch* → rozbieżność, *feasibility* → wykonalność, *dropout* → odpadanie uczestników, *overclaim* → nadinterpretacja, *pain points* → punkty tarcia (nazwa pola w bazie zostaje).

## 3. Czego nie zmieniam

- Liczb, dat, liczebności prób, wartości rho, tabel i słupków rycin w rozdz. 8 (poza przypisaniem średnich do ścieżki Full tam, gdzie JSON to potwierdza).
- Kluczy `\cite`, `\parencite`, `\textcite`; wpisów w `references.bib`.
- Etykiet `\label`, środowisk `figure` i `table`, ścieżek `\includegraphics`, istniejących `\Todo` i `\NeedsCite`.
- Struktury `main.tex`, preambuły, glosariusza. Nie włączam 07b. Nie kompiluję z `\includeonly`.
- Załączników: poprawiam tylko zdanie, które sprzeciwia się nowemu tekstowi rozdziału 7.

## 4. Zasady źródłowe

Twierdzenie spoza obserwacji autora i bez cytowania dostaje znacznik `\textcolor{red}{[ŹRÓDŁO DO UZUPEŁNIENIA]}`. Nie dopisuję stron ani nowych kluczy bibliograficznych. W prozie rozdzielam: stan badań (cudze), moją metodę, mój wkład.

## 5. Drugi przebieg (krytyk)

Po pierwszym przepisaniu czytam całość pod kątem: sprzeczności między rozdziałami, zmyślonych faktów, pękniętych odwołań do rycin, powrotu tików AI, nadmiarowych twierdzeń o zrzutach Fast/Full (brak klatek: nakładka awatara przy lądowaniu, osobne kontrolki satysfakcji w Fast, pełna siatka sześciu wariantów w Full, PRS, aktywności, pytania o preferencje, podsumowanie pokoju, ankieta 2, podziękowanie) oraz dryfu brzmienia RQ względem `HIPOTEZY_REWIZJA.md`.
Wynik: `notes/REDAKCJA_DO_UZUPELNIENIA.md`.
