---
name: thesis-writing
description: Doctoral thesis writing for IDA project. Use when drafting thesis chapters, methodology sections, tool descriptions, or academic text in thesis/. Requires GLOSSARY and docs/canon as sources. Polish academic style.
---

# Thesis Writing for IDA Doctoral Research

## When to use

- Drafting or editing files in `thesis/`
- Writing methodology, tool description, or RTD narrative
- Generating tables of research variables
- Fact-checking thesis text against implementation

## Mandatory sources

Before writing facts, read:

1. `thesis/GLOSSARY.md` — terminology and institution
2. `thesis/CANONICAL_SOURCES.md` — trust hierarchy
3. Relevant `docs/canon/*.md` for the section

For implementation claims, verify against code:

- `apps/frontend/src/lib/gcp-data.ts`
- `apps/frontend/src/lib/flow/fast-flow-progress.ts`
- `apps/frontend/src/lib/flow/full-flow-progress.ts`
- `infra/gcp/sql/01_research_schema.sql`

## Forbidden sources (do not cite as facts)

- `docs/archive/**`
- `PODSUMOWANIE_PROJEKTU.md`, `DATA_LINEAGE.md`, `DEEP_PERSONALIZATION_README.md`
- `COST_ANALYSIS_*.md`
- `apps/frontend/supabase/**` (legacy schema reference)
- `docs/MASTER_PLAN.md` for stack/flow (use canon instead)

## Canonical facts

| Topic | Correct value |
|-------|---------------|
| University | Akademia Sztuki w Szczecinie |
| Product | IDA (not Aura as product name) |
| Persistence | GCP — Cloud Run, Cloud SQL, GCS |
| Auth | Google native (not Supabase) |
| Image generation | Google Vertex/Gemini via `/api/google/*` |

## Writing style

- Language: Polish academic prose
- Technical terms: match `thesis/GLOSSARY.md`
- Paragraphs: 3–6 sentences
- No marketing language (“revolutionary”, “first in the world”)
- No invented bibliography — use `[Autor, rok — DO UZUPEŁNIENIA]`

## Output rules

1. **Draft one section at a time**, not entire chapters
2. Mark unverified implementation claims: `[WERYFIKACJA_KOD]`
3. Mark missing bibliography: `[DO UZUPEŁNIENIA]`
4. After draft, suggest fact-check against specific code files
5. Author must redact in their own voice — output is a sketch

## Section templates

### Methodology — variable table

```markdown
| Zmienna | Definicja operacyjna | Źródło w systemie |
|---------|----------------------|-------------------|
| ... | ... | `participants.column` or route |
```

Source: `docs/canon/research-variables.md`

### Tool description (RTD)

1. Design rationale (why artifact, not lab study)
2. Architecture summary (link to `docs/canon/system-overview.md`)
3. User flow fast vs full (`docs/canon/user-flow.md`)
4. Personalization pipeline (`docs/canon/personalization-pipeline.md`)
5. Limitations (e.g. fast path without full Big Five)

### Limitations section

Always include:

- Prototype status
- Self-selection bias in online participants
- AI model versioning
- Path differences (fast vs full)

## Commands

- `/thesis-outline` — section outline
- `/thesis-methods-table` — variables table from canon
- `/thesis-fact-check` — verify selection against code + canon
