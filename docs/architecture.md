# Architektura projektu IDA

> For thesis writing, prefer [`docs/canon/system-overview.md`](canon/system-overview.md).

## Przegląd systemu

IDA wykorzystuje architekturę opartą o Google Cloud:

- **Frontend**: Next.js 14 + Three.js (Vercel)
- **Backend**: Google Cloud Run ([`apps/backend-gcp`](../apps/backend-gcp))
- **Database**: Cloud SQL (PostgreSQL); schema w [`infra/gcp/sql`](../infra/gcp/sql)
- **Image generation**: Google (Vertex / Gemini) z Next.js `/api/google/*`
- **Legacy Modal backend**: [`docs/archive/modal-backend`](../docs/archive/modal-backend) (archived, not production)

## Przepływ danych

```
User → Frontend (Vercel) → /api/google/* → Google image APIs
  ↓
  Research Data → Cloud Run (backend-gcp) → Cloud SQL / Storage
```

Persystencja po stronie klienta: `apps/frontend/src/lib/gcp-data.ts` (brak Supabase w runtime).

## Komponenty systemu

### Frontend

```
apps/frontend/src/
├── app/                 # Next.js App Router
│   ├── flow/           # User funnel screens
│   ├── setup/          # Profile and room wizards
│   ├── api/            # API routes (incl. /api/google/*)
│   └── layout.tsx
├── components/
│   ├── awa/            # 3D IDA character (legacy folder name)
│   ├── screens/
│   └── ui/
├── lib/
│   ├── gcp-data.ts     # Persistence client
│   ├── flow/           # fast/full flow progress
│   └── prompt-synthesis/
└── types/
```

### Backend

```
apps/backend-gcp/
├── src/server.ts       # Express API
├── src/routes/         # participants, research, swipes, generations, images, …
└── …
```

## Kluczowe technologie

### Three.js

- GLTFLoader dla modelu postaci IDA
- Mouse tracking, animacje głowy

### Generacja obrazów

- Google Vertex / Gemini via `/api/google/*`
- Prompt synthesis: `apps/frontend/src/lib/prompt-synthesis/`

### Research Through Design

- Dane deklaratywne, behawioralne i wynikowe
- `user_hash` — anonimizacja
- Zgoda RODO przed zbieraniem danych badawczych

## User flow

Aktualny flow (fast 4 kroki, full 12 kroków): [`docs/canon/user-flow.md`](canon/user-flow.md).

## Bezpieczeństwo i prywatność

- Anonimowy `user_hash`
- Zgoda świadoma (consent)
- Prawo do wycofania zgody
- Szczegóły: polityka prywatności aplikacji
