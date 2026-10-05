# Redakcja całości — krytyka niezależna (2026-10-04)

Zakres: abstrakt (PL/EN), rozdz. 1–10, `07c-opis-dziela-przebieg.tex`. Odniesienia: `data/analysis-2026-10-01.json`, `notes/flow-inventory-fast.md`, `notes/flow-inventory-full.md`, `GLOSSARY.md`, `HIPOTEZY_REWIZJA.md`, plan i lista braków z redakcji. Sprawdziłem też kilka zrzutów w `figures/ida/`. Nie commitowałem i nie kompilowałem.

## Werdykt

**Przyjąć jako wersję roboczą, ale nie jako spójną całość do czytania „na czysto”, dopóki nie zostanie załatwionych sześć punktów z sekcji „Must-fix” na końcu.** Liczby w rozdz. 8–10 w przeważającej części zgadzają się z JSON-em, a RQ1–RQ6 nie dryfują względem `HIPOTEZY_REWIZJA.md`. Największe ryzyka to co innego: (1) bramka konta w macierzy, której opis w 07c nie ma odzwierciedlenia w rozdz. 6–9; (2) pierwszoosobowa „praktyka pracowni” w rozdz. 4, której nic w repo nie dokumentuje; (3) `style_match` jako pozorna miara rozbieżności; (4) kilka zmyślonych lub niepotwierdzonych szczegółów metodycznych w rozdz. 6.

## 1. Sprzeczności między rozdziałami

