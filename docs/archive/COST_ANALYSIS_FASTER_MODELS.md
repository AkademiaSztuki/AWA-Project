> OUTDATED — do not use for thesis. See docs/canon/ and thesis/CANONICAL_SOURCES.md
# Analiza Kosztów z Szybszymi Modelami

## Obecna Konfiguracja

| Model | GPU | Cena/sek | Czas generacji | Jakość |
|-------|-----|----------|----------------|--------|
| **FLUX 2 Dev** | A100 | $0.000583 | 45s (6x 512x512) | ⭐⭐⭐⭐⭐ Najwyższa |
| **Gemma 3 4B-IT** | T4 | $0.000164 | 7s (analiza pokoju) | ⭐⭐⭐⭐ Dobra |

---

## Opcja 1: Zmiana GPU (L4 zamiast A100 dla FLUX)

### L4 GPU - Szybszy i tańszy niż A100
- **Cena**: ~$0.0003/sekundę = $1.08/godzinę (vs A100 $2.10/h)
- **Pamięć**: 24GB (wystarczy dla FLUX 2 Dev 4-bit)
- **Prędkość**: ~1.5-2x szybszy niż A100 dla niektórych modeli
- **Szacowany czas generacji**: 25-30 sekund (vs 45s na A100)

### Koszty dla 500 użytkowników (L4 zamiast A100)

#### Scenariusz Średni (z regeneracją)
| Operacja | GPU | Czas (s) | Koszt (L4) | Koszt (A100) | Oszczędność |
|----------|-----|----------|------------|--------------|-------------|
| generate_previews (pierwsze) | L4 | 30 | $0.00900 | $0.01750 | $0.00850 |
| generate_previews (regeneracja) | L4 | 30 | $0.00900 | $0.01750 | $0.00850 |
| upscale_image | L4 | 15 | $0.00450 | $0.00875 | $0.00425 |
| **TOTAL A100** | | | | **$30.90** | |
| **TOTAL L4** | | | **$16.20** | | **-$14.70** |

**Oszczędność: $14.70 (47% taniej dla operacji A100)**

---

## Opcja 2: Zmiana Modelu (SDXL zamiast FLUX 2 Dev)

### Stable Diffusion XL (SDXL)
- **GPU**: L4 (24GB) - tańszy niż A100
- **Cena GPU**: $0.0003/sekundę
- **Czas generacji**: 15-20 sekund (6x 512x512)
- **Jakość**: ⭐⭐⭐⭐ Dobra (ale niższa niż FLUX 2)
- **Cold start**: ~20 sekund (vs 45s FLUX 2)

### Koszty dla 500 użytkowników (SDXL na L4)

#### Scenariusz Średni (z regeneracją)
| Operacja | GPU | Czas (s) | Koszt | Uwagi |
|----------|-----|----------|-------|-------|
| generate_previews (pierwsze) | L4 | 18 | $0.00540 | 2.5x szybsze |
| generate_previews (regeneracja) | L4 | 18 | $0.00540 | 2.5x szybsze |
| upscale_image | L4 | 12 | $0.00360 | 1.7x szybsze |
| Cold starts | L4 | 20 | $0.00600 | 2.25x szybsze |

**TOTAL SDXL na L4**: ~$10.80 (vs $30.90 A100 FLUX 2)
**Oszczędność: $20.10 (65% taniej!)**

---

## Opcja 3: Zmiana Modelu Vision (LLaVA zamiast Gemma 3)

### LLaVA (Large Language and Vision Assistant)
- **GPU**: T4 (16GB) - ten sam co Gemma
- **Cena GPU**: $0.000164/sekundę (bez zmian)
- **Czas analizy**: 3-5 sekund (vs 7s Gemma)
- **Jakość**: ⭐⭐⭐⭐ Dobra (porównywalna z Gemma)
- **Cold start**: ~8 sekund (vs 15s Gemma)

### Koszty dla 500 użytkowników (LLaVA na T4)

#### Scenariusz Średni
| Operacja | GPU | Czas (s) | Koszt (LLaVA) | Koszt (Gemma) | Oszczędność |
|----------|-----|----------|---------------|---------------|-------------|
| analyzeRoom | T4 | 4 | $0.00066 | $0.00115 | $0.00049 |
| analyzeInspiration (5 obrazów) | T4 | 12 | $0.00197 | $0.00328 | $0.00131 |
| Cold starts | T4 | 8 | $0.00131 | $0.00246 | $0.00115 |

**TOTAL LLaVA**: ~$1.20 (vs $1.89 Gemma)
**Oszczędność: $0.69 (36% taniej)**

---

## Opcja 4: Kombinacja Optymalna (SDXL + LLaVA)

### Konfiguracja
- **Generowanie obrazów**: SDXL na L4
- **Analiza wizji**: LLaVA na T4

### Koszty dla 500 użytkowników

#### Scenariusz Średni (z regeneracją)
| Kategoria | Koszt |
|-----------|-------|
| **T4 (LLaVA)** - Analiza | $1.20 |
| **L4 (SDXL)** - Generowanie | $10.80 |
| **Cold starts** | $0.50 |
| **TOTAL** | **$12.50** |

#### Porównanie z obecną konfiguracją
| Konfiguracja | Koszt | Oszczędność |
|--------------|-------|-------------|
| **Obecna** (FLUX 2 A100 + Gemma T4) | $33.71 | - |
| **Opcja 4** (SDXL L4 + LLaVA T4) | $12.50 | **-$21.21 (63% taniej!)** |

---

## Porównanie Jakości vs Koszt

