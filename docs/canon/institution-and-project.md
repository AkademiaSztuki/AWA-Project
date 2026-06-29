# Institution and project (canonical)

> Verified against code: 2026-06-11  
> Source: `apps/frontend/src/app/o-projecie/page.tsx`, `apps/frontend/src/app/layout.tsx`

## Institution

| Field | Value |
|-------|-------|
| University | **Akademia Sztuki w Szczecinie** (Academy of Art in Szczecin) |
| Context | Doctoral research |
| Supervisor | prof. dr hab. Andreas Guskos |
| Author | Jakub Palka |

## Product name

**IDA** — AI Interior Design Dialogue Research Platform (research prototype).

Do not use **Aura** or **AWA** as the product name in academic text. Those names appear only as legacy repo/component naming (`components/awa/`).

## Research paradigm

IDA combines **Research Through Design (RTD)** with a product people can actually use. Research data is collected during natural usage, not in an artificial laboratory setting.

## Four research areas

1. **Environmental psychology** — how spatial perception, mood, and interior function shape user preferences.
2. **Aesthetic preferences** — explicit (declarations, questionnaires) and implicit (behaviour, reaction times, visual choices).
3. **AI-assisted personalization** — how generative models translate a user profile into coherent interior concepts.
4. **Personality (Big Five, IPIP-NEO-120)** — how trait and facet scores relate to interior preferences and personalization.

## Participation and consent

- Users may follow a **fast** or **full** path.
- Participation requires **informed consent** during onboarding (fast) or at the start of the core profile wizard (full).
- Data is processed per the privacy policy; identifiers use `user_hash` (anonymized).

## Infrastructure partners (funding context)

Listed on the about page: Google Cloud Research Credits, Google for Startups Cloud Program, Modal for Startups (historical credits), Vercel hosting.

**Production stack today:** Google Cloud (Cloud Run, Cloud SQL, GCS, Vertex/Gemini) — not Modal or Supabase for runtime persistence.
