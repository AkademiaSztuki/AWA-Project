# Jak otwierać i kompilować rozprawę (FAQ)

## Dlaczego `main.tex` prawie nie ma tekstu?

`main.tex` to **szkielet dokumentu**: ustawienia, kolejność frontmatter, `\include{chapters/01-wprowadzenie}` itd. Cała proza jest w plikach rozdziałów, np.:

- `chapters/01-wprowadzenie.tex`
- `chapters/06-metodologia.tex`
- `frontmatter/abstract.tex`

W edytorze otwieraj i edytuj **konkretny rozdział**, albo `main.tex` tylko do pełnego składu PDF.

## TeXworks / edytor LaTeX

- Kompilator: **LuaLaTeX** (nie pdfLaTeX).
- W `preamble.tex` jest `fontspec` — pdfLaTeX się wyłoży.
- W TeXworks: Ustawienia → Kompilator domyślny → LuaLaTeX.

## Gdzie czytać gotowy PDF?

- **Aktualna wersja po `make pdf`:** `docs/thesis/main.pdf`
- **Archiwum:** `docs/thesis/wersje-pdf/robocza-01.pdf`, `robocza-02.pdf`, `robocza-03.pdf`, `robocza-04.pdf`

Nie szukaj pełnej treści w samym `main.tex` — to normalne.

## Jak zbudować PDF z terminala?

```bash
cd docs/thesis
make pdf
```

Wymaga: TeX Live (LuaLaTeX), `latexmk`, `biber`.

## Gdzie są stare wersje `.tex`?

Snapshoty (tylko do odczytu / porównań):

- `wersje-tex/robocza-01/`
- `wersje-tex/robocza-03/`
- `wersje-tex/robocza-04/`

Mapa wersji: `notes/WERSJA.md`.

## `versions/robocza-01/`

To już **nie** jest kopia źródeł — tylko `README.md` z linkiem do `wersje-tex/robocza-01/`.
