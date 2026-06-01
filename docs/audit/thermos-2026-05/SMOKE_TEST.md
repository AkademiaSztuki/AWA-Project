# Research smoke test (Thermos regression)

**SQL przed/po flow (Cloud SQL):** [SMOKE_TEST_SQL_BEFORE_AFTER.md](./SMOKE_TEST_SQL_BEFORE_AFTER.md)

Run on **staging** with real `NEXT_PUBLIC_GCP_API_BASE_URL`. Repeat after each Phase 1–2 merge.

## Preconditions

- `NEXT_PUBLIC_DISABLE_SESSION_SYNC` is **not** set (or `0`).
- Cloud SQL migrations applied, including `infra/gcp/sql/15_anon_usage.sql`.
- `NEXT_PUBLIC_GCP_API_BASE_URL` points at staging Cloud Run.

## Flow

1. **Consent** — New participant accepts research consent (checkbox + art. 13). Confirm `consentTimestamp` in session / local storage.
2. **Behavioral** — Swipe / dwell (if enabled). No errors in browser console.
3. **Anon limits** — `POST /api/session/init` sets anon cookie. Run **fast** path generation once; second attempt on same `pathScope` returns **429**.
4. **Persistence** — Reload page; session data restores via GCP (`fetchSession` / snapshot).
5. **Thanks export** — Complete flow to Thanks; verify `session_export_json` in Cloud SQL or GCP logs.
6. **OAuth (optional)** — Google login → `grant-free` once → credits on **full** path.

## Cloud SQL checks

- New `participants` row with `consent_timestamp` after consent.
- `participant_swipes`, `participant_generations`, `participant_research_events` grow during flow.
- `anon_usage` increments on anon generate (not only in-memory dev fallback).
- `session_export_json` non-empty after Thanks.
- No spike of `skip_session_sync_disabled` / `skip_no_userHash` in persistence logs.

## Billing (after Stripe webhook hardening)

- Stripe test webhook on staging Next route succeeds.
- Forged `POST` to GCP `/api/billing/stripe/*` without internal secret returns **401**.
