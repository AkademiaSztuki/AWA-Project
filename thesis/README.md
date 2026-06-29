# Praca doktorska — folder roboczy

Tekst pracy w Markdown. Kod i kanoniczna dokumentacja pozostają w repozytorium IDA; ten folder to **Twoja narracja** i szkice rozdziałów.

## Struktura

| Plik | Cel |
|------|-----|
| `GLOSSARY.md` | Terminy, instytucja, fakty — źródło prawdy dla AI |
| `CANONICAL_SOURCES.md` | Co cytować, czego unikać |
| `00-outline.md` | Plan rozdziałów |
| `01-wstep.md` … `07-zakonczenie.md` | Rozdziały |
| `figures/` | Diagramy Mermaid, eksporty PNG |

## Workflow w Cursorze

1. Otwórz jeden rozdział (`thesis/03-metodologia.md`).
2. W czacie użyj `@thesis/GLOSSARY.md` + `@docs/canon/...` (odpowiedni plik).
3. Poproś o **szkic jednej sekcji** (nie całego rozdziału).
4. Uruchom komendę `/thesis-fact-check` na gotowym akapicie.
5. Zredaguj własnym głosem; usuń oznaczenia `[WERYFIKACJA_KOD]` po weryfikacji.

Skill: `.cursor/skills/thesis-writing/SKILL.md`  
Reguły: `.cursor/rules/thesis-writing.mdc`, `canon-facts.mdc`

## Eksport do Word / LaTeX

### Pandoc (zalecane)

Z root repozytorium, po uzupełnieniu rozdziałów:

```bash
pandoc thesis/01-wstep.md thesis/02-teoria-i-stan-wiedzy.md thesis/03-metodologia.md \
  thesis/04-narzedzie-ida.md thesis/05-wyniki.md thesis/06-dyskusja.md thesis/07-zakonczenie.md \
  -o thesis/export/praca.docx --toc
```

LaTeX (szablon uczelni wymaga dopasowania):

```bash
pandoc thesis/*.md -o thesis/export/praca.tex --toc
```

### Ręcznie

Kopiuj sekcje do szablonu ASP w Word — zachowaj nagłówki `#` / `##` jako mapę struktury.

## Checklist przed oddaniem promotorowi

- [ ] Brak „Akademia Sztuk Pięknych”, „Aura”, „AWA” jako nazwy produktu
- [ ] Stack opisany jako GCP (nie Supabase / Modal jako produkcja)
- [ ] Flow fast (4 kroki) vs full (12 kroków) zgodny z `docs/canon/user-flow.md`
- [ ] Każde twierdzenie o implementacji ma źródło w kodzie lub `docs/canon/`
- [ ] Bibliografia z Zotero — brak wymyślonych pozycji

## Utrzymanie

Przy większej zmianie w flow lub schemacie bazy zaktualizuj odpowiedni plik w `docs/canon/` i wpis w `docs/canon/CHANGELOG.md`.
