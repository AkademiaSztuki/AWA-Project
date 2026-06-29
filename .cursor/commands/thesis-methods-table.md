Generate a methodology table of research variables in Polish.

Requirements:
1. Read `@docs/canon/research-variables.md` and `@docs/canon/data-model.md`
2. Verify column names against `@infra/gcp/sql/01_research_schema.sql` when possible
3. Output markdown table: Zmienna | Typ | Definicja operacyjna | Źródło w systemie (route/table)
4. Scope to variables requested by user, or default: identification + implicit + explicit + Big Five + outcomes
5. Mark any row that could not be verified `[WERYFIKACJA_KOD]`
6. Do not include variables from archived docs or legacy routes (`/flow/dna`, Modal, Supabase)
