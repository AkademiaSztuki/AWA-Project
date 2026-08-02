---
name: latex-thesis
description: LaTeX multi-agent writing for the IDA doctoral dissertation on branch pisemna. Use when editing docs/thesis/**/*.tex, bibliography, figures, or building the dissertation PDF.
---

# LaTeX thesis (IDA)

Canonical guide lives in the dissertation tree:

1. Read and follow `docs/thesis/AGENTS.md` (ownership, labels, bib rules).
2. Follow `docs/thesis/skills/latex-thesis/SKILL.md` for writing/build checklist.
3. Content sources: `docs/thesis/notes/SPIS_TRESCI_ROBOCZY.md`, `docs/thesis/notes/HIPOTEZY_REWIZJA.md`.

```bash
cd docs/thesis && make pdf
# or partial: make chapter C=06-metodologia
```

Edit only owned `.tex` files under `docs/thesis/`. Do not merge into `main` unless the user asks.
