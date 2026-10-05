# Capture: ścieżka szybka IDA (thesis figures)

```bash
cd docs/thesis/scripts
npm install playwright   # once
npx playwright install chromium
node capture-fast-flow.mjs
```

Output: `../figures/ida/flow/ch07-flow-quick-*.png` (9 screens, ~5–8 min on production API).

LaTeX: `chapters/07b-flow-quick-screens.tex` (included from `07-artefakt-ida.tex`).
