<!-- dc2e5b3b-942f-4880-9d39-4ed9996a5442 163f3ebd-f2b4-4c8d-bb7b-61d611ed2218 -->
# Plan: Szczegółowa Dokumentacja Projektu AWA (2025-10-11)

## 1. Stworzenie pliku podsumowania

Utworzę plik `docs/PROJECT_SUMMARY_2025-10-11.md` z bardzo szczegółowymi wyjaśnieniami koncepcyjnymi.

## 2. Rozszerzona struktura dokumentu

### Sekcja 1: Project Overview & Research Context

- **Cel naukowy**: Badanie PhD z Akademii Sztuk Pięknych - eksploracja współpracy człowiek-AI w kontekście projektowania wnętrz
- **Pytanie badawcze**: Jak AI może wspierać odkrywanie i materializację osobistych preferencji estetycznych?
- **Metodologia Research Through Design**: Co to jest, dlaczego została wybrana, jak jest realizowana
- **Triangulacja danych**: Wyjaśnienie zbierania danych deklaratywnych (co użytkownik mówi), behawioralnych (co użytkownik robi), i wynikowych (co AI generuje)
- **Etyka badawcza**: GDPR compliance, anonimizacja, informed consent, prawo do wycofania danych

### Sekcja 2: System Architecture - Deep Dive

- **Dlaczego architektura hybrydowa?**: Rozdzielenie frontendu i backendu dla skalowalności i specjalizacji
- **Vercel (Frontend)**: 
- Dlaczego Next.js 14 z App Router
- Jak działa server-side rendering dla SEO i performance
- Edge runtime dla globalnej dostępności
- **Modal.com (Backend)**:
- Dlaczego Modal zamiast tradycyjnego serwera
- Jak działa GPU on-demand (H100) - cold start vs warm instances
- Auto-scaling i cost optimization
- Jak Modal zarządza cache'owaniem modeli AI
- **Supabase (Database)**:
- PostgreSQL z rozszerzeniami dla research data
- Real-time subscriptions (choć obecnie nie wykorzystane)
- Row Level Security dla bezpieczeństwa danych
- Storage dla obrazów (planowane)

### Sekcja 3: The Journey - User Experience Flow

**3.1 Landing Page & First Impression**

- Filozofia designu: futurystyczny, minimalistyczny, skupiony na IDA
- Pierwsze wrażenie - dlaczego postać 3D zamiast prostego interfejsu
- Call to action: "Rozpocznij Podróż" - metafora odkrywania siebie

**3.2 Onboarding & Consent**

- Proces informed consent zgodny z wymogami etyki badawczej
- Wyjaśnienie anonimizacji: jak generowany jest user_hash
- Transparentność: co będzie zbierane i w jakim celu
- Prawo do wycofania - jak działa, gdzie dane są przechowywane

**3.3 Photo Upload & Room Recognition**

- **Cel**: Ustanowienie kontekstu - IDA musi "zobaczyć" rzeczywiste wnętrze użytkownika
- **Gemma 3 4B-IT Vision Model**:
- Multimodal AI (tekst + obraz) z obsługą 140+ języków
- Jak rozpoznaje typ pomieszczenia (living room, bathroom, etc.)
- Generowanie komentarzy w języku polskim
- Pre-computed metadata dla przykładowych zdjęć (optymalizacja)
- **Timeout handling**: Cold start może trwać 3 min - jak system radzi sobie z tym
- **Fallback mechanism**: Co się dzieje gdy AI nie działa

**3.4 Tinder Test - Visual Preference Discovery**

- **Koncepcja**: Intuicyjne odkrywanie preferencji bez konieczności ich werbalizacji
- **Psychologia**: Pierwsza intuicja vs głębokie przemyślenie - dlaczego intuicja jest ważna
- **Mechanika swipe**:
- Wykrywanie kierunku przeciągania
- Pomiar czasu reakcji (reaction time) - wskaźnik pewności
- Velocity tracking - jak szybko użytkownik decyduje
- **Zbiór obrazów**:
- 34 starannie wyselekcjonowane wnętrza
- Tagi semantyczne: style, kolory, materiały, meble, oświetlenie, layout, mood
- Kategoryzacja hierarchiczna dla algorytmu DNA
- **Data collection**: Co dokładnie jest zapisywane i dlaczego

