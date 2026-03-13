# Analiza Kosztów dla 500 Użytkowników (Zaktualizowana)

## ⚠️ WAŻNE: Uwzględniono Cold Starts i Regeneracje

## Ceny GPU w Modal Labs (2024-2025)
  
| GPU | Cena za sekundę | Cena za godzinę |
|-----|----------------|-----------------|
| **A100 (40GB)** | $0.000583 | $2.10/h |
| **T4 (16GB)** | $0.000164 | $0.59/h |

---

## Cold Starts (Ładowanie Modeli)

### Flux A100 - Cold Start
- **Czas ładowania modelu**: 30-60 sekund (średnio **45 sekund**)
- **Kiedy występuje**: 
  - Pierwszy użytkownik w sesji (kontener wyłączony)
  - Po `scaledown_window=600s` (10 min) bezczynności
- **Koszt cold start**: 45s × $0.000583 = **$0.02624**

### Gemma T4 - Cold Start
- **Czas ładowania modelu**: 10-20 sekund (średnio **15 sekund**)
- **Kiedy występuje**: 
  - Pierwszy użytkownik w sesji (kontener wyłączony)
  - Po `scaledown_window=120s` (2 min) bezczynności
- **Koszt cold start**: 15s × $0.000164 = **$0.00246**

**Uwaga**: Cold start jest **dzielony między użytkowników** jeśli requesty przychodzą równolegle (dzięki `@modal.concurrent`)

---

## Operacje na użytkownika

### 1. Analiza Pokoju (Gemma T4)
- **Operacja**: `analyzeRoom` - analiza zdjęcia pokoju
- **GPU**: T4
- **Szacowany czas**: 5-10 sekund
- **Średni czas**: **7 sekund**
- **Koszt**: 7s × $0.000164 = **$0.00115**

### 2. Analiza Inspiracji (Gemma T4) - OPCJONALNE
- **Operacja**: `analyzeInspiration` - analiza inspiracji (max 10 obrazów)
- **GPU**: T4
- **Szacowany czas**: 3-5 sekund na obraz
- **Średni czas na obraz**: **4 sekundy**
- **Maksymalnie**: 10 obrazów = 40 sekund
- **Założenie**: 70% użytkowników dodaje inspiracje, średnio 5 obrazów = **20 sekund/użytkownik**
- **Koszt**: 20s × $0.000164 = **$0.00328**

### 3. Generowanie Preview (Flux A100)
- **Operacja**: `generate_previews` - 6 obrazów 512x512, 20 steps
- **GPU**: A100
- **Szacowany czas**: 30-60 sekund dla 6 obrazów równolegle
- **Średni czas**: **45 sekund**
- **Koszt**: 45s × $0.000583 = **$0.02624**

### 4. Upscale (Flux A100) - OPCJONALNE
- **Operacja**: `upscale_image` - 1 obraz 1536x1536, 35 steps
- **GPU**: A100
- **Szacowany czas**: 15-30 sekund
- **Średni czas**: **20 sekund**
- **Założenie**: 80% użytkowników upscalowuje wybrany obraz = **16 sekund/użytkownik**
- **Koszt**: 20s × $0.000583 = **$0.01166**

### 5. Regeneracje (Flux A100) - DODATKOWE
- **Operacja**: `generate_previews` - ponowne generowanie 6 obrazów
- **GPU**: A100
- **Czas**: **45 sekund** (jak wyżej)
- **Założenie**: 
  - 60% użytkowników regeneruje **1 raz** (nie są zadowoleni z wyników)
  - 20% użytkowników regeneruje **2 razy** (szukają idealnego wariantu)
  - 20% użytkowników **nie regeneruje**
- **Średnia regeneracji na użytkownika**: 0.6 × 1 + 0.2 × 2 = **1.0 regeneracji**
- **Koszt regeneracji**: 1.0 × 45s × $0.000583 = **$0.02624/użytkownik**

### 6. Modyfikacje (Flux A100) - OPCJONALNE
- **Operacja**: `generate_previews` z modyfikacjami (micro modifications)
- **GPU**: A100
- **Czas**: **45 sekund**
- **Założenie**: 30% użytkowników modyfikuje obrazy **1 raz** (np. "więcej roślin", "jaśniejsze kolory")
- **Koszt modyfikacji**: 0.3 × 45s × $0.000583 = **$0.00787/użytkownik**

---

## Koszt na użytkownika (BEZ cold startów - są dzielone)

### Scenariusz Minimalny (bez inspiracji, bez upscale, bez regeneracji)
| Operacja | GPU | Czas (s) | Koszt |
|----------|-----|----------|-------|
| analyzeRoom | T4 | 7 | $0.00115 |
| generate_previews | A100 | 45 | $0.02624 |
| **TOTAL** | | **52s** | **$0.02739** |

