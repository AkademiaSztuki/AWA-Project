# iDA Project - Kompleksowe Podsumowanie Projektu Doktoranckiego

**Projekt**: IDA - AI Interior Design Dialogue Research Platform  
**Kontekst**: Doktorat - Akademia Sztuk Pięknych  
**Status**: W rozwoju (85% ukończone)  
**Data**: Styczeń 2025

---

## 🎯 Cel Projektu

IDA to platforma badawcza i produkcyjna, która łączy **psychologię środowiskową**, **badania preferencji** i **sztuczną inteligencję** w kontekście projektowania wnętrz. Projekt realizowany jest w ramach doktoratu i ma na celu:

1. **Badanie ukrytych i jawnych preferencji** użytkowników w kontekście wnętrz
2. **Integrację Big Five Personality** z preferencjami estetycznymi
3. **Walidację zgamifikowanych narzędzi psychologicznych** w kontekście projektowania
4. **Generowanie wnętrz opartych na psychologii** zamiast tylko estetyce
5. **Zbieranie danych badawczych** z rzeczywistego użycia produktu

---

## 🔬 Kontekst Badawczy

### Filozofia: Product-First, Research-Embedded

Kluczowa innowacja projektu polega na **zbudowaniu produktu, który użytkownicy CHCĄ używać**, a jednocześnie **naturalnie osadzeniu zwalidowanych metodologii badawczych**. Zamiast tradycyjnych badań laboratoryjnych, dane zbierane są z rzeczywistego użycia platformy, co umożliwia:

- **Wyższą jakość danych** (użytkownicy są zaangażowani, nie zmuszeni)
- **Większe próby** (produkt może być używany przez tysiące użytkowników)
- **Walidację w rzeczywistych warunkach** (nie sztuczne środowisko laboratoryjne)
- **Wielokrotne publikacje** z jednej platformy

### Metodologia: Research Through Design

Platforma zbiera trzy typy danych:
1. **Dane deklaratywne** - odpowiedzi użytkowników na pytania
2. **Dane behawioralne** - interakcje z interfejsem (czas reakcji, czas oglądania, wzorce)
3. **Dane wynikowe** - parametry AI, wygenerowane projekty, satysfakcja

---

## 🧠 Badanie Preferencji: Ukryte vs Jawne

### Problem Badawczy

Tradycyjne badania preferencji opierają się na **jawnych deklaracjach** użytkowników ("Jakie kolory lubisz?"). Jednak badania psychologiczne pokazują, że:

- **Ukryte preferencje** (implicit) często różnią się od jawnych (explicit)
- **Zachowanie** (co użytkownik faktycznie wybiera) jest lepszym predyktorem niż samo-opis
- **Kombinacja metod** daje pełniejszy obraz preferencji

### Implementacja w IDA

#### 1. **Ukryte Preferencje (Implicit Preferences)**

**Metoda**: Tinder-style swipes (oparte na IAT - Implicit Association Test)

**Jak działa**:
- Użytkownik widzi 33 obrazy wnętrz
- Szybkie binarne wybory (swipe left/right)
- **Śledzenie behawioralne**:
  - Czas reakcji
  - Czas oglądania (dwell time)
  - Wzorce wahania
  - Prędkość decyzji

**Co mierzy**:
- Dominujące style (scandinavian, minimalist, biophilic, etc.)
- Preferencje kolorystyczne (warm/cool, bright/dark)
- Preferencje materiałowe (wood, metal, fabric, etc.)
- Złożoność wizualną (minimalist vs eclectic)

**Źródło naukowe**: Greenwald et al. (1998) - Implicit Association Test

#### 2. **Jawne Preferencje (Explicit Preferences)**

**Metody**:
- **Semantic Differential Scales** (Osgood, 1957) - suwaki dla ciepła, jasności, złożoności
- **Ranking palet kolorów** - użytkownik rankuje 6 palet
- **Wybór materiałów** - multi-select ulubionych materiałów
- **Wybór stylu** - bezpośredni wybór preferowanego stylu

**Co mierzy**:
- Świadome preferencje estetyczne
- Deklarowane wartości (co użytkownik mówi, że lubi)
- Intencjonalne wybory

#### 3. **Porównanie i Synteza**

Algorytm łączy oba źródła danych:
- **60% wagi** dla preferencji ukrytych (zachowanie > słowa)
- **40% wagi** dla preferencji jawnych (świadome wybory)
- **Wykrywanie rozbieżności** - gdy implicit ≠ explicit (badawczo interesujące!)