| # | Gdzie | Co się nie zgadza |
|---|-------|-------------------|
| 1 | 07c (ryc. `opis-full-matrix`) vs rozdz. 6, 7, 8, 9, 10 | 07c słusznie opisuje ekran „Porównaj wizje (1/3)”: jedna karta odblokowana, reszta za kontem, komunikat „pierwsza z 6 wizji”. Zrzut to potwierdza. Rozdz. 6 (§ślepa macierz), 7 (§slepy-wybór: „porównuje sześć koncepcji”), 8 (RQ3: 29 „zaznaczeń”) i 9 (ograniczenia) tego nie uwzględniają. Jeśli uczestnik anonimowy widzi jedną wizję, to jego „ślepy wybór” nie jest wyborem spośród sześciu. 07c mówi o tym wprost („trzeba to uwzględnić przy interpretacji RQ3”), ale potem nikt tego nie robi. Ogranicza to zarazem wiarygodność tabeli 8.x z 29 osobami i tłumaczy, dlaczego liczniki 16/17/29 się rozjeżdżają. |
| 2 | Rozdz. 2, 3, 6 vs 07c | Rozdz. 2 i 6 umieszczają `prs_ideal` w profilu, `current`/`target` w Room Setup. 07c opisuje „aktualny, idealny i docelowy” jako jeden blok w pokoju. Inwentarz Full nie wymienia kroku „ideal” w ogóle (kroki 2–4 to Tinder, klimat, zmysły). Poprawiłem w 07c zdanie do „aktualny i docelowy”, ale gdzie leży `ideal`, musi rozstrzygnąć autor. |
| 3 | 07c (Room Setup) vs inwentarz Full | 07c podaje kolejność: aktywności/tarcia/ladder, potem PRS. Inwentarz: `prs_current` → `activities` → `prs_target`. Poprawione (patrz „Edycje”). |
| 4 | 07c („polskojęzyczny interfejs”) vs rozdz. 9 („po polsku i angielsku”) i zrzuty (przełącznik PL/EN) | Poprawione w 07c. |
| 5 | Rozdz. 6 („plan uzgodniony z promotorem”, faza „Główne zbieranie”) vs rozdz. 9 („progi uzgodnię z promotorem”) i rozdz. 10 („rozstrzygnę z promotorem”) | Czas przeszły vs przyszły. `HIPOTEZY_REWIZJA.md` ma to jako punkt do omówienia. Jedna z wersji jest nieprawdziwa. |
| 6 | Rozdz. 6 (kryteria wykluczenia: „oczywiście niespójne dane techniczne”) vs rozdz. 8 („za punkt wyjścia biorę rekordy z ważną zgodą”, bez żadnych wykluczeń) vs rozdz. 9 („240 rekordów miesza sesje testowe”) | Nie wiadomo, czy w 240 są sesje testowe, czy nie, i czy ktoś je wykluczył. „Sesje testowe” pojawiają się tylko w osieroconym `08-dane-2026-10-01.tex`, nie w JSON. |
| 7 | Rozdz. 5, 6, 7 („Fast nie zawiera Big Five”) vs rozdz. 8 (tab. kompletności: Fast ma 89 flag Big Five i 3 wyniki, 25 „ukrytych”, 4 profile rdzeniowe, 74 pokoje) | Rozdział 8 nie wyjaśnia, skąd dane „profilowe” na ścieżce, która ich nie zbiera. Najprawdopodobniej ludzie przechodzą Fast → Full (07c: `fast_completed=true`) i `path_type` bywa nadpisany albo flaga jest ustawiana przy pominięciu. To trzeba zdefiniować, bo od tego zależy, czym jest „full (85)”. |
| 8 | Rozdz. 8: „jasność” w RQ2 (`brightness` implicit/explicit) i „jasność” w RQ6 (`clarity`) | To samo słowo dla dwóch konstruktów w sąsiednich sekcjach. Abstrakt, rozdz. 1 i 07c używają „zrozumiałość”/„zrozumiały” dla `clarity`. Ujednolicić do „zrozumiałość” (a `brightness` zostawić jako „jasność”). |
| 9 | Abstrakt: „ślepy wybór zgłosiło 16” i zaraz „11 z 29 osób z zaznaczeniem” | Czytelnik widzi 29 > 16 bez wyjaśnienia. Rozdz. 9 i 10 mówią o „16, 17 albo 29”. W abstrakcie brakuje jednego zdania, że to osobne liczniki. |
| 10 | Rozdz. 8 RQ6: średnie z ścieżki full (n=25–27), rho z `n=27`/`26` | Zgodne z JSON, ale rho łączy ścieżki (25 full + 2 fast = 27), a średnie dotyczą samego full. Tekst tego nie mówi. Mała rzecz, ale n w tabeli syntezy („≈27”) wygląda jak full. |
| 11 | Rozdz. 8 RQ1: „Węższe gardło jest później. Wynik Big Five … 39 z 85” | W przebiegu Big Five (etap 7/12) poprzedza pokój (etapy 8–9). Na zrzucie jest przycisk „Pomiń test”. 39 < 49 to efekt pomijalności, nie gardła „później”. Ryc. lejka układa kolumny malejąco, nie w kolejności kroków, i też sugeruje inną sekwencję. |
| 12 | Rozdz. 8 RQ1, „Operacjonalizacja” vs „Wynik” | Operacjonalizacja zapowiada `current_step`, czas `created_at`→`updated_at`, `page_view`. Wynik używa tylko liczników kamieni milowych. Obiecane wskaźniki nigdzie nie są raportowane. |

**Głos.** Zasada „cudze — trzecia osoba, własne — ja” jest w przeważającej mierze zachowana. Pozostałości:
- 07c: „Załóżmy, że uczestnik wybiera…” (plan kazał zmienić „zakładamy” na „zakładam”; to jedyna forma 1. os. mn. w 07c).
- Rozdz. 1: „na którym oglądamy moodboardy” (1. os. mn. w akapicie, który ma być w stylu bezosobowym).
- Rozdz. 2, 3, 5: bezosobowe „Rozdział buduje…”, „Rozprawa nie dowodzi…” — spójne między sobą, ale rozdz. 1 i 6–10 mówią „ja”. Nie traktuję tego jako błędu, tylko świadomy podział.

**RQ.** Brzmienie RQ1–RQ6 w rozdz. 1, 6 i 8 jest zgodne z `HIPOTEZY_REWIZJA.md` i z `GLOSSARY.md` (rozdz. 1 parafrazuje RQ5 jako „wiąże się z preferencją wariantu `mixed_functional`” zamiast „wariantów uwzględniających funkcję przestrzeni” — dopuszczalne). Nie ma dryfu.

