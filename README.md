# AWA - AI Interior Design Dialogue Research Platform

## Architecture

- **Frontend (Vercel)**: Next.js 14 + Three.js + Glassmorphism UI
- **API / persistence (Google Cloud)**: Cloud Run backend ([`apps/backend-gcp`](apps/backend-gcp)), Cloud SQL, Cloud Storage
- **Image generation**: Google (Vertex / Gemini image APIs) via Next.js routes under `/api/google/*`
- **Monitoring**: Research Through Design data collection

## Quick start

```bash
pnpm install

# Local development
pnpm dev:frontend          # Next.js on :3000
pnpm dev:backend-gcp       # Express API (requires DATABASE_URL)

# Or run the full monorepo dev graph (frontend + backend-gcp + packages)
pnpm dev

# Deployment
pnpm run deploy:frontend   # Vercel
# Deploy backend-gcp to Cloud Run per infra docs (see infra/gcp)
```

## Project layout

- `apps/frontend/` - Next.js app (AWA character, flows, GCP client)
- `apps/backend-gcp/` - Cloud Run API (Postgres, research routes, auth helpers)
- `infra/gcp/sql/` - **Source of truth** for Cloud SQL schema
- `docs/archive/modal-backend/` - Legacy Modal.com Python backend (archived)

## Configuration

### Frontend (`.env.local`)

Set at least:

- `NEXT_PUBLIC_GCP_API_BASE_URL` - Cloud Run base URL for persistence
- Variables for Google image generation as documented in the frontend app

### Backend GCP (`DATABASE_URL`, etc.)

See [`infra/gcp/INSTRUKCJA_PL.md`](infra/gcp/INSTRUKCJA_PL.md) and backend README.

## Research

The app collects data per Research Through Design:

- Declarative (user answers)
- Behavioral (interactions; persisted via GCP when wired — see `gcp-data` + research events API)
- Outcomes (AI parameters, generations)

Persistence verification checklists: [docs/gcp-data-verification/README.md](docs/gcp-data-verification/README.md).

## Akademia Sztuk Pięknych - Doktorat

Project within research on human–AI collaboration in interior design.
