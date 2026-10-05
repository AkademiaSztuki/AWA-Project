# Pętla redakcyjna krytyk → poprawka (protokół + log dla 07c)

Dokument wewnętrzny (nie cytować w rozprawie). Pierwszy przebieg: `chapters/07c-opis-dziela-przebieg.tex`, 2026-10-04.

---

## 1. Protokół do wielokrotnego użycia

### 1.1. Zasada

Wzorzec generator → krytyk → poprawka (Self-Refine, Reflexion): po każdej rundzie krytyka powstaje **konkretna, cytowalna lista uwag**, a poprawka rusza tylko to, co na liście. Krytyka „w głowie” autora tekstu nie wystarcza, bo model oceniający własny tekst bez zewnętrznego punktu odniesienia często niczego nie poprawia, a bywa że pogarsza. Dlatego krytyk dostaje **kotwice zewnętrzne**: `GLOSSARY.md`, `AGENTS.md`, etykiety i odwołania w repozytorium, spis szczegółowy, kod/dane, jeśli rozdział o nich mówi.

### 1.2. Role (trzy osobne przebiegi, najlepiej osobne konteksty / subagenty)

| Rola | Wejście | Wyjście | Czego nie robi |
|------|---------|---------|----------------|
| **Krytyk A** | plik `.tex`, `GLOSSARY.md`, spis szczegółowy, `\ref`/`\label` | lista uwag: `[S]` struktura/sens, `[F]` fakt/spójność, `[T]` tik AI, `[K]` konkret (brak sceny); każda z krótkim cytatem (≤ 15 słów) i proponowanym kierunkiem | nie przepisuje tekstu |
| **Poprawiacz** | tylko lista Krytyka A + plik | zmieniony `.tex` | nie dodaje faktów, nie rusza ryc./label/include, nie kasuje `\Todo`, nie robi commitu |
| **Krytyk B** | nowy plik + stara lista | dla każdej uwagi: zamknięta / otwarta / nowa; werdykt | nie poprawia tekstu |

Krytyk B nie może być tym samym przebiegiem co Poprawiacz. Jeśli dostępne, Krytyk B powinien pracować w świeżym kontekście (lub innym modelu).

### 1.3. Warunek stopu

Stop po **dwóch** rundach Krytyk → Poprawka → Krytyk B, albo wcześniej, gdy Krytyk B nie ma uwag `[S]` ani `[F]` i zostały co najwyżej pojedyncze `[T]`/`[K]`. Nie robić trzeciej rundy „dla pewności”: kolejne iteracje wygładzają tekst i zwiększają jego „gładkość”, czyli właśnie to, co czytelnik odbiera jako maszynowe. Otwarte uwagi zapisać w tym pliku (sekcja „Log”), nie w nagłówku rozdziału.

### 1.4. Kolejność ważności uwag

1. `[F]` sprzeczności z glossary, z innymi rozdziałami, z liczbami (np. czas ścieżki), zmyślone twierdzenia o produkcie.
2. `[S]` czy rozdział prowadzi jedną narracją, czy jest katalogiem (ekran → funkcja → RQ w każdym akapicie).
3. `[T]` tiki AI (lista niżej).
4. `[K]` abstrakcje bez sceny, bez przykładu, bez „co uczestnik widzi i robi”.

### 1.5. Lista tików AI (polszczyzna akademicka) — do wyszukiwania i oceny

Pojedyncze wystąpienie to nie dowód. Liczy się **skupisko** i **powtarzalny szablon**. Detektory AI są zawodne, więc celem nie jest „oszukanie detektora”, tylko tekst, który ma konkret i własny głos autora.

**Frazy-wytrychy i otwieracze**
- „warto zauważyć / warto podkreślić / warto pamiętać / należy podkreślić / nie można zapominać, że”
- „w dzisiejszych czasach / w dzisiejszym dynamicznym świecie / w erze …”
- „kluczowy / kluczowe znaczenie / odgrywa kluczową rolę / fundamentalny / istotny” (bez uzasadnienia)
- „podsumowując / reasumując / w kontekście …” jako domykacz akapitu
- zapowiedzi ważności: „Prawda jest taka”, „Dlaczego to ważne”, „trzeba powiedzieć wprost”, „uczciwie”