**Fast/Full.** Z wyjątkiem pkt 1, 2, 7 spójne. Uwaga: 07c podaje czasy 3–5 i 20–30 min zgodnie ze zrzutem ekranu wyboru ścieżki; inwentarz Full ma 15–20 min. Rozdział mówi, że nie mierzył — to uczciwe, ale inwentarz warto poprawić.

## 2. Twierdzenia wykraczające poza inwentarze i JSON

### 2.1. Sprawdzone i zgodne z JSON

Wszystkie kluczowe liczby rozdz. 8, 9, 10 i abstraktu: 240/109/85/46; lejek full (85/74/71/69/68/49/41/39/25/16); fast (4/5/5/25/61/1/2/3); 2190 swipów, mediana 1609, kwartyle 1074/2513, 1303/887, mediany 1623/1599; `style_match` 10/170/60 null; 59 wierszy feedbacku i rozkład źródeł; macierz 11/6/5/3/2/2 z 29 osób; Big Five 21 z 29; inspiracje 6/11 i 5/5; 47 osób z luką PRS (średnia 0,68), średnie luki po źródle i 22 osoby bez zaznaczenia (0,94); rho: 0,39/0,46/0,43; 0,20/0,35/0,41/−0,29/0,02/0,29; 0,43 (n=21); −0,28 (n=25); 0,71/0,68/0,77/0,57; SUS 66,48 (n=27), clarity 5,05 (26), agency 5,13 (25), sat 5,34 (25), fast 68,75 / 5,38 (n=2). Nie znalazłem zmienionej liczebności próby.

### 2.2. Nie do sprawdzenia w JSON (autor przyznał część z nich)

- 108 rekordów fast z `preference_comparison_json` i dokładny podział `style_match` według ścieżki (tylko w osieroconym `08-dane`: „session_export_json 108 fast”).
- Mediany `selection_time_ms` według źródła (50/104/134/105/162/207 s), 59 wierszy z **34 sesji**, 58 z `conflict_analysis`, **47/58** rozbieżnych etykiet, 2/17 i 1/6 w H2b.
- „Facetów nie raportuję: `big5_facets` … jest obiektem, ale nie ma stabilnej serii” (rozdz. 8) — JSON nie ma nic o facetach, zdanie jest zgadywaniem o stanie bazy.
- Ostatnia aktualizacja `participants` 11:39 i nazwa bazy `awa_db` — tylko w `08-dane`.
- „Znaczna część zleceń generacji kończy się błędem lub pending” (rozdz. 9 ×2, 10): prawda wg `08-dane` (411 sukcesów, 485 błędów, 278 pending z 1174), ale tych liczb nie ma w JSON ani w rozdz. 8. Zdanie „nie wiem, ile obrazów uczestnik faktycznie zobaczył” jest kluczowe dla RQ3, a stoi na liczbie, której czytelnik nie zobaczy. Albo dodać do JSON i rozdz. 8, albo podać liczby w rozdz. 9.

### 2.3. Przekroczenia