### Scenariusz Średni (z inspiracjami, z upscale, z regeneracją)
| Operacja | GPU | Czas (s) | Koszt |
|----------|-----|----------|-------|
| analyzeRoom | T4 | 7 | $0.00115 |
| analyzeInspiration (5 obrazów) | T4 | 20 | $0.00328 |
| generate_previews (pierwsze) | A100 | 45 | $0.02624 |
| generate_previews (regeneracja) | A100 | 45 | $0.02624 |
| upscale_image | A100 | 20 | $0.01166 |
| **TOTAL** | | **137s** | **$0.06857** |

### Scenariusz Maksymalny (10 inspiracji, z upscale, 2x regeneracja, modyfikacje)
| Operacja | GPU | Czas (s) | Koszt |
|----------|-----|----------|-------|
| analyzeRoom | T4 | 7 | $0.00115 |
| analyzeInspiration (10 obrazów) | T4 | 40 | $0.00656 |
| generate_previews (pierwsze) | A100 | 45 | $0.02624 |
| generate_previews (regeneracja 1) | A100 | 45 | $0.02624 |
| generate_previews (regeneracja 2) | A100 | 45 | $0.02624 |
| generate_previews (modyfikacja) | A100 | 45 | $0.02624 |
| upscale_image | A100 | 20 | $0.01166 |
| **TOTAL** | | **227s** | **$0.14333** |

---

## Koszt dla 500 użytkowników

### Cold Starts (dzielone między użytkowników)

**Założenie**: Użytkownicy przychodzą w grupach (np. 10-20 równolegle), więc cold start jest dzielony.

#### Flux A100 Cold Starts
- **Liczba cold startów**: ~25-50 (w zależności od rozłożenia w czasie)
- **Średnio**: **35 cold startów** (500 użytkowników / ~14 równoległych requestów)
- **Koszt cold startów**: 35 × $0.02624 = **$0.92**

#### Gemma T4 Cold Starts
- **Liczba cold startów**: ~50-100 (Gemma ma krótszy scaledown_window=120s)
- **Średnio**: **70 cold startów** (częstsze wyłączanie kontenera)
- **Koszt cold startów**: 70 × $0.00246 = **$0.17**

**TOTAL Cold Starts**: $0.92 + $0.17 = **$1.09**

---

### Scenariusz Minimalny (bez inspiracji, bez upscale, bez regeneracji)
- **Koszt/użytkownik**: $0.02739
- **Koszt 500 użytkowników**: $13.70
- **Cold starts**: $1.09
- **TOTAL**: **$14.79**

### Scenariusz Średni (realistyczny - z regeneracją)
- **Koszt/użytkownik**: $0.06857
- **Koszt 500 użytkowników**: $34.29
- **Cold starts**: $1.09
- **TOTAL**: **$35.38**

### Scenariusz Maksymalny (10 inspiracji, 2x regeneracja, modyfikacje)
- **Koszt/użytkownik**: $0.14333
- **Koszt 500 użytkowników**: $71.67
- **Cold starts**: $1.09
- **TOTAL**: **$72.76**

---

## Rozkład kosztów według GPU

### Scenariusz Średni (500 użytkowników) - Z REGENERACJĄ

#### T4 (Gemma) - Analiza pokoju + inspiracji
- analyzeRoom: 500 × 7s = 3,500 sekund
- analyzeInspiration: 350 użytkowników × 20s = 7,000 sekund
- **Total T4**: 10,500 sekund = 2.92 godziny
- **Koszt T4 (operacje)**: 10,500s × $0.000164 = **$1.72**
- **Cold starts T4**: $0.17
- **TOTAL T4**: **$1.89**

#### A100 (Flux) - Generowanie obrazów + regeneracje
- generate_previews (pierwsze): 500 × 45s = 22,500 sekund
- generate_previews (regeneracja): 500 × 45s = 22,500 sekund (średnio 1x na użytkownika)
- upscale_image: 400 użytkowników × 20s = 8,000 sekund
- **Total A100**: 53,000 sekund = 14.72 godziny
- **Koszt A100 (operacje)**: 53,000s × $0.000583 = **$30.90**
- **Cold starts A100**: $0.92
- **TOTAL A100**: **$31.82**

#### **TOTAL**: $1.89 + $31.82 = **$33.71**

---

## Podsumowanie (ZAKTUALIZOWANE)

### ⚠️ Czy $530 wystarczy?

#### Scenariusz Średni (realistyczny - z regeneracją)
- **Koszt**: **$35.38**
- **Pozostało**: $494.62
- **Zapas**: **93.3%** ✅