**Konstrukcje**
- „nie tylko X, ale także Y” i „nie X, lecz Y” jako odruch (liczyć na stronę; więcej niż 2–3 na rozdział to sygnał)
- mechaniczne trójki (trzy przymiotniki / trzy rzeczowniki / trzy człony) bez treści
- zdania-hasła na końcu akapitu, które powtarzają to, co już padło („Fast jest więc…, a Full…”)
- puste intensyfikatory: „po prostu”, „zdecydowanie”, „w pełni”, „niezwykle”, „głęboko”, „celowo” (bez uzasadnienia)
- nadmiar „który / która” zamiast imiesłowu; kalki: „dedykowany”, „adresować problem”, „w oparciu o” jako odruch
- komentarz metatekstowy o własnym tekście: „Opis nie jest …”, „ten fragment celowo …”, „czego ten opis nie twierdzi” (jedna jasna deklaracja ograniczeń wystarczy)

**Struktura i rytm**
- zbyt gładkie przejścia: każdy akapit zaczyna się łącznikiem czasu/logiki („Następnie”, „Dopiero teraz”, „Co więcej”, „Ponadto”)
- ten sam szablon akapitu powtórzony N razy (np. opis ekranu → rola badawcza → odnośnik do RQ)
- równa długość zdań i akapitów, brak zdania krótkiego i brak zdania „nierównego”
- rzeczowniki abstrakcyjne bez sceny: „kotwica”, „dramaturgia”, „szkielet wrażeniowy”, „serce empiryczne”, „konstytutywna rola”
- hedging bez informacji: „wielu badaczy uważa”, „w większości przypadków”, bez nazwisk i źródeł
- formatowanie: nadmiar pogrubień/kursywy, długich myślników, wielkich liter w tytułach (kalka z angielskiego)

**Anglojęzyczne odpowiedniki (Abstract i cytowane fragmenty)**: *delve, tapestry, pivotal, underscore, testament to, not just X but Y, in conclusion*; końcówki typu „…, highlighting the importance of …”; sekcje „Challenges / Future prospects” na sztywnym szkielecie.

### 1.6. Co robić zamiast „wygładzać”

- Dopisać **scenę**: co uczestnik widzi, klika, co się dzieje po kliknięciu (tylko jeśli fakt jest w kodzie/rycinie/transkrypcie).
- Zamienić abstrakcję na nazwę ekranu, pole, liczbę, ścieżkę danych.
- Skracać: usunąć zdanie, które tylko powtarza poprzednie.
- Różnicować długość akapitów; część ekranów opisać jednym zdaniem, a nie każdy trzema.
- Gdzie to gatunkowo możliwe: pierwsza osoba liczby mnogiej / pojedynczej zgodnie z konwencją rozprawy, decyzje autora z uzasadnieniem (RtD), a nie neutralna „obserwacja ogólna”.

### 1.7. Prompty (wklejalne)

**Krytyk A**
```
Rola: krytyk redakcyjny rozprawy doktorskiej (PL). NIE przepisuj tekstu.
Plik: <ścieżka>. Kanon: GLOSSARY.md, AGENTS.md, notes/SPIS_TRESCI_SZCZEGOLOWY.md.
Zadanie: 1) Czy rozdział czyta się jak jedna narracja, czy jak katalog? 2) Znajdź tiki AI wg
notes/07c-redakcja-petla.md §1.5 (cytuj ≤15 słów). 3) Znajdź sprzeczności faktyczne/spójnościowe
(glossary, etykiety \ref, liczby, twierdzenia o produkcie). 4) Wskaż abstrakcje bez sceny.
Wyjście: lista numerowana [S]/[F]/[T]/[K], cytat, krótka propozycja kierunku. Maks. 25 uwag, posortuj wg ważności.
```