1. **`style_match` jako miara.** Rozdz. 8 (§próba) mówił: „Fałsz jest więc stanem dominującym, a nie jednym z dwóch zrównoważonych wariantów rozbieżności”. Skoro 108 z 170 wartości fałszywych pochodzi od fast, który ma 5 swipów i 5 zestawów preferencji jawnych, fałsz jest zapewne wartością domyślną przy braku kanału. Zastąpiłem to zdanie ostrożnym (patrz „Edycje”). Rozdz. 8 RQ2, 9 i 10 nadal mówią „style_match jest prawie zawsze fałszywy” jako ograniczenie — to jest już ostrożne.
2. **07c, „bez zaczynania od zera”** (powrót z Fast do Full). Inwentarz Fast: „start pełnej ścieżki lub ponowna szybka (zależnie od reguł sesji)”. Nic o kontynuacji bez powtarzania kroków. Usunięte.
3. **07c, awatar.** „Prowadzi przez niego [IPIP] awatar” — na zrzucie awatar jest, ale inwentarz nie mówi, że „prowadzi”. Drobne, ale to jest zdanie z gatunku „opis projektu przez autora”, a nie z zrzutu.
4. **07c, landing.** Opis „obiecuje koncepcję wnętrza dopasowaną do człowieka” łagodzi to, co widać na zrzucie: nagłówek **„Zobacz swoje wnętrze zaprojektowane pod Twoją osobowość”**, oferta „Basic za 0 zł · 6000 kredytów · limit 1000 pierwszych osób” i tag „IDA Interior Design Assistant” (a nie „AI Interior Design Dialogue Research Platform”). Rozdz. 5, 7, 9 podkreślają, że rozprawa unika determinizmu osobowości; landing mówi odwrotnie. To nie jest błąd tekstu, ale czytelnik zrzutu zobaczy sprzeczność. Warto jedno zdanie o tym w 07c albo w rozdz. 9 (etyka).
5. **Ślepy wybór a kredyty.** Bramka konta w macierzy jest kupiecką decyzją produktu (kredyty startowe). Rozdz. 7 („Product-First”) tłumaczy tło, ale rozdz. 9 nie wspomina o tym jako o zagrożeniu trafności RQ3 (zob. sprzeczność 1).
6. **Inwentarz Full jest błędny dla klatek 09 i 10.** Opisuje je jako „semantic differential” i „sensory”, a oba pliki pokazują ten sam ekran Tindera (etap 3/12, „Postęp 1/30”). Autor słusznie ich nie użył; teza „ta seria zrzutów nie ma dla nich osobnej, czytelnej klatki” w 07c jest prawdziwa, ale **plan i `REDAKCJA_DO_UZUPELNIENIA.md` sugerują coś odwrotnego** (że klatki istnieją i są pominięte). Do poprawienia w inwentarzu, nie w rozdziale. Klatki 06 i 08 też warto obejrzeć.
7. **Inwentarz Fast vs 07c: przycisk „Usuń meble”.** Inwentarz: „opcjonalna segmentacja mebli”. 07c i rozdz. 7: osobne zlecenie generacji, nie SAM (autor sprawdził w kodzie). Tekst jest tu prawdopodobnie lepszy od inwentarza, ale trzeba poprawić inwentarz, żeby nie wprowadzał w błąd następnego agenta. Rozdz. 4 mówi „W IDA … bez segmentacji SAM w produkcji”; spójne z rozdz. 7.
8. **Zrzuty wprost zgodne z tekstem 07c** (sprawdzone na obrazach): „+ Polecane” przy Pełnym doświadczeniu i czasy 3–5/20–30; pytania stylu życia (z kim mieszka, „vibe”, co najważniejsze w domu); ekran wyboru źródła preferencji dla pokoju („krótka ankieta dopasowana do pokoju”); pozycja IPIP z licznikiem i skalą 1–5; „Postęp 1/30”; ekran macierzy z jedną odblokowaną kartą. Nadmiarowych twierdzeń o nieistniejących klatkach (nakładka awatara, widżet satysfakcji, siatka sześciu wariantów, PRS, aktywności, podsumowanie, ankieta 2, podziękowanie) nie znalazłem — redakcja zrobiła to dobrze.

### 2.4. Zmyślone lub niepotwierdzone szczegóły metody i praktyki

