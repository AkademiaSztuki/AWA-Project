## Supabase usage inventory (AWA -> GCP migration)

### 1. Core Supabase client and helpers

- **Client & shared utilities**
  - `apps/frontend/src/lib/supabase.ts`
    - Exports: `supabase`, `DISABLE_SESSION_SYNC`, `safeLocalStorage`, `safeSessionStorage`
    - Research helpers:
      - `saveFullSessionToSupabase`
      - `fetchLatestSessionSnapshot`
      - `saveParticipantSwipes`
      - `startParticipantGeneration`, `endParticipantGeneration`
      - `saveParticipantImage`
      - `saveResearchConsent`
      - `saveGenerationFeedback`, `saveRegenerationEvent`
      - `ensureParticipantExists`
    - Legacy / analytics helpers (no-op or legacy tables):
      - `logBehavioralEvent`, `createProject`, `updateDiscoverySession`
      - `saveGenerationSet`, `saveGeneratedImages`, `updateGeneratedImageRatings`
      - `getOrCreateProjectId`, `saveTinderSwipes`, `saveTinderSwipesDetailed`
      - `saveDeviceContext`, `startPageView`, `endPageView`
      - `saveDnaSnapshot`, `saveLadderPathRows`, `saveLadderSummary`
      - `startGenerationJob`, `endGenerationJob`
      - `saveImageRatingEvent`, `logHealthCheck`, `logErrorEvent`

- **Deep personalization**
  - `apps/frontend/src/lib/supabase-deep-personalization.ts`
    - Imports: `supabase`, `ensureParticipantExists`
    - Uses participants and related tables for personalized dashboard / profile.

- **Remote spaces & images**
  - `apps/frontend/src/lib/remote-spaces.ts`
    - Imports: `supabase`, `saveParticipantImage`
    - Uses tables: `participant_spaces`, `participant_images`
    - Uses Storage buckets: `space-images`, `participant-images`

### 2. Frontend components/pages using Supabase helpers

- **Session & onboarding / profile**
  - `apps/frontend/src/hooks/useSession.ts`
    - Uses: `supabase`, `DISABLE_SESSION_SYNC`, `safeLocalStorage`, `safeSessionStorage`, `fetchLatestSessionSnapshot`, `saveFullSessionToSupabase`
  - `apps/frontend/src/hooks/useSessionData.ts`
    - Uses: `saveFullSessionToSupabase`, `DISABLE_SESSION_SYNC`
  - `apps/frontend/src/components/screens/OnboardingScreen.tsx`
    - Uses: `saveResearchConsent`
  - `apps/frontend/src/components/wizards/CoreProfileWizard.tsx`
    - Uses: `saveResearchConsent`, `saveParticipantSwipes`

- **Flows (photo / dna / generate / modify / fast-generate / survey)**
  - `apps/frontend/src/app/flow/photo/page.tsx`
    - Uses: `getOrCreateProjectId`, `saveDeviceContext`, `startPageView`, `endPageView` (legacy analytics)
  - `apps/frontend/src/app/flow/dna/page.tsx`
    - Uses: `getOrCreateProjectId`, `updateDiscoverySession`, `saveTinderSwipes`, `saveDnaSnapshot`, `startPageView`, `endPageView` (legacy)
  - `apps/frontend/src/app/flow/generate/page.tsx`
    - Uses: `getOrCreateProjectId`, `saveGenerationSet`, `saveGeneratedImages`, `logBehavioralEvent`, `startParticipantGeneration`, `endParticipantGeneration`, `saveImageRatingEvent`, `startPageView`, `endPageView`, `saveGenerationFeedback`, `saveRegenerationEvent`, `safeSessionStorage`, `supabase`
  - `apps/frontend/src/app/flow/modify/page.tsx`
    - Uses: `getOrCreateProjectId`, `startParticipantGeneration`, `endParticipantGeneration`, `safeSessionStorage`
  - `apps/frontend/src/app/flow/fast-generate/page.tsx`
    - Uses: `getOrCreateProjectId`, `saveGenerationSet`, `saveGeneratedImages`, `logBehavioralEvent`, `startParticipantGeneration`, `endParticipantGeneration`, `saveImageRatingEvent`, `startPageView`, `endPageView`, `safeSessionStorage`
  - `apps/frontend/src/app/flow/inspirations/page.tsx`
    - Uses: `supabase` Storage directly for `participant-images` bucket (see buckets below)
  - `apps/frontend/src/app/flow/survey1/page.tsx`
    - Uses: `supabase` to write `survey_results`
  - `apps/frontend/src/components/screens/Survey2Screen.tsx`
    - Uses: `supabase` to write additional survey data (`survey_results` with `sus`)