**Poprawiacz**
```
Rola: redaktor. Wejście: lista uwag Krytyka A + plik. Wprowadź TYLKO zmiany wynikające z listy.
Nie dodawaj faktów. Nie zmieniaj ryc., \label, \input/\include, nie usuwaj \Todo/\NeedsCite.
Nie uruchamiaj latexmk z \includeonly, nie rób commitu. Po edycji wypisz, które numery uwag zamknięto.
```

**Krytyk B**
```
Rola: krytyk. Porównaj nowy plik z listą uwag A. Dla każdej: zamknięta / otwarta / pogorszona.
Dodaj nowe uwagi, które powstały przy poprawie (np. nowy tik). Werdykt: zamknąć pętlę albo wypisać
resztę (max 10 pozycji) do pliku logu. Nie edytuj tekstu rozdziału.
```

### 1.8. Ograniczenia, o których warto pamiętać

- Krytyk LLM bez kotwic zewnętrznych bywa pobłażliwy wobec własnego stylu; dlatego `[F]` sprawdzać grepem po repozytorium, a nie „na wyczucie”.
- Lista tików to **heurystyka**. Człowiek też pisze „kluczowy”. Skupisko i szablon > pojedyncze słowo.
- Pętla nie zastępuje czytania na głos przez autora i uwag promotora.
- Nie edytować cudzych pasów (AGENTS.md): pętlę uruchamia się per rozdział przez jego `OWNER`.

---

## 2. Źródła faktycznie użyte do zaprojektowania pętli

Wzorce pętli:
- Madaan i in., *Self-Refine: Iterative Refinement with Self-Feedback* (2023) — https://arxiv.org/abs/2303.17651 (generator, feedback, refine, warunek stopu: limit iteracji lub sygnał z feedbacku)
- Shinn i in., *Reflexion: Language Agents with Verbal Reinforcement Learning* (2023) — https://arxiv.org/abs/2303.11366 (aktor, ewaluator, tekstowa refleksja w pamięci epizodycznej, limit prób)
- Huang i in., *Large Language Models Cannot Self-Correct Reasoning Yet* (2023/ICLR 2024) — https://arxiv.org/abs/2310.01798 (autokorekta bez zewnętrznego sygnału często nie pomaga; stąd osobny krytyk i kotwice zewnętrzne)

Rozpoznawanie prozy AI (EN):
- Wikipedia, *Signs of AI writing* — https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing (repertuar tików; podkreślone, że są probabilistyczne)
- Wikipedia, *WikiProject AI Cleanup/Guide and resources* — https://en.wikipedia.org/wiki/Wikipedia:AIDETECT (skupisko sygnałów zamiast pojedynczego; weryfikacja źródeł jako najpewniejsza metoda)
- *On the Detectability of ChatGPT Content: Benchmarking, Methodology, and Evaluation through the Lens of Academic Writing* — https://exa.ai/library/publication/qwfpgqvg1n0 (cechy statystyczne tekstów akademickich ChatGPT; ograniczona niezawodność cech ręcznych)

Rozpoznawanie prozy AI (PL), blogi branżowe i dyskusja, traktowane jako heurystyki, nie badania:
- prompty.pl, *Po czym rozpoznać, że tekst został napisany przez AI?* — https://prompty.pl/po-czym-rozpoznac-ze-tekst-zostal-napisany-przez-ai/
- Top Online, *Jak rozpoznać tekst napisany przez AI?* — https://toponline.pl/blog/jak-rozpoznac-tekst-napisany-przez-ai
- FEB, *Jak sprawdzić, czy tekst został napisany przez AI?* — https://feb.net.pl/blog/jak-sprawdzic-czy-tekst-zostal-napisany-przez-ai
- Netgonet, *Jak rozpoznać tekst pisany przez AI? Kluczowe wskazówki* — https://netgonet.pl/jak-rozpoznac-tekst-pisany-przez-ai
- r/Polska, *Rzeczy, po których można rozpoznać tekst wygenerowany przez ChatGPT?* — https://www.reddit.com/r/Polska/comments/1j094qi/rzeczy_po_kt%C3%B3rych_mo%C5%BCna_rozpozna%C4%87_tekst/ (anegdotyczne)

