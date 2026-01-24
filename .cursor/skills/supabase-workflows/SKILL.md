---
name: supabase-workflows
description: Workflows for working with Supabase in AWA project. Use when creating or modifying Supabase queries, participant data operations, swipes, generations, or image storage. Covers participants table, participant_swipes, participant_generations, participant_images, and related helper functions.
---

# Supabase Workflows for AWA Project

## Core Tables

### `participants`
Main user data table. Key fields:
- `user_hash` (primary key, unique)
- `big5_*` - Big Five personality scores
- `implicit_style_1/2/3` - Derived from swipes
- `explicit_style` - User-declared preferences
- `inspiration_style_1/2/3` - From uploaded images
- `tinder_total_swipes`, `tinder_likes`, `tinder_dislikes`
- `consent_timestamp` (required, NOT NULL)

### `participant_swipes`
Tinder-style swipe data:
- `user_hash` (foreign key)
- `image_id` (string)
- `direction` ('left' | 'right')
- `reaction_time_ms`
- `image_styles`, `image_colors`, `image_materials` (arrays)

### `participant_generations`
AI generation jobs:
- `user_hash` (foreign key)
- `job_type` ('initial' | 'micro' | 'macro')
- `prompt`, `parameters` (JSONB)
- `status` ('pending' | 'success' | 'error')
- `latency_ms`, `error_message`

### `participant_images`
Stored images:
- `user_hash` (foreign key)
- `type` ('generated' | 'inspiration' | 'room_photo' | 'room_photo_empty')
- `storage_path`, `public_url`, `thumbnail_url`
- `tags_styles`, `tags_colors`, `tags_materials` (arrays)

## Common Patterns

### 1. Ensure Participant Exists

Always call `ensureParticipantExists(userHash)` before inserting into related tables:

```typescript
import { ensureParticipantExists } from '@/lib/supabase';

const participantExists = await ensureParticipantExists(userHash);
if (!participantExists) {
  // Handle error - participant creation failed
  return;
}
```

### 2. Saving Swipes

Swipes automatically update implicit aggregates in `participants`:

```typescript
import { saveParticipantSwipes } from '@/lib/supabase';

await saveParticipantSwipes(userHash, [
  {
    imageId: '123',
    direction: 'right',
    reactionTimeMs: 450,
    categories: {
      style: 'modern',
      colors: ['white', 'gray'],
      materials: ['wood', 'metal']
    }
  }
]);
// Automatically updates participants.implicit_style_1/2/3, etc.
```

### 3. Generation Tracking

Track AI generation jobs:

```typescript
import { startParticipantGeneration, endParticipantGeneration } from '@/lib/supabase';

const jobId = await startParticipantGeneration(userHash, {
  type: 'initial',
  prompt: '...',
  parameters: { ... },
  has_base_image: false
});

// After generation completes:
await endParticipantGeneration(jobId, {
  status: 'success',
  latency_ms: 5000,
  error_message: null
});
```

### 4. Image Storage

Save images with metadata:

```typescript
import { saveParticipantImage } from '@/lib/supabase';

const imageId = await saveParticipantImage(userHash, {
  type: 'generated',
  storage_path: 'generations/abc123.jpg',
  public_url: 'https://...',
  tags_styles: ['modern', 'minimalist'],
  tags_colors: ['white', 'beige'],
  tags_materials: ['wood'],
  generation_id: jobId
});
```

## Error Handling

All Supabase functions include:
- Agent logging via `#region agent log` blocks
- Console error/warn messages
- Graceful fallbacks for missing data

Always check return values:
- `null` = operation failed or data missing
- `false` = operation failed
- `string` (ID) = success, returns ID
- `true` = success

## Data Mapping

Use `participants-mapper.ts` for converting between:
- `SessionData` (frontend format) ↔ `participants` (database format)

```typescript
import { mapSessionDataToParticipant, mapParticipantToSessionData } from '@/lib/participants-mapper';
```

## Legacy Functions

Many legacy functions are disabled (return early). Check function body before using:
- `logBehavioralEvent` - disabled
- `createProject` - disabled
- `getOrCreateProjectId` - returns null

Use new participant-based functions instead.