- **Rozdz. 6, „Dobór”:** „zaproszenia, kanały akademickie i projektowe”. Nic w repo tego nie potwierdza; `08-dane` tylko mówi, że wrzesień dał 148 rekordów. Zdanie wygląda jak wyobrażenie typowej rekrutacji.
- **Rozdz. 6, „Kryteria włączenia”:** „osoby pełnoletnie”. Zrzuty demografii pokazują przedziały wieku; nie widać bramki 18+. Do potwierdzenia.
- **Rozdz. 6, brak wzmianki o zgodzie komisji etycznej.** Jest RODO i klauzula, ale przy badaniu z ludźmi w pracy doktorskiej czytelnik zapyta o komisję. Nie jest to zmyślenie, to luka. Załącznik F wspomina „uzgodnienia etyczne” bez szczegółów.
- **Rozdz. 4 (pierwsza osoba o pracowni):** „W pracowni najczęściej obserwowałem pięć rodzajów niepowodzeń”, „najbardziej przydały mi się trzy rodzaje conditioningu”, „W moich próbach powielał typowe układy mebli…”, tabela porównania SDXL/FLUX/edycyjnych z ocenami „wysoka/zmienna/wyższy koszt”. To są twierdzenia o doświadczeniu autora, których model nie mógł znać. Wszystkie ryciny rozdz. 4 i 6 załącznik G to `\Todo`. Autor ma to potwierdzić (`REDAKCJA_DO_UZUPELNIENIA.md` §3), ale w tekście nie ma żadnego znacznika, że to dopiero do weryfikacji. Czytelnik zobaczy gotową „pamięć autora”.
- **Rozdz. 7, wagi 0,40/0,30/0,30 i rozdz. 5 (`BIGFIVE_STYLE_MAPPINGS`, `filterInputsBySource`):** wyglądają prawdziwie i są spójne z załącznikami, ale nie sprawdzałem kodu. Autor ma potwierdzić.
- **Rozdz. 6 / 9: „SUS w adaptacji”.** Załącznik B mówi tylko „bateria stwierdzeń o użyteczności (`sus_1…sus_10`)”. Nigdzie nie jest powiedziane, co zaadaptowano. Albo to standardowy SUS (wtedy „adaptacja” to przesada), albo zmieniono brzmienie (wtedy trzeba to opisać).
- **Cytowania dekoracyjne:** `idaPlatform2026` (własny, niepublikowany artefakt) jest użyty jako `\parencite` przy tezach metodologicznych, np. rozdz. 5 „Wartość r>0,4 nie może tu służyć jako wynik potwierdzający \parencite{idaPlatform2026}”. To nie jest źródło dla takiego zdania. Nie wymyślonej publikacji nie znalazłem, ale ten klucz jest nadużywany.
- Nie znalazłem wymyślonych cytowań z nieistniejącymi autorami. Wszystkie klucze użyte w tekście (`kahneman2011thinking`, `greenwald1998iat`, `kaplan1995restorative`, `ulrich1984window`, `hartig1997prs`, `kellert2008biophilic`, `osgood1957measurement`, `reynolds1988laddering`, `john2008bigfive`, `frayling1993research`, `zimmerman2007rtd`, `rombach2022ldm`, `zhang2023controlnet`, `kirillov2023sam`, `ravi2024sam2`, `eu2016gdpr`, `idaPlatform2026`) są w `references.bib`, a opisy treści (np. cztery cechy ART u Kaplana, wymiary PRS, nazwy facetów O1/O2/C2/E5/N1, 120 pozycji / 30 facetów po 6 na domenę) zgadzają się z tym, co wiem o tych źródłach.

## 3. Miejsca, które nadal brzmią jak tłumaczenie lub formuła

**Kalki i niezamienione anglicyzmy** (plan obiecywał ich usunięcie):
- Rozdz. 8: „attrition” (nagłówek akapitu), „dropout” (RQ1, wynik), „confirmatory” (hipotezy RQ3), „Feasibility flow” (tab. syntezy), „bez claimów”, „mismatch” (rozdz. 6 tab. RQ2). Hipotezy i nazwy z kanonu RQ1 („katastrofalnego dropoutu”) można zostawić jako cytat z `HIPOTEZY_REWIZJA.md`, ale poza cytatem powinno być „odpadanie uczestników”.
- „mood image” w rozdz. 7 (×4), 07c, 9, 10 — bez polskiego odpowiednika, używane jako termin (7 wystąpień). Warto raz zdefiniować albo przełożyć („obraz nastrojowy”).
- „zdjęcie bazy” (rozdz. 9, początek) dla „snapshot” — koliduje ze „zdjęciem pokoju”.
- „pain points” w tabelach i punktach rozdz. 2, 3, 6, 7 — plan kazał „punkty tarcia” w prozie; w tabelach i nazwach pól może zostać.