Lokalnie przeczytano też `skills-cursor/loop/SKILL.md`: dotyczy cyklicznego uruchamiania promptu (timer), więc nie jest podstawą tej pętli; można go użyć dopiero do ponawiania całego protokołu na kolejnych rozdziałach.

---

## 3. Log przebiegu: `chapters/07c-opis-dziela-przebieg.tex`

### 3.1. Krytyk A — główne ustalenia

**[S] Narracja czy katalog.** Całość czyta się jako opowieść (ścieżka od wejścia do macierzy), ale część Fast ma uniformowany szablon: jeden ekran = jeden akapit = rola badawcza + odnośnik do sekcji/RQ. W części Full narrację rwie 12 `\Todo` z rycinami.

**[F] Sens i spójność**
1. „Całość trwa kilkadziesiąt minut” vs wcześniej „20–30 min” — sprzeczność.
2. „bez tej części ścieżka pełna nie różniłaby się od szybkiej niczym poza liczbą pytań” — fałsz względem własnego opisu (swipe, Big Five, macierz).
3. „Opcja usunięcia mebli … skrótem produktowym, z którego nie trzeba korzystać” — sprzeczne z sekcją o empty shell (to instrukcja w prompcie, nie opcja uczestnika).
4. „Czas generacji jest bowiem jedynym miejscem, w którym uczestnik … czeka” — nadinterpretacja (w Full też czeka na macierz).
5. „próbą potwierdzającą ścieżki pełnej” — sprzeczne z rozdz. 8–9 (brak konfirmacji, małe N).
6. „W tym samym momencie uczestnik pokazuje, jak się w pokoju czuje” — nieweryfikowalne (osobne ryciny 07/08).
7. Zdanie o kolejności torów jawnego/ukrytego logicznie odwrócone („kolejność … jawny … nie zakłóca ukrytego”).
8. Zbitka „Kwestionariusz … mierzy … facetów, przedstawiony w formie …” — błąd składni/odniesienia.
9. „To rozwiązanie jest zamierzone” — twierdzenie o intencji bez źródła.

**[T] Tiki AI (cytaty)**
- „Opis nie jest inwentarzem ekranów.” (metatekst o sobie)
- „Kluczowa jest tu dramaturgia odsłaniania”; „To ważne rozróżnienie”; „Jego miejsce … jest logiczne”
- „nie tylko ilustracją, ale kotwicą wszystkiego” (tik „nie tylko… ale”, abstrakcja)
- „trzeba go czytać uczciwie”; „Trzeba jednak powiedzieć wprost”
- „sercem empirycznym pracy”; „rola bardziej konstytutywna”; „szkielet wrażeniowy”
- „na którą cały czas trwa wyczekiwanie”; „po prostu”
- „Na tym ścieżka szybka się kończy, ale opowieść nie.”
- „przebieg się zamyka i ekran końcowy domyka” (tautologia)
- Powtarzalne „nie X, lecz Y” (ok. 11 razy w całym pliku)
- Blok zastrzeżeń na końcu („Nie dowodzi… Nie twierdzi też…”) powtarza to, co powiedziano we wstępie

**[K] Brak sceny.** „Dramaturgia”, „kotwica”, „rytm rozmowy” bez wskazania, co dokładnie widać na ekranie.

### 3.2. Poprawiacz — co zmieniono

