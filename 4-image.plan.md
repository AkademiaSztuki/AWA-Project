# 5-Image Generation Matrix

## Status: ✅ ZAIMPLEMENTOWANE

**Data implementacji:** 29.11.2025

---

## Architektura systemu

### Pięć źródeł promptów

| Image | Źródło | Co zawiera | Status |
|-------|--------|------------|--------|
| 1 | **Implicit** | Tinder swipes + Inspiracje VLM (dane behawioralne) | ✅ |
| 2 | **Explicit** | CoreProfile LUB room-specific preferences | ✅ |
| 3 | **Personality** | Big Five IPIP-NEO-120 z facetami → mapowanie na design | ✅ |
| 4 | **Mixed** | Wszystkie estetyczne źródła (40% implicit, 30% explicit, 30% personality) | ✅ |
| 5 | **Mixed+Functional** | Mixed + dane funkcjonalne z setup/room | ✅ |

---

## Zaimplementowane komponenty

### 1. ✅ `scoring.ts` - Rozszerzone mapowanie Big Five

**Nowe funkcje:**
- `mapBigFiveFacetsToDesignPreferences()` - mapowanie 30 facetów IPIP-NEO-120
- `deriveStyleFromPersonality()` - generuje style z Big Five gdy brak danych estetycznych
- `deriveColorsFromPersonality()` - generuje kolory z Big Five

**Mapowanie osobowości na style:**
```
Wysoka O + Niska C → bohemian eclectic
Wysoka O + Wysoka E → maximalist artistic
Wysoka C + Niska O → minimalist clean
Wysoka C + Wysoka A → Scandinavian
Wysoki N + Wysoka A → cozy hygge
Niska E + Wysoki N → cozy sanctuary
Wysoka E + Wysoka A → open contemporary
```

**Mapowanie osobowości na kolory:**
```
Wysoka E → warm coral, sunny yellow
Niska E → soft gray, muted blue
Wysoka O → deep teal, rich burgundy
Wysoki N → sage green, sky blue (calming)
Wysoka A → blush pink, soft lavender
Wysoka C → crisp white, charcoal
```

### 2. ✅ `modes.ts` - Enum GenerationSource + filterInputsBySource()

**Nowy enum:**
```typescript
export enum GenerationSource {
  Implicit = 'implicit',
  Explicit = 'explicit',
  Personality = 'personality',
  Mixed = 'mixed',
  MixedFunctional = 'mixed_functional'
}
```

**Agresywne filtrowanie danych dla każdego źródła:**
- **Implicit**: zeruje explicit, personality, lifestyle, sensory, PRS, roomVisualDNA, social
- **Explicit**: zeruje implicit, inspirations, personality, PRS, roomVisualDNA, social
- **Personality**: zeruje WSZYSTKO estetyczne - tylko Big Five mapowane na style/kolory
- **Mixed**: zachowuje estetykę, zeruje functional
- **MixedFunctional**: zachowuje wszystko

### 3. ✅ `index.ts` - synthesizeFivePrompts()

```typescript
export async function synthesizeFivePrompts(
  sessionData: SessionData,
  roomType: string,
  options?: SynthesisOptions
): Promise<FivePromptSynthesisResult>
```

**Zwraca:**
- `results` - prompty dla każdego źródła
- `generatedSources` - które źródła miały dane
- `skippedSources` - które pominięte
- `displayOrder` - losowa kolejność dla blind test

### 4. ✅ `useModalAPI.ts` - generateFiveImagesParallel()

```typescript
const generateFiveImagesParallel = async (
  request: MultiSourceGenerationRequest
): Promise<MultiSourceGenerationResponse>
```

Generuje wszystkie 5 obrazów równolegle.

### 5. ✅ `generate/page.tsx` - UI Carousel (tryb testowy)

**Aktualny UI (tryb DEV):**
- Carousel pełnej szerokości ze strzałkami
- Miniaturki na dole
- Widoczne źródło dla każdego obrazu
- Panel DEV z promptami
- Rozwijana sekcja "Pokaż wszystkie prompty"

### 6. ✅ Migracja Supabase

Plik: `20251129000000_generation_matrix_results.sql`

**Tabele:**
- `generation_matrix_results` - wyniki pojedynczych obrazów
- `generation_matrix_sessions` - sesje blind comparison
- `matrix_source_preferences` - view z analityką

---

## Logika filtrowania danych (szczegóły)

### Image 1 (Implicit)
| Dane | Używane |
|------|---------|
| aestheticDNA.implicit | ✅ TAK |
| inspirations | ✅ TAK |
| aestheticDNA.explicit | ❌ ZEROWANE |
| personality | ❌ ZEROWANE |
| lifestyle, sensory | ❌ ZEROWANE |
| PRS (prsCurrent, prsTarget) | ❌ ZEROWANE do (0,0) |
| roomVisualDNA | ❌ ZEROWANE |
| socialContext | ❌ ZEROWANE do 'solo' |

