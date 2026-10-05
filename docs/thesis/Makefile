# Dissertation build helpers (run from docs/thesis/)
TEX = main.tex
ENGINE = -pdflua
LATEXMK = latexmk $(ENGINE)

.PHONY: pdf pdf-wersja snapshot-tex build-tex-pdf watch clean cleanall chapter help

SAVE_WERSJA = powershell -NoProfile -ExecutionPolicy Bypass -File scripts/save-wersja-pdf.ps1
SNAPSHOT_TEX = powershell -NoProfile -ExecutionPolicy Bypass -File scripts/snapshot-wersja-tex.ps1
BUILD_TEX_PDF = powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-wersja-tex-pdf.ps1

help:
	@echo "Targets:"
	@echo "  make pdf              - full PDF build + copy to wersje-pdf/robocza-NN.pdf"
	@echo "  make pdf-wersja       - copy main.pdf to wersje-pdf/ (from notes/WERSJA.md)"
	@echo "  make snapshot-tex N=3 - snapshot live .tex to wersje-tex/robocza-NN/"
	@echo "  make build-tex-pdf N=1 - build PDF from wersje-tex/robocza-NN/ to wersje-pdf/"
	@echo "  make watch            - continuous rebuild"
	@echo "  make chapter C=06-metodologia - partial include build"
	@echo "  make clean            - remove aux files"
	@echo "  make cleanall         - remove aux + PDF"

pdf:
	$(LATEXMK) $(TEX)
	$(SAVE_WERSJA)

pdf-wersja:
	$(SAVE_WERSJA)

snapshot-tex:
	@test -n "$(N)" || (echo "Usage: make snapshot-tex N=3"; exit 1)
	$(SNAPSHOT_TEX) -Number $(N)

build-tex-pdf:
	@test -n "$(N)" || (echo "Usage: make build-tex-pdf N=1"; exit 1)
	$(BUILD_TEX_PDF) -Number $(N)

watch:
	$(LATEXMK) -pvc $(TEX)

# Example: make chapter C=07-artefakt-ida
chapter:
	@test -n "$(C)" || (echo "Usage: make chapter C=06-metodologia"; exit 1)
	$(LATEXMK) -pretex='\includeonly{chapters/$(C)}' -usepretex $(TEX)

clean:
	$(LATEXMK) -c $(TEX)
	rm -f chapters/*.aux frontmatter/*.aux backmatter/*.aux

cleanall:
	$(LATEXMK) -C $(TEX)
	rm -f chapters/*.aux frontmatter/*.aux backmatter/*.aux
	rm -f main.pdf
