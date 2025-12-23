# Research Data Dictionary

Kompletny słownik danych dla eksportu badawczego. Opis wszystkich kolumn w widokach i tabelach eksportowanych do analizy.

## Główne pliki eksportu

### 1. `research_full_export_v2.csv` - Główny plik eksportu

Jeden wiersz = jeden uczestnik. Zawiera wszystkie dane z sesji w spłaszczonej formie.

#### IDENTYFIKACJA

| Kolumna | Typ | Opis |
|---------|-----|------|
| `user_hash` | text | Unikalny identyfikator uczestnika (hash) |
| `last_activity` | timestamp | Ostatnia aktywność uczestnika |
| `consent_timestamp` | timestamp | Data i czas wyrażenia zgody RODO |
| `path_type` | text | Typ ścieżki: `fast` lub `full` |
| `current_step` | text | Aktualny krok w procesie (jeśli sesja nie zakończona) |

#### DEMOGRAFIA

| Kolumna | Typ | Opis |
|---------|-----|------|
| `age_range` | text | Przedział wiekowy uczestnika |
| `gender` | text | Płeć uczestnika |
| `country` | text | Kraj pochodzenia |
| `education` | text | Poziom wykształcenia |

#### BIG FIVE (IPIP-NEO-120)

| Kolumna | Typ | Opis |
|---------|-----|------|
| `big5_instrument` | text | Instrument testu: `IPIP-NEO-120` |
| `big5_openness` | numeric | Wynik domeny Openness (O) |
| `big5_conscientiousness` | numeric | Wynik domeny Conscientiousness (C) |
| `big5_extraversion` | numeric | Wynik domeny Extraversion (E) |
| `big5_agreeableness` | numeric | Wynik domeny Agreeableness (A) |
| `big5_neuroticism` | numeric | Wynik domeny Neuroticism (N) |
| `big5_facets_json` | jsonb | Pełna struktura 30 facetów (JSON) |
| `big5_completed_at` | timestamp | Data ukończenia testu |
| `big5_responses_json` | jsonb | Wszystkie 120 odpowiedzi (JSON) |

**Uwaga:** Szczegółowe wyniki 30 facetów są dostępne w osobnym pliku `research_bigfive_facets.csv`.

#### VISUAL DNA (IMPLICIT) - Tagi z swipe'ów