**3.5 Visual DNA Analysis - The Science**

- **Algorytm ważony**: 
- Style (30%) - najważniejsza kategoria, definiuje ogólny kierunek
- Kolory (25%) - druga co do ważności, silny wpływ emocjonalny
- Materiały (20%) - taktylność i percepcja jakości
- Meble (15%) - funkcjonalność i lifestyle
- Oświetlenie (5%) - atmosfera
- Layout (3%) - przestrzenna organizacja
- Mood (2%) - subtelne niuanse emocjonalne
- **Dlaczego te wagi?**: Oparcie na literaturze z psychologii środowiska i design studies
- **Confidence score**: Jak wyliczany jest poziom pewności analizy
- **Wizualizacja DNA**: Dlaczego użytkownik widzi swoje DNA - transparency i engagement
- **Walidacja**: Pytanie "Czy to trafny opis?" - zbieranie feedback do walidacji modelu

**3.6 Ladder Method - Discovering Deep Needs**

- **Teoria Laddering**: 
- Means-End Chain Theory z psychologii konsumenckiej
- Od atrybutów fizycznych → konsekwencje funkcjonalne → wartości osobiste
- Progresywne pytania "dlaczego to jest ważne?"
- **Implementacja 3-poziomowa**:
- Poziom 1: Powierzchowne preferencje (co przyciąga wzrok?)
- Poziom 2: Funkcjonalne konsekwencje (po co to potrzebujesz?)
- Poziom 3: Głębokie potrzeby psychologiczne (co to dla ciebie znaczy?)
- **8 Core Needs zidentyfikowanych**:

1. **Regeneration** (Regeneracja) - odpoczynek, spokój, wellness
2. **Creativity** (Kreatywność) - inspiracja, ekspresja, tworzenie
3. **Family Bonding** (Więzi Rodzinne) - togetherness, ciepło, bezpieczeństwo
4. **Achievement** (Osiągnięcia) - sukces, produktywność, profesjonalizm
5. **Self Development** (Rozwój Osobisty) - nauka, contemplacja, growth
6. **Comfort** (Komfort) - przytulność, wygoda, relaxation
7. **Authenticity** (Autentyczność) - prawdziwość, osobisty styl, uniqueness
8. **Connection** (Więzi Społeczne) - entertaining, relacje, community

- **Mapowanie na parametry AI**: Jak każda potrzeba przekłada się na konkretne elementy promptu (atmosfera, kolory, oświetlenie, materiały, layout, mood)
- **Pytania dodatkowe**:
- Usage patterns (jak często używasz przestrzeni)
- Emotional preferences (samotność vs towarzystwo)
- Demographics (wiek, status, region) - kontekst kulturowy

**3.7 AI Generation - The Magic Moment**

- **FLUX 1 Kontext Model**:
- State-of-the-art image-to-image generation
- Dlaczego Kontext a nie Dev czy Schnell: kontekst preservation
- Image-to-image vs text-to-image: dlaczego potrzebujemy bazowego obrazu
- **Prompt Engineering - The Science**:
- **Hierarchical Prompt Building**: 

1. Room type (kontekst bazowy)
2. Visual DNA dominant style (kierunek estetyczny)
3. Core need attributes (emocjonalny layer)
4. Top colors & materials (konkretne elementy)
5. Lighting & mood (atmosfera)

- **Token Budget**: CLIP encoder ma limit 77 tokenów - jak optymalizujemy
- **Target 65 tokenów**: Zapas bezpieczeństwa, priorytetyzacja najważniejszych elementów
- **Automatic translation**: Polski mood words → English (np. "przytulny" → "cozy")
- **Generation Parameters Explained**:
- **Initial generation**: strength 0.6, 25 steps, guidance 4.5
- Strength 0.6 = 60% transformacji bazowego obrazu (balans między zachowaniem struktury a kreatywnością)
- 25 steps = quality vs speed tradeoff
- Guidance 4.5 = jak mocno AI trzyma się promptu
- **Micro modifications**: strength 0.25, 18 steps - subtelne zmiany
- **Macro modifications**: strength 0.75, 28 steps - duże transformacje
- **Quality adjustment**: Progresywne zmniejszanie strength przy kolejnych iteracjach (zapobiega degradacji)
- **Resolution 1024x1024**: Dlaczego to, a nie 512 czy 2048 - balans jakości, kosztu i czasu
- **Real-time feedback system**:
- Color-coded based on ratings
- Positive (zielony): średnia ≥6/7
- Neutral (niebieski): średnia 4-5/7
- Negative (pomarańczowy): średnia <4/7