- **Dashboard & spaces**
  - `apps/frontend/src/components/dashboard/UserDashboard.tsx`
    - Uses: `supabase`, `fetchLatestSessionSnapshot`, `DISABLE_SESSION_SYNC`, `safeLocalStorage`, `safeSessionStorage`, plus deep-personalization helpers.
  - `apps/frontend/src/app/space/[id]/page.tsx`
    - Uses: `safeLocalStorage` (from Supabase lib) + `remote-spaces` helpers (which call `supabase`).
  - `apps/frontend/src/components/setup/RoomSetup.tsx`
    - Uses: `supabase` (for room photos) and `saveParticipantImages` from `remote-spaces`.

- **Auth and user context**
  - `apps/frontend/src/contexts/AuthContext.tsx`
    - Uses: `supabase`, `safeLocalStorage`, `safeSessionStorage`
    - Auth: `signInWithGoogle` (Supabase OAuth Google provider) and session management.
  - `apps/frontend/src/app/auth/callback/page.tsx`
    - Uses: `supabase`, `safeSessionStorage` to finalize OAuth login and session.
  - `apps/frontend/src/components/subscription/SubscriptionManagement.tsx`
    - Uses: `supabase` for subscription management UI.

- **Credits**
  - `apps/frontend/src/components/subscription/CreditBalance.tsx`
    - Uses: `supabase` (for diagnostics) and `getCreditBalance` (credits API).
  - API routes:
    - `apps/frontend/src/app/api/credits/grant-free/route.ts`
    - `apps/frontend/src/app/api/credits/deduct/route.ts`
    - `apps/frontend/src/app/api/credits/balance/route.ts`
    - `apps/frontend/src/app/api/credits/check/route.ts`
    - `apps/frontend/src/app/api/credits/expire/route.ts`
    - `apps/frontend/src/app/api/test/allocate-credits/route.ts`
    - Wszystkie korzystają z Supabase (oraz `lib/credits`) do obsługi `subscriptions` i `credit_transactions`.
  - `apps/frontend/src/app/api/stripe/webhook/route.ts`
    - Uses: `supabase` to persist webhook events (`stripe_webhook_events`) i aktualizować `subscriptions` i `credit_transactions`.

- **Misc / UI state persisted via safeLocalStorage/safeSessionStorage**
  - `apps/frontend/src/contexts/ColorAdjustmentContext.tsx`
  - `apps/frontend/src/contexts/LanguageContext.tsx`
  - `apps/frontend/src/hooks/useAmbientMusic.ts`
  - `apps/frontend/src/hooks/useDialogueVoice.ts`
  - `apps/frontend/src/components/ui/AmbientMusic.tsx`
  - `apps/frontend/src/app/dashboard/personality/page.tsx`
  - `apps/frontend/src/app/space/[id]/page.tsx`

- **Logging**
  - `apps/frontend/src/app/api/log/route.ts`
    - Uses: `supabase`, `logBehavioralEvent` (legacy analytics surface).

### 3. Supabase Storage buckets usage

