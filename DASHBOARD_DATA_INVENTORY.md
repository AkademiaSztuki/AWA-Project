# Dashboard - Inwentaryzacja Danych Użytkownika

## Przegląd Flow i Zbieranych Danych

### 1. **Path Selection** (`/flow/path-selection`)
- **Zbierane dane:**
  - `pathType`: 'fast' | 'full'
  - `pathSelectedAt`: timestamp

### 2. **Photo Upload** (`/flow/photo`)
- **Zbierane dane:**
  - `roomImage`: Base64 zdjęcia pokoju
  - `roomAnalysis`:
    - `detected_room_type`: typ pokoju (bedroom, living room, etc.)
    - `confidence`: pewność wykrycia (0-1)
    - `room_description`: opis pokoju
    - `suggestions`: sugestie AI
    - `comment`: komentarz AI (angielski)
    - `human_comment`: komentarz IDA (polski)

### 3. **Tinder Swipes** (`/flow/tinder`)
- **Zbierane dane:**
  - `tinderResults`: Array<TinderSwipe>
    - `imageId`: ID obrazka
    - `direction`: 'left' | 'right'
    - `reactionTimeMs`: czas reakcji
    - `timestamp`: czas
  - `tinderData`:
    - `swipes`: wszystkie swipe'y
    - `currentProgress`: postęp
    - `totalImages`: liczba obrazków

### 4. **Visual DNA** (`/flow/dna`)
- **Zbierane dane:**
  - `visualDNA`:
    - `dominantTags`: dominujące tagi
    - `preferences`:
      - `colors`: kolory
      - `materials`: materiały
      - `styles`: style
      - `lighting`: oświetlenie
    - `accuracyScore`: dokładność (0-1)
    - `dominantStyle`: dominujący styl
    - `colorPalette`: paleta kolorów
    - `materialsSummary`: podsumowanie materiałów
    - `lightingSummary`: podsumowanie oświetlenia
    - `moodSummary`: podsumowanie nastroju
  - `dnaAccuracyScore`: ocena użytkownika
  - `dnaFeedbackTime`: timestamp
  - `dnaAnalysisComplete`: czy zakończone

### 5. **Laddering** (`/flow/ladder`)
- **Zbierane dane:**
  - `ladderResults`:
    - `path`: Array<LadderStep>
      - `level`: poziom (1-3)
      - `question`: pytanie
      - `selectedAnswer`: wybrana odpowiedź
      - `selectedId`: ID odpowiedzi
      - `timestamp`: czas
    - `coreNeed`: podstawowa potrzeba
    - `promptElements`:
      - `atmosphere`: atmosfera
      - `colors`: kolory
      - `lighting`: oświetlenie
      - `materials`: materiały
      - `layout`: układ
      - `mood`: nastrój
  - `ladderPath`: uproszczona ścieżka
  - `coreNeed`: podstawowa potrzeba
  - `ladderCompleteTime`: timestamp

### 6. **Inspirations** (`/flow/inspirations`)
- **Zbierane dane:**
  - `inspirations`: Array<Inspiration>
    - `id`: ID
    - `fileId`: ID w storage
    - `url`: URL obrazka
    - `tags`:
      - `styles`: style
      - `colors`: kolory
      - `materials`: materiały
      - `biophilia`: poziom natury (0-3)
    - `description`: opis AI
    - `addedAt`: timestamp

### 7. **Big Five Personality** (`/flow/big-five`)
- **Zbierane dane:**
  - `bigFive`:
    - `responses`: Record<string, number> - 60 odpowiedzi (1-5)
    - `scores`:
      - `openness`: Otwartość (0-100)
      - `conscientiousness`: Sumienność (0-100)
      - `extraversion`: Ekstrawersja (0-100)
      - `agreeableness`: Ugodowość (0-100)
      - `neuroticism`: Neurotyczność (0-100)
    - `completedAt`: timestamp

**Szczegóły do wizualizacji:**
- Każda domena ma 12 itemów
- Niektóre są odwrotnie punktowane (reverse)
- Można pokazać wyniki per facet (podskala)
- Możliwość porównania z normami populacyjnymi

### 8. **Generation** (`/flow/generate`)
- **Zbierane dane:**
  - `generations`: Array<GenerationSet>
    - `id`: ID
    - `prompt`: użyty prompt
    - `images`: wygenerowane obrazki
    - `timestamp`: czas
  - `generatedImages`: URL-e obrazków
  - `selectedImage`: wybrany obrazek
  - `imageRatings`: oceny obrazków

