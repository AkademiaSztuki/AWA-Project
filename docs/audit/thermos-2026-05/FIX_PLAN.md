# Proposed fix branches (awaiting your approval)

Do **not** start these until you review [REPORT.md](./REPORT.md). Each row = one small PR from `main`.

| Branch | Scope | Report IDs |
|--------|-------|------------|
| `fix/thermos-credits-server-auth` | Verify session on `/api/credits/*`; remove body `isAuthenticated`; bind `userHash` to auth user; fail-closed on check | C-1, H-8 |
| `fix/thermos-google-elevenlabs-guard` | Auth + rate limit on AI/TTS routes; payload size caps | C-2 |
| `fix/thermos-remove-debug-routes` | Remove or gate `debug/print`, `test/allocate-credits`; require `CRON_SECRET` on expire | H-9, Medium |
| `fix/thermos-gcp-webhook-verify` | Stripe signature on GCP billing routes; disable direct grant without event | C-3 |
| `fix/thermos-gcp-auth-hardening` | Auth middleware; redact `password_hash` from GETs; secure set-password + link-auth + session UPSERT | C-4–C-6, H-2–H-4 |
| `fix/thermos-stripe-portal-checkout` | Ownership checks on portal/checkout; validate redirect URLs | H-1 |
| `fix/thermos-open-redirect` | Allowlist relative paths on verify pages | H-7 |
| `fix/thermos-gcp-client-server-only` | Move sensitive `gcpApi` calls behind Next server routes or signed tokens | C-9, H-1 (client) |
| `fix/thermos-supabase-rls-prod` | Separate migration set or env-specific policies for production | C-7, C-8, H-5–H-6 |
| `fix/thermos-infra-secrets` | Secret Manager + restrict Cloud Run IAM | H-10 |
| `fix/thermos-split-generate-page` | Extract matrix/modify/credits from `generate/page.tsx` | H-11, structural |
| `fix/thermos-unify-fast-generate` | Shared hook with generate; delete duplication | H-11 |

## Verification per PR

```powershell
pnpm --filter @aura/frontend type-check
pnpm --filter @aura/frontend test
# Manual smoke: /flow/generate, /flow/fast-generate, login, credits, Stripe webhook (staging)
```

## After you approve

Reply with which branch numbers to implement first; agent will create branches from `main` (not from `audit/thermos-2026-05`).
