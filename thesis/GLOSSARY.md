# KlSłownik terminów i faktów (źródło prawdy)

> Ostatnia weryfikacja względem kodu: 2026-06-11  
> Przy konflikcie z innymi plikami `.md` w repo — **ten plik wygrywa** (obok `docs/canon/`).

## Instytucja i autor


| Pole             | Wartość                                                 |
| ---------------- | ------------------------------------------------------- |
| Uczelnia         | **Akademia Sztuki w Szczecinie**                        |
| Kontekst         | Praca doktorska                                         |
| Autor            | Jakub Palka                                             |
| Promotor         | prof. dr hab. Andreas Guskos                            |
| Produkt badawczy | **IDA** (AI Interior Design Dialogue Research Platform) |


Źródło w kodzie: `apps/frontend/src/app/o-projecie/page.tsx`, `apps/frontend/src/app/layout.tsx`.

**Nie używać:** „Akademia Sztuk Pięknych” (Warszawa) — to błąd w starych README.

## Nazewnictwo produktu


| Termin     | Znaczenie                                                                                                          |
| ---------- | ------------------------------------------------------------------------------------------------------------------ |
| **IDA**    | Oficjalna nazwa platformy badawczej                                                                                |
| AWA / Aura | Legacy nazewnictwo repozytorium i komponentów (`components/awa/`) — nie używać w tekście pracy jako nazwy produktu |


## Paradygmat badawczy


| Termin                               | Definicja                                                                                                          |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| **Research Through Design (RTD)**    | Metoda łącząca projektowanie artefaktu z generowaniem wiedzy badawczej; dane powstają w naturalnym użyciu produktu |
| **Product-first, research-embedded** | Produkt użyteczny dla użytkownika, w którym osadzono zwalidowane narzędzia psychologiczne                          |


## Preferencje


| Termin                            | Definicja                                                                                                   |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Preferencje jawne (explicit)**  | Deklaracje użytkownika: ankiety, skale semantyczne, wybór materiałów, rankingi                              |
| **Preferencje ukryte (implicit)** | Wnioskowane z zachowania: swipe'y Tinder, czas reakcji, czas oglądania, wzorce wyboru                       |
| **Visual DNA**                    | Profil estetyczny wyprowadzony głównie ze swipe'ów i analizy wizualnej (dominujący styl, kolory, materiały) |


## Psychologia i narzędzia


| Termin           | Definicja                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------- |
| **Big Five**     | Model pięciu cech osobowości (OCEAN)                                                        |
| **IPIP-NEO-120** | 120-itemowy kwestionariusz z 30 facetami — używany w ścieżce full                           |
| **PRS**          | Perceived Restorativeness Scale — mapowanie nastroju przestrzeni (ideal / current / target) |
| **Biophilia**    | Skłonność do kontaktu z naturą w przestrzeni (skala w profilu)                              |
| **Laddering**    | Metoda odkrywania głębszych potrzeb przez łańcuch „dlaczego?”                               |


## Ścieżki użytkownika


| Termin              | Definicja                                                                                          |
| ------------------- | -------------------------------------------------------------------------------------------------- |
| **path_type: fast** | Skrócona ścieżka — 4 kroki (zgoda → zdjęcie → styl → generacja)                                    |
| **path_type: full** | Pełna ścieżka — 12 kroków (profil, inspiracje, Big Five, setup pokoju, generacja, ankiety końcowe) |


Szczegóły: `docs/canon/user-flow.md`.

## Technologia (aktualny stack)


| Warstwa           | Technologia                                      |
| ----------------- | ------------------------------------------------ |
| Frontend          | Next.js 14, Three.js (postać IDA)                |
| API / persistence | Google Cloud Run (`apps/backend-gcp`)            |
| Baza              | Cloud SQL (PostgreSQL), schema: `infra/gcp/sql/` |
| Pliki             | Google Cloud Storage                             |
| Generacja obrazów | Google Vertex / Gemini via `/api/google/`*       |


**Legacy (nie opisywać jako produkcja):** Supabase, Modal.com.

Źródło: `apps/frontend/src/lib/gcp-data.ts`, `README.md`.

## Generacja i personalizacja


| Termin                            | Definicja                                                                   |
| --------------------------------- | --------------------------------------------------------------------------- |
| **Generation matrix (5 obrazów)** | Równoległa generacja 5 wariantów z różnych źródeł danych + blind comparison |
| **GenerationSource**              | `implicit`, `explicit`, `personality`, `mixed`, `mixed_functional`          |
| **Prompt synthesis**              | Pipeline łączący profil użytkownika w prompt dla modelu generatywnego       |


Szczegóły: `docs/canon/personalization-pipeline.md`, `GENERATION_MATRIX_5_IMAGES.md`.

## Dane badawcze


| Termin                | Definicja                                           |
| --------------------- | --------------------------------------------------- |
| **user_hash**         | Anonimowy identyfikator uczestnika (hash)           |
| **Dane deklaratywne** | Odpowiedzi na pytania, kwestionariusze              |
| **Dane behawioralne** | Czas reakcji, swipe'y, dwell time, kolejność kroków |
| **Dane wynikowe**     | Prompty, parametry generacji, oceny satysfakcji     |


Szczegóły zmiennych: `docs/canon/research-variables.md`.

## Temat pracy doktorskiej



**[DO UZUPEŁNIENIA — temat złożony w ASP Szczecin]**

Roboczy opis zakresu (z platformy):

IDA bada, jak preferencje estetyczne, cechy osobowości (Big Five) i sztuczna inteligencja mogą wspierać personalizację koncepcji wnętrz w kontekście psychologii środowiskowej.

Cztery obszary: psychologia środowiskowa; preferencje jawne i ukryte; personalizacja AI; osobowość (IPIP-NEO-120).