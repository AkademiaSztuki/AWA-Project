# Audit: Source Differentiation in Scoring

## Problem Found: Biophilia ✅ FIXED
- **Issue**: All sources used default `biophiliaScore` (explicit), ignoring `sourceType`
- **Fix**: Added `switch` statement to use correct biophilia data per source
- **Status**: ✅ Fixed in `scoring.ts` lines 237-287

## Checked: PRS Gap Analysis
- **Status**: ✅ OK
- **Reason**: PRS is zeroed in `modes.ts` for Implicit, Explicit, Personality sources
- **Behavior**: When PRS = (0,0) and target = (0,0), gap = 0, so all needs = 0 (correct)
- **Note**: Added logging to track PRS values per source

## Checked: Style Integration
- **Status**: ✅ OK
- **Differentiation**:
  - Implicit: Uses only `aestheticDNA.implicit.dominantStyles`
  - Explicit: Uses only `aestheticDNA.explicit.selectedStyle` or `selectedPalette`
  - Personality: Uses only `deriveStyleFromPersonality()`
  - Mixed: Blends implicit + explicit (implicit emphasized)
  - MixedFunctional: Blends implicit + explicit (explicit emphasized)

## Checked: Color Integration
- **Status**: ✅ OK
- **Differentiation**:
  - Mixed: 60% implicit colors + 40% explicit colors
  - MixedFunctional: 40% implicit colors + 60% explicit colors
  - Other sources: Use their respective data sources

## Checked: Materials Integration
- **Status**: ✅ OK
- **Differentiation**:
  - Mixed: 2 implicit + 1 explicit material
  - MixedFunctional: 2 explicit + 1 implicit material
  - Other sources: Use their respective data sources

## Checked: Lighting
- **Status**: ⚠️ POTENTIAL ISSUE
- **Current**: Uses `inputs.sensory.light`, `inputs.prsCurrent`, `inputs.prsTarget`, `inputs.activities`
- **Problem**: For Implicit/Explicit/Personality sources, PRS is zeroed but lighting still uses it
- **Impact**: Low - PRS (0,0) gives neutral lighting, which is acceptable
- **Recommendation**: Consider zeroing lighting influence for Personality source

## Checked: Mood
- **Status**: ✅ OK
- **Differentiation**: Mood is derived from style, colors, and PRS gap
- **Behavior**: When PRS is zeroed, mood becomes neutral/balanced (correct)

## Summary
- ✅ Biophilia: FIXED
- ✅ PRS: OK (zeroed correctly, gap = 0 when zeroed)
- ✅ Style: OK (differentiated per source)
- ✅ Colors: OK (differentiated per source)
- ✅ Materials: OK (differentiated per source)
- ⚠️ Lighting: Minor issue (uses zeroed PRS, but result is acceptable)
- ✅ Mood: OK (derived correctly)