### 9. **Surveys** (`/flow/survey1`, `/flow/survey2`)
- **Zbierane dane:**
  - `surveyData`:
    - `agencyScore`: poczucie sprawczości
    - `satisfactionScore`: zadowolenie
    - `clarityScore`: jasność
    - `agencyAnswers`: szczegółowe odpowiedzi agency
    - `satisfactionAnswers`: szczegółowe odpowiedzi satisfaction
    - `clarityAnswers`: szczegółowe odpowiedzi clarity
    - `survey1Completed`: timestamp
    - `survey2Completed`: timestamp
    - `sessionCompleted`: timestamp
  - `finalSurvey`: SurveyResults
    - `satisfaction`: (easeOfUse, engagement, clarity, overall)
    - `agency`: (control, collaboration, creativity, ownership)
    - `preferences`: (evolution, crystallization, discovery)

### 10. **Demographics & Context** (różne kroki)
- **Zbierane dane:**
  - `demographics`: Record<string, string>
  - `usagePattern`:
    - `timeOfDay`: pora dnia
    - `description`: opis
    - `timestamp`: czas
  - `emotionalPreference`:
    - `emotion`: emocja
    - `description`: opis
    - `timestamp`: czas

### 11. **Spaces** (nowa struktura)
- **Zbierane dane:**
  - `spaces`: Array<Space>
    - `id`: ID przestrzeni
    - `name`: nazwa
    - `type`: typ
    - `images`: obrazki (generated + inspiration)
    - `createdAt`: utworzono
    - `updatedAt`: zaktualizowano

## Propozycje Sekcji Dashboard

### 📊 Sekcja 1: Profile Overview
- Avatar / Imię
- Data rejestracji
- Typ ścieżki (Fast/Full)
- Postęp profilu (%)

### 🎨 Sekcja 2: Visual DNA
- Dominant Style badge
- Color palette (kulki z kolorami)
- Materials (ikony)
- Lighting preference
- Accuracy score slider

### 🧠 Sekcja 3: Big Five Personality (ROZBUDOWANA!)
- **Radar Chart** - wszystkie 5 wymiarów
- **Bar Charts** - szczegóły per domena z opisem
- **Facets** - podskale każdej domeny
- **Descriptions** - tekstowe opisy profilu osobowości
- **Comparisons** - porównanie z normami
- Przycisk "Zobacz Szczegóły" → pełna strona z analizą

### 🪜 Sekcja 4: Core Needs (Laddering)
- Core Need badge (duży, wyróżniony)
- Ścieżka wyboru (poziomy 1→2→3)
- Prompt Elements (atmosphere, mood, etc.)
- Wizualizacja ścieżki

### 💡 Sekcja 5: Inspirations
- Mini galeria (6 obrazków)
- Tagi ze wszystkich inspiracji
- Biophilia score agregowany
- Przycisk "Zobacz Wszystkie"

### 🏠 Sekcja 6: Room Analysis
- Zdjęcie pokoju (thumbnail)
- Detected Room Type
- AI Description
- IDA Comment
- Suggestions

### 📈 Sekcja 7: Generation Stats
- Liczba wygenerowanych obrazków
- Średnie oceny (aesthetic, character, harmony)
- Ulubione obrazki
- Historia modyfikacji

### 📝 Sekcja 8: Surveys & Feedback
- Agency Score (gauge/progress)
- Satisfaction Score
- Clarity Score
- Detailed feedback text

### 🎯 Sekcja 9: Quick Actions
- "Wygeneruj Nowe Wnętrze"
- "Dodaj Inspirację"
- "Edytuj Profil"
- "Powtórz Test Big Five"

## Priorytet Implementacji

1. **PRIORITY 1**: Rozbudowa Big Five z wykresami ⭐
2. **PRIORITY 2**: Visual DNA + Ladder Results
3. **PRIORITY 3**: Room Analysis + Inspirations
4. **PRIORITY 4**: Surveys & Stats
5. **PRIORITY 5**: Quick Actions & Navigation

## Techniczne TODO

- [ ] Komponenty wizualizacji (Radar Chart, Bar Chart)
- [ ] Strona szczegółowa Big Five
- [ ] Sekcje Dashboard (modularnie)
- [ ] Export danych do PDF/JSON
- [ ] Porównanie z normami populacyjnymi (opcjonalnie)
