# Baseline note

- `pnpm --filter @aura/frontend type-check` — **exit 0** (recorded in `baseline.txt`).
- `pnpm lint`, `pnpm test`, `pnpm run build:research-stack` — re-run locally; turbo lint exceeded automation timeout while `baseline.txt` was being written.

```powershell
pnpm lint
pnpm test
pnpm run build:research-stack
```

Append results to `baseline.txt` before relying on CI for fix PRs.