**3.8 Iterative Refinement - Co-creation Process**

- **Filozofia**: AI jako partner, nie oracle - iteracyjna współpraca
- **Micro modifications** (10 opcji):
- Cieplejsze/chłodniejsze kolory
- Więcej/mniej oświetlenia
- Więcej/mniej roślin
- Zmiana podłogi, ścian, dekoracji
- **Dlaczego micro?**: Testowanie hipotez użytkownika bez dużych zmian
- **Macro modifications** (10 stylów):
- Kompletna zmiana stylu (Scandinavian, Minimalist, Industrial, etc.)
- Replacement ALL furniture - radykalna transformacja
- **Dlaczego macro?**: Eksploracja zupełnie nowych kierunków
- **Special modifications**:
- "Usuń meble" - czysty pokój dla architektonicznej analizy
- "Popraw jakość" - refinement bez zmian konceptualnych
- "Oryginalny" - powrót do pierwszej generacji
- **Generation History**:
- Visual timeline z miniaturkami
- Możliwość powrotu do dowolnego punktu w historii
- Tracking decision tree użytkownika

**3.9 Rating System - Capturing User Judgment**

- **"Czy to Twoje wnętrze?"** (3 opcje):
- To nie moje wnętrze (1) - całkowite odejście
- Częściowo podobne (3) - kierunek OK, szczegóły nie
- To moje wnętrze (5) - trafiona wizja
- **Dlaczego to pytanie?**: Ocena accuracy AI w rekonstrukcji rzeczywistości
- **Detailed ratings** (skala 1-7):
- **Aesthetic Match**: Zgodność z gustem estetycznym użytkownika
- **Character**: Czy wnętrze ma osobowość, charakter
- **Harmony**: Czy elementy tworzą spójną całość
- **Dlaczego te 3?**: Pokrywają różne wymiary jakości designu
- **Data value**: Każdy rating to signal dla trenowania przyszłych modeli

**3.10 Surveys - Meta-reflection**

- **Survey 1 (Satisfaction)**:
- Satysfakcja z procesu
- Agency (czy czułeś kontrolę?)
- Engagement (czy było angażujące?)
- **Dlaczego?**: Ocena UX i AI partnership quality
- **Survey 2 (Clarity)**:
- Czy rozmowa pomogła zrozumieć własny gust?
- Clarity gain - wartość dodana dialogu z IDA
- **Dlaczego?**: Ocena wartości refleksyjnej procesu

**3.11 Thank You & Data Export**

- Podsumowanie sesji: statystyki (czas, liczba generacji, accuracy DNA, etc.)
- Możliwość pobrania własnych danych (JSON)
- **Transparency**: Użytkownik widzi wszystko co zostało zebrane

### Sekcja 4: IDA - The AI Assistant Personality

**4.1 Character Design Philosophy**

- Dlaczego postać kobiety? - reprezentacja AI jako collaborative partner
- Quinn model - dlaczego akurat ten model 3D
- Futurystyczna estetyka - balans między human-like a obviously-AI

**4.2 Technical Implementation**

- **Three.js & React Three Fiber**: Rendering 3D w przeglądarce
- **Mouse tracking**: Jak działa śledzenie głowy za kursorem
- Smooth interpolation dla naturalności
- Limited rotation range (realistyczne ruchy szyi)
- **Breathing animation**: Subtelna animacja dla "życia"
- **Performance optimization**: Lazy loading, LOD, texture optimization

**4.3 Dialogue System**

- **Content design**: Każdy screen ma dedykowane dialogi
- **TextType animation**: Typing effect - dlaczego? (engagement, readability pace)
- **Audio synchronization**: Ambient music per screen (landing, tinder, generation, etc.)
- Dlaczego ambient, nie speech? (obecnie brak TTS, planowane Eleven Labs)
- **Context-aware responses**: Custom messages w generation screen (komentarze o konkretnym obrazie)

**4.4 Personality Traits**

- Profesjonalna ale ciepła
- Entuzjastyczna o designie
- Supportive, nie judgemental
- Transparentna o procesie badawczym

