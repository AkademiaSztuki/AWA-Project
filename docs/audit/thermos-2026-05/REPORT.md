# Thermos-style full-repo audit — AWA-Project

**Date:** 2026-05-29  
**Branch:** `audit/thermos-2026-05`  
**Mode:** Read-only (documentation only; no application code changed)  
**Thermos plugin:** Installed; official run in [THERMOS_RUN.md](./THERMOS_RUN.md). Initial pass used manual sharding (same date).

---

## Baseline tooling

| Check | Result |
|-------|--------|
| `pnpm --filter @aura/frontend type-check` | **Pass** (exit 0) |
| `pnpm lint` | In progress / slow in CI environment — see [baseline.txt](./baseline.txt) |
| `pnpm test` | Not completed in automated run — run locally before merge fixes |
| `pnpm run build:research-stack` | Not completed in automated run — run locally before merge fixes |

---

## Top risks (fix before production hardening)

1. **Trust boundary on `userHash`** — Frontend and GCP API treat `userHash` as a bearer secret. Cloud Run is documented as publicly invokable. Combined with missing auth middleware, this enables IDOR on sessions, images, credits, and billing.
2. **Client-controlled `isAuthenticated`** — Credit check/deduct routes honor a JSON flag from the browser; `generate` and `fast-generate` send it from `useAuth`.
3. **Unauthenticated paid API proxies** — Google AI and ElevenLabs routes on Next.js have no auth or rate limits.
4. **GCP Stripe webhooks without verification** — Direct calls can grant subscriptions/credits.
5. **Permissive Supabase RLS** — Appropriate for controlled research kiosks; **not** for production multi-tenant + Stripe without policy rewrite.
6. **Debug/test surfaces** — `/api/debug/print`, `/api/test/allocate-credits` (non-prod), optional `CRON_SECRET` on credit expiry.

---

## Critical

| # | Finding | Location |
|---|---------|----------|
| C-1 | Credit APIs trust `isAuthenticated` from request body | `app/api/credits/check`, `deduct`; used by `flow/generate`, `fast-generate` |
| C-2 | Public Google AI + ElevenLabs proxies (cost abuse) | `app/api/google/*`, `app/api/elevenlabs/tts` |
| C-3 | GCP billing webhooks without Stripe signature | `backend-gcp` `routes/billing.ts`, `services/billing.ts` |
| C-4 | `grant-free` + `/ensure` credit farming | `backend-gcp` `routes/credits.ts`, `routes/participants.ts` |
| C-5 | Set password / session UPSERT without identity proof | `backend-gcp` `routes/auth.ts`, `routes/participants.ts` |
| C-6 | Session/participant GET returns `password_hash` + PII | `backend-gcp` `routes/participants.ts` |
| C-7 | Supabase open RLS on participant tables + storage | migrations `20251223005000_*`, `20251223003000_*` |
| C-8 | Auto free-credit trigger on participant INSERT | `20251231000000_ensure_free_grant_on_participant_insert.sql` |
| C-9 | Auth via spoofable `localStorage` + public GCP client | `AuthContext.tsx`, `gcp-api-client.ts` |

---

## High

| # | Finding | Location |
|---|---------|----------|
| H-1 | Credit balance / Stripe portal / checkout IDOR | `api/credits/balance`, `stripe/create-portal`, `create-checkout` |
| H-2 | Image raw download IDOR | `backend-gcp` `routes/images.ts` |
| H-3 | CORS `*` on backend | `backend-gcp` `server.ts` |
| H-4 | `link-auth` without verification | frontend + backend participants routes |
| H-5 | Authenticated users can manage own subscription row (self-grant) | Supabase `20251224000000_stripe_subscriptions.sql` |
| H-6 | `SECURITY DEFINER` credit RPCs callable broadly | Supabase migrations |
| H-7 | Open redirect after email verify | `auth/verify`, `auth/verify-email` |
| H-8 | Fail-open credit checks | `lib/credits.ts`, generate pages |
| H-9 | Debug endpoint in production | `api/debug/print` |
| H-10 | Secrets in Cloud Run env vars (not Secret Manager) | `infra/gcp/deploy-backend.ps1` |
| H-11 | Files 2k–5k lines (maintainability + review risk) | See [shard-D-giants.md](./shard-D-giants.md) |

---

## Medium

- Behavioral `/api/log` without auth; research consent bypass via `consentTimestamp` only.
- Magic link phishing via `Origin` header when env unset.
- No rate limits on auth, contact, uploads.
- PII in browser console logs (`prompt-synthesis`, `generate`, `useSession`).
- Debug ingest `127.0.0.1:7242` left in production code paths.
- Incomplete wipe script for GDPR resets (`infra/gcp/sql/99_wipe_all_data.sql`).
- Anon IP hash default salt in dev fallback.

---

## Low

- Unused `PUBLIC_PATHS` in middleware; stub setup routes.
- Legacy Supabase comments; naming `*Admin` without elevated auth in `credits.ts`.
- Marketing monolith size (no direct security issue).

---

## Thermo-nuclear quality bar (structural)

**Presumptive blockers for large refactors:**

- `generate/page.tsx` (4912 lines) and `fast-generate/page.tsx` (1968 lines) should not grow further; extract shared `useGenerationFlow` before new features.
- `RoomSetup.tsx`, `CoreProfileWizard.tsx`, `MarketingEntryScreen.tsx` — split steps/sections into dedicated files.
- `scoring.ts` — split per `GenerationSource` integrator.

---

## Suggested fix order

See [FIX_PLAN.md](./FIX_PLAN.md) for proposed `fix/thermos-*` branches.

1. Security hotfixes (credits auth, API proxy auth, GCP webhook verification, remove/guard debug routes).
2. Backend auth middleware + sanitize GET responses (never return `password_hash`).
3. Supabase policy strategy (research vs prod environments).
4. Infra: Secret Manager, authenticated Cloud Run or API gateway.
5. Giant-file decomposition (separate PRs per file).

---

## Shard references

- [shard-A-api.md](./shard-A-api.md)
- [shard-B-backend-gcp.md](./shard-B-backend-gcp.md)
- [shard-C-supabase.md](./shard-C-supabase.md)
- [shard-D-giants.md](./shard-D-giants.md)
- [shard-E-frontend-rest.md](./shard-E-frontend-rest.md)
- [shard-F-infra.md](./shard-F-infra.md)
