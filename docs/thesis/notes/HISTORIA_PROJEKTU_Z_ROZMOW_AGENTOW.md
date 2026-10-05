# Historia projektu AWA / IDA — synteza z rozmów z agentami Cursor

## Metadane

| Pole | Wartość |
|------|---------|
| **Data utworzenia dokumentu** | 2026-10-01 |
| **Ostatnia aktualizacja** | 2026-10-01 (rozbudowa narracji + indeks `cloud-cache`; ~**7900** słów) |
| **Autor syntezy** | agent Cursor (na zlecenie Jakuba Palki) |
| **Źródła pierwotne** | transkrypty rozmów w folderach Cursor `agent-transcripts` dla workspace AWA-Project oraz AWA-Project-docs-thesis |
| **Przeanalizowane rozmowy (unikalne UUID)** | **164** folderów JSONL w `agent-transcripts` (AWA root) + **355** wątków AWA/IDA w indeksie sidebar (score ≥ 9 w FTS; łącznie **880** wpisów w DB: **741** `local`, **139** `cloud-cache`) |
| **Zakres czasowy rozmów** | **2025-07-07** – **2026-10-01** (`conversation-search.db`: `updated_at`; transkrypty agenta (UUID/*.jsonl) od ~**2026-03-05**) |
| **Uzupełnienie** | `git log`, `GLOSSARY.md`, `HIPOTEZY_REWIZJA.md`, `SPIS_TRESCI_ROBOCZY.md`, eksporty FTS → `notes/drafts/transcripts/` (top **50** wątków) |
| **Kopia robocza DB** | read-only kopia `conversation-search.db` w `%TEMP%`; oryginał nietknięty |
| **Chmura Cursor (`cloud-cache`)** | **139** wpisów w indeksie (id `bc-…`, krótszy `body` po sync) — nie zastępuje JSONL ani pełnego UI; patrz [GDZIE_SA_ROZMOWY_CURSOR.md](GDZIE_SA_ROZMOWY_CURSOR.md) § Archiwa |
| **Branch roboczy pracy pisemnej** | `pisemna`, kanon w `docs/thesis/` |

**Źródła uzupełniające (2025-07 – 2026-02):** pełne transkrypty agenta (`agent-transcripts`) zaczynają się ok. **marca 2026**, ale **indeks sidebar** `conversation-search.db` (FTS: tytuł + skrócony `body`) obejmuje cały okres pracy nad **Aura/AWA/IDA**, w tym wątki bez pliku `.jsonl` (np. [Futurystyczna asystentka projektowania wnętrz](41da62f6-e2d9-49d3-8b74-86448633fa60)). Treść FTS bywa fragmentaryczna względem UI — oznaczamy to w eksportach. Okres **2024 – wczesna 2025** (dokumenty H1–H5, pierwsze plany macierzy) nadal głównie z **Git** i archiwalnych `.md` w repo. Szczegóły ścieżek: [GDZIE_SA_ROZMOWY_CURSOR.md](GDZIE_SA_ROZMOWY_CURSOR.md).

---

## Streszczenie wykonawcze

**IDA** (*AI Interior Design Dialogue Research Platform*) to artefakt badawczy w logice **Research through Design (RtD)**: platforma łączy psychologię środowiskową (PRS, biophilia), psychometrię (IPIP-NEO-120), pomiar preferencji ukrytych i jawnych, generatywne AI oraz warstwę produktową (ścieżka **Full** vs **Fast**, marketing, później billing i udostępnianie wyników). Repozytorium **AWA-Project** wyewoluowało z wczesnego prototypu **Aura** (Next.js, flow badawczy, generacja przez **FLUX** na **Modal**, persistence w **Supabase**).

W okresie objętym transkryptami dominują trzy osie prac:

1. **Infrastruktura i jakość danych** — świadoma migracja persystencji na **GCP** (Cloud SQL, Cloud Run, GCS), spięcie z już używanym **Vertex AI / Gemini** do obrazów, iteracyjne debugowanie synchronizacji profilu badawczego (consent, macierz, Big Five, PRS).
2. **Dopracowanie artefaktu pod empirykę** — utrwalenie **macierzy 6 źródeł** i **ślepego wyboru**, audyt pipeline’u **prompt-synthesis**, poprawki UX lejka (progress 12 kroków, testy sensoryczne jako sekwencja, nie skaczące zakładki), rozróżnienie „ukończony profil” vs „ukończone badanie”.
3. **Warstwa doktorska i organizacja wiedzy** — branch **`pisemna`**, LaTeX w `docs/thesis/`, rewizja **H1–H5 → RQ1–RQ6**, **GLOSSARY.md** jako anty-„śmietnik dokumentacyjny”, workflow **multi-agent** z podziałem ownership rozdziałów, audyt bezpieczeństwa (**Thermos**) przed skalowaniem produktu.

Równolegle projekt zyskał cechy **produktu komercyjnego** (landing, SEO, OAuth, Stripe, program poleceń, karty udostępniania Przed/Po), co w rozmowach wielokrotnie rodziło pytania **etyczne i metodologiczne**: jak nie tracić danych badawczych przy mieszaniu użytkowników „badawczych” i „produktowych”, jak komunikować zgodę RODO, jak nie zatrzymać lejka macierzy przy skalowaniu do docelowych **500–1000** uczestników.

Narracja rozprawy (wg `GLOSSARY` i `SPIS_TRESCI_PROPOZYCJA_ASP.md`) oddziela **ComfyUI** (pracownia autora, eksperymenty depth/SAM/ControlNet) od **runtime IDA** (Gemini Image na Vertex). **FLUX** pozostaje w genealogii, nie w opisie produkcji.

**Uzupełnienie z indeksu sidebar (lipiec 2025 – luty 2026):** w tym okresie praca z Cursorem ma charakter **ciągłego dopinania produktu badawczego** — od pierwszego commitu Aura po pierwsze poważne audyty metodologiczne i pivot na modele Google. Wątki są krótsze i częściej „techniczne” niż transkrypty agenta z 2026, ale razem tworzą spójną historię decyzji: (1) **tożsamość UX** (asystentka, glass, audio) jako element procedury, nie dekoracja; (2) **implicit** od początku spięty z Tinderem i biblioteką obrazów; (3) **backend GPU** najpierw Modal/FLUX, potem ostrożne przesuwanie inferencji do ekosystemu Google; (4) **persistencja** jako ryzyko nr 1 dla doktoratu — już w lipcu 2025 widać problemy zapisu ankiet, a w grudniu 2025 z OAuth i kredytami; (5) **metodologia** doprecyzowana dopiero po krytyku MBTI i nadmiernych claimów psychometrycznych ([f5b2b00a](f5b2b00a-4357-4ba2-8e51-d50a7571fe6b)). Eksporty FTS dla najważniejszych wątków: `notes/drafts/transcripts/`.


## Rozdział narracyjny — geneza Aura, tożsamość IDA i pierwsze zamrożenia metodologiczne

### Od Aura do IDA: rename bez zerowania genealogii

Projekt, który dziś opisujemy jako **IDA** (*AI Interior Design Dialogue Research Platform*), nie wystartował pod tą nazwą ani pod językiem „platformy badawczej” w rozumieniu gotowej rozprawy. Pierwszy commit repozytorium (**2025-07-21**, `e679059`) nosi tytuł *Initial commit: Stworzenie struktury projektu Aura* i zakłada monorepo z frontendem **Next.js** oraz warstwą API w Pythonie. W indeksie rozmów Cursor pierwszy wpis datowany jest jeszcze wcześniej (**2025-07-07**) i odpowiada okresowi instalacji edytora oraz pierwszych eksperymentów z asystentem kodu — jeszcze przed ustabilizowaniem nazwy produktu. Ta chronologia jest ważna metodologicznie dla **Research through Design (RtD)**: artefakt nie był „najpierw zaprojektowany w laboratorium, potem zbudowany”, lecz współewoluował z narzędziami generatywnymi (Cursor), z infrastrukturą chmurową i z iteracyjnym doprecyzowaniem pytań badawczych.

Rename **Aura / AWA → IDA** w komunikacji akademickiej nie jest więc aktem wymazywania historii, lecz **rozdzieleniem warstw narracji**. W `GLOSSARY.md` utrwalono zasadę: w rozprawie mówimy **IDA** jako o artefakcie badawczym i o kanonie empirycznym (RQ1–RQ6, macierz 6 źródeł, IPIP-NEO-120), podczas gdy **Aura/AWA** pozostają w genealogii commitów, w starych README i w tytułach wątków z 2025 roku w `conversation-search.db`. Dla autora rozprawy implikacja jest prosta: w rozdziale o artefakcie można pokazać zrzut landingu z copy „wizualne DNA” i awatarką AWA jako **dowód wczesnej hipotezy produktowej**, a następnie wyjaśnić, dlaczego doktorat wymagał ostrzejszego języka (zgody, operacjonalizacja, rozdzielenie ścieżki Full od Fast).

Kontekst tej decyzji leży w napięciu między **Product-First** a **Research-Embedded**, które już w grudniu 2025 pojawia się w rozmowie [Podsumowanie projektu doktoranckiego](c69dd1bc-6947-4ecd-b2b9-443769fccd60). Dokument ten opisuje stack **Modal + FLUX**, **Supabase**, około dziesięciu kanałów danych do syntezy promptów oraz **IPIP-60** — snapshot, który dziś traktujemy jako **archiwum intencji**, nie jako opis produkcji. Właśnie dlatego `HISTORIA` nie powinna cytować tego pliku jako „stan obecny”, lecz jako **moment przed pivotem GCP/Gemini** i przed rewizją hipotez.

### Faza 0 — Aura jako wspólny prototyp produktu i protokołu

**Problem początkowy** można sformułować jako pytanie projektowe z pogranicza HCI i psychologii środowiskowej: jak zebrać preferencje estetyczne użytkownika (część jawna, część ukryta), przetłumaczyć je na parametry generacji wnętrz i jednocześnie utrzymać użytkownika w flow wystarczająco długo, by dane miały wartość badawczą. W lipcu i sierpniu 2025 odpowiedzią techniczną było połączenie **Tindera** (swipe z czasem reakcji) z **Modal.com** i modelem **FLUX Kontext** ([Jak odpalać modala?](23a9678e-107a-4f56-a791-b6e448a458a3), [FLUX Kontext](cee45992-6ce1-476d-a148-8ee1b082952a)), a odpowiedzią doświadczeniową — **Minimalist Glass Design**, model 3D awatarki oraz warstwa **AwaDialogue** (zdania + audio), widoczna już w wątku [Futurystyczna asystentka projektowania wnętrz](41da62f6-e2d9-49d3-8b74-86448633fa60).

W RtD asystentka nie jest „ozdobą interfejsu”. W rozmowach z agentem powtarza się motyw, że dialog prowadzi uczestnika przez kolejne kroki procedury — od onboardingu po **laddering** w Room Setup ([dialog w ladder](d62f3e77-9d40-478d-b13f-253c86be6abd)). Audio i glass UI wpływają na tempo i na pierwsze wrażenie; w październiku 2025 logi z [Research framework](9e5d5fdf-5878-4500-be7c-2c24bf2f7f4f) pokazują typowe tarcie **Fast Refresh** i wyścigi `play()` w przeglądarce. Metodologicznie nie traktujemy tego jako zmiennej zależnej, ale jako **kontekst proceduralny**, który w 2026 wymusił poprawki (ducking ambientu przy próbkach sensorycznych, commit `5fff23d`).

**Problem persystencji** pojawił się niemal równolegle z pierwszymi ekranami ankiety. Wątek [Zapis wyników ankiet](9e902bec-2060-4584-a3cb-9b7338c5f867) jest wczesnym sygnałem alarmowym: bez stabilnego zapisu do **Supabase** doktorat nie ma materiału empirycznego, niezależnie od jakości generacji. Ta lekcja wróciła w czerwcu 2026 w serii audytów Cloud SQL — ale już w 2025 ustanowiła **priorytet jakości danych** równorzędny z priorytetem UI.

**Rozważane opcje infrastrukturalne** w fazie 0 były typowe dla startupu badawczego: frontend na **Vercel**, API GPU na **Modal**, baza **Supabase** (PostgreSQL + Auth + Storage). Problemy środowiskowe ([Modal w WSL](74ed8f49-dfe0-4173-ac9d-3bfece7ac823)) oraz limity serverless ([Problem z generowaniem obrazów na Vercel](deafbb04-d100-4fca-a6c1-ca03c60d11dc)) nie kończyły wtedy projektu, lecz **kumulowały argumenty** za późniejszym przeniesieniem ciężkiej inferencji i długich requestów poza Vercel. Decyzja nie zapadła natychmiast — najpierw trzeba było ustabilizować flow profilu i bibliotekę stimulusów ([Integracja zdjęć do systemu tinder](93b8304c-8c58-4de7-af6c-8ef9469ac883)).

**Konsekwencje dla badań i produktu:** faza 0 zostawiła trwały ślad w architekturze mentalnej projektu: (1) **implicit** i **explicit** są równoległymi kanałami od początku; (2) generacja jest **rdzeniem obietnicy produktowej** („zobacz swoje wnętrze”), więc każda zmiana modelu (FLUX → Gemini) jest jednocześnie zmianą **stimulusów** w macierzy; (3) doktorat nie może polegać na „ręcznym zrzucie” danych z konsoli — wymaga audytowalnej ścieżki od zgody do `participant_id`.

### Faza 1 — kryzys metodologiczny, profil, prompty i pierwszy pivot na Google

Październik 2025 wprowadza **przełom doktorski** nie przez nowy commit, lecz przez rozmowę [Weryfikacja pytań i metod badawczych](f5b2b00a-4357-4ba2-8e51-d50a7571fe6b). Kontekstem było odkrycie, że **MBTI** — wcześniej rozważane w rozmowach o personalizacji — jest **niewłaściwe** dla projektu badawczego: koszt licencyjny, brak gotowości do obrony psychometrycznej oraz fundamentalna różnica względem kwestionariuszy opartych na pozycjach (IPIP). Użytkownik explicite kwestionuje wtedy zaufanie do wcześniejszych sugestii agenta i żąda audytu pliku `validated-scales.ts`.

**Problem** można streścić jako ryzyko **nienaukowej legitymizacji**: część komponentów nosiła etykiety „IAT”, „PRS”, „validated”, podczas gdy implementacja była adaptacją gamifikowaną (2D mood grid zamiast PRS-11, swipe zamiast klasycznego IAT). To nie jest fałsz intencji — to typowe napięcie RtD — ale w rozprawie wymaga **jawnego opisu adaptacji** i ograniczenia claimów. W tej samej rozmowie pojawiają się konkretne kierunki naprawcze: **IPIP-NEO-120** (docelowo w produkcji), **SUS** i rozważenia **NASA-TLX** zamiast części customowych skal Agency/Clarity/Satisfaction, oraz precyzyjne rozróżnienie między tym, co jest **literaturą**, a tym, co jest **operacjonalizacją autorską**.

Listopad i grudzień 2025 przesuwają ciężar pracy na **architekturę profilu** ([Analiza architektury profilu](517b6715-c213-49d2-88ad-8d7546ecbce9)) i **budowanie promptów** ([Budowanie promptów do generowania obrazów](37ec8e7a-0cc0-4d2a-9130-de5cdd388288)). Tutaj zaczyna się genealogia **macierzy wieloźródłowej**: w dokumentach grantowych i podsumowaniach pojawia się język „~10 źródeł”, podczas gdy w kanonie 2026 mamy **6 źródeł** (`GLOSSARY` §7). Ewolucja nie była kosmetyką — była **redukcją wariantów do porównywalnego eksperymentu** ze ślepym wyborem. W rozmowach podkreślano ryzyko „szablonowości” promptów (wątki o podobieństwie i różnorodności generacji), co bezpośrednio dotyka **ważności wewnętrznej** porównań między warunkami macierzy.

**Pivot generacji (grudzień 2025):** [Integracja modeli Google](933ce084-2f0f-4d45-b9f1-ea928d22a0ef) i styl „Nano Banana” (nazwa robocza modelu obrazu) oznaczają początek odejścia od **FLUX jako produkcji**. Motywacje mieszane są typowe dla RtD z grantem: jakość obrazu, spójność z już używanym ekosystemem Google, kredyty, mniej moving parts niż Modal + osobny pipeline. Jednocześnie [Problem z przepływem Big Five](125a039b-ea05-4dbd-99f4-b9bea45dc439) pokazuje, że **zmiana modelu nie zastępuje** problemu kompletności profilu — bez domkniętego Big Five źródło `personality` w macierzy jest puste, a eksperyment traci warunek.

Git z końca 2025 dokumentuje dojrzewanie produktu: migracje **RLS** w Supabase, **OAuth** (w tym problemy Safari), **kredyty**, normalizacja zdjęć mobilnych (EXIF) — każdy z tych elementów dotyka **wiarygodności próby** (czy `participant_id` jest stabilny w sesji? czy zdjęcie pokoju jest geometrycznie poprawne dla PRS/target?). W tabeli decyzji warto to traktować jako **przygotowanie do skali**, która w 2026 przyjmie formę Stripe, referral i audytu Thermos.

### Faza 2 — pivot infrastrukturalny GCP: dlaczego doktorat wymagał greenfield

Marzec 2026 to moment, w którym **Supabase zostaje zapauzowany**, a rozmowa [Migracja z Supabase na Google Cloud](4fbfb9b1-b5c4-4127-bc9a-8865c80150d4) formułuje nową zasadę: **nie migrujemy danych testowych**, lecz **odbudowujemy schemat** na GCP z myślą o badaniach. Kontekstem są **kredyty edukacyjne Google**, już istniejące podpięcie API do generacji obrazów oraz potrzeba, by **obrazy trafiały od razu do Cloud Storage**, a metadane — do **Cloud SQL**.

**Problem badawczy** stojący za pivotem jest prostszy niż migracja techniczna: doktorat potrzebuje **jednego audytowalnego źródła prawdy** o uczestniku (zgoda, profil, macierz, wybór ślepy, ankiety końcowe). Rozproszenie między Supabase (historycznie), plikami tymczasowymi a bucketami bez spójnego klucza obiektowego zwiększa ryzyko, że przy N=500–1000 uczestników nie da się obronić łańcucha **consent → stimulus → wybór → feedback**. Greenfield na GCP nie był więc „fashion move”, lecz **decyzja o jakości dowodu empirycznego**.

**Rozważane opcje** (z rozmowy): klasyczna migracja pg_dump vs odtworzenie schematu; hybryda Vercel + zewnętrzne API vs **Cloud Run**; trzymanie Auth w Supabase vs spięcie z Google Identity. Wybór padł na **jeden ekosystem** dla inferencji, storage i SQL, przy świadomym zaakceptowaniu kosztu przepisania warstwy `@/lib/supabase` na własne API.

**Konsekwencje:** (1) w rozprawie **FLUX/Modal/Supabase** trafiają do podrozdziału genealogii (`GLOSSARY` §8.2), nie do opisu runtime; (2) każdy audyt persistence z czerwca 2026 ([Weryfikacja persistence](bb533688-0a64-4863-a456-9e39cbf3a0cb), [Wdrożenie sync GCP](49c9a66e-979c-4f1a-afc0-b95bb32d04fe)) jest kontynuacją tej samej decyzji; (3) produkt może nadal żyć na Vercel jako frontend, ale **kanon danych badawczych** jest po stronie GCP.

---

## Metodologia — od MBTI i „IAT” do IPIP-120, SUS i RQ1–RQ6

### Kontekst: doktorat pierwszy, aplikacja druga — ale dane muszą być obronne

W wielu wątkach z 2025 roku agent pełni rolę **przyspieszacza implementacji**, nie promotora metodologii. Gdy użytkownik w październiku 2025 domaga się źródeł pytań, projekt przechodzi **świadomy audyt** ([f5b2b00a](f5b2b00a-4357-4ba2-8e51-d50a7571fe6b)). Kluczowe ustalenia dla narracji rozprawy:

**MBTI** zostało odrzucone nie z powodu „modny Big Five”, lecz z powodu **niespełnienia kryteriów** projektu badawczego (licencja, forma pozycji, gotowość do cytowania norm). **IPIP-NEO-120** weszło jako kompromis między dokładnością a obciążeniem uczestnika — w `HIPOTEZY_REWIZJA.md` i `GLOSSARY` §5 utrwalono, że produkcja nie używa już IPIP-60 z grantowych dokumentów.

**„IAT / Tinder”** w kodzie było etykietą adaptacji. Metodologicznie honest naming (wymuszony w glossary) brzmi: **forced-choice preference task z pomiarem czasu reakcji**, inspirowany logiką zadań asocjacyjnych, ale **nie** równoważny klasycznemu IAT Greenwald et al. W rozprawie warto poświęcić akapit na **ograniczenia inferencji** z `reaction_time_ms` bez pełnego harmonogramu stimulusów IAT.

**PRS** w platformie to **ideal / current / target** na mood grid — nie pre/post po ekspozycji na wizualizację AI. Stąd w czerwcu 2026 **odrzucenie H2** (poprawa PRS po generacji) jest konsekwencją audytu DB, nie „zmiany zdania” bez powodu ([bd5f2d81](bd5f2d81-b3b2-4861-88a1-f26a3ed7c844)).

**SUS** i dyskusja o **NASA-TLX** pojawiają się jako propozycja zastąpienia części customowych Likertów Agency/Satisfaction/Clarity kotwicami z literatury HCI. W danych zachowano pola pod RQ6 (agency/clarity/satisfaction); autor rozprawy powinien jasno powiedzieć, **które skale są porównywalne z brooke’owskim SUS**, a które pozostają operacjonalizacją autorską pod konstrukty projektowe.

### Rewizja hipotez jako akt dojrzałości empirycznej

Dokument `HIPOTEZY_REWIZJA.md` (2026-06-29) jest centralnym źródłem do rozdziału metodologicznego. Pokazuje, że stare **H1–H5** z `PODSUMOWANIE_PROJEKTU.md` zakładały zmienne, których **nie ma w Cloud SQL** (np. `prs_post_*`, dwell time w swipe). Przejście na **RQ1–RQ6** nie jest „łagodzeniem hipotez”, lecz **dopasowaniem pytań do artefaktu**, który faktycznie został zbudowany — z macierzą ślepych wyborów jako rdzeniem (**RQ3**).

Dla historii projektu ważne jest, że rewizja nastąpiła **po pilotażu ~20–30 profili**, gdy użytkownik i agent analizowali lejek macierzy ([454a8762](454a8762-98be-4066-91e2-b0145e1a9e23)) i rozdzielili metryki **„ukończony profil”** vs **„ukończone badanie”**. To jest klasyczny moment RtD: artefakt generuje dane, które **wymuszają** nową teorię operacyjną.

---

## Macierz sześciu źródeł i ślepy wybór — ewolucja eksperymentu

Wczesna dokumentacja (grant Modal, podsumowanie doktoranckie) operowała językiem wielu kanałów (~10) i czasem „pięciu obrazów”. Taki opis odpowiadał **inżynierii prompt-synthesis** — każdy fragment profilu (implicit, explicit, biophilia, PRS target, inspiracja, osobowość, funkcja pokoju) mógł generować osobny wariant. **Problem badawczy** przy takiej swobodzie brzmi: uczestnik nie porównuje **źródeł informacji**, lecz losowe realizacje promptów o niekontrolowanej redundancji.

**Rozwiązanie kanoniczne** (2025-11 – 2026-06): sześć **GenerationSource** (`implicit`, `explicit`, `personality`, `mixed`, `mixed_functional`, `inspiration_reference`) i procedura **ślepego wyboru** z zapisem `blind_selection_made`, `selected_source`, `selection_time_ms`. Rozmowa [Mapa prompt-synthesis 6 źródeł](a8ddf983-6128-4d14-9ce3-b86371804147) jest tu kluczowa: pokazuje scoring → builder JSON v3, reguły blokady geometrii pokoju oraz ryzyko „Nano Banana” jako nazwy zamiast Gemini Image w tekście rozprawy.

**Ewolucja proceduralna:** w maju 2026 [Parity Full/Fast](2a9697e1-68f5-4b60-8a20-2037d230d676) wyrównuje reguły generacji między ścieżkami, aby Fast nie był „gorszym warunkiem” w sensie stimulusów, tylko krótszą ścieżką produktową. W kwietniu 2026 [Testy sensoryczne — kroki liniowe](01f71f41-e1a3-407b-bd47-fd78b3eb1b30) zamykają lukę proceduralną: uczestnik nie mógł skakać między testami przed ukończeniem sekwencji — inaczej kanał explicit byłby zanieczyszczony kolejnością.

**Konsekwencje dla rozprawy:** rozdział wyników powinien prezentować macierz jako **within-subject design** z wieloma warunkami generacji i jednym głównym DV (wybór źródła), a nie jako „sześć ładnych obrazków”. Wątek o metaforze „30 → 9 blind” ([bd5f2d81](bd5f2d81-b3b2-4861-88a1-f26a3ed7c844)) przypomina, że **lejek macierzy** był równie ważny jak sama jakość obrazu — bez retencji nie ma RQ3.

---

## Produkt komercyjny vs protokół badawczy (Full, Fast, billing, RODO)

Od końca 2025 projekt nosi cechy **startupu badawczego**: landing SEO, OAuth, kredyty, później **Stripe**, program poleceń, karty **Przed/Po** do udostępniania (commity 2026 na `main`). **Problem etyczno-metodologiczny** jest stały: użytkownik produktowy i uczestnik badania mogą przejść ten sam UI, ale **nie mają tego samego statusu prawnego i analitycznego**.

Rozmowy [RODO i cookies](2904e574-0cf1-47ce-8501-ae8215efd572), [Komunikat badawczy na landing](2a42bd45-078b-4920-a1f8-7d310146e025) oraz [Pakiet 1000 kont](7fabde3f-5264-4a21-8669-e9cbc8350dcd) pokazują próbę **segmentacji**: ścieżka Full, wersje zgód, zdarzenia macierzy jako marker udziału w badaniu. **Audyt Thermos** ([55e40b31](55e40b31-365c-4697-8b80-4a47aeb12290)) wprowadza twardą warstwę bezpieczeństwa przed skalowaniem: `IDA_STRICT_PARTICIPANT_AUTH`, rate limiting AI, zamknięcie debug endpointów, redakcja sekretów (widoczne w `git log` 2026).

**Full vs Fast:** Full to około 12 kroków z Big Five, Room Setup, macierzą i ankietami końcowymi; Fast to skrót produktowy. Dla próby badawczej autor musi explicite opisać **kryteria włączenia** (np. `path_type=full`, `blind_selection_made=true`, komplet pól w Cloud SQL). Fast pozostaje ważny **produktowo** i jako test obciążenia UX, ale nie powinien być mieszany z próbą confirmatory bez uzasadnienia.

**Konsekwencje:** w dyskusji rozprawy warto oddzielić trzy narracje: (1) **artefakt RtD** jako dowód wykonalności złożonego pomiaru; (2) **pilotaż** N≈20–30 jako kalibracja lejka; (3) **produkt** jako kontekst ekologiczny, nie jako substytut próby laboratoryjnej.

---

## Rok 2026 — persistence, prompt-synthesis, gałąź `pisemna` i multi-agent LaTeX

### Czerwiec 2026: „czy to w ogóle się zapisuje?”

Seria wątków z początku czerwca 2026 ([bb533688](bb533688-0a64-4863-a456-9e39cbf3a0cb), [e93d1d65](e93d1d65-7d32-4a9d-815b-ca881aa8f768), [49c9a66e](49c9a66e-979c-4f1a-afc0-b95bb32d04fe)) ma charakter **forensic data engineering**: porównywanie stanu profilu po OAuth, weryfikacja pól macierzy, domykanie sync po resume. To jest odpowiedź na lęk z lipca 2025 — tyle że na innym stacku. Bez tego etapu rozprawa nie mogłaby cytować RQ1–RQ3 jako osadzonych w DB.

Równolegle [Audyt promptów 6 źródeł](a8ddf983-6128-4d14-9ce3-b86371804147) stabilizuje **stimulusy** — w badaniu preferencji względem źródła jakości generacji musi być wystarczająco spójna, by różnice wynikały z **kanału informacji**, nie z przypadkowej zmiany promptu między commitami.

### Czerwiec–sierpień 2026: infrastruktura pisemna

Rozmowy [Plan pisania z Cursor](bbf13187-4a3f-4b19-bb6d-ff0619c31059) i [Branch pisemna, RQ](bd5f2d81-b3b2-4861-88a1-f26a3ed7c844) formalizują to, co wcześniej było intuicją: **nie można uczyć agentów na rozproszonych README**. Powstaje branch **`pisemna`**, katalog `docs/thesis/`, `HIPOTEZY_REWIZJA.md`, snapshot danych ([LaTeX lokalnie](2ae4c45c-0767-4ff5-ac04-73f74e5814a0)).

Sierpień 2026 przosi **GLOSSARY.md**, **AGENTS.md** i podział ownership rozdziałów — multi-agent nie jest gimmickiem, lecz **odpowiedzią na skalę tekstu** (~90 stron PDF w fali 1, `COORD_SYNC_WAVE1.md`). Terminologiczne rozróżnienie **ComfyUI = pracownia** vs **Gemini = produkcja IDA** zapobiega najczęstszej pomyłce w rozdziale o medium dyfuzyjnym.

### Sierpień–październik 2026: produkt na zewnątrz, praca w środku

Marketing, share, referral i poprawki mobilnego UX (widoczne w ostatnich commitach `git log`) dzieją się głównie na `main`, podczas gdy rozprawa żyje na `pisemna`. [Organizacja folderów thesis](f454659c-7e6a-4bff-a286-c55362a6239c) rozwiązuje dezorientację workspace — ważne dla zespołu agentów. Bieżąca praca nad tym dokumentem ([Historia z transkryptów](afe45b46-14d8-46bd-af01-cbab0cfe3d02)) domyka pętlę: **historia projektu staje się źródłem wewnętrznym** do rozdz. wprowadzenia i metodologii (nie do cytowania jako publikacja).

---

## Narracja RtD — jak opisać to w rozprawie (wskazówki dla autora)

Research through Design zakłada, że **artefakt jest argumentem** — nie ilustracją do tezy zaplanowanej przed implementacją. W przypadku IDA narracja powinna więc unikać retrospektywnej fikcji „wszystko było zaplanowane w H1–H5”. Zamiast tego proponuje się **trzy warstwy opowieści**, każda z innym typem dowodu:

**Warstwa 1 — Geneza problemu badawczego (rozdz. 1–2).** Opisz lukę: personalizacja wnętrz z AI bez operacjonalizacji **ukrytych vs jawnych** preferencji i bez kontrolowanego porównania **źródeł syntezy promptu**. Odwołaj się do psychologii środowiskowej (PRS, biophilia) i do literatury o preferencjach estetycznych, ale bez obietnicy PRS pre/post — tej obietnicy nie utrzymuje DB.

**Warstwa 2 — Projektowanie artefaktu jako seria hipotez operacyjnych (rozdz. 6–7).** Każda większa decyzja z tabeli w tym dokumencie to **mini-eksperyment RtD**: np. ślepa macierz (czy użytkownik wybiera źródło, gdy nie widzi etykiety?), IPIP-120 (czy da się włączyć psychometrię bez MBTI?), GCP greenfield (czy da się udowodnić łańcuch zgody i zapisu?). W tekście używaj czasowników projektowych: *ustabilizowano*, *odrzucono*, *przeformułowano po audycie danych* — nie *udowodniono* na N pilotażowym.

**Warstwa 3 — Empiryka ograniczona próbą (rozdz. 8–9).** RQ1–RQ6 z `GLOSSARY` i `HIPOTEZY_REWIZJA.md` są już dopasowane do zmiennych w Cloud SQL. W dyskusji oddziel **confirmatory** (docelowe N) od **exploratory** (RQ4, część RQ2). Wyraźnie napisz, co wynika z **jakości stimulusów** (Gemini, prompt-synthesis), a co z **procedury** (kolejność testów sensorycznych, parity Full/Fast).

**ComfyUI i FLUX** w narracji RtD pełnią rolę **pracowni projektanta**: eksperymenty depth/SAM/ControlNet uzasadniają kompetencje autora w medium dyfuzyjnym, ale **nie** mieszają się z opisem tego, co widział uczestnik badania w przeglądarce. Jedna tabela „genealogia vs produkcja” (`GLOSSARY` §8) w rozprawie oszczędza dziesiątki stron pomyłek recenzenta.

**Cursor i rozmowy z agentem** można wspomnieć w metodologii **tworzenia pracy** (narzędzie współautorskie kodu i LaTeX), ale **nie** jako źródło danych empirycznych o uczestnikach. Ten dokument (`HISTORIA_PROJEKTU_Z_ROZMOW_AGENTOW.md`) i `GDZIE_SA_ROZMOWY_CURSOR.md` są **audit trail procesu badawczego**, analogicznie do lab book — cytuj je jako materiał wewnętrzny lub załącznik roboczy, nie jako literaturę.

**Zalecana struktura akapitu RtD w rozprawie (szablon):** (1) kontekst użytkownika/problemu; (2) ograniczenie poprzedniej wersji artefaktu; (3) decyzja projektowa; (4) implementacja w IDA; (5) konsekwencja dla zmiennej/RQ; (6) ograniczenie / otwarta kwestia. Ten szablon mapuje się bezpośrednio na sekcje powyżej i na tabelę decyzji w tym pliku.

**Język polski vs angielskie skróty:** przy pierwszym użyciu w rozdziale podawaj polski termin i skrót (np. „ścieżka pełna (Full)”), zgodnie z `GLOSSARY`. Nazwy modeli (**Gemini Image**, **Vertex AI**) pisz konsekwentnie; „Nano Banana” tylko w przypisie technicznym.

---

## Oś czasu — fazy projektu

**Jak czytać ten dokument:** uzasadniona narracja (kontekst → problem → decyzja → skutki) jest w sekcjach **Geneza i fazy 0–2**, **Metodologia**, **Macierz**, **Produkt vs protokół**, **Rok 2026** i **Narracja RtD** powyżej. Poniższa oś czasu to **indeks chronologiczny**; fazy 3–8 w formie listy uzupełnia akapit **„Fazy 3–8 — skrót narracyjny”** — przy pisaniu rozdziału artefaktu zacznij od sekcji narracyjnych, nie od bulletów.

Daty faz 0–2 są zsynchronizowane z `git` i dokumentami; fazy 3+ głównie z transkryptami (marzec–październik 2026).

### Faza 0 — Geneza techniczna: Aura (lipiec 2025 – luty 2026)

- **Repozytorium:** `Initial commit: Stworzenie struktury projektu Aura` (**2025-07-21**, commit `e679059`) — monorepo Next.js + Python API, narracja produktowa **AURA/AWA** (asystentka, „wizualne DNA”, ukryte preferencje).
- **Stack produkcyjny (rozmowy + dokumenty):** frontend **Next.js** na Vercel; backend **Modal.com** (`aura-flux-api-fastapi-app`) z **FLUX Kontext** do edycji/generacji wnętrz; modele pomocnicze (Gemma, MiniCPM) w opisach grantowych; persistence **Supabase** (PostgreSQL, Auth, Storage); health-check Modal w logach z [Research framework](9e5d5fdf-5878-4500-be7c-2c24bf2f7f4f).
- **Tożsamość UX:** **Minimalist Glass Design**, model 3D awatarki, **AwaDialogue** (zdania + pliki audio landing/onboarding), ambient music — spójne z późniejszym kanonem IDA (`GLOSSARY` §3), wtedy jeszcze pod marką Aura ([Asystentka — landing](41da62f6-e2d9-49d3-8b74-86448633fa60)).
- **Flow badawczy (wczesny):** onboarding → ścieżka Fast/Full → Tinder/swipe → profil → **laddering** w Room Setup ([dialog w ladder](d62f3e77-9d40-478d-b13f-253c86be6abd)); integracja biblioteki obrazów do Tindera ([93b8304c](93b8304c-8c58-4de7-af6c-8ef9469ac883)).
- **Infrastruktura developerska:** intensywne sesje „wyślij na githuba”, naprawy **404** w `page.tsx`, błędy składni JSX — typowy rytm prac przy Cursorze od pierwszych dni indeksu (**2025-07-07** = pierwszy wpis w `conversation-search.db`).
- **Znaczenie dla rozprawy:** faza pokazuje **RtD od początku** — produkt i protokół badawczy rosły razem; późniejsze rename na **IDA** nie unieważnia genealogii **Aura/AWA** w Git i w indeksie rozmów.

### Faza 1 — Personalizacja, metodologia, macierz (październik 2025 – luty 2026)

- **Kryzys metodologiczny (październik 2025):** [Weryfikacja pytań i metod badawczych](f5b2b00a-4357-4ba2-8e51-d50a7571fe6b) — odrzucenie **MBTI** (koszt, brak walidacji badawczej w projekcie); audyt skal w `validated-scales.ts` (PRS jako 2D mood grid, biophilia, semantic differential, „IAT-inspired” swipe); propozycja **IPIP** (docelowo **IPIP-NEO-120**) oraz rozważenia **SUS** / **NASA-TLX** zamiast części customowych Likertów Agency/Clarity.
- **Dokumentacja doktorska:** [Podsumowanie projektu doktoranckiego](c69dd1bc-6947-4ecd-b2b9-443769fccd60) — opis „product-first, research-embedded”, **~10 źródeł** danych do prompt-synthesis, **IPIP-60**, aplikacja do programu **Modal**; stack FLUX/Supabase — snapshot stanu przed migracją GCP.
- **Architektura profilu i promptów (listop–grudzień 2025):** wątki o [architekturze profilu](517b6715-c213-49d2-88ad-8d7546ecbce9), [budowaniu promptów](37ec8e7a-0cc0-4d2a-9130-de5cdd388288), różnorodności generacji, optymalizacji FLUX; Git: `deep personalization`, migracje **implicit semantics**, usunięcie osobnego `TinderScreen` na rzecz **CoreProfileWizard**.
- **Pivot generacji (grudzień 2025):** [Integracja modeli Google](933ce084-2f0f-4d45-b9f1-ea928d22a0ef), „Nano Banana” / Gemini Image, problemy [przepływu Big Five](125a039b-ea05-4dbd-99f4-b9bea45dc439) i kredytów — przygotowanie gruntu pod **Vertex** i spójność z grantami Google.
- **Hipotezy:** stare **H1–H5** (`PODSUMOWANIE_PROJEKTU.md`, 2024/2025) — w tym PRS pre/post i dwell time; w indeksie rozmów widać stopniowe oddzielanie **tego, co da się obronić w DB**, od copy marketingowego (kulminacja: **RQ1–RQ6** w 06/2026).
- **Macierz:** ewolucja z dokumentacji „5 wariantów” / wieloźródłowej syntezy do kanonicznych **6 źródeł** + ślepy wybór (szczegóły w fazie 3–4 i w `GLOSSARY` §7).

### Faza 2 — Decyzja o GCP i Gemini jako produkcji (marzec 2026)

- Rozmowa [Migracja z Supabase na GCP](4fbfb9b1): Supabase zapauzowany; decyzja **nie migrować** danych testowych, lecz **odbudować** schemat na Google Cloud; wykorzystać kredyty edu; obrazy z generacji od razu do **Cloud Storage**; mapowanie istniejących integracji Google w projekcie.
- Motywacja: jeden ekosystem (auth już częściowo na Google, generacja obrazów już przez API Google), skalowalność pod badania, zgodność z grantami.

### Faza 3 — Stabilizacja flow badawczego i produktu (kwiecień–maj 2026)

- Intensywne sesje UI/UX: dashboard, **progress bar 12 kroków** na Full, Big Five (przycisk „już zrobione”), ścieżka szybka vs pełna.
- [Parity Full/Fast w macierzy](2a9697e1): wyrównanie proporcji obrazu / umeblowania między ścieżkami — spójność empiryczna (te same reguły generacji).
- [Jaki model generuje wnętrza](f26a3070): potwierdzenie **Gemini / Vertex**; FLUX traktowany jako legacy w dokumentacji.
- [Cennik i stack](9ed1e2db): dyskusja modelu biznesowego; świadome odsunięcie przestarzałych odniesień do FLUX w analizach kosztów.
- [RODO i cookies](2904e574): doprecyzowanie warstwy zgody vs banner cookies.

### Faza 4 — Pilotaż danych i audyt persistence (czerwiec 2026)

- Seria rozmów **weryfikacji zapisu** do Cloud SQL (np. [Weryfikacja persistence](bb533688), [Query uczestnika](e93d1d65), [Wdrożenie sync](49c9a66e)).
- [Audyt promptów 6 źródeł](a8ddf983): pełna mapa **prompt-synthesis**, plany JSON v3, „Nano Banana” jako nazwa robocza modelu obrazu, rekomendacje blokady architektury pokoju w promptach.
- [Palety jawne vs ukryte](d452b43e): spójność kategorii estetycznych między kanałami danych.
- [Grant Google dla akademików](9db0e1e2): kontekst finansowania infrastruktury.
- [Wyłączenie debugów na produkcji](de8cedf0): przygotowanie do ruchu zewnętrznego.
- [Plan pisania z Cursor](bbf13187): diagnoza „śmietnika” w `.md`, propozycja **osobnej gałęzi / kanonu** zamiast uczenia AI na nieaktualnych README.

### Faza 5 — Bezpieczeństwo, Thermos, skala produktu (koniec maja – czerwiec 2026)

- [Audyt Thermos na osobnej gałęzi](55e40b31): pełny przegląd bezpieczeństwa i jakości bez ryzyka dla `main` (wpis z X / ericzakariasson jako inspiracja workflow).
- Skutki widoczne w `git` (lipiec–sierpień 2026): redakcja sekretów, rate limiting AI, Stripe, `IDA_STRICT_PARTICIPANT_AUTH`, zamknięcie endpointów debug GCP.

### Faza 6 — Doktorska infrastruktura: `pisemna`, RQ, LaTeX (czerwiec–sierpień 2026)

- [Branch `pisemna` i spis treści](bd5f2d81): utworzenie `docs/thesis/`, `SPIS_TRESCI_ROBOCZY.md`; świadome pisanie przy niepewnych hipotezach (RtD).
- [HIPOTEZY_REWIZJA.md](bd5f2d81): odrzucenie **H2** (brak PRS pre/post), przeformułowanie **H1**, **H3** → rdzeń **ślepej macierzy**, **H5** bez dwell w DB; wprowadzenie **RQ1–RQ6**.
- [LaTeX lokalnie](2ae4c45c): LaTeX Workshop, LuaLaTeX, `make pdf`, snapshot danych badawczych na dzień analizy (pliki w `docs/thesis/data/`).
- [Lejek macierzy](454a8762): rozdzielenie metryk ukończenia; „jedna obserwacja na przebieg macierzy” jako decyzja analityczna przy **bogatszym** zapisie eventów, nie utracie danych.
- [Statystyki uczestników](8868e4c3): analiza dropoutu od wejścia na stronę do pełnej ścieżki (kontynuacja w kolejnych datach w tej samej rozmowie).

### Faza 7 — Multi-agent, glossary, rozdziały LaTeX (sierpień–wrzesień 2026)

- **GLOSSARY.md** (2026-08-02): kanon terminów (ASP, 6 źródeł, Gemini vs FLUX, ComfyUI = pracownia).
- **AGENTS.md**, **MULTIAGENT_PROMPTS.md**, podział na pasy (`framing`, `theory-a`, `media-lab`, `methods`, `artifact`, `empirical`, `coordinator`).
- `COORD_SYNC_WAVE1.md`: pierwsza fala spójności (~90 stron PDF), check terminologii.
- Migracje GCP operacyjne ([Migracja bazy](7a592fd6)), komunikaty Google Cloud ([Vertex / polityki](c224ce87), [zgodność RODO Vertex](f1f01b0c)).

### Faza 8 — Marketing, share, dopracowanie badawcze (sierpień–październik 2026)

- Landing, hero, FAQ/SEO, share **Przed/Po**, referral — commity na `main` (np. `feat(share)`, marketing IDA).
- [Organizacja folderów pracy](f454659c): dezorientacja `thesis` vs `docs/thesis`; porządkowanie workspace pod multi-agent.
- [Testy sensoryczne — kroki liniowe](01f71f41): UX zgodny z procedurą (brak skakania między testami przed ukończeniem).
- Bieżąca rozmowa [Historia z transkryptów](afe45b46): ten dokument.

### Fazy 3–8 — skrót narracyjny (marzec–październik 2026)

Po pivotcie GCP projekt wchodzi w fazę, w której **każda poprawka UI ma konsekwencję dla zmiennej badawczej**. Kwiecień i maj 2026 koncentrują się na **dashboardzie**, **pasku postępu 12 kroków** ścieżki Full oraz na dopinaniu **Big Five** jako warunku źródła `personality` — bez tego macierz jest niekompletna metodologicznie, nawet jeśli generacja obrazów działa. Równolegle rozmowy [Jaki model generuje wnętrza](f26a3070-3f6e-4789-8f81-2709a365709c) i [Cennik i stack](9ed1e2db-cb86-4db6-9aae-305ae18fd69a) zamykają narrację kosztową: **Gemini na Vertex** zastępuje FLUX nie tylko w kodzie, lecz w dokumentacji ekonomicznej produktu.

Czerwiec 2026 jest miesiącem **dowodu zapisu** i **dowodu stimulusów**. Audyty persistence oraz mapa prompt-synthesis ([a8ddf983](a8ddf983-6128-4d14-9ce3-b86371804147)) odpowiadają na pytanie recenzenta: „skąd wiecie, co uczestnik wybrał i na podstawie jakiego obrazu?”. Wyłączenie debugów na produkcji ([de8cedf0](de8cedf0-7aaa-458a-98a2-c0cb37c86ffd)) oraz pakiet startowych kont ([7fabde3f](7fabde3f-5264-4a21-8669-e9cbc8350dcd)) pokazują, że skala **500–1000** uczestników była planowana jako realna — stąd Thermos i późniejsze flagi auth w `git`.

Lipiec–sierpień 2026 przenoszą ciężar na **pisanie**: branch `pisemna`, LaTeX, snapshot analizy w `docs/thesis/data/`, oraz pierwsza fala spójności terminologicznej. Sierpień–październik na `main` to warstwa **go-to-market** (SEO, share Przed/Po, referral), która nie powinna być mylona z próbą badawczą, ale stanowi **kontekst ekologiczny RtD**. W `git log` z końca września 2026 widać dojrzałość produktu share, podczas gdy ten dokument domyka **łańcuch dowodowy** między rozmowami Cursor, indeksem FTS i commitami.

---

## Co zostało porzucone / zmienione i dlaczego

Poniższa tabela syntetyzuje **świadome odwrócenia** widoczne w indeksie rozmów 2025–2026 oraz w commitach. Nie są to „błędy zapisu”, lecz typowe dla **Research through Design** iteracje: artefakt musiał pozostać używalny produktowo, gdy jednocześnie zaostrzano operacjonalizację pod empirykę.

| Obszar | Stan wcześniejszy | Stan obecny (kanon) | Powód zmiany |
|--------|-------------------|---------------------|--------------|
| **Nazwa produktu** | Aura / AWA w UI i repo | **IDA** w rozprawie i komunikacji akademickiej | Oddzielenie genealogii (Aura) od artefaktu badawczego (IDA); `GLOSSARY` §1 |
| **Backend inferencji** | Modal + **FLUX Kontext** | **Vertex AI / Gemini Image** | Jakość, jeden ekosystem z GCS/SQL, kredyty edu; FLUX w genealogii, nie w produkcji |
| **Baza danych** | Supabase (Auth, RLS, Storage) | **Cloud SQL + GCS** (greenfield) | Pauza Supabase; brak potrzeby migracji danych testowych; spójność z GCP ([Migracja](4fbfb9b1-b5c4-4127-bc9a-8865c80150d4)) |
| **Osobowość** | MBTI w rozmowach wczesnych; potem IPIP-60 w grant docs | **IPIP-NEO-120** | Licencja, psychometria, zgodność z RQ4 ([f5b2b00a](f5b2b00a-4357-4ba2-8e51-d50a7571fe6b)) |
| **Hipotezy** | H1–H5 (PRS pre/post, dwell) | **RQ1–RQ6** | Brak kolumn/zdarzeń w DB ([HIPOTEZY_REWIZJA](bd5f2d81-b3b2-4861-88a1-f26a3ed7c844)) |
| **PRS** | Narracja „poprawa PRS po AI” (H2) | **ideal / current / target** | Brak `prs_post_*`; PRS jako mapa nastroju, nie test przed/po ekspozycji |
| **„IAT / Tinder”** | Etykieta IAT w kodzie | **Forced-choice preference + reaction time** | Metodologiczna uczciwość wobec Greenwald et al. ([f5b2b00a](f5b2b00a-4357-4ba2-8e51-d50a7571fe6b)) |
| **Źródła macierzy** | Dokumentacja ~10 kanałów / 5 obrazów | **6 źródeł** + blind selection | Jednolity eksperyment porównawczy (`GLOSSARY` §7) |
| **Hosting API obrazów** | Vercel + Modal (problemy timeout) | Cloud Run / Vertex | [Generacja na Vercel](deafbb04-d100-4fca-a6c1-ca03c60d11dc) — niestabilność serverless dla GPU |
| **Dev environment Modal** | Praca pod WSL | Windows / chmura | [Modal w WSL](74ed8f49-dfe0-4173-ac9d-3bfece7ac823) — tarcie środowiskowe |
| **Debug / endpointy** | Endpointy diagnostyczne, verbose logi | Wyłączenie na prod | Przed ruchem zewnętrznym ([de8cedf0](de8cedf0-7aaa-458a-98a2-c0cb37c86ffd)) |
| **UI flow Tinder** | Osobny `TinderScreen` | **CoreProfileWizard** | Uproszczenie ścieżki i jeden stan profilu (Git `e993cdc`) |
| **Ankiety końcowe** | Custom Agency/Satisfaction/Clarity | Uzupełnienie o SUS (dyskusja); zachowanie części custom pod RQ1 | Doktorat wymaga kotwic w literaturze ([f5b2b00a](f5b2b00a-4357-4ba2-8e51-d50a7571fe6b)) |
| **Dokumentacja** | Rozproszone README w root | **`docs/thesis/` + GLOSSARY** | Anty-„śmietnik” przy pisaniu z AI ([bbf13187](bbf13187-4a3f-4b19-bb6d-ff0619c31059)) |

---

## Przebieg prac chronologiczny (szczegółowy)

Chronologia łączy **`updated_at` z `conversation-search.db`** (wpisy `local`) z **`git log`** AWA-Project. W jednym tygodniu mogło powstać wiele krótkich wątków (UI, deploy); poniżej **wątki dominujące** dla genezy IDA.

### 2025-07 — start Cursor, commit Aura, Modal/FLUX

- **2025-07-07:** pierwszy wpis w indeksie rozmów (instalacja / wczesne czaty niezwiązane z AWA mieszają się w DB — filtrowanie po słowach AWA/Modal/wnętrza).
- **2025-07-21:** `e679059` — struktura projektu **Aura** (Next.js, flow badawczy).
- Rozmowy: podłączenie **backendu** i **Modala** ([Jak odpalać modala?](23a9678e-107a-4f56-a791-b6e448a458a3)), eksperymenty **FLUX Kontext** ([cee45992](cee45992-6ce1-476d-a148-8ee1b082952a)), **glass UI**, naprawa **404** w routingu App Router, **persistence ankiet** ([9e902bec](9e902bec-2060-4584-a3cb-9b7338c5f867)) — wczesny sygnał, że **jakość danych badawczych** będzie równoległym produktem do UI.
- **Laddering / dialog:** naprawy **AwaDialogue** i kroków means-end ([d62f3e77](d62f3e77-9d40-478d-b13f-253c86be6abd)).

### 2025-08 — tożsamość asystentki, Tinder, problemy Modal/WSL

- [Futurystyczna asystentka projektowania wnętrz](41da62f6-e2d9-49d3-8b74-86448633fa60): copy landing (**wizualne DNA**, ukryte preferencje), ikony, spójność z **glass**.
- [Integracja zdjęć do systemu tinder](93b8304c-8c58-4de7-af6c-8ef9469ac883): biblioteka stimulusów pod implicit.
- [Czemu nie działa modal w WSL Ubuntu](74ed8f49-dfe0-4173-ac9d-3bfece7ac823): decyzja środowiskowa — mniej polegania na lokalnym GPU w WSL.
- Regularne commity: **AwaModel**, **ResponsiveLayout**, audio dialogów.

### 2025-09 — deploy i generacja w chmurze

- [Problem z generowaniem obrazów na Vercel](deafbb04-d100-4fca-a6c1-ca03c60d11dc): limity serverless; wzmocnienie potrzeby **długotrwałego** worker/API (później Modal/GCP).

### 2025-10 — „research framework” i audyt pytań

- [Research framework for AI interior design app](9e5d5fdf-5878-4500-be7c-2c24bf2f7f4f): logi z **health Modal**, ścieżka **Fast** na landingu, cały stack Aura w jednym wątku debugowym.
- [Weryfikacja pytań i metod badawczych](f5b2b00a-4357-4ba2-8e51-d50a7571fe6b): przełom doktorski — mapowanie skal, odrzucenie MBTI, plan Big Five + SUS, krytyka nadmiernych claimów „IAT”.
- Porządkowanie dokumentacji ([1e71f47e](1e71f47e-4a3f-4b19-bb6d-ff0619c31059) w indeksie).

### 2025-11 — profil użytkownika, prompty, jakość obrazów

- Analiza **flow profilu** i **architektury danych** ([517b6715](517b6715-c213-49d2-88ad-8d7546ecbce9), [4715a20b](4715a20b-5cc3-491f-ac1a-6fb4b5a643e7)).
- [Budowanie promptów do generowania obrazów](37ec8e7a-0cc0-4d2a-9130-de5cdd388288): prekursor **prompt-synthesis** i macierzy.
- Wątki o **różnorodności** i **podobieństwie** promptów (ryzyko „szablonowości” generacji — ważne metodologicznie dla ślepej macierzy).

### 2025-12 — doktorat na papierze, Google image, Big Five, kredyty

- [Podsumowanie projektu doktoranckiego](c69dd1bc-6947-4ecd-b2b9-443769fccd60): formalny opis pod grant **Modal**, FLUX, IPIP-60, 10 źródeł — **snapshot przed GCP**.
- [Integracja modeli Google do generowania obrazów](933ce084-2f0f-4d45-b9f1-ea928d22a0ef), styl **Nano Banana** — początek odejścia od FLUX w produkcji.
- [Problem z przepływem big five](125a039b-ea05-4dbd-99f4-b9bea45dc439): UX + persistence osobowości jako warunek źródła `personality` w macierzy.
- Git: **RLS Supabase**, **kredyty**, **OAuth Safari**, normalizacja zdjęć mobilnych, **ElevenLabs** / audio ambient.

### 2026-01 — temat rozprawy, stabilizacja generacji

- [Propozycja tematu pracy doktorskiej](050a15d8-0109-4928-9d7b-b0594b993328): spinanie narracji ASP z artefaktem.
- Błędy generacji obrazów ([6ffa2da1](6ffa2da1-8f6e-4789-8f81-2709a365709c)) — iteracja pod pilotaż.

### 2026-02 — most do transkryptów agenta

- Ostatnie wątki w indeksie przed pełnymi **agent-transcripts**: przygotowania do **GCP**, audyty danych; szczegóły w fazach 2–4 poniżej.

### 2026-03 – 2026-06 — GCP, empiryka, pisanie (skrót — patrz fazy 2–6)

- Marzec: [Migracja Supabase → GCP](4fbfb9b1-b5c4-4127-bc9a-8865c80150d4), auth, audyt kompletności danych.
- Kwiecień–maj: UX **12 kroków**, dashboard, **Gemini** jako model prod, **RODO**, **Thermos**.
- Czerwiec: **persistence Cloud SQL**, **prompt-synthesis 6 źródeł**, **branch pisemna**, **RQ1–RQ6**.

### 2026-07 – 2026-10 — skala produktu + LaTeX multi-agent

- Stripe, share Przed/Po, referral, **GLOSSARY**, **AGENTS.md**, snapshoty danych pod rozdział wyników, porządki `docs/thesis/` ([f454659c](f454659c-7e6a-4bff-a286-c55362a6239c)).

---

## Błędy, testy, iteracje (wpływ na produkt i badanie)

| Problem | Kiedy (ok.) | Objaw | Reakcja projektu | Wpływ na badanie / produkt |
|---------|-------------|-------|------------------|----------------------------|
| **Modal na WSL** | 2025-08 | Brak uruchomienia API GPU lokalnie | Przesunięcie pracy na Windows/chmurę | Wolniejsza iteracja algorytmów, wcześniejsza centralizacja API |
| **Persistence ankiet** | 2025-07 | Wyniki nie zapisywane | Poprawki API/Supabase | Ryzyko utraty danych pilotażowych — precedens audytów 2026 |
| **404 / routing Next** | 2025-07 | Błędne ścieżki `page.tsx` | Naprawy App Router | Dropout techniczny na wejściu do flow |
| **JSX / importy** | 2025-07–08 | Build failures | Refaktory komponentów | Blokada deploy = brak testerów |
| **Generacja na Vercel** | 2025-09 | Timeout / błędy obrazu | Modal/GCP | Bez stabilnej generacji **macierz 6 źródeł** nie ma sensu empirycznego |
| **Safari OAuth** | 2025-12 (Git) | Wylogowania, race redirect | Callback rewrite, sessionStorage | Utrata powiązania sesji z `participant_id` — kluczowe dla próby |
| **Rotacja zdjęć mobile** | 2025-12 | Złe wejście do AI | Normalizacja EXIF przed base64 | Błąd **Room Setup** = zafałszowane PRS/target |
| **Dialogue audio race** | 2025-10 (logi) | `AbortError` play() | Kolejka audio, ducking | Procedura onboardingowa — pierwsze wrażenie (nie DV, ale UX) |
| **Big Five flow** | 2025-12 | Niedokończone kroki | Naprawy wizarda | Brak źródła `personality` w macierzy |
| **Kredyty / subskrypcja** | 2025-12 | Błędne odliczanie | API grant-free + rate limit | Mieszanie użytkowników płatnych i badawczych |
| **Sync GCP profilu** | 2026-06 | Brak pól po OAuth | [Wdrożenie sync](49c9a66e-979c-4f1a-afc0-b95bb32d04fe) | Bez tego RQ1–RQ3 na Cloud SQL są nieobronne |
| **Lejek macierzy** | 2026-06 | „Dropout” vs sync | Profil ≠ badanie ([454a8762](454a8762-98be-4066-91e2-b0145e1a9e23)) | Poprawa KPI i interpretacji pilotażu |
| **Debug na produkcji** | 2026-06 | Ekspozycja danych | Wyłączenie debugów | Warunek etyki przed skalowaniem N |
| **Testy sensoryczne** | 2026-04 | Skakanie między krokami | Wizard liniowy ([01f71f41](01f71f41-e1a3-407b-bd47-fd78b3eb1b30)) | Kontrola kolejności implicit/explicit |
| **Gemini empty-room** | 2026-08 | Zła geometria pokoju | Prompt-synthesis + blokada architektury ([56fbac63](56fbac63-4ce2-4bbd-a862-8d05bce1fae1)) | Jakość stimulusów w macierzy |

**Wzorzec:** większość „błędów” z 2025 to **tarcie między prototypem a protokołem**; po migracji GCP (2026) błędy przesuwają się w stronę **kompletności zapisu** i **metryk lejka** — zgodnie z priorytetem doktoratu nad kosmetyką UI.


## Tabela decyzji projektowych

| Decyzja | Etap | Powód | Skutek | Źródło (tytuł → UUID) |
|---------|------|-------|--------|------------------------|
| **Branch `pisemna` + `docs/thesis/`** | 2026-06 | Izolacja pisemnej pracy od produktu | LaTeX, notatki, snapshoty | [Branch pisemna, RQ](bd5f2d81-b3b2-4861-88a1-f26a3ed7c844) |
| **GCP zamiast Supabase (greenfield)** | 2026-03 | Kredyty edu, Vertex, brak wartościowych danych testowych | Cloud SQL, GCS, nowe API | [Migracja GCP](4fbfb9b1-b5c4-4127-bc9a-8865c80150d4) |
| **Gemini/Vertex zamiast FLUX/Modal (prod)** | 2025-12 – 2026-05 | Jakość, jeden vendor, granty | Runtime IDA bez FLUX | [Integracja Google](933ce084-2f0f-4d45-b9f1-ea928d22a0ef), [Model Gemini](f26a3070-3f6e-4789-8f81-2709a365709c) |
| **IPIP-NEO-120 zamiast MBTI / IPIP-60** | 2025-10 – 2026-04 | Psychometria i licencja | Źródło `personality` w macierzy | [Weryfikacja metod](f5b2b00a-4357-4ba2-8e51-d50a7571fe6b) |
| **6 źródeł + blind selection** | 2025-11 – 2026-06 | Eksperyment porównawczy kanałów | RQ3, tabele macierzy | [Mapa prompt-synthesis](a8ddf983-6128-4d14-9ce3-b86371804147) |
| **RQ1–RQ6 zamiast H1–H5** | 2026-06 | Operacjonalizacja w DB | `HIPOTEZY_REWIZJA.md` | [bd5f2d81](bd5f2d81-b3b2-4861-88a1-f26a3ed7c844) |
| **PRS: ideal/current/target zamiast pre/post** | 2025-10 | Brak ekspozycji PRS po generacji | Odrzucenie H2 | [f5b2b00a](f5b2b00a-4357-4ba2-8e51-d50a7571fe6b) |
| **GLOSSARY + multi-agent** | 2026-08 | Spójność terminów przy AI | `AGENTS.md`, ownership | [LaTeX + dane](2ae4c45c-0767-4ff5-ac04-73f74e5814a0) |
| **ComfyUI poza runtime IDA** | 2026 (doktorat) | RtD: pracownia vs produkcja | Rozdz. 4, zał. G | `GLOSSARY`, brak wątku prod |
| **Thermos na osobnej gałęzi** | 2026-05 | Billing, sekrety, auth | Remediacja przed skalą | [55e40b31](55e40b31-365c-4697-8b80-4a47aeb12290) |
| **Lejek: profil ≠ badanie** | 2026-06 | Zawyżony dropout | Jaśniejsze KPI pilotażu | [454a8762](454a8762-98be-4066-91e2-b0145e1a9e23) |
| **Testy sensoryczne sekwencyjne** | 2026-04 | Naruszenie procedury | Wizard kroków | [01f71f41](01f71f41-e1a3-407b-bd47-fd78b3eb1b30) |
| **Full vs Fast parity** | 2026-05 | Porównywalność warunków | Wspólne reguły generacji | [2a9697e1](2a9697e1-68f5-4b60-8a20-2037d230d676) |
| **CoreProfileWizard zamiast TinderScreen** | 2025-12 (Git) | Jeden stan profilu | Prostszy lejek | commit `e993cdc` |
| **Wyłączenie debugów prod** | 2026-06 | RODO / bezpieczeństwo | Mniejsza ekspozycja PII | [de8cedf0](de8cedf0-7aaa-458a-98a2-c0cb37c86ffd) |
| **Warstwa marketingu + badań** | 2025-12 – 2026 | RtD + Product-First | Segmentacja próby, consent | [7fabde3f](7fabde3f-5264-4a21-8669-e9cbc8350dcd) |
---

## Szczegóły tematyczne

### Platforma IDA i ścieżki Full / Fast

Ścieżka **Full** jest operacjonalizacją „głębokiego” protokołu badawczego: około dwunastu kroków łączących profil (w tym zadanie swipe z czasem reakcji), testy sensoryczne i semantyczne, **IPIP-NEO-120**, konfigurację pokoju z **PRS current/target**, means-end **laddering**, inspiracje, **macierz sześciu wariantów** ze ślepym wyborem oraz ankiety końcowe (agency, clarity, satisfaction — z ostrożnością wobec claimów SUS). Ścieżka **Fast** pozostaje produktowym skrótem; decyzja o **parity** reguł generacji ([2a9697e1](2a9697e1-68f5-4b60-8a20-2037d230d676)) wynika z tego, że porównanie warunków w macierzy nie może być zafałszowane różnym preprocessingiem zdjęcia pokoju lub innym modelem umeblowania między użytkownikami „szybkimi” i „pełnymi”.

Warstwa doświadczenia — awatar IDA, glass UI, ambient, dialogi głosowe — nie jest w rozprawie „ozdobnikiem”, lecz **elementem procedury**: tempo onboardingowe, pierwsze zdanie asystentki i równoległe odtwarzanie audio wpływają na dystrybucję uwagi przed zadaniami implicit. Commity wokół duckingu muzyki przy próbkach sensorycznych (`5fff23d`) pokazują, że zespół traktował to jako **kontrolę kontekstu**, nie kosmetykę. W rozdziale metodologicznym warto jednoznacznie napisać, że te zmienne nie wchodzą do RQ1–RQ6 jako DV, ale stanowią **parametry środowiska** artefaktu RtD.

### Macierz 6 źródeł i pytania badawcze

Kanon źródeł (`GLOSSARY` §7): `implicit`, `explicit`, `personality`, `mixed`, `mixed_functional`, `inspiration_reference`.

W transkryptach [bd5f2d81](bd5f2d81-b3b2-4861-88a1-f26a3ed7c844) i [a8ddf983](a8ddf983-6128-4d14-9ce3-b86371804147) powtarza się wątek: **ślepy wybór** (`blind_selection_made`, `selected_source`) jest ważniejszy empirycznie niż ogólna satysfakcja bez powiązania ze źródłem. Użytkownik zwracał uwagę na **lejek** (np. metafora „30 → 9 blind”) — priorytetem stała się **retencja w macierzy**, nie przedwczesne „dopieszczanie” brzmienia hipotez przy małym N.

**PRS** w platformie: **ideal / current / target** — nie klasyczny pre/post po ekspozycji na AI (kluczowe dla odrzucenia starego H2).

### Generacja obrazów: FLUX → Gemini, prompt-synthesis

Pipeline generacji w IDA przeszedł drogę od **Modal + FLUX Kontext** (2025) do **Vertex AI / Gemini Image** (produkcja 2026). Zmiana nie była wyłącznie „lepszym modelem”, lecz **zmianą warstwy dowodowej**: w badaniu porównującym źródła promptu każda regeneracja musi być powiązana z `participant_generations`, ścieżką w GCS i wersją `prompt-synthesis`. W marcu 2026 greenfield na GCP umożliwił zapisywanie obrazu i metadanych w jednym ekosystemie; w czerwcu audyt [a8ddf983](a8ddf983-6128-4d14-9ce3-b86371804147) ujawnił miejsca, gdzie legacy flow (np. nieblokowana geometria pokoju) mogło wprowadzać **szum między warunkami** macierzy.

**prompt-synthesis** to w rozprawie rdzeń łączący psychometrię i design: scoring preferencji → builder JSON (wersja v3) → osobne ścieżki dla każdego z sześciu `GenerationSource`. Nazwa robocza „Nano Banana” pojawia się w rozmowach i commitach jako skrót komunikacji zespołu; w `GLOSSARY` utrwalono zasadę pisania **Gemini Image / Vertex AI** w prozie ASP. Problemy typu „empty room” lub zła perspektywa ([56fbac63](56fbac63-4ce2-4bbd-a862-8d05bce1fae1)) pokazują, że jakość stimulusu była równoległym zadaniem do jakości zapisu SQL — bez obu RQ3 traci sens.

**ComfyUI** pozostaje poza runtime uczestnika: depth, SAM, ControlNet i eksperymenty autora uzasadniają rozdział o medium dyfuzyjnym i kompetencje badacza-projektanta, ale nie powinny być mylone z tym, co widzi użytkownik w przeglądarce. To rozróżnienie jest jednym z najczęstszych punktów recenzy w projektach RtD z generatywnym AI — ten dokument i `GLOSSARY` §8 mają je utrwalać dla agentów piszących LaTeX.

### Thermos, billing i granica między pilotażem a produkcją

W maju–czerwcu 2026 audyt **Thermos** na osobnej gałęzi ([55e40b31](55e40b31-365c-4697-8b80-4a47aeb12290)) odpowiada na ryzyko, które w RtD pojawia się dopiero przy skali: wyciek sekretów, zbyt otwarte endpointy debug, mieszanie tożsamości uczestnika badania z kontem płatnym. Commity `feat: thermos audit remediation`, `IDA_STRICT_PARTICIPANT_AUTH`, rate limiting AI i Stripe pokazują **świadome oddzielenie warstwy komercyjnej od warstwy badawczej** — nawet jeśli UI pozostaje wspólny. Dla rozprawy wystarczy opisać to jako **decyzję etyczno-infrastrukturalną**: zanim docelowe N wzrośnie, łańcuch auth → `participant_id` → zgoda musi być audytowalny.

Rozmowa o **pierwszych 1000 kontach** ([7fabde3f](7fabde3f-5264-4a21-8669-e9cbc8350dcd)) nie jest zaprzeczeniem charakteru doktoranckiego projektu; jest **testem obciążenia** i lejka. W analizie próby autor powinien explicite filtrować rekordy (ścieżka Full, zdarzenia macierzy, wersja regulaminu), zamiast traktować cały ruch marketingowy jako próbę losową.

### Baza danych, GCP, jakość danych

- Schemat warstwowy USER → HOUSEHOLD → ROOM → SESSION (`GLOSSARY` §11).
- Czerwiec 2026: intensywne **smoke testy** zapisu uczestnika po przejściu flow; naprawy OAuth resume macierzy, pełny sync profilu GCP.
- Sierpień 2026: snapshot SQL + JSON analizy w `docs/thesis/data/` (rozmowa [2ae4c45c](2ae4c45c-0767-4ff5-ac04-73f74e5814a0)).
- Rozmowa [454a8762](454a8762-98be-4066-91e2-b0145e1a9e23): jawne rozróżnienie metryk i **jedna obserwacja analityczna na przebieg macierzy** przy zachowaniu bogatszego logu zdarzeń.

### Etyka, RODO, mieszanie prób

- Consent, regulamin, komunikaty badawcze na landingu ([2a42bd45](2a42bd45-078b-4920-a1f8-7d310146e025), [2904e574](2904e574-0cf1-47ce-8501-ae8215efd572)).
- Po wejściu w fazę produktową: kredyty, Stripe, pierwsze 1000 kont ([7fabde3f](7fabde3f-5264-4a21-8669-e9cbc8350dcd)) — w pracy wymaga opisu **jak filtrować próbę badawczą** (ścieżka Full, zgoda, zdarzenia macierzy).

### Badania pilotażowe i iteracje po testach

- Pilotaż ~20–30 profili jako **sanity check** operacjonalizacji, nie confirmatory NHST ([bd5f2d81](bd5f2d81-b3b2-4861-88a1-f26a3ed7c844)).
- Testy z udziałem konkretnych `user_*` w Cloud SQL — wzorzec powtarzalny w czerwcu 2026.
- [8868e4c3](8868e4c3-c4c7-4cbf-aaa7-07d77098729b): analiza liczby uczestników, ukończeń, etapów dropoutu (aktualizacje wrzesień 2026).

### Rozprawa LaTeX i workflow multi-agent

- Struktura `main.tex`, rozdziały 01–10, załączniki A–H (schemat DB, instrumenty, mapowania, prompty, zmienne, consent, ComfyUI, flow IDA).
- **AGENTS.md:** jeden agent = jeden zakres plików; coordinator pilnuje `GLOSSARY`, `preamble`, build.
- Build: `make pdf`, LuaLaTeX, `latexmkrc`.
- Fala 1 (sierpień 2026): spójność FLUX/Gemini, 6 źródeł, IPIP-120 (`COORD_SYNC_WAVE1.md`).

### Aura / AWA w 2025 — warstwa doświadczenia i backendu (indeks FTS)

**Asystentka i narracja produktu.** Wątek [Futurystyczna asystentka](41da62f6-e2d9-49d3-8b74-86448633fa60) pokazuje, że już w sierpniu 2025 copy landingu operuje kategoriami, które przejdą do IDA: wizualne DNA, idealne wnętrze, ukryte preferencje. AWA nie jest wtedy jeszcze „platformą badawczą” w języku rozprawy, ale **Research-Embedded** jest widoczne w strukturze flow (onboarding → pomiar → generacja).

**Audio i immersja.** Równolegle rozwijane są **AwaDialogue** (pliki MP3 per krok), ambient music i sterowanie głośnością — w październiku 2025 w logach [Research framework](9e5d5fdf-5878-4500-be7c-2c24bf2f7f4f) widać wyścigi `play()` i Fast Refresh. Dla metodologii: audio wpływa na tempo procedury i pierwsze wrażenie, ale nie jest główną zmienną — mimo to iteracje (ducking przy testach sensorycznych w 2026) wynikają z **kontroli kontekstu** uczestnika.

**Modal + FLUX jako rdzeń generacji.** W lipcu–sierpniu 2025 dominują pytania o uruchomienie Modala ([23a9678e](23a9678e-107a-4f56-a791-b6e448a458a3)), FLUX Kontext ([cee45992](cee45992-6ce1-476d-a148-8ee1b082952a)) i błędy środowiska WSL ([74ed8f49](74ed8f49-dfe0-4173-ac9d-3bfece7ac823)). W grudniowym [Podsumowaniu doktoranckim](c69dd1bc-6947-4ecd-b2b9-443769fccd60) ten stack jest opisany pod **grant Modal** (~10 źródeł promptu, IPIP-60) — dokument jest ważny jako **archiwum intencji**, nie jako opis obecnego runtime.

**Supabase i próba produktowa.** Git z końca 2025 pokazuje migracje RLS, kredyty, naprawy Safari OAuth i normalizację zdjęć — produkt zaczyna wychodzić poza laboratorium, co później wymusi audyt Thermos i rozdzielenie użytkowników badawczych od płatnych.

**Od dokumentacji do kanonu.** Wątki [Uporządkuj dokumenty](1e71f47e-64b4-408a-9520-a3fa12355c76) i [Podsumowanie doktoranckie](c69dd1bc-6947-4ecd-b2b9-443769fccd60) poprzedzają decyzję o **`pisemna`** i `GLOSSARY` — odpowiedź na ten sam problem: wiele wersji prawdy w plikach `.md` rozproszonych po repo.

---

## Otwarte kwestie / luki w źródłach

1. **2024 – wczesna 2025 bez Cursor** — pierwsze wersje hipotez i macierzy („5 obrazów”, `PODSUMOWANIE_PROJEKTU.md`) tylko z Git/archiwów repo; brak indeksu rozmów.
2. **FTS ≠ pełny czat** — `conversation_fts.body` to indeks (często ~2–250 KB), nie zamiennik transkryptu agenta; wątki sprzed 03/2026 nie mają `.jsonl`.
3. **`state.vscdb.backup`** — nie zawiera osobnej historii rozmów; kanon lokalny to `conversation-search.db` (+ WAL przy otwartym Cursorze).
4. **Timestampy w JSONL** — chronologia oparta na `mtime` folderów; kolejność dwóch rozmów tego samego dnia może być przybliżona.
5. **Subagenty** — struktura `agent-transcripts/{uuid}/` może zawierać wiele plików w jednym wątku; w liczbie **164** folderów AWA **nie** wliczamy osobno każdego subagenta jako osobnej rozmowy z użytkownikiem.
6. **`cloud-cache`** — **139** wpisów z krótszym `body` w FTS; część wątków AWA ma duplikat semantyczny jako `local` lub tylko wersję `bc-…` po sync (patrz `GDZIE_SA_ROZMOWY_CURSOR.md`).
7. **Wyniki liczbowe funneli** — konkretne N i procenty z analiz SQL cytowane w rozmowach mogą się dezaktualizować; kanon liczb → snapshot `data/analysis-2026-10-01.json` i rozdział wyników, nie ten dokument.
8. **ComfyUI** — w transkryptach mniej głębokich wątków niż o Gemini; szczegóły grafów głównie w załączniku G i materiałach poza Cursor.
9. **Rozmowy czysto UI** (kolory, particles, hero) — pominięte w tabeli decyzji, chyba że wpływały na procedurę badawczą.

---

## Indeks rozmów (źródła użyte w syntezie)

Format: [krótki tytuł](uuid) — data przybliżona (mtime folderu).

| Tytuł | UUID | Data ok. |
|-------|------|----------|
| [Jak odpalać Modal](23a9678e-107a-4f56-a791-b6e448a458a3) | 23a9678e-107a-4f56-a791-b6e448a458a3 | 2025-07-24 |
| [FLUX Kontext](cee45992-6ce1-476d-a148-8ee1b082952a) | cee45992-6ce1-476d-a148-8ee1b082952a | 2025-07-25 |
| [Zapis wyników ankiet](9e902bec-2060-4584-a3cb-9b7338c5f867) | 9e902bec-2060-4584-a3cb-9b7338c5f867 | 2025-07-28 |
| [Asystentka AWA — landing](41da62f6-e2d9-49d3-8b74-86448633fa60) | 41da62f6-e2d9-49d3-8b74-86448633fa60 | 2025-08-05 |
| [Modal w WSL](74ed8f49-dfe0-4173-ac9d-3bfece7ac823) | 74ed8f49-dfe0-4173-ac9d-3bfece7ac823 | 2025-08-07 |
| [Zdjęcia w Tinderze](93b8304c-8c58-4de7-af6c-8ef9469ac883) | 93b8304c-8c58-4de7-af6c-8ef9469ac883 | 2025-08-10 |
| [Research framework AI interiors](9e5d5fdf-5878-4500-be7c-2c24bf2f7f4f) | 9e5d5fdf-5878-4500-be7c-2c24bf2f7f4f | 2025-10-20 |
| [Weryfikacja metod badawczych](f5b2b00a-4357-4ba2-8e51-d50a7571fe6b) | f5b2b00a-4357-4ba2-8e51-d50a7571fe6b | 2025-10-28 |
| [Analiza architektury profilu](517b6715-c213-49d2-88ad-8d7546ecbce9) | 517b6715-c213-49d2-88ad-8d7546ecbce9 | 2025-11-22 |
| [Budowanie promptów obrazów](37ec8e7a-0cc0-4d2a-9130-de5cdd388288) | 37ec8e7a-0cc0-4d2a-9130-de5cdd388288 | 2025-11-24 |
| [Podsumowanie projektu doktoranckiego](c69dd1bc-6947-4ecd-b2b9-443769fccd60) | c69dd1bc-6947-4ecd-b2b9-443769fccd60 | 2025-12-04 |
| [Integracja Google do obrazów](933ce084-2f0f-4d45-b9f1-ea928d22a0ef) | 933ce084-2f0f-4d45-b9f1-ea928d22a0ef | 2025-12-21 |
| [Przepływ Big Five](125a039b-ea05-4dbd-99f4-b9bea45dc439) | 125a039b-ea05-4dbd-99f4-b9bea45dc439 | 2025-12-23 |
| [Temat pracy doktorskiej](050a15d8-0109-4928-9d7b-b0594b993328) | 050a15d8-0109-4928-9d7b-b0594b993328 | 2026-01-13 |
| [Migracja Supabase → GCP](4fbfb9b1-b5c4-4127-bc9a-8865c80150d4) | 4fbfb9b1-b5c4-4127-bc9a-8865c80150d4 | 2026-03-05 |
| [Merge gałęzi Supabase](0591fa60-9f7b-4668-92fb-901341f202fa) | 0591fa60-9f7b-4668-92fb-901341f202fa | 2026-03-08 |
| [Auth e-mail / weryfikacja](5e0063f7-ac35-4bec-bedc-4c7590d1a998) | 5e0063f7-ac35-4bec-bedc-4c7590d1a998 | 2026-03-12 |
| [Audyt kompletności danych aplikacji](9958893b-b4d6-4de1-9c8b-856840b1d20c) | 9958893b-b4d6-4de1-9c8b-856840b1d20c | 2026-03-21 |
| [Vertex / mail Google Cloud](b7ef69df-7b18-48d9-ba95-e3ae7087cc94) | b7ef69df-7b18-48d9-ba95-e3ae7087cc94 | 2026-04-09 |
| [Progress bar 12 kroków Full](2b9e49ec-d6c4-46aa-913d-f085a96e4ce8) | 2b9e49ec-d6c4-46aa-913d-f085a96e4ce8 | 2026-04-28 |
| [Przeprojektowanie dashboardu](5c6c66f1-a257-4a88-a2c4-e8bd8a7449cd) | 5c6c66f1-a257-4a88-a2c4-e8bd8a7449cd | 2026-04-28 |
| [Big Five — powtórzenie testu](d7df803c-0d6e-4d64-88cd-6688aac9191f) | d7df803c-0d6e-4d64-88cd-6688aac9191f | 2026-04-28 |
| [Model generacji — Gemini](f26a3070-3f6e-4789-8f81-2709a365709c) | f26a3070-3f6e-4789-8f81-2709a365709c | 2026-05-07 |
| [Parity macierzy Full/Fast](2a9697e1-68f5-4b60-8a20-2037d230d676) | 2a9697e1-68f5-4b60-8a20-2037d230d676 | 2026-05-08 |
| [Stack i kontekst doktorski](6420f3b2-e8b5-43af-9d39-1840688d6df9) | 6420f3b2-e8b5-43af-9d39-1840688d6df9 | 2026-05-03 |
| [Cennik bez legacy FLUX](9ed1e2db-cb86-4db6-9aae-305ae18fd69a) | 9ed1e2db-cb86-4db6-9aae-305ae18fd69a | 2026-05-08 |
| [Cookies vs regulamin RODO](2904e574-0cf1-47ce-8501-ae8215efd572) | 2904e574-0cf1-47ce-8501-ae8215efd572 | 2026-05-18 |
| [Audyt Thermos (bezpieczna gałąź)](55e40b31-365c-4697-8b80-4a47aeb12290) | 55e40b31-365c-4697-8b80-4a47aeb12290 | 2026-05-29 |
| [Komunikat badawczy na landing](2a42bd45-078b-4920-a1f8-7d310146e025) | 2a42bd45-078b-4920-a1f8-7d310146e025 | 2026-05-29 |
| [Query Cloud SQL uczestnika](e93d1d65-7d32-4a9d-815b-ca881aa8f768) | e93d1d65-7d32-4a9d-815b-ca881aa8f768 | 2026-06-01 |
| [Weryfikacja persistence badawczej](bb533688-0a64-4863-a456-9e39cbf3a0cb) | bb533688-0a64-4863-a456-9e39cbf3a0cb | 2026-06-01 |
| [Wdrożenie sync GCP](49c9a66e-979c-4f1a-afc0-b95bb32d04fe) | 49c9a66e-979c-4f1a-afc0-b95bb32d04fe | 2026-06-01 |
| [Palety jawne vs ukryte](d452b43e-9551-4dfa-9949-b154e647ae86) | d452b43e-9551-4dfa-9949-b154e647ae86 | 2026-06-01 |
| [Pakiet 1000 kont startowych](7fabde3f-5264-4a21-8669-e9cbc8350dcd) | 7fabde3f-5264-4a21-8669-e9cbc8350dcd | 2026-06-02 |
| [Grant Google dla akademików](9db0e1e2-3cc1-4b6b-b9cb-beec070ce678) | 9db0e1e2-3cc1-4b6b-b9cb-beec070ce678 | 2026-06-04 |
| [Prompty Tindera — liczba zestawów](89f20b85-d08d-46d5-ab25-86d25a39ed58) | 89f20b85-d08d-46d5-ab25-86d25a39ed58 | 2026-06-05 |
| [Mapa prompt-synthesis 6 źródeł](a8ddf983-6128-4d14-9ce3-b86371804147) | a8ddf983-6128-4d14-9ce3-b86371804147 | 2026-06-05 |
| [Wyłączenie debugów produkcji](de8cedf0-7aaa-458a-98a2-c0cb37c86ffd) | de8cedf0-7aaa-458a-98a2-c0cb37c86ffd | 2026-06-11 |
| [Plan infrastruktury pisania z AI](bbf13187-4a3f-4b19-bb6d-ff0619c31059) | bbf13187-4a3f-4b19-bb6d-ff0619c31059 | 2026-06-11 |
| [Opis projektu pod marketing](d7270aa4-431d-41a8-b908-7c41eb85d692) | d7270aa4-431d-41a8-b908-7c41eb85d692 | 2026-06-12 |
| [Czy branch pod pracę pisemną](3aca49d8-e16b-494e-bf2d-a0d832043199) | 3aca49d8-e16b-494e-bf2d-a0d832043199 | 2026-06-29 |
| [Branch pisemna, spis, RQ1–RQ6](bd5f2d81-b3b2-4861-88a1-f26a3ed7c844) | bd5f2d81-b3b2-4861-88a1-f26a3ed7c844 | 2026-06-29 |
| [Lejek macierzy — profil vs badanie](454a8762-98be-4066-91e2-b0145e1a9e23) | 454a8762-98be-4066-91e2-b0145e1a9e23 | 2026-06-30 |
| [LaTeX lokalnie i snapshot danych](2ae4c45c-0767-4ff5-ac04-73f74e5814a0) | 2ae4c45c-0767-4ff5-ac04-73f74e5814a0 | 2026-08-02 |
| [Pull pisemna + Gemini empty-room](56fbac63-4ce2-4bbd-a862-8d05bce1fae1) | 56fbac63-4ce2-4bbd-a862-8d05bce1fae1 | 2026-08-17 |
| [Statystyki uczestników i dropout](8868e4c3-c4c7-4cbf-aaa7-07d77098729b) | 8868e4c3-c4c7-4cbf-aaa7-07d77098729b | 2026-08-31 |
| [Migracja operacyjna GCP](7a592fd6-8c96-4cef-995f-eff5f6da5318) | 7a592fd6-8c96-4cef-995f-eff5f6da5318 | 2026-08-31 |
| [RODO / zgody Vertex](f1f01b0c-f921-4dcd-bae2-b68a734a1ddc) | f1f01b0c-f921-4dcd-bae2-b68a734a1ddc | 2026-09-25 |
| [Porządek folderów thesis](f454659c-7e6a-4bff-a286-c55362a6239c) | f454659c-7e6a-4bff-a286-c55362a6239c | 2026-10-01 |
| [Testy sensoryczne — kroki liniowe](01f71f41-e1a3-407b-bd47-fd78b3eb1b30) | 01f71f41-e1a3-407b-bd47-fd78b3eb1b30 | 2026-04-25 |
| [Historia z transkryptów (ten dokument)](afe45b46-14d8-46bd-af01-cbab0cfe3d02) | afe45b46-14d8-46bd-af01-cbab0cfe3d02 | 2026-10-01 |

---

*Dokument roboczy pod rozdziały metodologiczne i wprowadzenie (geneza artefaktu). Ostatnia duża aktualizacja: 2026-10-01 (skan archiwów Cursor: `local`/`cloud-cache`, rozbudowa narracji faz 0–2 i RtD). Aktualizacja: po każdej większej fazie projektu lub rewizji `GLOSSARY.md`.*
