---
name: prompt-engineering
description: Prompt engineering for FLUX AI image generation in AWA project. Use when creating or modifying prompts, working with personality-based style derivation, facet mapping, or prompt synthesis. Covers facet-derivation.ts, scoring.ts, data-quality.ts, and research-mappings.
---

# Prompt Engineering for AWA Project

## Architecture

Prompts are synthesized from multiple data sources:
1. **Personality data** (Big Five + facets) → Style derivation
2. **Implicit preferences** (Tinder swipes) → Visual DNA
3. **Explicit preferences** (semantic differentials, surveys)
4. **Room context** (photos, room analysis)
5. **Inspiration images** (uploaded by user)

## Key Files

### `facet-derivation.ts`
Maps personality to design styles using IPIP-NEO-120 facets.

**Core function:**
```typescript
import { deriveStyleFromFacets } from '@/lib/prompt-synthesis/facet-derivation';

const derivation = deriveStyleFromFacets({
  openness: 75,
  conscientiousness: 60,
  extraversion: 80,
  agreeableness: 70,
  neuroticism: 40,
  facets: {
    O: { 1: 80, 2: 70, ... }, // 6 facets per domain
    C: { 1: 60, ... },
    // ...
  }
});

// Returns:
// - dominantStyle: string
// - confidence: number (0-1)
// - materials: string[]
// - complexity: number
// - researchBasis: string
```

**Style mapping logic:**
- Uses `BIGFIVE_STYLE_MAPPINGS` from `research-mappings.ts`
- Each mapping has conditions (e.g., `O1: ">0.65"`, `C: "0.4-0.6"`)
- Calculates match score based on condition fulfillment
- Prefers facet-level matches over domain-level
- Penalizes default mappings when facets are available

### `scoring.ts`
Combines all data sources into final prompt.

**Input structure:**
```typescript
interface PromptInputs {
  personality?: PersonalityData;
  visualDNA?: VisualDNA;
  explicitPreferences?: ExplicitPreferences;
  roomContext?: RoomContext;
  inspirations?: InspirationImage[];
}
```

**Scoring factors:**
- Personality → Style (via facet-derivation)
- Visual DNA → Colors, materials, complexity
- Explicit → Overrides and refinements
- Room context → Constraints and adaptations
- Inspirations → Style references

### `data-quality.ts`
Validates and scores data quality for prompt synthesis.

## Prompt Structure

Final prompts follow this structure:

```
[STYLE] interior design, [MATERIALS], [COLORS], [COMPLEXITY level], 
[ROOM TYPE], [ACTIVITIES], [MOOD], [BIOPHILIA elements], 
[CONSTRAINTS from room analysis], [INSPIRATION references]
```

## Common Patterns

### 1. Personality-Based Style

```typescript
const derivation = deriveStyleFromFacets(personalityData);
const stylePrompt = `${derivation.dominantStyle} interior design`;
const materialsPrompt = derivation.materials.join(', ');
const complexityPrompt = `complexity level: ${derivation.complexity}`;
```

### 2. Combining Multiple Sources

```typescript
import { synthesizePrompt } from '@/lib/prompt-synthesis/scoring';

const prompt = await synthesizePrompt({
  personality: bigFiveData,
  visualDNA: tinderResults,
  explicitPreferences: surveyAnswers,
  roomContext: roomAnalysis,
  inspirations: uploadedImages
});
```

### 3. Handling Missing Data

- If no personality: Use neutral/default style
- If no swipes: Skip implicit preferences
- If no room photo: Use generic room description
- Always provide fallbacks

## Research Mappings

Style mappings are based on validated research:
- Each mapping has `researchBasis` citation
- Conditions use facet numbers (O1-O6, C1-C6, etc.)
- Confidence multipliers adjust final confidence
- Materials and complexity are derived from style

## Debugging

Agent logging is embedded throughout:
- Logs top 5 style mappings with scores
- Logs condition matches/failures
- Logs fallback scenarios
- Check `#region agent log` blocks for debugging

## Best Practices

1. **Always check confidence** - Low confidence (<0.5) may need fallback
2. **Prefer facets over domains** - More precise when available
3. **Combine sources** - Don't rely on single data source
4. **Validate inputs** - Use data-quality checks before synthesis
5. **Log decisions** - Use agent logging for debugging