- Wstęp: usunięto metatekst „Opis nie jest inwentarzem ekranów”, skrócono i uproszczono; pierwsza osoba liczby mnogiej spójnie.
- Usunięto: „kluczowa”, „ważne rozróżnienie”, „logiczne”, „uczciwie”, „powiedzieć wprost”, „po prostu”, „zamierzone”, „kotwica”, „serce”, „konstytutywna”, „dramaturgia”, „wyczekiwanie”.
- Skorygowano czas Full na „około 20–30 min”.
- Usunięto fałszywe zdanie o niczym poza liczbą pytań; funkcja i nastrój pokoju tylko „zasilają wariant mieszany z funkcją przestrzeni”.
- Usunięto „opcję usunięcia mebli”; zastąpiono odwołaniem do empty shell jako części instrukcji dla modelu.
- Złagodzono twierdzenie o czasie generacji (RQ6: „może wpływać”).
- Zastąpiono „próbą potwierdzającą” neutralnym „próbą ścieżki pełnej”.
- „W tym samym momencie” → „Potem”; poprawiono zdanie o kolejności torów; przebudowano zdanie o IPIP-NEO-120.
- Skrócono blok zastrzeżeń na końcu (usunięto „kolejność kroków jest jedyną możliwą” i dubel o pipeline).
- Konto: stwierdzenie „konto jest opcjonalne” zawężone do Fast (dla Full nie ma jeszcze pewności; `\Todo` przy rycinie 12).
- Nie ruszano ryc., etykiet, `\Todo`, plików `figures/ida`, `main.tex`.

### 3.3. Krytyk B — stan po poprawce (otwarte uwagi)

Zamknięte: [F] 1–9, większość tików frazowych.

Otwarte (do decyzji autora / następnej sesji, nie robić trzeciej rundy automatycznie):
1. **[T]** nadal ok. 9× „nie X, lecz Y”; warto zostawić 3–4 najważniejsze.
2. **[S]** w części Fast akapity wciąż mają szablon „ekran → rola badawcza → odnośnik”; część (np. dane demograficzne, styl) można skrócić do jednego zdania lub scalić w jeden akapit.
3. **[T]** łączniki czasowe na początku akapitów Full: „Następnie”, „Dopiero teraz” (×3), „Potem”, „Po wyborze” — zbyt równy rytm.
4. **[F, do sprawdzenia w kodzie/na produkcji]**:
   - czy usunięcie mebli rzeczywiście nie jest osobnym krokiem w Fast;
   - czy w Full kroki klimat/zmysły/inspiracje nie da się pominąć i jest ustalona kolejność;
   - czy „zgoda poprzedza każdy zbiór danych”, „jeden głos przewodniczki”, „ruch liniowo do przodu” (Fast po ukończeniu wraca do wyboru ścieżki, więc „liniowo” jest uproszczeniem).
5. **[F, terminologia]** „zadanie wyboru wymuszonego… a nie test IAT” vs `GLOSSARY.md` („IAT-like / adaptacja IAT do swipe”) — ujednolicić w glossary lub w tekście; „faceci” (polski odpowiednik *facets*: aspekty/podskale) brzmi potocznie, choć glossary używa „facetów” — rozważyć „aspekty (facety)” po decyzji koordynatora.
6. **[S, techniczne]** `\label{ch07:sec:flow-quick}` stoi po `\subsubsection*`, więc `\ref` zwraca numer podsekcji nadrzędnej (`ch07:sec:opis-dziela`), nie osobnej sekcji. Używane z `07-artefakt-ida.tex` i `appendix-h-ida-flows.tex`. Naprawa wymaga decyzji koordynatora (numerowana `\subsubsection` albo zmiana odwołań).
7. **[K]** brakuje konkretów liczbowych/przykładów z danych pilotażu w narracji (uczestnik „średni”, czasy) — uzupełnić dopiero po ustaleniu, co jest w eksporcie (rozdz. 8).
8. **[S]** 12 `\Todo` w Full czeka na ryciny `figures/ida/flow-full/`; po ich dodaniu przeczytać rozdział jeszcze raz pod kątem rytmu.

### 3.4. Jak uruchomić pętlę na kolejnym rozdziale

1. Ustal `OWNER` i plik (zgodnie z `AGENTS.md`).
2. Uruchom Krytyka A (prompt z §1.7), zapisz listę.
3. Uruchom Poprawiacza z tą listą.
4. Uruchom Krytyka B, dopisz sekcję logu w nowym pliku `notes/<rozdział>-redakcja-petla.md` (odnoś się do §1 tego pliku zamiast kopiować protokół).
5. Stop zgodnie z §1.3.
