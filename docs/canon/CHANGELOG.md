# Canon documentation changelog

## 2026-06-11 — Initial canon setup

Created canonical documentation layer for doctoral thesis writing:

- `institution-and-project.md` — Akademia Sztuki w Szczecinie, IDA, RTD scope
- `system-overview.md` — GCP stack, monorepo layout
- `user-flow.md` — fast (4 steps) and full (12 steps) from `fast-flow-progress.ts` / `full-flow-progress.ts`
- `data-model.md` — Cloud SQL schema from `infra/gcp/sql/01_research_schema.sql`
- `research-variables.md` — variables cross-checked with SQL and data dictionary
- `personalization-pipeline.md` — prompt synthesis and 5-image matrix

Also added:

- `thesis/` folder with glossary and chapter skeletons
- `.cursorignore` to exclude legacy docs from Cursor indexing
- Cursor skill `thesis-writing`, rules, and commands

### Verified facts

- Institution: Akademia Sztuki w Szczecinie (not Akademia Sztuk Pięknych)
- Product name: IDA (not Aura as product name)
- Persistence: GCP via `gcp-data.ts` (not Supabase runtime)

### Known gaps / follow-up

- Official thesis title in `thesis/GLOSSARY.md` — TO BE COMPLETED by author
- `DASHBOARD_DATA_INVENTORY.md` has legacy route names — do not cite routes without checking `user-flow.md`
- `docs/MASTER_PLAN.md` technical sections partially outdated — use `system-overview.md`