- **Bucket: `participant-images`**
  - Direct client usage:
    - `apps/frontend/src/app/flow/inspirations/page.tsx`
      - Upload inspirations for a participant:
        - `supabase.storage.from('participant-images').upload(path, file, { upsert: true, ... })`
        - `supabase.storage.from('participant-images').getPublicUrl(path)`
  - Indirect via `remote-spaces`:
    - `apps/frontend/src/lib/remote-spaces.ts`
      - Upload generated images / room photos:
        - `supabase.storage.from('participant-images').upload(storagePath, blob, ...)`
        - `supabase.storage.from('participant-images').getPublicUrl(storagePath)`
      - Delete images:
        - `supabase.storage.from('participant-images').remove([image.storage_path])`
  - Bucket provisioning & policies:
    - `apps/frontend/src/app/api/setup/create-participant-images-bucket/route.ts`
    - `apps/frontend/scripts/create-participant-images-bucket.js`
    - `apps/frontend/scripts/create-storage-bucket.js`
    - `apps/frontend/scripts/create-bucket-via-api.js`
    - `apps/frontend/supabase/migrations/20251223003000_storage_participant_images_rls.sql`

- **Bucket: `space-images`**
  - Used in:
    - `apps/frontend/src/lib/remote-spaces.ts`
      - Constant `SPACE_BUCKET = 'space-images'`
      - Upload and list images per space.
  - Defined/policies:
    - `apps/frontend/supabase/migrations/20251208000000_spaces_and_space_images.sql`

- **Bucket: `aura-assets`**
  - Used in:
    - `apps/frontend/src/components/steps/InspirationsStep.tsx`
      - Upload inspirational assets:
        - `supabase.storage.from('aura-assets').upload(...)`
        - `supabase.storage.from('aura-assets').getPublicUrl(...)`
  - Provisioning / maintenance:
    - `apps/frontend/src/app/api/setup/create-bucket/route.ts` (generic create-bucket for `aura-assets`)
    - `apps/frontend/scripts/create-bucket-via-api.js`
    - `apps/frontend/scripts/create-storage-bucket.js` (console instructions)
    - `apps/frontend/scripts/create-participant-images-bucket.js` (instructions mention `aura-assets`)
    - `apps/frontend/supabase/create_bucket.sql`
    - `apps/frontend/supabase/migrations/20251202000001_create_aura_assets_bucket.sql`
    - `apps/frontend/supabase/cleanup_storage_bucket.sql`
    - `apps/frontend/supabase/cleanup_database.sql`
    - `apps/frontend/supabase/check_storage_usage.sql`

### 4. Summary for migration

- **High-priority to replace with GCP API backend:**
  - Research-critical helpers:
    - `saveFullSessionToSupabase`, `fetchLatestSessionSnapshot`
    - `saveParticipantSwipes` (+ implicit aggregate update on `participants`)
    - `startParticipantGeneration`, `endParticipantGeneration`
    - `saveParticipantImage`
    - `saveResearchConsent`
    - `saveGenerationFeedback`, `saveRegenerationEvent`
    - `ensureParticipantExists` (plus free-credits side effect)
  - Storage buckets:
    - `participant-images`, `space-images`, `aura-assets` → docelowo GCS buckety z równoważną strukturą.

- **Legacy/optional surfaces (mogą zostać wygaszone lub odwzorowane uproszczone):**
  - Cała rodzina helpersów bazujących na dawnych tabelach analitycznych (`projects`, `tinder_swipes`, `generation_jobs`, `page_views`, itp.).
  - API `/api/log` i inne miejsca wołające `logBehavioralEvent` / `startPageView` / `endPageView`.

Ta lista jest punktem odniesienia do refaktoringu: każdy z powyższych punktów powinien zostać albo zastąpiony wywołaniem nowego backendu na GCP, albo oznaczony jako legacy i docelowo usunięty, jeśli nie jest już potrzebny dla badań.

