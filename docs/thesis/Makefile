# Dissertation build helpers (run from docs/thesis/)
TEX = main.tex
ENGINE = -pdflua
LATEXMK = latexmk $(ENGINE)

.PHONY: pdf watch clean cleanall chapter help

help:
	@echo "Targets:"
	@echo "  make pdf              - full PDF build"
	@echo "  make watch            - continuous rebuild"
	@echo "  make chapter C=06-metodologia - partial include build"
	@echo "  make clean            - remove aux files"
	@echo "  make cleanall         - remove aux + PDF"

pdf:
	$(LATEXMK) $(TEX)

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
