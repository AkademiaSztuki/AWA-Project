---
name: research-data
description: Research data collection and handling patterns for AWA project. Use when working with participant data, behavioral tracking, GDPR compliance, data anonymization, or research analytics. Covers data collection workflows, consent management, and data export.
---

# Research Data Handling for AWA Project

## Data Architecture

4-layer data model:
1. **USER** (global, once) - Core profile, personality, preferences
2. **HOUSEHOLD** (per space) - Who lives there, dynamics
3. **ROOM** (per room) - Room-specific context
4. **SESSION** (per design attempt) - Generation attempts, feedback

## Data Collection Points

### 1. Onboarding
- Consent (research + processing)
- Demographics
- Consent timestamp (required, NOT NULL)

### 2. Core Profile
- Big Five Personality (IPIP-60 or IPIP-NEO-120)
- Lifestyle preferences
- Inspiration images (1-10)
- Semantic differentials (warmth, brightness, complexity)
- Sensory tests
- Biophilia assessment

### 3. Behavioral Data
- **Tinder swipes**: Reaction time, direction, image metadata
- **Dwell time**: Time spent on each screen
- **Hesitation patterns**: Pauses before decisions
- **Selection time**: Time to choose generated images

### 4. Generation Data
- Prompts used
- Parameters (model, seed, etc.)
- Latency (generation time)
- Success/error status
- Selected images

### 5. Feedback
- User ratings (aesthetic_match, character, harmony)
- Regeneration events (why user regenerated)
- Conflict analysis (implicit vs explicit preferences)

## GDPR Compliance

### Consent Management

```typescript
import { saveResearchConsent, CONSENT_VERSION } from '@/lib/supabase';

await saveResearchConsent(userId, {
  consentResearch: true,
  consentProcessing: true,
  acknowledgedArt13: true
}, 'pl'); // or 'en'
```

**Requirements:**
- Consent version tracking (`CONSENT_VERSION`)
- Separate consent for research vs processing
- Art. 13 GDPR acknowledgment
- Locale-specific consent forms

### Data Anonymization

- `user_hash` - Anonymized user identifier
- No PII in research tables
- Separate `auth.users` table for authentication
- Optional link via `auth_user_id` (only if user consents)

### Right to Withdrawal

Users can withdraw consent:
- Data marked as withdrawn (not deleted immediately)
- Future data collection stops
- Historical data retained for research validity

## Data Storage

### Primary Tables

**`participants`** - Main user data
- All profile data
- Aggregated preferences
- Implicit/explicit style preferences

**`participant_swipes`** - Raw swipe data
- Individual swipe events
- Reaction times
- Image metadata

**`participant_generations`** - AI generation jobs
- Prompts, parameters
- Latency, errors
- Job status

**`participant_images`** - Stored images
- Generated, inspiration, room photos
- Tags (styles, colors, materials)
- Storage paths

**`generation_feedback`** - User feedback
- Selected images
- Ratings
- Quality assessments

**`regeneration_events`** - Regeneration tracking
- Why user regenerated
- Previous selections
- Interpretation

### Research-Specific Tables

**`research_consents`** - Consent tracking
- Consent version
- Timestamps
- Locale

## Data Export

### CSV Export Scripts

```bash
# Export all participants
pnpm export:csv

# Export single participant
pnpm export:single
```

**Export includes:**
- All participant data
- Swipe aggregates
- Generation history
- Feedback data

## Data Quality

### Validation

- Check for required fields (`consent_timestamp`)
- Validate data types (arrays, numbers, strings)
- Check referential integrity (user_hash exists)

### Completeness Scoring

```typescript
import { calculateDataQuality } from '@/lib/prompt-synthesis/data-quality';

const quality = calculateDataQuality(sessionData);
// Returns: completeness score, missing fields, confidence
```

## Agent Logging

Research data includes agent logging for debugging:

```typescript
// #region agent log
fetch('http://127.0.0.1:7242/ingest/...', {
  method: 'POST',
  body: JSON.stringify({
    location: 'file.ts:line',
    message: 'Description',
    data: { ... },
    timestamp: Date.now(),
    sessionId: '...',
    runId: '...',
    hypothesisId: '...'
  })
}).catch(() => {});
// #endregion
```

**Purpose:**
- Debug data flow
- Track hypothesis testing
- Monitor data quality
- Identify issues early

## Best Practices

1. **Always ensure participant exists** - Use `ensureParticipantExists()` before inserts
2. **Log important events** - Use agent logging for research tracking
3. **Validate data** - Check types and required fields
4. **Respect consent** - Check consent before collecting research data
5. **Anonymize** - Never store PII in research tables
6. **Export regularly** - Backup research data for analysis

## Common Patterns

### Saving Complete Session

```typescript
import { saveFullSessionToSupabase } from '@/lib/supabase';

await saveFullSessionToSupabase({
  userHash: '...',
  bigFive: { ... },
  visualDNA: { ... },
  colorsAndMaterials: { ... },
  // ... all session data
});
```

### Tracking Behavioral Events

```typescript
import { saveParticipantSwipes } from '@/lib/supabase';

await saveParticipantSwipes(userHash, swipes);
// Automatically updates participants.implicit_* fields
```

### Generation Tracking

```typescript
const jobId = await startParticipantGeneration(userHash, job);
// ... generation happens ...
await endParticipantGeneration(jobId, outcome);
```
