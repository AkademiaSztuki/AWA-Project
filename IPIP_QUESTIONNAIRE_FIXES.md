# IPIP-60 Questionnaire Fixes

## Problem Identified

Badanie IPIP-60 zawierało **poważne duplikaty pytań**, szczególnie w sekcjach:
- **Agreeableness** (Ugodowość)
- **Neuroticism** (Neurotyczność)

## Duplikaty Znalezione

### Agreeableness (przed poprawką):
- **"Często czuję się zaniepokojony problemami innych"** - powtórzone **5 razy** (a4, a6, a8, a10, a12)
- **"Lubię być miły dla innych"** - powtórzone **4 razy** (a5, a7, a9, a11)

### Neuroticism (przed poprawką):
- **"Często czuję się zaniepokojony"** - powtórzone **3 razy** (n2, n7, n12)
- **"Często czuję się smutny"** - powtórzone **2 razy** (n3, n8)
- **"Często czuję się zły"** - powtórzone **2 razy** (n4, n9)
- **"Często czuję się niepewnie"** - powtórzone **2 razy** (n5, n10)
- **"Często czuję się przytłoczony"** - powtórzone **2 razy** (n6, n11)

## Wykonane Zmiany

Zastąpiłem wszystkie duplikaty **oryginalnymi pytaniami z badania IPIP** (International Personality Item Pool) autorstwa Goldberga, zapewniając:

### 1. **Openness to Experience** (Otwartość na doświadczenia) - 12 pytań
Zaktualizowano pytania zgodnie z oryginalnymi markerami IPIP:
- Bogaty zasób słownictwa
- Żywa wyobraźnia
- Doskonałe pomysły
- Szybkie rozumienie
- Używanie trudnych słów
- Refleksja
- Pełen pomysłów
- Trudności z abstrakcją (R)
- Brak zainteresowania abstrakcją (R)
- Słaba wyobraźnia (R)
- Trudności z wyobrażaniem (R)
- Brak zainteresowania teorią (R)

### 2. **Conscientiousness** (Sumienność) - 12 pytań
Zaktualizowano do oryginalnych pytań:
- Zawsze przygotowany
- Zwracanie uwagi na szczegóły
- Robienie rzeczy od razu
- Porządek
- Harmonogram
- Wymagający w pracy
- Zostawianie rzeczy (R)
- Bałagan (R)
- Zapominanie o odkładaniu (R)
- Uchylanie się od obowiązków (R)
- Tracenie czasu (R)
- Trudności z rozpoczęciem pracy (R)

### 3. **Extraversion** (Ekstrawersja) - 12 pytań
Zaktualizowano do oryginalnych pytań:
- Dusza towarzystwa
- Komfort wśród ludzi
- Rozpoczynanie rozmów
- Rozmowy na przyjęciach
- Centrum uwagi
- Mało rozmawia (R)
- W tle (R)
- Niewiele do powiedzenia (R)
- Brak zwracania uwagi (R)
- Cichy wśród nieznajomych (R)
- Dużo rozmawia ze znajomymi
- Trudności z nawiązywaniem kontaktu (R)

### 4. **Agreeableness** (Ugodowość) - 12 pytań
**Usunięto wszystkie duplikaty** i zastąpiono oryginalnymi pytaniami:
- Miękkie serce
- Współczucie
- Czucie emocji innych
- Poświęcanie czasu
- Brak troski (R)
- Sprawianie swobody
- Brak zainteresowania innymi (R)
- Obrażanie ludzi (R)
- Brak zainteresowania problemami (R)
- Obojętność na uczucia (R)
- Szacunek dla ludzi
- Uprzejmość dla wszystkich

### 5. **Neuroticism** (Neurotyczność) - 12 pytań
**Usunięto wszystkie duplikaty** i zastąpiono oryginalnymi pytaniami:
- Łatwy stres
- Martwienie się
- Łatwe wyprowadzenie z równowagi
- Łatwe denerwowanie się
- Zmiany nastroju
- Częste huśtawki nastroju
- Łatwa irytacja
- Smutek
- Relaks przez większość czasu (R)
- Rzadko smutek (R)
- Panika
- Brak martwienia się przeszłością (R)

## Wynik Weryfikacji

✅ **60 pytań** w sumie (po 12 na domenę)
✅ **Brak duplikatów** - wszystkie pytania są unikalne
✅ **Poprawna dystrybucja pytań reverse-scored:**
- Openness: 7 forward, 5 reverse
- Conscientiousness: 6 forward, 6 reverse  
- Extraversion: 6 forward, 6 reverse
- Agreeableness: 7 forward, 5 reverse
- Neuroticism: 9 forward, 3 reverse

## Zgodność z Oryginałem

Wszystkie pytania pochodzą z **oficjalnego badania IPIP** (International Personality Item Pool), które jest:
- ✅ Zwalidowane naukowo
- ✅ Szeroko stosowane w badaniach psychologicznych
- ✅ Darmowe i dostępne publicznie
- ✅ Tłumaczone na wiele języków

## Tłumaczenia Polskie

Polskie tłumaczenia zostały dostosowane aby:
- Zachować sens oryginalnych pytań angielskich
- Być naturalne i zrozumiałe dla polskich użytkowników
- Zachować spójność stylistyczną w całym kwestionariuszu

## Plik Zmieniony

- `/workspace/apps/frontend/src/lib/questions/ipip-60.ts`

## Data Poprawek

2025-10-29

## Weryfikacja

Plik został zweryfikowany pod kątem:
- ✅ Brak błędów TypeScript
- ✅ Brak błędów linter
- ✅ Aplikacja kompiluje się poprawnie
- ✅ Wszystkie pytania są unikalne
- ✅ Poprawna liczba pytań (60)
- ✅ Poprawna dystrybucja (12 na domenę)