**Zdania uszkodzone lub niezgrabne:**
- Rozdz. 9, §rozbieżność: „Tego rozdziału nie rozstrzygają dane, które mam.” Zdanie bez sensu (zapewne „Tego nie rozstrzygają dane, które mam”).
- Rozdz. 8: „Za punkt wyjścia biorę rekordy z ważną zgodą badawczą (…)” + „Czterdzieści sześć rekordów… niemal nic poza nią” — ok, ale „lejek ukończenia … Spadek nie następuje w jednym miejscu” to już leitmotiv „nie X, tylko Y” (patrz niżej).
- Rozdz. 8: „W lewo poszło 1303 gestów” — rzadko spotykane sformułowanie; „odrzucono 1303 kart” brzmiałoby naturalniej, ale to kwestia gustu.

**Tiki AI, które zostały:**
- Antyteza „nie X, lecz/tylko Y” jako główny silnik retoryki. Szacunkowo 2–7 na rozdział, najwięcej w rozdz. 7 (głównie przed 07c), 6, 9. Przykłady: „Problem nie zaczyna się więc od aplikacji. Zaczyna się od pytania dyscypliny” (1), „Luką … nie jest zatem brak kolejnego generatora. Brakuje…” (1), „Nie jest to formularz badania, lecz zwykła strona produktu” (07c), „Pierwsza z nich nie jest jeszcze projektowaniem, lecz umową” (07c), „Awatar IDA nie jest chatbotem dla ozdoby ani maskotką” (7), „Nie mówi, że deklaracje są gorszym źródłem gustu… Mówi tyle, że…” (9).
- Slogan zamiast tezy: „Product-First i Research-Embedded nie są dla mnie dwiema warstwami, tylko jednym gestem” (07c), „Interfejs jest „pusty” z rozmysłem” (7), „Po wyniku nie ma pożegnania” (07c), „obietnica z pierwszego ekranu ma się spełnić” (07c), „Fast jest więc samodzielnym produktem i zaproszeniem do dłuższej rozmowy” (07c).
- „Gest” jako uniwersalny rzeczownik (przycisk, wybór, decyzja projektowa, „trzy gesty” wkładu w rozdz. 9, „gest projektowy” w 7). Nie krytyczne, ale po trzecim użyciu męczy.
- Trójki i rytmiczne listy: „decyzje, odrzucenia i przeniesienie wniosków” (9), „instrumenty … są etapami drogi projektowej. Dane powstają…” (7).
- Rozdz. 10, „Rekomendacje”: ogólniki w trybie rozkazującym („Dobrze zbierać równolegle sygnały jawne i behawioralne”, „Najpierw raportować wykonalność, dopiero potem psychometrię”), które nie wynikają z tak małej próby.

Całościowo 07c i rozdz. 8 brzmią najbardziej „po polsku” i konkretnie; rozdz. 1, 7 (część przed 07c) i 10 są najbardziej „prezentacyjne”.

## 4. Sześć czerwonych znaczników `[ŹRÓDŁO DO UZUPEŁNIENIA]` w świetle `references.bib`

Wniosek: **wszystkie sześć to realne braki; żadnego nie zamykam, bo żaden klucz nie pasuje oczywiście i bez zgadywania.** Nie dodawałem cytowań do `.tex`. Dla dwóch jest częściowy kandydat, dla czterech brak.