---

## 🎭 Big Five Personality w Kontekście Wnętrz

### Teoretyczne Podstawy

**Big Five Model** (Costa & McCrae, 1992) to najszerzej akceptowany model osobowości, składający się z 5 domen:

1. **Openness (Otwartość)** - kreatywność, ciekawość, tolerancja na nowości
2. **Conscientiousness (Sumienność)** - organizacja, samodyscyplina, porządek
3. **Extraversion (Ekstrawersja)** - towarzyskość, energia, aktywność
4. **Agreeableness (Ugodość)** - współpraca, empatia, harmonia
5. **Neuroticism (Neurotyczność)** - lęk, wrażliwość na stres, niestabilność emocjonalna

### Implementacja w IDA

#### Test IPIP-60

- **60 pytań** w języku polskim i angielskim
- **Reverse scoring** dla dokładności pomiaru
- **5 domen** osobowości (0-100 punktów każda)
- **Opcjonalnie**: IPIP-NEO-120 z facetami (30 facetów, 6 na domenę)

#### Mapowanie Osobowości → Preferencje Wnętrz

Na podstawie literatury z **psychologii środowiskowej**, każda domena Big Five mapuje się na preferencje projektowe:

**Openness (Otwartość)**:
- Wysoka → Większa złożoność wizualna, kreatywne kombinacje, różnorodne materiały
- Niska → Minimalizm, prostota, spójność

**Conscientiousness (Sumienność)**:
- Wysoka → Potrzeba organizacji, ukryte przechowywanie, uporządkowane układy
- Niska → Elastyczność, otwarte przestrzenie, mniej struktury

**Extraversion (Ekstrawersja)**:
- Wysoka → Przestrzenie społeczne, otwarte plany, jasne oświetlenie
- Niska → Prywatne nisze, zamknięte przestrzenie, intymne oświetlenie

**Agreeableness (Ugodość)**:
- Wysoka → Harmonia, zbalansowane proporcje, uspokajające elementy
- Niska → Wyraźne kontrasty, dynamiczne układy

**Neuroticism (Neurotyczność)**:
- Wysoka → Potrzeba komfortu, miękkie tekstury, ciepłe oświetlenie, elementy uspokajające
- Niska → Możliwość większej stymulacji, chłodniejsze tony

#### Facety IPIP-NEO-120

Dla bardziej szczegółowej personalizacji, projekt wykorzystuje również **facety** (30 facetów):

- **O2 Aesthetics** → Wrażliwość estetyczna
- **C2 Order** → Preferencja porządku
- **E1 Warmth** → Preferencja ciepła
- **E2 Gregariousness** → Otwartość społeczna
- **E5 Excitement-Seeking** → Poszukiwanie ekscytacji
- **A6 Tender-Mindedness** → Delikatność
- **N1 Anxiety** → Poziom lęku
- **N6 Vulnerability** → Wrażliwość

Każdy facet wpływa na konkretne aspekty projektu (np. wysoka O2 + niska C2 → eklektyczny mix, wysoka C2 + niska O1 → minimalistyczna tendencja).

---

## 🏗️ Architektura Systemu

### 4-Warstwowa Struktura Danych

```
┌─────────────────────────────────────────────┐
│  WARSTWA 1: USER PROFILE (Global - Raz)     │
│  • Aesthetic DNA (implicit + explicit)      │
│  • Psychology (PRS ideal, biophilia)        │
│  • Big Five Personality (IPIP-60)            │
│  • Inspiration Images (1-10)                 │
│  • Lifestyle & sensory preferences           │
│  Czas: 20 min | Używane: Zawsze             │
└─────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────┐
│  WARSTWA 2: HOUSEHOLD (Per Space)           │
│  • Kto tu mieszka, dynamika                 │
│  • Cele gospodarstwa domowego               │
│  Czas: 2-3 min | Wiele dozwolonych          │
└─────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────┐
│  WARSTWA 3: ROOM (Per Room)                  │
│  • Typ pokoju, kontekst społeczny           │
│  • Analiza zdjęć, aktywności, problemy     │
│  • Room-specific visual DNA                 │
│  Czas: 8-10 min | Wiele per household      │
└─────────────────────────────────────────────┘
          ↓
┌─────────────────────────────────────────────┐
│  WARSTWA 4: SESSION (Per Generation)         │
│  • Projekty AI, feedback, poprawki           │
│  • PRS post-test, satysfakcja               │
│  Czas: 3-5 min | Nieograniczone per room   │
└─────────────────────────────────────────────┘
```

