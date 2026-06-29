Fact-check the selected thesis text or the current file section against IDA implementation.

Requirements:
1. Read `@thesis/CANONICAL_SOURCES.md` and relevant `@docs/canon/` files
2. For each factual claim about the system, verify in code:
   - `apps/frontend/src/lib/gcp-data.ts`
   - `apps/frontend/src/lib/flow/fast-flow-progress.ts`
   - `apps/frontend/src/lib/flow/full-flow-progress.ts`
   - `apps/frontend/src/app/o-projecie/page.tsx` (institution)
   - `infra/gcp/sql/01_research_schema.sql` (data model)
3. Output:
   - **Verified** — claim + source file
   - **Incorrect** — claim + correction + source
   - **Unverifiable** — needs author decision
4. Flag wrong institution (ASP vs Szczecin), wrong product name (Aura), wrong stack (Supabase/Modal)
5. Suggest corrected Polish phrasing for incorrect sentences
6. Do not rewrite entire chapter — focused audit only