| # | Plik / miejsce | Czy w bib jest klucz? | Uwagi |
|---|----------------|-----------------------|-------|
| 1 | `01-wprowadzenie.tex`, rola ekranu w decyzjach projektowych | **Brak.** | Żaden z 17 kluczy nie dotyczy wizualizacji w projektowaniu. Opcja: przeformułować na obserwację własną („w mojej praktyce”) i zdjąć znacznik, albo znaleźć źródło. |
| 2 | `02-psychologia-srodowiskowa.tex`, regeneracyjność kształtowana światłem, materiałem, złożonością, naturą, układem | **Częściowo:** `kellert2008biophilic` obejmuje światło dzienne, materiały naturalne, obecność natury; `kaplan1995restorative` (fascynacja, rozległość/spójność) stoi blisko „złożoności” i „czytelności układu”. | Pełne zdanie ma pięć elementów; bib pokrywa trzy pewnie, dwa luźno. Nie dopisałem cytowania, bo trzeba by wybrać, które elementy kto uzasadnia (i bez numerów stron). |
| 3 | `03-preferencje-estetyczne.tex`, rozbieżność jako konflikt gustu / pożądanie społeczne / trudność nazwania | **Brak** dla „pożądania społecznego” i „trudności nazwania”. `kahneman2011thinking` stoi już w poprzednim zdaniu i uzasadnia tylko „dwa tryby”. `osgood1957measurement` nie dotyczy. | Najuczciwsze wyjście: zamienić drugie zdanie na jawną hipotezę autora („Może oznaczać … — to są hipotezy, które w pilotażu nie mogą być rozstrzygnięte”) i zdjąć znacznik. Alternatywnie dodać klasyczne prace o samoopisie (np. Nisbett i Wilson 1977; Paulhus o odpowiedziach pożądanych społecznie) po weryfikacji DOI/danych. |
| 4 | `04-medium-dyfuzyjne-comfyui.tex`, rodziny modeli SDXL / FLUX / edycyjne | **Częściowo:** `rombach2022ldm` to podstawa Stable Diffusion; nie pokrywa SDXL ani FLUX. `zhang2023controlnet` dotyczy ControlNet. | Brakuje: SDXL (Podell i in. 2023, arXiv 2307.01952, do weryfikacji) i FLUX (brak recenzowanej pracy; ewentualnie dokumentacja Black Forest Labs jako `@misc`). Zdanie jest jednak relacją z własnych porównań autora, więc dla „porównałem trzy grupy” źródło nie jest konieczne; potrzebne tylko do opisu rodzin. |
| 5 | `04-medium-dyfuzyjne-comfyui.tex`, LoRA | **Brak.** | Standardowe źródło: Hu i in., „LoRA: Low-Rank Adaptation of Large Language Models” (ICLR 2022, arXiv 2106.09685) — do dopisania do bib po sprawdzeniu danych. |
| 6 | `06-metodologia.tex`, SUS i skale własne | **Brak** dla SUS. | Standardowe źródło: Brooke 1996, „SUS: a ‘quick and dirty’ usability scale” (rozdział w *Usability Evaluation in Industry*) — do dopisania po sprawdzeniu. Skale agency/clarity/satisfaction są własne i bez źródła; wystarczy powiedzieć wprost, że nie były walidowane (rozdz. 6 §ograniczenia już to w istocie mówi). Dodatkowo patrz 2.4 „SUS w adaptacji”. |

Pozostałe `\NeedsCite` (15) są pomarańczowe i nie dotyczą tego zadania, ale uwaga: rozdz. 5 opiera cały akapit o literaturze „osobowość a preferencje” (słabe-do-umiarkowanych asocjacje, otwartość→zróżnicowane obiekty, sumienność→porządek) wyłącznie na `\NeedsCite`. To są konkretne twierdzenia empiryczne bez żadnego klucza; powinny dostać czerwony znacznik, skoro plan (§4) tak definiuje „twierdzenie spoza obserwacji autora”.

## 5. Edycje, które wprowadziłem w `.tex`

Cztery drobne, każda to korekta faktu względem zrzutu/inwentarza/JSON, nie stylu:

1. `chapters/07c-opis-dziela-przebieg.tex` — „polskojęzyczny interfejs” → „interfejs w dwóch wersjach językowych (PL i EN)” (zrzuty pokazują przełącznik PL/EN; rozdz. 9 mówi to samo).
2. `chapters/07c-opis-dziela-przebieg.tex` — „wejść w pełne doświadczenie bez zaczynania od zera” → „wybrać pełne doświadczenie” (inwentarz Fast nie potwierdza kontynuacji bez powtórzeń).
3. `chapters/07c-opis-dziela-przebieg.tex` — zdanie o PRS: usunięty „idealny” (nieustalone miejsce w przebiegu; sprzeczność z rozdz. 2 i 6), kolejność zmieniona na zgodną z inwentarzem (PRS przeplata się z aktywnościami).
4. `chapters/08-wyniki.tex` — zdanie „Fałsz jest więc stanem dominującym, a nie jednym z dwóch zrównoważonych wariantów rozbieżności” zastąpione stwierdzeniem, że fast prawie nie zbiera swipów i preferencji jawnych (po 5 osób), więc fałsz u 108 rekordów może wynikać z braku kanału, i że `style_match` nie jest tu traktowany jako miara rozbieżności.

Nic poza tym nie ruszałem: żadnych zmian stylistycznych, cytowań ani liczb.

## 6. Must-fix przed czytaniem jako całość

1. **Bramka konta w macierzy.** Dodać do rozdz. 9 (ograniczenia) i do §ślepa macierz w rozdz. 6/7 jedno zdanie, że uczestnik anonimowy widzi na ekranie „Porównaj wizje” tylko część wizji (zrzut: 1 odblokowana z 3 kart na stronie, komunikat „pierwsza z 6”), i napisać, jak to wpływa na interpretację 16/17/29 wyborów. Bez tego sprzeczność między 07c a resztą jest widoczna dla każdego czytelnika, który dojdzie do ryciny `opis-full-matrix`.
2. **Rozdz. 4 — oznaczyć niepotwierdzone obserwacje z pracowni.** Dopóki autor nie potwierdzi, każde zdanie w pierwszej osobie o własnych próbach i tabela modeli powinny mieć widoczny znacznik (`\AgentNote` lub `\Todo`), a nie wyglądać na ustalenie. Dotyczy też rozdz. 7 (tabela transferu) w zakresie „co odrzuciłem i dlaczego”.
3. **Rozdz. 6, metoda.** Rozstrzygnąć trzy niezgodne szczegóły: czy plan jest już „uzgodniony z promotorem” (rozdz. 6) czy dopiero będzie (rozdz. 9–10); czy w 240 były sesje testowe i czy zostały wykluczone; skąd „kanały akademickie i projektowe” i „pełnoletniość”. Dopisać, co dokładnie zaadaptowano w SUS albo usunąć słowo „adaptacja”.
4. **Wyjaśnić w rozdz. 8, czym jest „fast” z danymi profilu** (89 flag Big Five, 25 ukrytych, 4 profile, 74 pokoje) i jak powstaje `path_type`. Bez tego tab. kompletności podważa zdanie „Fast nie zbiera profilu” z rozdz. 5–7.
5. **Liczby generacji w tekście.** Dodać do `analysis-2026-10-01.json` i rozdz. 8 liczbę zleceń: 1174 łącznie, 411 sukcesów, 485 błędów, 278 pending (z `08-dane`), albo usunąć „znaczna część” z rozdz. 9 i 10. Dziś jest to jedno z trzech głównych zastrzeżeń do RQ3 bez liczby.
6. **Ujednolicić terminologię i usunąć uszkodzone zdanie:** „jasność” (brightness) vs „zrozumiałość” (clarity) w rozdz. 8; „Tego rozdziału nie rozstrzygają dane, które mam” w rozdz. 9; w abstrakcie jedno zdanie, że 16/17/29 to różne liczniki; w rozdz. 10 „udany pilotaż procedury” (przy 41% zleceń z błędem i niejednoznacznym licznikiem wyboru to za mocne).

Poza listą, do ustalenia przez autora bez pośpiechu: miejsce `prs_ideal` w przebiegu; poprawa inwentarzy (klatki 09–10 Full, „segmentacja” przy „Usuń meble”, czas 15–20 vs 20–30 min); sprawdzenie klatek 06 i 08 Full.