### Dual Path System

#### 🔵 Fast Track (3-5 min)
- Szybki test, ciekawość, pierwszy kontakt
- Photo → 10 swipes → Generate
- **Limit**: 10 generacji
- **Upgrade prompt** gdy wyczerpane

#### 🟡 Full Experience (15-20 min pierwszy raz, 5-8 min powrót)
- Kompletny profil psychologiczny
- **Design Persona Report** - spersonalizowany raport (jak 16 Personalities)
- Nieograniczone generacje
- Wsparcie multi-room
- Wkład w badania

---

## 🔬 Zwalidowane Narzędzia Badawcze (Zgamifikowane)

### 1. PRS-11 (Perceived Restorativeness Scale)

**Źródło**: Pasini et al. (2014), Hartig et al. (1997)

**Zgamifikowane jako**: 2D Mood Grid (spatial mapping)

**Jak działa**:
- Użytkownik umieszcza pokój na mapie 2D
- Oś X: Energetyzujący ←→ Uspokajający
- Oś Y: Nudny ←→ Inspirujący
- **Pre-test**: Gdzie jest obecny pokój?
- **Post-test**: Gdzie jest wygenerowany pokój?

**Co mierzy**:
- **Being Away** - oderwanie od codzienności
- **Fascination** - fascynacja przestrzenią
- **Coherence** - spójność
- **Extent** - rozległość

**Wartość badawcza**: Porównanie pre/post pokazuje, czy AI-generowane wnętrza faktycznie poprawiają odczuwaną regeneracyjność.

### 2. Biophilia Test

**Źródło**: Kellert (2008) - Patterns of Biophilic Design

**Zgamifikowane jako**: Visual Dosage Test (4 opcje wizualne)

**Jak działa**:
- 4 obrazy pokoju z różnym poziomem natury (0-3)
- Użytkownik wybiera "Która najbardziej TY?"
- Poziom 0: Brak natury
- Poziom 1: Minimalne (1-2 rośliny)
- Poziom 2: Średnie (kilka roślin, naturalne światło)
- Poziom 3: Maksymalne (dużo roślin, naturalne materiały, widoki)

**Co mierzy**: Orientację biofiliczną (0-3)

### 3. IAT (Implicit Association Test)

**Źródło**: Greenwald et al. (1998)

**Zgamifikowane jako**: Tinder swipes

**Jak działa**: (opisane wyżej w sekcji "Ukryte Preferencje")

### 4. Semantic Differential

**Źródło**: Osgood (1957)

**Zgamifikowane jako**: Interactive sliders

**Jak działa**:
- Suwaki dla różnych wymiarów:
  - Ciepło: Cool ←→ Warm
  - Jasność: Dark ←→ Bright
  - Złożoność: Simple ←→ Complex

**Co mierzy**: Jawne preferencje w wymiarach semantycznych

### 5. Means-End Laddering

**Źródło**: Reynolds & Gutman (1988)

**Zgamifikowane jako**: Conversational laddering z IDA (3D avatar)

**Jak działa**:
- IDA prowadzi konwersację
- Pytania typu "Dlaczego to jest dla Ciebie ważne?"
- Odkrywa głębokie potrzeby, wartości, konflikty

**Co mierzy**: Hierarchia wartości, głębokie potrzeby psychologiczne

### 6. Sensory Tests (Nowe)

**Źródło**: Własna innowacja

**Jak działa**:
- **Muzyka**: Wybór stylu muzycznego (jazz, classical, electronic, nature, silence, lofi)
- **Tekstura**: Preferencje dotykowe (soft_fabric, smooth_wood, cold_metal, etc.)
- **Światło**: Temperatura światła (warm_low, warm_bright, neutral, cool_bright)

**Co mierzy**: Preferencje sensoryczne (synestetyczne wejście do projektowania)

### 7. Projective Techniques (Nowe)

**Źródło**: Własna innowacja

**Jak działa**:
- **Nature Metaphor**: "Które miejsce w naturze najlepiej Cię opisuje?" (ocean, forest, mountain, desert, garden, sunset)
- **Aspirational Self**: Opis idealnej wersji siebie za rok

**Co mierzy**: Projektowane preferencje (omijają filtry poznawcze)

---

## 🎨 Synteza Promptów (Prompt Synthesis)

### Hybrydowy Algorytm

System używa **3-stopniowego procesu** do generowania promptów dla AI:

#### KROK 1: Scoring Matrix (Deterministic)