| Kolumna | Typ | Opis |
|---------|-----|------|
| `implicit_dominant_style` | text | Dominujący styl (z analizy swipe'ów) |
| `implicit_style_1` | text | Top 1 styl (implicit) |
| `implicit_style_2` | text | Top 2 styl (implicit) |
| `implicit_style_3` | text | Top 3 styl (implicit) |
| `implicit_color_1` | text | Top 1 kolor (implicit) |
| `implicit_color_2` | text | Top 2 kolor (implicit) |
| `implicit_color_3` | text | Top 3 kolor (implicit) |
| `implicit_material_1` | text | Top 1 materiał (implicit) |
| `implicit_material_2` | text | Top 2 materiał (implicit) |
| `implicit_material_3` | text | Top 3 materiał (implicit) |
| `dna_accuracy_score` | numeric | Dokładność analizy DNA (0-1) |
| `implicit_lighting` | jsonb | Preferencje oświetlenia (JSON) |
| `dna_accuracy_score_alt` | numeric | Alternatywny wynik dokładności |

#### EXPLICIT PREFERENCES - Preferencje jawne (z wizarda)

| Kolumna | Typ | Opis |
|---------|-----|------|
| `explicit_warmth` | numeric | Ciepło (0-1) z semantic differential |
| `explicit_brightness` | numeric | Jasność (0-1) z semantic differential |
| `explicit_complexity` | numeric | Złożoność (0-1) z semantic differential |
| `explicit_texture` | numeric | Tekstura (0-1) z semantic differential |
| `explicit_palette` | text | Wybrana paleta kolorów |
| `explicit_style` | text | Wybrany styl |
| `explicit_material_1` | text | Top 1 materiał (explicit) |
| `explicit_material_2` | text | Top 2 materiał (explicit) |
| `explicit_material_3` | text | Top 3 materiał (explicit) |

#### SENSORY / BIOPHILIA

| Kolumna | Typ | Opis |
|---------|-----|------|
| `sensory_music` | text | Preferencja muzyki (np. `jazz`, `classical`, `electronic`) |
| `sensory_texture` | text | Preferencja tekstury (np. `soft_fabric`, `smooth_wood`) |
| `sensory_light` | text | Preferencja światła (np. `warm_low`, `cool_bright`) |
| `biophilia_score` | numeric | Wynik biofilii (0-3) |
| `nature_metaphor` | text | Metafora natury (np. `ocean`, `forest`, `mountain`) |

#### LIFESTYLE

| Kolumna | Typ | Opis |
|---------|-----|------|
| `living_situation` | text | Sytuacja mieszkaniowa (np. `alone`, `partner`, `family`) |
| `life_vibe` | text | Styl życia (np. `busy`, `calm`, `chaotic`) |
| `life_goals_json` | jsonb | Cele życiowe (JSON array) |

#### ASPIRATIONAL

| Kolumna | Typ | Opis |
|---------|-----|------|
| `aspirational_feelings_json` | jsonb | Uczucia aspiracyjne (JSON array) |
| `aspirational_rituals_json` | jsonb | Rytuały aspiracyjne (JSON array) |

#### PRS (MOOD GRID)

| Kolumna | Typ | Opis |
|---------|-----|------|
| `prs_ideal_x` | numeric | Współrzędna X idealnego nastroju |
| `prs_ideal_y` | numeric | Współrzędna Y idealnego nastroju |
| `prs_current_x` | numeric | Współrzędna X obecnego nastroju |
| `prs_current_y` | numeric | Współrzędna Y obecnego nastroju |
| `prs_target_x` | numeric | Współrzędna X docelowego nastroju |
| `prs_target_y` | numeric | Współrzędna Y docelowego nastroju |

#### LADDERING

| Kolumna | Typ | Opis |
|---------|-----|------|
| `ladder_path_json` | jsonb | Ścieżka ladderingu (JSON array) |
| `ladder_core_need` | text | Core need (główna potrzeba) |
| `ladder_prompt_elements_json` | jsonb | Elementy prompta z ladderingu (JSON) |
| `ladder_path_alt_json` | jsonb | Alternatywna ścieżka ladderingu (JSON) |
| `core_need_alt` | text | Alternatywny core need |

**Uwaga:** Laddering może nie być używany we wszystkich ścieżkach.

#### SURVEYS

| Kolumna | Typ | Opis |
|---------|-----|------|
| `sus_score` | numeric | SUS score (0-100) - System Usability Scale |
| `clarity_score` | numeric | Clarity score (0-100) |
| `agency_score` | numeric | Agency score (0-100) |
| `satisfaction_score` | numeric | Satisfaction score (0-100) |
| `sus_answers_json` | jsonb | Odpowiedzi SUS (sus_1 do sus_10) |
| `agency_answers_json` | jsonb | Odpowiedzi agency (JSON) |
| `satisfaction_answers_json` | jsonb | Odpowiedzi satisfaction (JSON) |
| `clarity_answers_json` | jsonb | Odpowiedzi clarity (JSON) |

#### ROOM DATA

| Kolumna | Typ | Opis |
|---------|-----|------|
| `room_type` | text | Typ pokoju (np. `bedroom`, `living_room`) |
| `room_name` | text | Nazwa pokoju |
| `room_usage_type` | text | Typ użytkowania: `solo` lub `shared` |
| `room_shared_with_json` | jsonb | Z kim dzielony pokój (JSON array) |
| `room_pain_points_json` | jsonb | Problemy z pokojem (JSON array) |
| `room_activities_json` | jsonb | Aktywności w pokoju (JSON array) |
| `detected_room_type` | text | Wykryty typ pokoju (z VLM) |
| `room_analysis_confidence` | numeric | Pewność analizy pokoju (0-1) |
| `room_description` | text | Opis pokoju z analizy VLM |
| `room_suggestions_json` | jsonb | Sugestie dla pokoju (JSON array) |

#### TINDER STATS

| Kolumna | Typ | Opis |
|---------|-----|------|
| `tinder_total_swipes` | integer | Całkowita liczba swipe'ów |
| `tinder_likes` | integer | Liczba polubień (swipe right) |
| `tinder_dislikes` | integer | Liczba niepolubień (swipe left) |
| `tinder_total_images` | integer | Całkowita liczba obrazów w teście |

**Uwaga:** Szczegółowe dane każdego swipe'a są dostępne w `research_swipes_detailed.csv`.

#### SPACES / IMAGES (liczniki)

| Kolumna | Typ | Opis |
|---------|-----|------|
| `spaces_count` | integer | Liczba przestrzeni |
| `inspirations_count` | integer | Liczba inspiracji |
| `generations_count` | integer | Liczba wygenerowanych obrazów |

#### TAGI INSPIRACJI - Aggregated Top 3

| Kolumna | Typ | Opis |
|---------|-----|------|
| `inspiration_style_1` | text | Top 1 styl z inspiracji (aggregated) |
| `inspiration_style_2` | text | Top 2 styl z inspiracji (aggregated) |
| `inspiration_style_3` | text | Top 3 styl z inspiracji (aggregated) |
| `inspiration_color_1` | text | Top 1 kolor z inspiracji (aggregated) |
| `inspiration_color_2` | text | Top 2 kolor z inspiracji (aggregated) |
| `inspiration_color_3` | text | Top 3 kolor z inspiracji (aggregated) |
| `inspiration_material_1` | text | Top 1 materiał z inspiracji (aggregated) |
| `inspiration_material_2` | text | Top 2 materiał z inspiracji (aggregated) |
| `inspiration_material_3` | text | Top 3 materiał z inspiracji (aggregated) |
| `inspiration_biophilia_avg` | numeric | Średnia biofilia ze wszystkich inspiracji (0-3) |

**Uwaga:** Tagi inspiracji są agregowane ze wszystkich inspiracji użytkownika.

#### PROFILE COMPLETION

| Kolumna | Typ | Opis |
|---------|-----|------|
| `core_profile_complete` | boolean | Czy profil został ukończony |
| `core_profile_completed_at` | timestamp | Data ukończenia profilu |

#### RAW JSON

| Kolumna | Typ | Opis |
|---------|-----|------|
| `full_session_json` | jsonb | Pełny JSON sesji (dla szczegółowej analizy) |

---

### 2. `research_swipes_detailed.csv` - Szczegóły swipe'ów

Jeden wiersz = jeden swipe. Zawiera szczegółowe dane każdego swipe'a z czasami reakcji.

| Kolumna | Typ | Opis |
|---------|-----|------|
| `user_hash` | text | Identyfikator uczestnika |
| `image_id` | text | ID obrazu |
| `direction` | text | Kierunek: `left` (dislike) lub `right` (like) |
| `reaction_time_ms` | integer | Czas reakcji w milisekundach |
| `swipe_timestamp` | text | Timestamp swipe'a |
| `image_styles_json` | jsonb | Style obrazu (jeśli dostępne) |
| `image_colors_json` | jsonb | Kolory obrazu (jeśli dostępne) |
| `image_materials_json` | jsonb | Materiały obrazu (jeśli dostępne) |

---

### 3. `research_bigfive_facets.csv` - 30 facetów Big Five

Jeden wiersz = jeden uczestnik. Zawiera wszystkie 30 facetów jako osobne kolumny.

#### Openness (O1-O6)

| Kolumna | Typ | Opis |
|---------|-----|------|
| `user_hash` | text | Identyfikator uczestnika |
| `completed_at` | timestamp | Data ukończenia testu |
| `facet_O1` | numeric | Facet O1 (Imagination) |
| `facet_O2` | numeric | Facet O2 (Artistic Interests) |
| `facet_O3` | numeric | Facet O3 (Emotionality) |
| `facet_O4` | numeric | Facet O4 (Adventurousness) |
| `facet_O5` | numeric | Facet O5 (Intellect) |
| `facet_O6` | numeric | Facet O6 (Liberalism) |

#### Conscientiousness (C1-C6)

| Kolumna | Typ | Opis |
|---------|-----|------|
| `facet_C1` | numeric | Facet C1 (Self-Efficacy) |
| `facet_C2` | numeric | Facet C2 (Orderliness) |
| `facet_C3` | numeric | Facet C3 (Dutifulness) |
| `facet_C4` | numeric | Facet C4 (Achievement-Striving) |
| `facet_C5` | numeric | Facet C5 (Self-Discipline) |
| `facet_C6` | numeric | Facet C6 (Cautiousness) |

#### Extraversion (E1-E6)

| Kolumna | Typ | Opis |
|---------|-----|------|
| `facet_E1` | numeric | Facet E1 (Friendliness) |
| `facet_E2` | numeric | Facet E2 (Gregariousness) |
| `facet_E3` | numeric | Facet E3 (Assertiveness) |
| `facet_E4` | numeric | Facet E4 (Activity Level) |
| `facet_E5` | numeric | Facet E5 (Excitement-Seeking) |
| `facet_E6` | numeric | Facet E6 (Cheerfulness) |

#### Agreeableness (A1-A6)

| Kolumna | Typ | Opis |
|---------|-----|------|
| `facet_A1` | numeric | Facet A1 (Trust) |
| `facet_A2` | numeric | Facet A2 (Morality) |
| `facet_A3` | numeric | Facet A3 (Altruism) |
| `facet_A4` | numeric | Facet A4 (Cooperation) |
| `facet_A5` | numeric | Facet A5 (Modesty) |
| `facet_A6` | numeric | Facet A6 (Sympathy) |

#### Neuroticism (N1-N6)

| Kolumna | Typ | Opis |
|---------|-----|------|
| `facet_N1` | numeric | Facet N1 (Anxiety) |
| `facet_N2` | numeric | Facet N2 (Anger) |
| `facet_N3` | numeric | Facet N3 (Depression) |
| `facet_N4` | numeric | Facet N4 (Self-Consciousness) |
| `facet_N5` | numeric | Facet N5 (Immoderation) |
| `facet_N6` | numeric | Facet N6 (Vulnerability) |

---

### 4. `generation_jobs.csv` - Prompty generacji

Jeden wiersz = jedna generacja. Zawiera pełne prompty używane do generacji obrazów.

| Kolumna | Typ | Opis |
|---------|-----|------|
| `id` | uuid | ID generacji |
| `project_id` | text | userHash uczestnika |
| `job_type` | text | Typ generacji: `initial`, `micro`, `macro` |
| `prompt` | text | **PEŁNY PROMPT** używany do generacji |
| `parameters` | jsonb | Parametry generacji (strength, guidance, itp.) |
| `has_base_image` | boolean | Czy była bazowa grafika |
| `modification_label` | text | Etykieta modyfikacji |
| `started_at` | timestamp | Czas startu generacji |
| `finished_at` | timestamp | Czas zakończenia generacji |
| `status` | text | Status: `success` lub `error` |
| `latency_ms` | integer | Latencja generacji w milisekundach |
| `error_message` | text | Komunikat błędu (jeśli wystąpił) |

---

### 5. `space_images.csv` - Obrazy z URL-ami

Jeden wiersz = jeden obraz. Zawiera obrazy wygenerowane i inspiracje z URL-ami do Storage.

| Kolumna | Typ | Opis |
|---------|-----|------|
| `id` | uuid | ID obrazu |
| `space_id` | uuid | ID przestrzeni |
| `storage_path` | text | Ścieżka w Supabase Storage |
| `public_url` | text | Publiczny URL obrazu |
| `type` | text | Typ: `generated` lub `inspiration` |
| `is_favorite` | boolean | Czy ulubiony |
| `created_at` | timestamp | Data utworzenia |

---

### 6. `generation_feedback.csv` - Feedback do generacji

Jeden wiersz = jeden feedback. Zawiera informacje o wyborze użytkownika między wygenerowanymi obrazami.

| Kolumna | Typ | Opis |
|---------|-----|------|
| `session_id` | text | ID sesji (userHash) |
| `generated_sources` | jsonb | Źródła wygenerowanych obrazów |
| `selected_source` | text | Wybrane źródło |
| `selection_time_ms` | integer | Czas wyboru w milisekundach |
| `has_complete_bigfive` | boolean | Czy ukończono Big Five |
| `tinder_swipe_count` | integer | Liczba swipe'ów |
| `explicit_answer_count` | integer | Liczba odpowiedzi explicit |
| `user_rating` | integer | Ocena użytkownika |
| `source_quality` | text | Jakość źródła |
| `created_at` | timestamp | Data utworzenia |

---

## Porównanie tagów (implicit vs explicit vs inspiracje)

Tagi są eksportowane w spójnym formacie, co pozwala na łatwe porównanie preferencji z różnych źródeł:

| Źródło | Style | Kolory | Materiały | Biofilia |
|--------|-------|--------|-----------|----------|
| **Implicit (swipe'y)** | `implicit_style_1,2,3` | `implicit_color_1,2,3` | `implicit_material_1,2,3` | - |
| **Explicit (wizard)** | `explicit_style` | `explicit_palette` | `explicit_material_1,2,3` | `biophilia_score` |
| **Inspiracje** | `inspiration_style_1,2,3` | `inspiration_color_1,2,3` | `inspiration_material_1,2,3` | `inspiration_biophilia_avg` |

---

## Zdjęcia użytkowników

Zdjęcia użytkowników są eksportowane jako osobne pliki JPG w folderze `images/`:

- Format: JPG
- Nazwy: `{userHash}_room.jpg` - zdjęcie pokoju
- Nazwy: `{userHash}_room_empty.jpg` - zdjęcie bez mebli (jeśli dostępne)

---

## Użycie w analizie

### Python (pandas)

```python
import pandas as pd

# Główny plik
df = pd.read_csv('research_full_export_v2.csv')

# Swipe'y
swipes = pd.read_csv('research_swipes_detailed.csv')

# Facety Big Five
facets = pd.read_csv('research_bigfive_facets.csv')

# Prompty
prompts = pd.read_csv('generation_jobs.csv')
```

### R

```r
# Główny plik
df <- read.csv('research_full_export_v2.csv')

# Swipe'y
swipes <- read.csv('research_swipes_detailed.csv')

# Facety Big Five
facets <- read.csv('research_bigfive_facets.csv')

# Prompty
prompts <- read.csv('generation_jobs.csv')
```

### Excel / Google Sheets

Otwórz pliki CSV bezpośrednio w Excel lub Google Sheets. Pamiętaj, że:
- JSON kolumny będą wyświetlane jako tekst
- Duże pliki mogą wymagać filtrowania

---

## Uwagi techniczne

1. **Puste wartości**: Reprezentowane jako puste pola w CSV
2. **JSON kolumny**: Zapisane jako stringi JSON - wymagają parsowania
3. **Daty**: Format ISO 8601 (YYYY-MM-DDTHH:mm:ss.sssZ)
4. **Encoding**: UTF-8
5. **Separator**: Przecinek (`,`)
6. **Escape**: Cudzysłowy są escapowane jako `""`

---

## Changelog

- **2025-01-XX**: Utworzono kompletny eksport v2 z wszystkimi polami
- Dodano widoki: `research_full_export_v2`, `research_swipes_detailed`, `research_bigfive_facets`
- Dodano eksport zdjęć użytkowników jako JPG
- Dodano eksport promptów generacji z `generation_jobs`

