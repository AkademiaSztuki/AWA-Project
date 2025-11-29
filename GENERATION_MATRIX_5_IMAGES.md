# 5-Image Generation Matrix

System generowania 5 obrazów wnętrza na podstawie różnych źródeł danych użytkownika, z blind comparison testem do badania preferencji.

## Cel

Zbadać, które źródło danych użytkownika najlepiej przewiduje jego preferencje estetyczne:
- Dane behawioralne (implicit) vs deklarowane (explicit)
- Osobowość (Big Five) vs bezpośrednie wybory
- Mix wszystkich danych vs pojedyncze źródła
- Wpływ danych funkcjonalnych na wybory

## Architektura

### 5 Źródeł Danych (GenerationSource)

| # | Source | Nazwa PL | Opis | Dane |
|---|--------|----------|------|------|
| 1 | `implicit` | Dane behawioralne | Tinder swipes + Inspiracje VLM | `aestheticDNA.implicit`, `inspirations` |
| 2 | `explicit` | Deklarowane preferencje | CoreProfile lub room-specific | `aestheticDNA.explicit`, `lifestyle`, `sensory` |
| 3 | `personality` | Profil osobowości | Big Five IPIP-NEO-120 z facetami | `personality` (domains + facets) |
| 4 | `mixed` | Mix estetyczny | Wszystkie źródła estetyczne | 40% implicit + 30% explicit + 30% personality |
| 5 | `mixed_functional` | Mix + funkcjonalność | Mixed + dane funkcjonalne | Mixed + `activities`, `painPoints`, `PRS gap` |

### Logika Warunkowa (Image 2 - Explicit)

```typescript
if (roomData.preferenceSource === 'complete') {
  // Użyj danych z setup/room
  - semanticDifferential
  - colorsAndMaterials
  - sensoryPreferences
} else {
  // Użyj danych z CoreProfile
  - globalPreferences
}
```

### Mapowanie Big Five na Design (Image 3)

Używamy facetów IPIP-NEO-120 dla precyzyjniejszego mapowania:

| Facet | Wpływ na design |
|-------|-----------------|
| O2 (Aesthetics) | Visual complexity, eclectic mix |
| C2 (Order) | Storage needs, minimalism |
| E1 (Warmth) | Color temperature, cozy textures |
| E5 (Excitement-Seeking) | Bold colors, dynamic patterns |
| A6 (Tender-Mindedness) | Soft textures, organic shapes |
| N1 (Anxiety) | Calming elements, nature |
| N6 (Vulnerability) | Grounding, enclosed spaces |

## Przepływ Użytkownika

### 1. Generowanie (handleMatrixGeneration)

```
1. Synteza 5 promptów → synthesizeFivePrompts(sessionData, roomType)
2. Równoległa generacja → generateFiveImagesParallel(prompts, baseImage)
3. Shuffle kolejności → displayOrder (losowa dla blind test)
4. Wyświetlenie grid 3+2
```

### 2. Blind Comparison

- Obrazy wyświetlane bez etykiet źródła
- Grid: 3 obrazy u góry, 2 u dołu (centered)
- Hover pokazuje tylko "Wizja X"
- Click = wybór

### 3. Reveal

Po wyborze:
1. Animowane podświetlenie wybranego obrazu
2. Reveal źródła z opisem
3. Mini-grid pozostałych obrazów z etykietami
4. Przycisk kontynuacji

## Pliki Kluczowe

### Prompt Synthesis Pipeline

```
apps/frontend/src/lib/prompt-synthesis/
├── index.ts          # synthesizeFivePrompts() - główna funkcja
├── modes.ts          # GenerationSource enum, filterInputsBySource()
├── scoring.ts        # mapBigFiveFacetsToDesignPreferences()
├── builder.ts        # buildPromptFromWeights()
└── input-builder.ts  # buildPromptInputsFromSession()
```

### Hook i UI

```
apps/frontend/src/hooks/useModalAPI.ts   # generateFiveImagesParallel()
apps/frontend/src/app/flow/generate/page.tsx  # UI blind comparison
```

### Supabase

```
apps/frontend/supabase/migrations/
└── 20251129000000_generation_matrix_results.sql

Tabele:
- generation_matrix_results  # Wyniki pojedynczych obrazów
- generation_matrix_sessions # Sesje blind comparison
- matrix_source_preferences  # View z analityką
```

## API

### synthesizeFivePrompts()

```typescript
async function synthesizeFivePrompts(
  sessionData: SessionData,
  roomType: string,
  options?: SynthesisOptions
): Promise<FivePromptSynthesisResult>

interface FivePromptSynthesisResult {
  results: Partial<Record<GenerationSource, SynthesisResult>>;
  generatedSources: GenerationSource[];
  skippedSources: GenerationSource[];
  displayOrder: GenerationSource[];  // Shuffled for blind test
  metadata: {
    totalPrompts: number;
    synthesisTimestamp: string;
    roomType: string;
  };
}
```

### generateFiveImagesParallel()

```typescript
async function generateFiveImagesParallel(
  request: MultiSourceGenerationRequest
): Promise<MultiSourceGenerationResponse>

interface MultiSourceGenerationRequest {
  prompts: Array<{ source: GenerationSource; prompt: string }>;
  base_image?: string;
  style: string;
  parameters: { strength, steps, guidance, image_size };
}
```

## Obsługa Brakujących Danych

| Brak danych | Działanie |
|-------------|-----------|
| Tinder swipes | Image 1 (Implicit) pominięty |
| Big Five | Image 3 (Personality) pominięty |
| Explicit prefs | Image 2 używa defaults |
| Functional data | Image 5 = Image 4 |

**Minimum**: Zawsze generuj Mixed (4) + MixedFunctional (5)

## Analityka

### Supabase View: matrix_source_preferences

```sql
SELECT 
  source_type,
  times_selected,
  times_shown,
  selection_rate_percent,
  avg_selection_time_ms
FROM matrix_source_preferences
ORDER BY selection_rate_percent DESC;
```

### Przykładowy Output

```
source_type      | selected | shown | rate%  | avg_time_ms
-----------------|----------|-------|--------|------------
mixed_functional | 45       | 100   | 45.00  | 8234
implicit         | 28       | 100   | 28.00  | 6521
personality      | 15       | 100   | 15.00  | 9102
explicit         | 8        | 100   | 8.00   | 7845
mixed            | 4        | 100   | 4.00   | 11234
```

## Wagi w Mixed Mode

```typescript
const MIXED_SOURCE_WEIGHTS = {
  implicit: 0.40,     // 40% - najbardziej autentyczne
  explicit: 0.30,     // 30% - świadome deklaracje
  personality: 0.30   // 30% - profil psychologiczny
};
```

## Future Enhancements

1. **A/B Testing różnych wag** - testowanie innych proporcji w Mixed
2. **Personalizowane wagi** - uczenie się preferencji użytkownika
3. **Więcej źródeł** - np. Social (inspiracje znajomych)
4. **Detailed feedback** - ocena każdego obrazu po reveal