Konwersja wszystkich danych użytkownika na **numeryczne wagi** (0-1):

```typescript
const weights = {
  needsCalming: 0.92,        // Z analizy PRS gap
  natureDensity: 0.67,       // Z biophilia score
  warmth: 0.81,              // Z semantic differential + implicit
  visualComplexity: 0.45,    // Z personality (Openness) + implicit
  storageNeeds: 0.78,        // Z personality (Conscientiousness)
  harmonyLevel: 0.65,        // Z personality (Agreeableness + low Neuroticism)
  // ... więcej wag
};
```

**Dlaczego transparentny?**
- Można dokładnie prześledzić, skąd każda decyzja
- Reprodukowalny (te same dane → ten sam wynik)
- Można udokumentować w publikacjach
- Można testować A/B różne wagi

#### KROK 2: Template Builder (Rule-based)

Zasady oparte na wagach budują prompt:

```typescript
const prompt = buildPromptFromWeights(weights, roomType);
// → "A serene Scandinavian bedroom with warm beige tones, 
//    natural wood furniture, medium-density plants, 
//    hidden storage solutions, soft textures, 
//    maximum natural light with warm accent lighting..."
```

**Dlaczego rule-based?**
- Nie czarna skrzynka (wiemy, co się dzieje)
- Szybki (bez wywołań LLM)
- Spójny (te same wagi → ten sam styl)

#### KROK 3: LLM Refinement (Optional)

Opcjonalne dopracowanie składni (tylko forma, nie treść):

```typescript
const refined = await refineSyntaxWithLLM(prompt);
// → Skondensowany, dopracowany, <65 tokenów
```

**Dlaczego opcjonalne?**
- Główna logika jest transparentna
- LLM tylko poprawia składnię
- Można wyłączyć dla pełnej transparentności

### Integracja Wszystkich Źródeł

Prompt syntetyzuje dane z:

1. **Tinder swipes** (implicit) → Style, kolory, materiały
2. **DNA Analysis** (pattern) → Dominujący styl, wtórny styl
3. **Ladder** (psychology) → Głębokie potrzeby, wartości
4. **PRS pre-test** (baseline) → Obecny stan nastroju
5. **Survey 2** (explicit) → Świadome preferencje
6. **Big Five** (personality) → Storage, harmonia, złożoność
7. **Inspirations** (VLM analysis) → Style, kolory z uploadowanych obrazów
8. **Photo analysis** (context) → Obecny stan pokoju
9. **Activities** (function) → Wymagania funkcjonalne
10. **Sensory** (multi-modal) → Preferencje sensoryczne

**Wynik**: ~250+ punktów danych → Spersonalizowany profil → Prompt dla AI

---

## 📊 Potencjalne Publikacje Naukowe

### Paper 1: Gamified Scales Validation
**Cel**: HCI/UX conference (CHI, DIS, TEI)  
**N**: 250 uczestników  
**Design**: Within-subjects (zgamifikowane vs tradycyjne)  
**Miary**: Completion rate, czas, satysfakcja, construct validity  
**Oczekiwania**: Równa ważność, 3x completion, 2x satysfakcja

### Paper 2: AI-Generated Restorativeness
**Cel**: Environmental Psychology journal  
**N**: 200 uczestników  
**Design**: Pre/post z kontrolą  
**Miary**: PRS-11 adapted, satysfakcja, implementacja  
**Oczekiwania**: 1.8 punktu poprawy, 78% pozytywnych zmian

### Paper 3: Implicit vs Explicit Preferences
**Cel**: Design Studies journal  
**N**: 300 uczestników  
**Design**: Porównanie implicit (Tinder) vs explicit (surveys)  
**Miary**: Rozbieżności, predykcyjność, satysfakcja z wyników  
**Oczekiwania**: Implicit lepiej przewiduje satysfakcję

### Paper 4: Big Five → Interior Preferences
**Cel**: Environmental Psychology / Personality Psychology  
**N**: 400 uczestników  
**Design**: Korelacja Big Five z preferencjami wnętrz  
**Miary**: Mapowanie domen → design choices, satysfakcja  
**Oczekiwania**: Silne korelacje (r > 0.4) dla niektórych domen

### Paper 5: Behavioral Preference Indicators
**Cel**: Cognition / HCI  
**N**: 200 uczestników  
**Design**: Analiza behawioralnych wskaźników (dwell time, hesitation)  
**Miary**: Czy zachowanie przewiduje preferencje lepiej niż wybory?  
**Oczekiwania**: Dwell time + hesitation = lepszy predyktor niż samo swipe

