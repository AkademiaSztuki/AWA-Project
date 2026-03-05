# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

AWA (Aura) is an AI-powered interior design research platform built as a Turborepo + pnpm monorepo. The main service is the Next.js 14 App Router frontend in `apps/frontend/`. The Modal.com Python backend (`apps/modal-backend/`) is optional and requires GPU access.

### Running the frontend dev server

```bash
cd apps/frontend && pnpm dev
```

The dev server runs on `http://localhost:3000`. All required secrets (Supabase, Stripe, Google AI, ElevenLabs, Groq) are injected as environment variables; no `.env.local` file is needed when secrets are configured in Cursor Cloud.

### Lint and type-check

```bash
cd apps/frontend && pnpm lint        # ESLint (next lint)
cd apps/frontend && pnpm type-check  # tsc --noEmit
```

Note: the codebase has pre-existing lint errors (React hooks rules-of-hooks violations in `AwaDialogue.tsx` and `GenerationHistory.tsx`) and one pre-existing TS error in `useDashboardAccess.ts`. These do not block the dev server.

### ESLint configuration

The `.eslintrc.json` file at `apps/frontend/.eslintrc.json` extends `next/core-web-vitals`. If this file is missing, `next lint` will prompt interactively. The file was created during setup.

### Build scripts approval (pnpm)

The root `package.json` includes `pnpm.onlyBuiltDependencies` to allow `sharp`, `@vercel/speed-insights`, and `unrs-resolver` build scripts. Without this, `pnpm install` will skip native binary compilation for `sharp` (needed by Next.js image optimization).

### Key routes

- `/` — Landing page with AWA 3D character
- `/flow/onboarding` — Research consent onboarding
- `/flow/path-selection` — Choose research or fast track
- `/flow/big-five` — IPIP-NEO personality questionnaire
- `/flow/dna` — Visual DNA swiping
- `/dashboard` — User dashboard

### External service dependencies

- **Supabase** (cloud): Required for data persistence and auth. Configured via `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- **Google Vertex AI / Gemini**: Required for AI image generation and room analysis. Configured via `GOOGLE_AI_API_KEY`, `GOOGLE_CLOUD_PROJECT`.
- **Stripe**: Optional, for subscriptions. App grants free credits without it.
- **ElevenLabs / Groq**: Optional, for voice and LLM comments.
