# Official `/thermos` run — 2026-05-29

**Branch:** `audit/thermos-2026-05` vs `main` (diff = audit docs only)  
**Plugin:** Thermos (installed) — `thermo-nuclear-review-subagent` + `thermo-nuclear-code-quality-review-subagent` in parallel  
**Mode:** Read-only

## Unified verdict

| Reviewer | Verdict |
|----------|---------|
| Security / correctness | **Fail** — exploitable IDOR, auth bypass on credits, unauthenticated GCP billing + public Cloud Run |
| Code quality | **Fail** — do not approve PRs that grow giant files; structural debt blocks maintainability |

Prior manual audit in [REPORT.md](./REPORT.md) is **largely confirmed** with corrections and gaps below.

---

## Confirmed Critical (both reviewers)

1. **`isAuthenticated` from JSON body** on `/api/credits/check` and `/deduct` — no server session (`check/route.ts` ~41–48, `deduct/route.ts`).
2. **Public Google AI + ElevenLabs proxies** — no auth, no rate limits.
3. **GCP Stripe billing routes without signature** — `backend-gcp/routes/billing.ts` (Next `stripe/webhook` **does** verify; exploit is direct GCP call).
4. **Credit farming** — `grant-free`, `POST /ensure`, Supabase auto-grant trigger.
5. **`set-password` / session UPSERT / link-auth** without identity proof — GCP `auth.ts`, `participants.ts`.
6. **`password_hash` in GET session** — `SELECT *` without redaction.
7. **Permissive Supabase RLS** + open storage — research-kiosk model, not production-safe.
8. **`localStorage` auth + browser `gcpApi`** — no bearer token to Cloud Run.

---

## Corrections to [REPORT.md](./REPORT.md)

| Claim | Thermos says |
|-------|----------------|
| C-3 “Stripe webhook” | Clarify: **Next** webhook is OK; **GCP** `/api/billing/stripe/*` is not |
| H-5 subscription self-grant | **Partial false positive** — `auth.uid()` vs `email:` `auth_user_id` mismatch; real risk is C-7 + GCP |
| H-11 giant files as **High security** | Downgrade to **maintainability** — not direct exploits |

---

## Gaps to add (missing from first REPORT)

| ID | Finding |
|----|---------|
| NEW-C | GCP `MIGRATE_SECRET` default `awa-migrate-2025` + `GET /api/debug/participants-auth-column` |
| NEW-H | `CRON_SECRET` optional on `/api/credits/expire` — open if env unset |
| NEW-H | `POST /session` IDOR — overwrite research data with known `userHash` |
| NEW-M | `test/allocate-credits` blocked only when `NODE_ENV === 'production'` (staging still open) |

---

## Code quality highlights (thermo-nuclear-code-quality)

| File | Lines | Blocker |
|------|------:|---------|
| `flow/generate/page.tsx` | 4912 | `handleMatrixGeneration` L881–2077 (~1196 lines) in one function |
| `flow/fast-generate/page.tsx` | 1968 | Duplicate of generate — extract `lib/flow/generation/` first |
| `RoomSetup.tsx` | 2433 | Split steps to separate files |
| `CoreProfileWizard.tsx` | 2082 | Same |
| `prompt-synthesis/scoring.ts` | 2019 | Split per `GenerationSource`; remove hot-path `console.log` |
| `gcp-data.ts` | 1275 | Split persist / research / storage |
| `useSession.ts` | 974 | Split merge policies |

**Approval bar for future fix PRs:** no net growth of files >1k; no new client `gcpApi` calls from components; no more duplicated generate/fast-generate logic.

---

## Suggested fix order (unchanged, Thermos-aligned)

1. `fix/thermos-credits-server-auth`
2. `fix/thermos-google-elevenlabs-guard`
3. `fix/thermos-gcp-webhook-verify` + `fix/thermos-gcp-auth-hardening`
4. `fix/thermos-remove-debug-routes`
5. Structural PRs per [FIX_PLAN.md](./FIX_PLAN.md) — only after security hotfixes

---

## Full subagent outputs

Detailed markdown from each subagent is embedded in the Cursor session (security + quality). This file is the **synthesized rollup** per Thermos skill step 5.
