# Research variables (canonical)

> Verified against code: 2026-06-11  
> Sources: `infra/gcp/sql/01_research_schema.sql`, `RESEARCH_DATA_DICTIONARY.md`, `DASHBOARD_DATA_INVENTORY.md`

## Export

Main research export: `research_full_export_v2.csv` — one row per participant (flattened).

Detailed dictionary: `apps/frontend/supabase/RESEARCH_DATA_DICTIONARY.md` (verify column names against SQL before citing in thesis).

## Identification

| Variable | Type | Operational definition | System source |
|----------|------|------------------------|---------------|
| `user_hash` | text | Anonymized participant ID | Generated at consent; PK in `participants` |
| `consent_timestamp` | timestamp | When informed consent was given | `participants.consent_timestamp` (NOT NULL) |
| `path_type` | text | `fast` or `full` | Set at path selection |
| `current_step` | text | Last step if session incomplete | `participants.current_step` |

## Demographics

| Variable | Source step |
|----------|-------------|
| `age_range`, `gender`, `country`, `education` | Onboarding (fast) or Core Profile (full) |

## Big Five (IPIP-NEO-120)

| Variable | Description |
|----------|-------------|
| `big5_openness` … `big5_neuroticism` | Domain scores O, C, E, A, N |
| `big5_facets` | JSONB — 30 facets |
| `big5_responses` | JSONB — 120 item responses |
| `big5_completed_at` | Completion timestamp |

Instrument: IPIP-NEO-120 on `/flow/big-five` (full path only).

## Implicit preferences (behavioural)

| Variable | Operational definition | Collection |
|----------|------------------------|------------|
| `implicit_dominant_style` | Dominant style from swipe analysis | Tinder swipes in Core Profile |
| `implicit_style_*`, `implicit_color_*`, `implicit_material_*` | Top tags from liked stimuli | Aggregated on `participants` |
| `implicit_warmth`, `implicit_brightness`, `implicit_complexity` | Inferred aesthetic dimensions | From swipe metadata |
| `reaction_time_ms` | Time from stimulus display to swipe | `participant_swipes` per row |
| `direction` | `left` (reject) or `right` (accept) | `participant_swipes` |

## Explicit preferences

| Variable | Collection |
|----------|------------|
| `explicit_warmth`, `explicit_brightness`, `explicit_complexity` | Semantic differential scales |
| `explicit_palette`, `explicit_style` | Direct selections |
| `explicit_material_*` | Material preferences |
| `sensory_music`, `sensory_texture`, `sensory_light` | Sensory tests |

## Environmental psychology

| Variable | Description |
|----------|-------------|
| `prs_current_x/y`, `prs_target_x/y`, `prs_ideal_x/y` | PRS mood grid coordinates |
| `biophilia_score` | Biophilia tendency scale |
| `nature_metaphor` | Selected nature metaphor |

## Personality → design (research mapping)

Facet-to-design mappings used in prompt synthesis: see `prompt-synthesis/facet-derivation.ts`, `research-mappings.ts`, and `GENERATION_MATRIX_5_IMAGES.md`.

## Outcomes — generation matrix

Five parallel prompts from different data sources (`GenerationSource`):

| Source | Label PL | Primary inputs |
|--------|----------|----------------|
| `implicit` | Dane behawioralne | Swipes + inspiration VLM tags |
| `explicit` | Deklarowane preferencje | Core profile or room-specific explicit data |
| `personality` | Profil osobowości | Big Five domains + facets |
| `mixed` | Mix estetyczny | 40% implicit + 30% explicit + 30% personality |
| `mixed_functional` | Mix + funkcjonalność | Mixed + activities, pain points, PRS gap |

Blind comparison: images shuffled in `displayOrder`; user selects preferred image without knowing source.

## Survey outcomes (full path)

| Variable | Instrument |
|----------|------------|
| `sus_score`, `sus_answers` | System Usability Scale (post-generation) |
| `clarity_score`, `clarity_answers` | Clarity / agency survey |
| `satisfaction_score` | Session satisfaction |

## GDPR

- No PII in research tables; `auth_user_id` optional link to Google OAuth
- Consent version tracked via `saveResearchConsent` in `gcp-data.ts`
- Separate consent for research vs data processing

## Known documentation drift

`DASHBOARD_DATA_INVENTORY.md` still lists legacy routes (`/flow/dna`, `/flow/ladder`, `/flow/tinder` as separate routes). Current full flow integrates Tinder in `/setup/profile` and removes standalone DNA step. **Verify against `docs/canon/user-flow.md` before citing route names in thesis.**