---

## 🛠️ Stack Technologiczny

### Frontend
- **Next.js 14** (App Router)
- **TypeScript**
- **Three.js** (3D model IDA)
- **Framer Motion** (animacje)
- **Tailwind CSS** (styling)
- **Glassmorphism UI** (Pearl/Platinum/Silver/Gold/Champagne palette)

### Backend
- **Modal.com** (Python API)
- **FLUX 1 Kontext** (generacja obrazów)
- **Gemma 3 4B-IT** (VLM dla analizy obrazów)
- **MiniCPM** (analiza pokoju, komentarze IDA)

### Database
- **Supabase** (PostgreSQL)
- **Supabase Storage** (zdjęcia, inspiracje)
- **Supabase Auth** (autentykacja)

### Design System
- **Glassmorphism** - backdrop-blur, subtelne obramowania
- **Minimalistyczny** - bez emoji, bez kolorowych ikon
- **Elegancki** - Pearl/Platinum/Silver/Gold/Champagne
- **Spójny** - GlassCard, GlassButton, GlassSurface

---

## 📈 Status Implementacji

### ✅ Ukończone (85%)

- [x] Architektura bazy danych (4 warstwy)
- [x] System pytań (3 tier)
- [x] Algorytm syntezy promptów
- [x] Wsparcie dwujęzyczne (PL/EN)
- [x] Wszystkie komponenty badawcze
- [x] Core Profile Wizard
- [x] Dashboard
- [x] Household Setup
- [x] Room Setup
- [x] Fast Track flow
- [x] Path Selection
- [x] Narzędzia walidacji badań
- [x] Analytics dashboard
- [x] Big Five Personality Test (IPIP-120)
- [x] Inspiration Images Upload & Analysis
- [x] Enhanced Prompt Synthesis

### ⏳ Do Ukończenia (15%)

- [ ] Prawdziwe obrazy Tinder + tracking
- [ ] UI wyboru kolorów/materiałów
- [ ] Upload zdjęć do Supabase Storage
- [ ] Konwersacyjne odpowiedzi IDA LLM
- [ ] UI sesji projektowej pokoju
- [ ] Prawdziwe pobieranie danych (obecnie mockowane)

---

## 🎓 Wkład Akademicki

### Innowacje Metodologiczne

1. **Zgamifikowanie Skal Psychologii Środowiskowej** ✅
   - Nowość: PRS jako 2D spatial mapping
   - Nowość: Biophilia jako visual dosage test
   - Wkład: Walidacja zgamifikowanych alternatyw

2. **Integracja Multi-Metodowa Preferencji** ✅
   - Nowość: Integracja implicit + explicit + psychological
   - Wkład: Która kombinacja najlepiej przewiduje?

3. **Restorativeness Specyficzna dla Pokoju** ✅
   - Nowość: PRS dla konkretnych pokoi (nie ogólna cecha)
   - Wkład: Ważność porównania pre/post

4. **AI-Mediated Design Personalization** ✅
   - Nowość: Dane psychologiczne → parametry AI
   - Wkład: Framework dla psychologia → generative AI

5. **Behawioralne Preferencje Implicit** ✅
   - Nowość: Rozszerzone śledzenie (dwell, hesitation, velocity)
   - Wkład: Jakie zachowania ujawniają autentyczne preferencje?

6. **Big Five → Interior Design Mapping** ✅
   - Nowość: Systematyczne mapowanie domen osobowości na preferencje wnętrz
   - Wkład: Walidacja mapowania w kontekście projektowania

---

## 🌟 Unikalna Propozycja Wartości

### Dla Użytkowników

"Pierwsza aplikacja do projektowania wnętrz oparta na psychologii, gdzie design pochodzi z TEGO KIM JESTEŚ, nie tylko z tego, co wygląda 'ładnie'."

### Dla Badaczy

"Platforma produkcyjna, która zbiera dane na poziomie badań z prawdziwych użytkowników, umożliwiając 4+ publikacje przy jednoczesnym dostarczaniu rzeczywistej wartości."

### Dla Nauki

"Walidacja, że zgamifikowana ocena może utrzymać ważność konstruktu przy jednoczesnym dramatycznym poprawieniu wskaźników ukończenia i doświadczenia użytkownika."

---

## 📚 Kluczowe Referencje Naukowe