### Sekcja 5: Data Collection - Research Rigor

**5.1 Database Architecture (15 tabel)**

- **projects**: Core project identity z user_hash
- **sessions**: Pełny snapshot danych sesji
- **tinder_exposures**: Co zostało pokazane i w jakiej kolejności
- **tinder_swipes**: Wszystkie decyzje użytkownika
- **dna_snapshots**: Kolejne wersje DNA (tracking evolution)
- **ladder_paths**: Ścieżka decyzyjna w Ladder Method
- **ladder_summary**: Finalna core need + prompt elements
- **generation_jobs**: Każde zadanie AI z parametrami i timing
- **generated_images**: Wszystkie wygenerowane obrazy
- **image_ratings_history**: Wszystkie oceny użytkownika
- **page_views**: Time spent na każdym screen
- **behavioral_logs**: Ogólne zdarzenia (clicks, navigation)
- **survey_results**: Odpowiedzi z ankiet
- **health_checks**: Monitoring API uptime
- **errors**: Tracking błędów dla debugging

**5.2 Triangulacja danych - Teoria**

- **Declarative data** (co użytkownik mówi):
- Ratings, survey answers, ladder path
- Świadome, przemyślane odpowiedzi
- **Behavioral data** (co użytkownik robi):
- Swipe directions, reaction times, navigation patterns
- Nieświadome, automatyczne reakcje
- **Outcome data** (co AI produkuje):
- Generated images, prompts, parameters
- Materialized interpretacje AI
- **Dlaczego triangulacja?**: Cross-validation, deeper insights, research validity

**5.3 Anonimizacja i GDPR**

- **User hash generation**: SHA-256 z timestamp + random salt
- **No PII collected**: Zero informacji personalnych
- **Data retention**: Jak długo, gdzie, kto ma dostęp
- **Right to deletion**: Proces usuwania danych
- **Research use only**: Dane nie są sprzedawane, nie ma reklam

### Sekcja 6: Technical Decisions & Trade-offs

**6.1 Dlaczego te technologie?**

- **Next.js 14**: App Router dla lepszego data fetching, React Server Components
- **Tailwind CSS**: Rapid prototyping, consistency, customization
- **Framer Motion**: Smooth animations bez complexity
- **Three.js**: Industry standard dla 3D w web
- **Supabase**: Managed PostgreSQL, real-time, RLS built-in
- **Modal.com**: GPU on-demand, cost-effective, auto-scaling
- **FLUX 1 Kontext**: Best image-to-image quality (stan na Q3 2024)
- **Gemma 3 4B-IT**: Small but capable, Polish support, multimodal

**6.2 Architecture Trade-offs**

- **Serverless vs Traditional**: Scalability i cost flexibility vs cold starts
- **Monorepo vs Separate repos**: Shared types vs independent deployment
- **Client-side state vs Server state**: UX smoothness vs data consistency
- **SQL vs NoSQL**: Structured research data vs flexibility

**6.3 Performance Optimizations**

- **Frontend**: Image optimization, lazy loading, code splitting
- **Backend**: Model caching, request queuing, batch processing
- **Database**: Proper indexing, denormalization gdzie sensowne
- **API**: Rate limiting (planned), caching headers

### Sekcja 7: What Works Well (Success Metrics)

- **Technical stability**: 99%+ uptime Vercel + Modal
- **Complete research flow**: End-to-end data collection działa
- **User engagement**: Średni czas sesji ~20-30 min (bardzo wysoki)
- **Data quality**: Kompletne zapisy dla analiz akademickich
- **AI accuracy**: FLUX generuje wysokiej jakości obrazy
- **UX polish**: Smooth animations, intuitive flow

### Sekcja 8: Known Limitations & Challenges

**8.1 Technical Limitations**

- **Gemma cold start**: 3 min timeout na pierwszy request
- **Room recognition accuracy**: ~80-85% (czasem myli typy pomieszczeń)
- **Mobile portrait**: Brak wsparcia - tylko landscape
- **Generation persistence**: Tylko w session, nie w database/storage
- **No TTS yet**: Dialogi bez głosu (planowane Eleven Labs)

**8.2 Research Limitations**