### Image 2 (Explicit)
| Dane | Używane |
|------|---------|
| aestheticDNA.explicit | ✅ TAK |
| lifestyle, sensory | ✅ TAK |
| aestheticDNA.implicit | ❌ ZEROWANE |
| inspirations | ❌ ZEROWANE |
| personality | ❌ ZEROWANE |
| PRS | ❌ ZEROWANE do (0,0) |
| roomVisualDNA | ❌ ZEROWANE |

### Image 3 (Personality)
| Dane | Używane |
|------|---------|
| personality (Big Five + facets) | ✅ TAK → mapowane na style/kolory |
| aestheticDNA | ❌ ZEROWANE (style z personality) |
| inspirations | ❌ ZEROWANE |
| lifestyle, sensory | ❌ ZEROWANE |
| PRS | ❌ ZEROWANE do (0,0) |
| roomVisualDNA | ❌ ZEROWANE |

### Image 4 (Mixed)
| Dane | Używane |
|------|---------|
| aestheticDNA (oba) | ✅ TAK |
| inspirations | ✅ TAK |
| personality | ✅ TAK |
| lifestyle, sensory | ✅ TAK |
| PRS | ✅ TAK |
| activities, painPoints | ❌ ZEROWANE |

### Image 5 (Mixed+Functional)
| Dane | Używane |
|------|---------|
| Wszystko z Mixed | ✅ TAK |
| activities | ✅ TAK |
| painPoints | ✅ TAK |
| PRS gap | ✅ TAK |
| socialContext | ✅ TAK |

---

## Obsługa brakujących danych

- Brak Tinder swipes → Image 1 (Implicit) pomijany
- Brak Big Five → Image 3 (Personality) pomijany
- Brak explicit prefs → Image 2 używa defaults
- Brak functional → Image 5 = Image 4
- **Minimum**: zawsze generuj Mixed (4) + MixedFunctional (5)

---

## Pliki

| Plik | Opis |
|------|------|
| `lib/prompt-synthesis/scoring.ts` | Mapowanie facetów, deriveStyleFromPersonality, deriveColorsFromPersonality |
| `lib/prompt-synthesis/modes.ts` | GenerationSource enum, filterInputsBySource() |
| `lib/prompt-synthesis/index.ts` | synthesizeFivePrompts() |
| `hooks/useModalAPI.ts` | generateFiveImagesParallel() |
| `app/flow/generate/page.tsx` | UI carousel z panelem DEV |
| `supabase/migrations/20251129000000_*.sql` | Tabele dla wyników |
| `GENERATION_MATRIX_5_IMAGES.md` | Dokumentacja |

---

## To-dos

- [x] Rozszerzyć scoring.ts - mapowanie facetów Big Five
- [x] Dodać deriveStyleFromPersonality() i deriveColorsFromPersonality()
- [x] Utworzyć enum GenerationSource w modes.ts
- [x] Zaimplementować filterInputsBySource() z agresywnym zerowaniem
- [x] Dodać synthesizeFivePrompts() w index.ts
- [x] Zaktualizować useModalAPI.ts - generateFiveImagesParallel()
- [x] Zaktualizować generate/page.tsx - UI carousel
- [x] Dodać panel DEV z promptami
- [x] Dodać migrację SQL dla generation_matrix_results
- [x] Utworzyć dokumentację GENERATION_MATRIX_5_IMAGES.md

---

## Następne kroki (opcjonalne)

- [ ] Przełącznik DEV mode on/off (ukrycie promptów w produkcji)
- [ ] Blind comparison mode (ukrycie źródeł)
- [ ] A/B testing różnych wag w Mixed
- [ ] Analytics dashboard dla matrix_source_preferences

---

## Faza 2: Poprawa Jakości i Różnorodności (Six-Image Diversity Recovery)

**Status:** ✅ ZAIMPLEMENTOWANE

**Data implementacji:** 2025-01-XX

### Problem

Prompty generowane dla różnych źródeł były zbyt podobne do siebie, szczególnie:
- **Implicit/Mixed/MixedFunctional** - produkowały identyczne style z tag soup ("bohemian warm earth velvet marble...")
- **Explicit** - używał "social-warmth" zamiast prawdziwego stylu
- **Personality** - fallback był zbyt generyczny ("modern classic")
- **InspirationReference** - nie miał unikalnej struktury promptu

### Zaimplementowane poprawki

#### 1. Normalizacja stylów (`scoring.ts`)