#### Scenariusz Maksymalny (10 inspiracji, 2x regeneracja, modyfikacje)
- **Koszt**: **$72.76**
- **Pozostało**: $457.24
- **Zapas**: **86.3%** ✅

### ✅ WNIOSEK: $530 WYSTARCZY, ale z mniejszym zapasem niż wcześniej szacowano

**Różnica w kosztach:**
- **Poprzednia analiza**: $19.50 - $22.81
- **Zaktualizowana analiza**: $35.38 - $72.76
- **Różnica**: +$12.88 do +$49.95 (cold starts + regeneracje)

---

## Dodatkowe czynniki kosztowe

### Cold Starts (pierwsze uruchomienie kontenera)
- **Flux A100**: ~30-60 sekund ładowania modelu (raz na kontener)
- **Gemma T4**: ~10-20 sekund ładowania modelu (raz na kontener)
- **Wpływ**: Minimalny przy 500 użytkownikach (kontenery będą aktywne)

### Model Caching (Modal Volume)
- ✅ **Już zaimplementowane** - modele są cache'owane w Volume
- **Koszt**: $0 (Volume storage jest wliczony w koszt GPU)

### Concurrent Processing
- ✅ **Zoptymalizowane** - `@modal.concurrent(max_inputs=6)` dla Flux, `max_inputs=10` dla Gemma
- **Efekt**: Wszystkie requesty w jednym kontenerze = **znaczne oszczędności**

---

## Rekomendacje (ZAKTUALIZOWANE)

1. **Monitoruj rzeczywiste koszty** - użyj Modal dashboard do śledzenia
   - **Krytyczne**: Śledź liczbę regeneracji i cold startów

2. **Optymalizuj scaledown_window** 
   - **Flux**: Obecnie 600s (10 min) - **ZWIĘKSZ do 1200s (20 min)** jeśli użytkownicy często regenerują
   - **Gemma**: Obecnie 120s (2 min) - **ZWIĘKSZ do 300s (5 min)** aby zmniejszyć cold starts
   - **Efekt**: Mniej cold startów = oszczędność ~$0.50-1.00

3. **Ogranicz regeneracje** (opcjonalnie)
   - Limit regeneracji: max 2-3 na użytkownika
   - **Oszczędność**: ~$5-10 dla 500 użytkowników

4. **Cache'uj wyniki analizy pokoju** - jeśli ten sam pokój jest analizowany wielokrotnie
   - **Oszczędność**: ~$0.50-1.00

5. **Batch processing** - rozważ batch'owanie analizy inspiracji jeśli możliwe
   - **Oszczędność**: Minimalna (już zoptymalizowane przez concurrent)

---

## Szacunki z marginesem błędu (ZAKTUALIZOWANE)

### Scenariusz Średni z bufferem (+20%)
- **Koszt**: $35.38 × 1.2 = **$42.46**
- **Pozostało**: $487.54
- **Wystarczy na**: ~5,900 użytkowników (11.8× więcej!)

### Scenariusz Średni z dużym bufferem (+50%)
- **Koszt**: $35.38 × 1.5 = **$53.07**
- **Pozostało**: $476.93
- **Wystarczy na**: ~4,700 użytkowników (9.4× więcej!)

### Scenariusz Maksymalny z bufferem (+20%)
- **Koszt**: $72.76 × 1.2 = **$87.31**
- **Pozostało**: $442.69
- **Wystarczy na**: ~2,900 użytkowników (5.8× więcej!)

---

## Wnioski (ZAKTUALIZOWANE)

### ⚠️ **$530 kredytów wystarczy na 500 użytkowników, ale z mniejszym zapasem**

**Realistyczny koszt (z regeneracją):**
- **$35.38** (scenariusz średni)
- **$72.76** (scenariusz maksymalny)

**Pozostało:**
- **$494.62** (scenariusz średni)
- **$457.24** (scenariusz maksymalny)

**Możesz obsłużyć:**
- **~4,700 - 5,900 użytkowników** (scenariusz średni z bufferem)
- **~2,900 użytkowników** (scenariusz maksymalny z bufferem)

### 📊 Główne czynniki kosztowe:
1. **Regeneracje**: +$13.12 (37% kosztów)
2. **Cold starts**: +$1.09 (3% kosztów)
3. **Upscale**: +$4.66 (13% kosztów)
4. **Inspiracje**: +$1.64 (5% kosztów)

### 💡 Rekomendacje:
- **Zwiększ `scaledown_window`** dla Flux do 1200s (20 min) - oszczędność ~$0.50
- **Rozważ limit regeneracji** (max 2-3) - oszczędność ~$5-10
- **Monitoruj rzeczywiste użycie** - Modal dashboard pokaże dokładne koszty

