---
name: latex-thesis
description: LaTeX multi-agent writing for the IDA doctoral dissertation on branch pisemna. Use when editing docs/thesis/**/*.tex, bibliography, figures, or building the dissertation PDF.
---

# LaTeX thesis (IDA) — agent skill

## Before editing

1. Confirm work stays under **`docs/thesis/`** (canonical thesis folder on branch `pisemna`).
2. Read **`docs/thesis/GLOSSARY.md`** first — terminology canon (IDA vs Aura, RQ1–6, six sources, Gemini vs FLUX, ComfyUI = lab).
3. Read `docs/thesis/AGENTS.md` and respect `OWNER` for the target file.
4. Read the chapter file header (`OWNER`, `STATUS`) and `notes/SPIS_TRESCI_PROPOZYCJA_ASP.md` / `HIPOTEZY_REWIZJA.md` as needed.
5. New term/acronym/model name → add to `GLOSSARY.md` before using it in prose; sync `frontmatter/abbreviations.tex` if it is an acronym.

## Writing rules

- Prose in **Polish**; keep LaTeX commands/comments in English when technical.
- One chapter == one `.tex` file under `chapters/` (or `frontmatter/` / `backmatter/`).
- Use macros: `\Todo{}`, `\NeedsCite{}`, `\RQ{1}`, `\Hyp{3}`, `\parencite{key}`.
- Labels: `chNN:sec:...`, `fig:chNN:...`, `tab:chNN:...`, `app:x:top`.
- Add bibliography keys to `bibliography/references.bib` only; never rewrite unrelated entries.
- Do not edit `preamble.tex` / `main.tex` unless acting as `coordinator`.

## Build / verify

```bash
cd docs/thesis
make chapter C=06-metodologia   # fast check of your chapter
make pdf                        # full document
```

Fix LaTeX errors in **your** files first. If the error is in shared preamble, stop and report as coordinator work.

## Sources of truth for content

| Topic | File |
|-------|------|
| Terminology (must match) | `GLOSSARY.md` |
| TOC / ASP narrative | `notes/SPIS_TRESCI_PROPOZYCJA_ASP.md` |
| Hypotheses / RQs | `notes/HIPOTEZY_REWIZJA.md` |
| Ownership / workflow | `AGENTS.md` |
| Metadata (title, promotor) | `metadata.tex` |

## Done checklist

- [ ] Only owned files changed
- [ ] Labels namespaced
- [ ] New cites exist in `.bib`
- [ ] `make pdf` or `make chapter` succeeds
- [ ] `STATUS` updated if scope of work changed
- [ ] Commit message: `thesis(chXX): ...`