- **VALID_STYLES whitelist** - lista dozwolonych stylów (modern, scandinavian, bohemian, etc.)
- **extractValidStyle()** - wyciąga prawidłowy styl z tag soup
  - "bohemian warm earth velvet marble..." → "bohemian"
- **extractAllValidStyles()** - normalizuje tablice stylów z inspirations

#### 2. Mapowanie Explicit na style (`scoring.ts`)

- **deriveStyleFromExplicit()** - mapuje lifestyle/sensory na style:
  - `lifestyle.vibe: calm` → minimalist
  - `lifestyle.vibe: creative` → eclectic
  - `sensory.texture: cold_metal` → industrial
  - `sensory.texture: smooth_wood` → japandi
  - `sensory.light: warm_low` → scandinavian
  - `sensory.natureMetaphor: ocean` → coastal
  - `sensory.natureMetaphor: forest` → rustic

#### 3. Kolory jako HEX (`scoring.ts`)

- **COLOR_TO_HEX mapa** - konwertuje nazwy kolorów na hex
- **extractValidColors()** - normalizuje kolory do hex kodów
- **Deduplikacja kolorów** - unika duplikatów w palecie

#### 4. Builder produkuje różne prompty (`builder.ts`)

- **normalizeStyle()** - podwójna walidacja stylu (wyciąga z tag soup)
- **ensureHexColor()** - gwarantuje hex kody dla wszystkich kolorów
- **STYLE_OPTIONS integration** - używa definicji stylów do tworzenia bogatych opisów:
  - "Modern: Clean lines, minimalist approach..." zamiast samego "Modern"
- **Source-aware customization**:
  - **InspirationReference** - minimalny prompt bez stylu (style z obrazów)
  - **MixedFunctional** - dodaje `functional_requirements` i `address_pain_points`
  - **Personality** - dodaje `personality_signature` z cechami Big Five

#### 5. Przekazywanie źródła do buildera (`index.ts`)

- **sourceType w SynthesisOptions** - każdy prompt wie, z jakiego źródła pochodzi
- **buildFlux2Prompt()** przyjmuje `sourceType` - umożliwia customizację per źródło

#### 6. Mapowanie danych wejściowych (`input-builder.ts`)

- **selectedStyle mapping** - przekazuje `selectedStyle` z `colorsAndMaterials` do `aestheticDNA.explicit`
- Fallback do `visualDNA.dominantStyle` jeśli `selectedStyle` nie jest dostępne

### Rezultat

Każdy z 6 obrazów w macierzy powinien teraz być wyraźnie inny:

1. **Implicit** - używa znormalizowanych stylów z Tinder swipes (np. "Modern: Clean lines...")
2. **Explicit** - ściśle trzyma się wybranego stylu lub mapuje z lifestyle/sensory
3. **Personality** - używa mapowania Big Five z `personality_signature`
4. **Mixed** - inteligentnie łączy implicit+explicit (np. "Bohemian with Modern accents")
5. **MixedFunctional** - jak Mixed + `functional_requirements` i `address_pain_points`
6. **InspirationReference** - minimalny prompt "Transform using style elements from reference images..."

### Pliki zmodyfikowane

| Plik | Zmiany |
|------|--------|
| `lib/prompt-synthesis/scoring.ts` | VALID_STYLES, extractValidStyle(), deriveStyleFromExplicit(), COLOR_TO_HEX, normalizeColor() |
| `lib/prompt-synthesis/builder.ts` | normalizeStyle(), ensureHexColor(), STYLE_OPTIONS integration, source-aware customization |
| `lib/prompt-synthesis/index.ts` | sourceType w SynthesisOptions, przekazywanie do buildFlux2Prompt() |
| `lib/prompt-synthesis/input-builder.ts` | selectedStyle mapping z colorsAndMaterials |

### Acceptance Criteria

- [x] Każde źródło produkuje unikalny styl (nie "modern" dla wszystkich)
- [x] Style są znormalizowane (nie tag soup)
- [x] Kolory są w formacie HEX
- [x] Explicit używa selectedStyle lub mapuje z lifestyle/sensory
- [x] Mixed łączy implicit+explicit zamiast wybierać tylko jedno
- [x] InspirationReference ma minimalny prompt
- [x] MixedFunctional zawiera functional_requirements
- [x] Personality zawiera personality_signature

### Następne kroki (opcjonalne)

- [ ] Testy jednostkowe dla normalizeStyle() i extractValidStyle()
- [ ] Rozszerzenie VALID_STYLES o więcej stylów jeśli potrzeba
- [ ] Monitoring różnorodności promptów w produkcji
- [ ] A/B testing czy różnorodność poprawia user satisfaction