### Psychologia Środowiskowa
- **Pasini et al. (2014)** - PRS-11 (Perceived Restorativeness Scale)
- **Hartig et al. (1997)** - Restoration Theory
- **Kellert (2008)** - Patterns of Biophilic Design

### Psychologia Osobowości
- **Costa & McCrae (1992)** - Big Five Model
- **Goldberg (1992)** - IPIP (International Personality Item Pool)

### Metodologie Badawcze
- **Greenwald et al. (1998)** - Implicit Association Test (IAT)
- **Osgood (1957)** - Semantic Differential
- **Reynolds & Gutman (1988)** - Means-End Laddering

### HCI / Design
- **Law et al. (1996)** - Person-Environment-Occupation (PEO) model

---

## 🎯 Kluczowe Pytania Badawcze

1. **Czy zgamifikowane skale psychologiczne zachowują ważność konstruktu?**
   - H1: Tak, z równą ważnością i wyższym completion rate

2. **Czy AI-generowane wnętrza faktycznie poprawiają odczuwaną regeneracyjność?**
   - H2: Tak, średnia poprawa PRS o 1.8 punktu

3. **Czy preferencje ukryte lepiej przewidują satysfakcję niż jawne?**
   - H3: Tak, implicit ma wyższą korelację z satysfakcją

4. **Czy Big Five koreluje z preferencjami wnętrz?**
   - H4: Tak, silne korelacje (r > 0.4) dla Openness, Conscientiousness, Extraversion

5. **Czy behawioralne wskaźniki (dwell time, hesitation) przewidują preferencje?**
   - H5: Tak, kombinacja behawioralnych wskaźników > samo swipe

---

## 📊 Struktura Danych Badawczych

### Zbierane Dane

1. **Demograficzne**: wiek, płeć, lokalizacja, wykształcenie
2. **Osobowość**: Big Five (IPIP-60 lub IPIP-NEO-120)
3. **Preferencje Implicit**: 33 swipes + metadata behawioralna
4. **Preferencje Explicit**: Semantic differential, ranking palet, wybór materiałów
5. **Psychologia**: PRS pre/post, biophilia, laddering responses
6. **Sensoryczne**: Muzyka, tekstura, światło, nature metaphor
7. **Kontekst**: Typ pokoju, aktywności, pain points, zdjęcia
8. **Wyniki**: Wygenerowane projekty, satysfakcja, PRS post-test
9. **Behawioralne**: Dwell time, reaction time, hesitation patterns, velocity

### Anonimizacja

- Wszystkie dane są **anonimizowane** (userHash zamiast ID)
- **GDPR compliant**
- **Informed consent** przed rozpoczęciem
- **Możliwość wycofania** danych w dowolnym momencie

---

## 🚀 Przyszłe Rozszerzenia

### Multi-Room Architecture (Zaprojektowane, nie zaimplementowane)

- Wsparcie dla wielu pokoi w jednym gospodarstwie
- Reużycie profilu użytkownika (raz wypełniony, używany zawsze)
- Historia sesji projektowych
- Porównanie pokoi (bedroom vs living room preferences)

### Advanced Analytics

- Dashboard badawczy dla analityków
- Eksport danych (JSON, CSV)
- Funkcje analizy statystycznej
- Wizualizacje korelacji

### Conversational IDA

- LLM-powered responses (MiniCPM)
- Naturalna konwersacja zamiast statycznych pytań
- Adaptacyjne follow-upy
- Personalizacja na podstawie historii

---

## 📝 Podsumowanie

IDA to **ambitny projekt doktorancki**, który łączy:

- **Psychologię środowiskową** (PRS, biophilia)
- **Psychologię osobowości** (Big Five)
- **Metodologie badań preferencji** (implicit vs explicit)
- **Sztuczną inteligencję** (generacja obrazów, analiza)
- **HCI/UX** (zgamifikowane narzędzia, engaging UX)

**Kluczowa innowacja**: Zamiast tradycyjnych badań laboratoryjnych, projekt buduje **produkt, który użytkownicy chcą używać**, a jednocześnie **naturalnie osadza zwalidowane metodologie badawcze**. To umożliwia zbieranie danych wysokiej jakości z rzeczywistego użycia, co może prowadzić do **wielokrotnych publikacji** z jednej platformy.

**Status**: 85% ukończone, gotowe do testów pilotażowych i zbierania danych.

---

*Ostatnia aktualizacja: Styczeń 2025*  
*Projekt: IDA - AI Interior Design Dialogue Research Platform*  
*Kontekst: Doktorat - Akademia Sztuk Pięknych*






