| Konfiguracja | Jakość obrazów | Jakość analizy | Koszt 500 użytkowników | Oszczędność |
|--------------|----------------|----------------|------------------------|-------------|
| **Obecna** (FLUX 2 A100 + Gemma T4) | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | $33.71 | - |
| **Opcja 1** (FLUX 2 L4 + Gemma T4) | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | $19.01 | -$14.70 (44%) |
| **Opcja 2** (SDXL L4 + Gemma T4) | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | $12.20 | -$21.51 (64%) |
| **Opcja 3** (FLUX 2 A100 + LLaVA T4) | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | $32.82 | -$0.89 (3%) |
| **Opcja 4** (SDXL L4 + LLaVA T4) | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | **$12.50** | **-$21.21 (63%)** |

---

## Szczegółowa Analiza Opcji 4 (SDXL + LLaVA)

### Koszt na użytkownika (scenariusz średni)

| Operacja | GPU | Czas (s) | Koszt |
|----------|-----|----------|-------|
| analyzeRoom | T4 (LLaVA) | 4 | $0.00066 |
| analyzeInspiration (5 obrazów) | T4 (LLaVA) | 12 | $0.00197 |
| generate_previews (pierwsze) | L4 (SDXL) | 18 | $0.00540 |
| generate_previews (regeneracja) | L4 (SDXL) | 18 | $0.00540 |
| upscale_image | L4 (SDXL) | 12 | $0.00360 |
| **TOTAL/użytkownik** | | **66s** | **$0.01703** |

### Koszt dla 500 użytkowników

- **Operacje**: 500 × $0.01703 = $8.52
- **Cold starts**: 
  - L4: 35 × 20s × $0.0003 = $0.21
  - T4: 70 × 8s × $0.000164 = $0.09
- **TOTAL**: **$8.82**

### Z bufferem (+20%)
- **Koszt**: $8.82 × 1.2 = **$10.58**
- **Pozostało z $530**: **$519.42**
- **Wystarczy na**: ~25,000 użytkowników!

---

## Wpływ na Czas Odpowiedzi

| Konfiguracja | Czas preview (6 obrazów) | Czas upscale | Czas analizy pokoju |
|--------------|---------------------------|--------------|---------------------|
| **Obecna** (FLUX 2 A100) | 45s | 20s | 7s |
| **Opcja 4** (SDXL L4) | **18s** ⚡ | **12s** ⚡ | **4s** ⚡ |

**Przyspieszenie: 2.5x dla generowania, 1.75x dla analizy**

---

## Kompromisy

### SDXL vs FLUX 2 Dev

**SDXL Zalety:**
- ✅ 2.5x szybszy
- ✅ 63% tańszy
- ✅ Działa na tańszym GPU (L4)
- ✅ Szybszy cold start

**SDXL Wady:**
- ❌ Nieco niższa jakość obrazów
- ❌ Mniej zaawansowane multi-reference
- ❌ Mniejsza kontrola nad detalami

**FLUX 2 Dev Zalety:**
- ✅ Najwyższa jakość obrazów
- ✅ Zaawansowane multi-reference (do 6 obrazów)
- ✅ Lepsze zrozumienie promptów

**FLUX 2 Dev Wady:**
- ❌ Wolniejszy (45s vs 18s)
- ❌ Droższy GPU (A100 vs L4)
- ❌ Dłuższy cold start

### LLaVA vs Gemma 3

**LLaVA Zalety:**
- ✅ 1.75x szybszy
- ✅ 36% tańszy
- ✅ Szybszy cold start

**LLaVA Wady:**
- ❌ Nieco mniejsza dokładność dla złożonych analiz
- ❌ Mniejsze wsparcie dla języka polskiego (Gemma ma lepsze)

**Gemma 3 Zalety:**
- ✅ Doskonałe wsparcie polskiego
- ✅ Bardziej zaawansowana analiza

**Gemma 3 Wady:**
- ❌ Wolniejszy
- ❌ Dłuższy cold start

---

## Rekomendacje

### Jeśli priorytetem jest **KOSZT**:
✅ **Opcja 4: SDXL (L4) + LLaVA (T4)**
- Oszczędność: **63%** ($21.21)
- Koszt 500 użytkowników: **$12.50**
- Jakość: Dobra (4/5 gwiazdek)

### Jeśli priorytetem jest **JAKOŚĆ**:
✅ **Opcja 1: FLUX 2 (L4) + Gemma 3 (T4)**
- Oszczędność: **44%** ($14.70)
- Koszt 500 użytkowników: **$19.01**
- Jakość: Najwyższa (5/5 gwiazdek)

### Jeśli priorytetem jest **BALANS**:
✅ **Opcja 2: SDXL (L4) + Gemma 3 (T4)**
- Oszczędność: **64%** ($21.51)
- Koszt 500 użytkowników: **$12.20**
- Jakość: Dobra (4/5 gwiazdek) + doskonałe wsparcie polskiego

---

## Wnioski

### Z $530 kredytów możesz obsłużyć:

| Konfiguracja | Użytkowników (z bufferem) |
|--------------|---------------------------|
| **Obecna** (FLUX 2 A100 + Gemma T4) | ~4,700 |
| **Opcja 1** (FLUX 2 L4 + Gemma T4) | ~8,300 |
| **Opcja 2** (SDXL L4 + Gemma T4) | ~21,700 |
| **Opcja 4** (SDXL L4 + LLaVA T4) | **~25,000** 🚀 |

### Rekomendacja Finalna

**Dla 500 użytkowników:**
- **Opcja 4 (SDXL + LLaVA)**: Najlepszy stosunek jakość/cena
- **Koszt**: $12.50 (vs $33.71 obecnie)
- **Oszczędność**: $21.21 (63%)
- **Pozostało**: $517.50 z $530

**Dla większej skali (5000+ użytkowników):**
- **Opcja 1 (FLUX 2 L4)**: Zachowaj jakość, obniż koszty o 44%

