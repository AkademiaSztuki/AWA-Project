# Phase 4 review — multi-agent dissertation sprint

**Date:** 2026-08-02  
**Branch:** `pisemna`  
**Build:** `make pdf` OK — **102 pages** (no undefined citations)

## STATUS map

| File | STATUS | Notes |
|------|--------|-------|
| ch01–ch07 + frontmatter + app A–H | `review` | Full prose drafts; open `\Todo`/`\NeedsCite` remain |
| ch08–ch10 | `draft` | Empirical skeleton — waiting for export data |
| `_archive-05-ai-hci.tex` | `archived` | Not in `\include` |

## Anti-hallucination grep

| Check | Result |
|-------|--------|
| FLUX as current production | Pass (genealogy only) |
| ComfyUI as runtime | Pass (explicitly denied) |
| Matrix = 6 sources | Pass |
| IPIP-60 as current | Pass (negated) |
| Invented p-values / N in wyniki | Pass (only `\Todo` placeholders) |
| Undefined citations | Pass |

## Backlog — `\NeedsCite` (author / next research pass)

| Chapter | Count | Themes |
|---------|------:|--------|
| ch05 osobowość | 7 | IPIP docs, Gosling room cue, Nasar, color psych, ethics of personality recs |
| ch04 medium | 3 | Arch/design diffusion surveys; VLM×design; authorship theory |
| ch02 przestrzeń | 3 | Ulrich 1991 / reviews; Pasini PRS-11; PEO |
| ch03 preferencje | 1 | IAT/HCI reviews |
| ch01 intro | 1 | Critical survey of consumer AI interior tools |

## Backlog — `\Todo` (assets / data)

| Area | Count | Action for author |
|------|------:|-------------------|
| ch08 wyniki | 26 | Export pilot data (funnel, `selected_source`, mismatch, Big Five, PRS gap, UX) |
| appendix G / ch04 figures | ~11 | Drop ComfyUI/depth/SAM/fail screens into `figures/comfyui/` |
| ch02–ch03 / ch06–ch07 figures | few | Diagrams + IDA UI screens into `figures/ida/` |

## Recommended next sprints

1. Author drops ComfyUI portfolio images → media-lab pass to uncomment `\includegraphics`.
2. Author provides pilot export → empirical pass fills ch08 tables/figures only.
3. Coordinator resolves top `\NeedsCite` with verified DOIs (especially Gosling / Pasini).
4. Promotor sync on thesis one-liner + monografia vs cykl.

## Do not

- Merge `pisemna` → `main` unless explicitly requested.
- Mark `final` while `\Todo` / `\NeedsCite` remain.