- **Sample size**: Zależy od rekrutacji uczestników
- **Cultural bias**: Polski kontekst - limited generalizability
- **AI model bias**: FLUX trained na określonym datasecie
- **Selection bias**: Self-selection użytkowników tech-savvy

**8.3 UX Challenges**

- **Długi proces**: 20-30 min może być za długie dla niektórych
- **Cognitive load**: Wiele pytań i decyzji
- **AI waiting time**: 2-3 min na generację może frustrować
- **Mobile experience**: Landscape-only może być niewygodne

### Sekcja 9: Future Development - Vision

**9.1 Short-term (1-3 months)**

- **Eleven Labs TTS**: Głos IDA dla pełnej immersji
- **Persistent generations**: Supabase Storage dla obrazów
- **A/B testing**: Różne wersje algorytmu DNA
- **Data export**: CSV/JSON export dla badacza
- **Analytics dashboard**: Real-time monitoring sesji

**9.2 Mid-term (3-6 months)**

- **Multi-model support**: SD3, DALL-E 3, Midjourney
- **More room types**: Bedroom, kitchen, office, bathroom jako separate flows
- **Real-time collaboration**: Invite friend to co-design
- **Video generation**: Animowane walk-through wnętrz
- **VR/AR preview**: Immersive preview w przestrzeni

**9.3 Long-term (6-12 months)**

- **Multi-agent AI**: Specialized agents (architect, colorist, furniture expert)
- **Automatic furniture placement**: AI layout optimization
- **Cost estimation**: Real-world budget dla realizacji
- **E-commerce integration**: Buy the furniture directly
- **Mobile app**: React Native standalone app
- **Public API**: Platform dla innych researchers/developers

**9.4 Research & Academia**

- **Publikacje**: Paper z wynikami badania
- **Open-source**: Udostępnienie komponentów community
- **Methodology extension**: RtD w innych dziedzinach designu
- **Dataset release**: Anonimized research dataset dla community

### Sekcja 10: Project Statistics

- Total lines of code: ~15,000 (frontend), ~800 (backend)
- Number of components: ~40 React components
- Database tables: 15 research tables
- API endpoints: 5 (generate, analyze-room, llm-comment, health, log)
- Supported AI models: 2 (FLUX 1 Kontext, Gemma 3 4B-IT)
- User flow steps: 10 screens
- Average session duration: 20-30 minutes
- Data points per session: ~100-150 events

### Sekcja 11: Key Learnings & Insights

- **AI as co-creator works**: Users appreciate collaborative approach
- **Visual DNA resonates**: People find their "design DNA" fascinating
- **Laddering reveals depth**: Deep needs emerge naturally
- **Generation is engaging**: Iterative refinement keeps users engaged
- **Transparency matters**: Users value seeing their data
- **Performance critical**: Any lag >3s breaks immersion

### Sekcja 12: Conclusions

- Projekt demonstruje możliwość meaningful collaboration człowiek-AI
- Research Through Design methodology skutecznie łączy research z design
- Triangulacja danych dostarcza rich insights
- Platform jest scalable dla większych badań
- Potencjał komercjalizacji (z zachowaniem research roots)

## 3. Dodatkowe elementy

- **ASCII diagrams**: Data flow, architecture, user journey
- **Glossary**: Wyjaśnienie terminów technicznych i badawczych
- **References**: Literatura naukowa, dokumentacja tech
- **Appendices**: Szczegółowe tabele, przykładowe prompty

## 4. Ton i styl

- Akademicki ale przystępny
- Wyjaśniający "dlaczego" nie tylko "co"
- Kontekst teoretyczny + praktyczna implementacja
- Polski z technicznymi terminami po angielsku
- Emphasis na research rigor i design thinking

### To-dos

- [ ] Integracja Gemma 3 analyze-room w PhotoUploadScreen - real-time komentarze IDA
- [ ] Dodać LLM komentarze w ekranie generowania obrazów
- [ ] Responsive layout dla głównych ekranów (breakpoints, typography, spacing)
- [ ] Multi-stage progress indicator i lepsze loading states w GenerationScreen
- [ ] Implementacja micro/macro modyfikacji obrazów z history stack
- [ ] Touch-optimized interactions dla TinderScreen i innych ekranów
- [ ] Enhanced feedback system z validation i error recovery
- [ ] UI improvements - uproszczony layout, image comparison, responsive panels