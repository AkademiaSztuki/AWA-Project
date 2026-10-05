# Redakcja całości — lista braków do uzupełnienia

Stan: po redakcji prozy (abstrakty, rozdz. 1–10, 07c). Kanon liczb: `data/analysis-2026-10-01.json`. Nic nie zostało zacommitowane. Pełna kompilacja nie była uruchamiana.

## 1. Czerwone znaczniki `[ŹRÓDŁO DO UZUPEŁNIENIA]` (6)

| # | Plik | Miejsce | Czego brakuje |
|---|------|---------|---------------|
| 1 | `chapters/01-wprowadzenie.tex` | tło, akapit o ekranie jako miejscu decyzji (moodboardy, rendery, obrazy generatywne) | źródło o roli wizualizacji w decyzjach projektowych |
| 2 | `chapters/02-psychologia-srodowiskowa.tex` | koniec akapitu o sensie praktycznym ART/SRT | źródło, że regeneracyjność można kształtować światłem, materiałem, złożonością, naturą, układem |
| 3 | `chapters/03-preferencje-estetyczne.tex` | sekcja o rozbieżności implicit/explicit | źródło o rozbieżności jako konflikcie gustu, pożądaniu społecznym, trudności nazwania atmosfery |
| 4 | `chapters/04-medium-dyfuzyjne-comfyui.tex` | sekcja o modelach (SDXL, FLUX, edycyjne/img2img) | źródło dla opisu rodzin modeli |
| 5 | `chapters/04-medium-dyfuzyjne-comfyui.tex` | sekcja o LoRA | źródło dla opisu adapterów LoRA |
| 6 | `chapters/06-metodologia.tex` | początek sekcji o instrumentach | źródło adaptacji SUS; podstawa własnych skal sprawczości, zrozumiałości, satysfakcji |

## 2. Pozostawione `\NeedsCite` (pomarańczowe, 15) i `\Todo` / `\AgentNote`

`\NeedsCite`: ch01 ×1 (narzędzia AI do wizualizacji), ch02 ×3 (Ulrich 1991 i przeglądy; PRS-11 Pasini 2014; PEO), ch03 ×1 (adaptacje IAT w HCI), ch04 ×3 (przegląd dyfuzji w architekturze; VLM w designie; autorstwo w sztuce generatywnej), ch05 ×7 (IPIP-NEO-120/NEO; Gosling 2002; Graham–Gosling–Travis 2017; Nasar 1989; Whitfield–Wiltshire 1990; podstawa reguł facetów; etyka rekomendacji z osobowości).
Weryfikacja DOI przed wpisem do `references.bib`. Nie wpisywałem stron ani cytatów.

`\Todo` (placeholdery rycin): ch02 ×3, ch03 ×2, ch04 ×5, ch06 ×1 (`figures/ch06-procedure-fast-full.pdf`), appendix-g ×6. `\AgentNote`: ch07 ×1 (ryciny `fig:ch07:avatar`, `ui-screens`, `architecture`, `flow`, `pipeline`, `matrix` do zastąpienia materiałem z `figures/ida/`), appendix-a ×1.

## 3. Punkty do potwierdzenia przez autora

**Ch04 (praktyka pracowni).** Zdania w pierwszej osobie o własnych próbach (porównanie rodzin modeli, obserwacje o geometrii, depth, SAM) oparłem na dotychczasowym tekście i notatkach. Potwierdź, że odpowiadają temu, co faktycznie robiłeś.

**Ch06 (metoda).** Wagi mieszane 0,40/0,30/0,30, rozmiar pilotażu i kryteria przejścia pilotaż → zbieranie to opis Twojej procedury. Sprawdź, że zgadzają się z kodem i z decyzją co do kolejności kroków.

**Ch07 / 07c.**
- Przycisk „Usuń meble (Zalecane)”: opisałem go jako osobne zlecenie generacji z instrukcją usunięcia wyposażenia (nie SAM). Sprawdziłem w kodzie, ale zrzut ekranu z jego użyciem nie istnieje.
- Czasy „3–5 min” i „20–30 min” podaję jako deklaracje z ekranu wyboru. `notes/flow-inventory-full.md` ma jeszcze wariant 15–20 min; warto ujednolicić inwentarz.
- Brakujące klatki: Fast — widżet satysfakcji; Full — klimat/zmysły (istnieją pliki 09–10 w inwentarzu, ale nie użyłem ich w 07c), pytania o pokój, PRS, aktywności i punkty tarcia, podsumowanie pokoju, druga ankieta, podziękowanie.
- Ryc. `fig:ch07:opis-full-matrix` pokazuje ekran „Porównaj wizje (1/3)” z jedną odblokowaną kartą i komunikatem „pierwsza z 6 wizji”. To bramka konta, nie pełna siatka sześciu wariantów.
- Awatar na landingu: nakładki pominięcia nie było w nagranej sesji, nie ilustruję jej.
- Kolejność w Full (swipe → semantic → sensory → inspiracje → Big Five → pokój) zgodna z inwentarzem; kolejność ankiet końcowych (SUS, potem ankieta 2) wzięta z inwentarza, bez zrzutu drugiej.

**Ch08 (wyniki).** Liczby kontrolowałem względem `analysis-2026-10-01.json`. Nie umiem ich zweryfikować z tego pliku:
- podział `style_match` prawda/fałsz według ścieżki (10 / 170 / 108 fast),
- mediany `selection_time_ms` według źródła,
- 59 wierszy z 34 sesji, 58 z `conflict_analysis`, 47/58 rozbieżnych etykiet,
- statystyki swipów (2190, mediana 1609 ms, 1303/887),
- rho ze satysfakcją (0,71 / 0,68 / 0,77) — ich próba (n=27) jest większa niż n satysfakcji na Full (25); zakładam, że obejmuje też dwie osoby z Fast, sprawdź.
Trzy liczniki ślepego wyboru (16 flag na Full / 17 łącznie / 29 w macierzy) nie zostały sprowadzone do jednego. To otwarta decyzja metodologiczna.

**Ch09.** Podałem, że „znaczna część” zleceń generacji kończy się błędem lub pending. Liczby (z odczytu tego samego dnia: 485 błędów, 278 pending z 1174 zleceń) są w osieroconym `chapters/08-dane-2026-10-01.tex`, nie w kanonie JSON. Jeśli chcesz je podać w tekście, dodaj je do JSON-a i do ch08.

## 4. Inne uwagi

- Ch10 nie zawiera już listy braków. Ta lista jest tylko tutaj.
- `07b` nie jest włączony i nie został ruszony. `08-dane-2026-10-01.tex` pozostaje osierocony.
- Appendix H: poprawiłem jedno zdanie o ścieżce Fast (bez Big Five, ladderingu i profilu).
- Przy pełnej kompilacji sprawdź: tabele w ch06/ch07/ch08 (szerokości), nierozwiązane odwołania (statyczna kontrola `\ref`/`\cite` nie wykazała braków).
