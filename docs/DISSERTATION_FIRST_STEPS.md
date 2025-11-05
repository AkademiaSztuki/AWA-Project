# PIERWSZE KROKI - Praca Doktorska AWA
## Praktyczny checklist na najbliższe tygodnie/miesiące

**Ostatnia aktualizacja**: 2025-11-05  
**Status**: Ready to start!

---

## 🚀 TYDZIEŃ 1: PRZYGOTOWANIE (Teraz!)

### 📖 Przeczytaj dokumentację
- [ ] **DISSERTATION_EXECUTIVE_SUMMARY.md** (15 min) - Szybki przegląd
- [ ] **DISSERTATION_PLAN.md** (60 min) - Pełna struktura pracy
- [ ] **DISSERTATION_VISUAL_OVERVIEW.md** (30 min) - Diagramy i flow
- [ ] **Ten dokument** (10 min) - Checklist działań

**TOTAL**: ~2 godziny na zrozumienie całości

---

### 📋 Sprawdź wymagania ASP Warszawa
- [ ] **Website ASP** - Znajdź regulamin studiów doktoranckich
- [ ] **Format pracy**:
  - [ ] Język: PL, EN, czy obie wersje?
  - [ ] Objętość: Min/max stron?
  - [ ] Format: A4, czcionka (Times? Arial?), marginesy?
  - [ ] Styl cytowań: APA 7? Chicago? MLA?
- [ ] **Publikacje**:
  - [ ] Ile publikacji wymaganych przed obroną?
  - [ ] Czy conference papers liczą się jako peer-reviewed?
  - [ ] Czy musisz być first author?
- [ ] **Procedury**:
  - [ ] Kolokwia doktoranckie (ile, kiedy)?
  - [ ] Milestone reviews?
  - [ ] Deadlines na drafty chapters?
- [ ] **Komitet**:
  - [ ] Skład (ilu członków, jakie specjalizacje)?
  - [ ] Czy potrzebny external advisor?
  - [ ] Recenzenci (krajowi? zagraniczni?)?
- [ ] **Etyka**:
  - [ ] Czy ASP ma ethics committee / IRB?
  - [ ] Procedura zatwierdzania badań
  - [ ] Formularz zgody (template dostępny?)

**ACTION**: Zapisz znalezione informacje w dokumencie (np. `ASP_REQUIREMENTS.md`)

---

### 👨‍🏫 Przygotuj spotkanie z promotorem

- [ ] **Zaplanuj spotkanie** (w ciągu 7 dni)
- [ ] **Przygotuj dokumenty**:
  - [ ] Wydrukuj/wyślij Executive Summary (8 stron)
  - [ ] Link do pełnego planu (GitHub lub PDF)
  - [ ] Visual Overview (diagramy)
- [ ] **Przygotuj pytania** (z Executive Summary, sekcja "Pytania do Promotora"):
  ```
  ZAKRES:
  □ Czy 4 studia to odpowiedni zakres?
  □ Czy N=950 total to realistic?
  □ Czy interdyscyplinarność OK dla ASP?
  
  PUBLIKACJE:
  □ Ile publikacji wymaganych?
  □ Czy CHI/DIS liczą się jako peer-reviewed?
  □ Co-authorship z promotorem expected?
  
  TIMELINE:
  □ Czy 4 lata to realistic?
  □ Kolokwia / milestone reviews?
  □ Deadlines?
  
  METODOLOGIA:
  □ RTD acceptable dla ASP?
  □ Ethics committee approval needed?
  □ Język pracy: PL, EN?
  
  FINANSE:
  □ Funding dla rekrutacji (~5k PLN)?
  □ Conference travel?
  □ Open access fees?
  
  KOMITET:
  □ Skład (design + psychology + AI)?
  □ External reviewers?
  ```

**AGENDA SPOTKANIA (50 min)**:
1. Feedback na proposal (10 min)
2. Zakres i timeline (15 min)
3. Metodologia (10 min)
4. Publikacje & komitet (10 min)
5. Next steps (5 min)

---

## 🔬 MIESIĄC 1-2: PILOT STUDY

### 📚 Literatura (Start reading)

**Przeczytaj w tej kolejności** (minimum 4 najważniejsze):

#### Must-Read (Teoria - PRIORITY 1)
- [ ] **Kaplan, R., & Kaplan, S.** (1989). *The Experience of Nature: A Psychological Perspective*
  - → Attention Restoration Theory (ART)
  - → Foundational dla Study 2
- [ ] **Pasini, M., et al.** (2014). *Measuring the Restorativeness of the Environment: The PRS-11*
  - → PRS-11 scale
  - → Jak adaptować na 2D grid (Study 1)
- [ ] **Greenwald, A. G., et al.** (1998). *Measuring Individual Differences in Implicit Cognition: The IAT*
  - → Implicit Association Test
  - → Adaptacja na Tinder swipes (Study 3)
- [ ] **Zimmerman, J., et al.** (2007). *Research Through Design as a Method for Interaction Design Research*
  - → RTD methodology
  - → Jak uzasadnić artefakt (AWA) jako instrument badawczy

#### Should-Read (Metody - PRIORITY 2)
- [ ] **Reynolds, T. J., & Gutman, J.** (1988). *Laddering Theory, Method, Analysis, and Interpretation*
- [ ] **Kellert, S. R.** (1993). *The Biophilia Hypothesis*
- [ ] **Osgood, C. E., et al.** (1957). *The Measurement of Meaning*
- [ ] **Gifford, R.** (2014). *Environmental Psychology: Principles and Practice* (6th ed.)

#### Nice-to-Read (AI & Personalization - PRIORITY 3)
- [ ] **Shneiderman, B.** (2020). *Human-Centered AI*
- [ ] **Lubart, T.** (2005). *How Can Computers Be Partners in the Creative Process?*
- [ ] **Rombach, R., et al.** (2022). *High-Resolution Image Synthesis with Latent Diffusion Models*

**TIP**: Użyj Zotero lub Mendeley do zarządzania literaturą od początku!

---

### 🧪 Przygotuj Pilot Study (N=20-30)

**Cel**: Validate instruments, test UX, get feedback

#### Krok 1: Dokończ system AWA (jeśli potrzeba)
- [ ] Test end-to-end flow (Landing → Thanks)
- [ ] Fix any bugs
- [ ] Ensure data saves correctly to Supabase
- [ ] Mobile responsive check
- [ ] Bilingual check (PL + EN działa?)

#### Krok 2: Przygotuj materiały badawcze
- [ ] **Informed Consent Form**:
  - [ ] Cel badania
  - [ ] Czas trwania (~20 min)
  - [ ] Anonimowość (user_hash)
  - [ ] Prawo do wycofania
  - [ ] Kontakt (email, telefon)
  - [ ] PL + EN wersje
- [ ] **Recruitment post**:
  ```
  SZUKAM UCZESTNIKÓW DO BADANIA! 🏠✨
  
  Testuję system AI do projektowania wnętrz (praca doktorska ASP).
  
  Jak to działa?
  • 20 min (online, z domu)
  • Profil psychologiczny + preferencje wizualne
  • AI wygeneruje spersonalizowany projekt Twojego wnętrza
  • Otrzymasz wynik + możliwość wygrania [incentive?]
  
  Udział jest anonimowy i możesz się wycofać w każdej chwili.
  
  Zainteresowany/a? → [link]
  ```
- [ ] **Post-study interview questions**:
  ```
  1. Czy instrukcje były jasne?
  2. Czy pytania były zrozumiałe?
  3. Która część była najtrudniejsza?
  4. Która część była najciekawsza?
  5. Czy czas (20 min) był OK?
  6. Czy wynik (design) odzwierciedla Cię?
  7. Czy coś było frustrujące?
  8. Co byś zmienił/a?
  9. Czy poleciłbyś/poleciłabyś znajomym?
  10. Inne uwagi?
  ```

#### Krok 3: Rekrutacja (N=20-30)
- [ ] **Social media** (Facebook, Instagram, LinkedIn):
  - [ ] Post with visuals (screenshot AWA)
  - [ ] ASP groups
  - [ ] Design/architecture groups
  - [ ] Psychology groups
- [ ] **ASP students**:
  - [ ] Poster w akademii
  - [ ] Email do kolegów/koleżanek
  - [ ] Prośba o share
- [ ] **Znajomi & rodzina**:
  - [ ] Personal outreach
  - [ ] Snowball sampling (poproś o polecenie)
- [ ] **Incentive?**:
  - [ ] Losowanie nagrody (100-200 PLN voucher Ikea?)
  - [ ] Lub: Każdy dostaje wydruk swojego designu?

**TARGET**: 20-30 complete sessions w ciągu 2-4 tygodni

#### Krok 4: Zbierz dane pilota
- [ ] Monitor completion rate (target: 70%+)
- [ ] Track drop-off points (gdzie ludzie rezygnują?)
- [ ] Measure time-on-task (czy 20 min realistic?)
- [ ] Export data (JSON/CSV) z Supabase
- [ ] Conduct 5-10 post-study interviews (Zoom/in-person)

#### Krok 5: Analiza pilota
- [ ] **Quantitative**:
  - [ ] Descriptive stats (means, SDs)
  - [ ] Completion rate (%)
  - [ ] Time per section (minutes)
  - [ ] Satisfaction scores (mean)
  - [ ] PRS pre/post (preliminary)
- [ ] **Qualitative**:
  - [ ] Thematic analysis (feedback, interviews)
  - [ ] UX issues (what to fix)
  - [ ] Suggestions (features, questions)
- [ ] **Instrument validation** (preliminary):
  - [ ] PRS gamified vs traditional (if tested): correlation r
  - [ ] Internal consistency: Cronbach's α

#### Krok 6: Raport z pilota
- [ ] Write brief report (5-10 pages):
  ```
  PILOT STUDY REPORT
  
  1. SAMPLE
     - N=X (X male, X female, age range)
     - Recruitment channels
     - Completion rate: X%
  
  2. RESULTS
     - Time-on-task: M=X min (SD=X)
     - Satisfaction: M=X/10 (SD=X)
     - PRS improvement: M=+X points (SD=X)
     - Drop-off points: [list]
  
  3. FEEDBACK (Themes)
     - Positive: [list]
     - Issues: [list]
     - Suggestions: [list]
  
  4. CHANGES TO BE MADE
     - [list fixes/improvements]
  
  5. READINESS FOR MAIN STUDY
     - ✓ Instruments valid
     - ✓ UX acceptable
     - ✓ Data pipeline works
     - → READY (or: needs X fixes)
  ```
- [ ] Share with promotor
- [ ] Iterate based on feedback

---

## 📝 MIESIĄC 3-4: PAPER 1 DRAFT (Gamified Scales)

### Struktura Paper 1

**Tytuł**: "Gamified Environmental Psychology Scales: Validation of Digital Alternatives to Traditional Measures"

**Target**: CHI 2026 / DIS 2026 (deadline ~October 2025)

#### Outline
```
ABSTRACT (250 words)
  - Problem: Low completion, survey fatigue
  - Solution: Gamified scales (mood grid, visual tests)
  - Method: Within-subjects (N=250)
  - Results: r>0.75, +200% completion, +50% satisfaction
  - Contribution: Validated digital alternatives

1. INTRODUCTION (2 pages)
   1.1. Problem: Traditional scales limitations
   1.2. Opportunity: Gamification
   1.3. Research Question
   1.4. Contribution

2. RELATED WORK (3 pages)
   2.1. Environmental Psychology Scales (PRS, Biophilia)
   2.2. Digital Questionnaires & UX
   2.3. Gamification in Research
   2.4. Validation Studies

3. METHOD (3 pages)
   3.1. Design (within-subjects)
   3.2. Participants (N=250, demographics)
   3.3. Instruments
        - PRS-11: Traditional Likert vs 2D Mood Grid
        - Biophilia: Traditional vs Visual Dosage (0-3)
   3.4. Procedure
   3.5. Analysis

4. RESULTS (3 pages)
   4.1. Construct Validity (correlations)
   4.2. Completion Rate
   4.3. Time-on-Task
   4.4. User Satisfaction

5. DISCUSSION (2 pages)
   5.1. Implications (digital research, UX, psychology)
   5.2. Trade-offs (engagement vs precision?)
   5.3. Limitations
   5.4. Future Work

6. CONCLUSION (1 page)

REFERENCES (2 pages)
```

#### Checklist
- [ ] **Week 1**: Intro + Related Work draft
- [ ] **Week 2**: Method draft
- [ ] **Week 3**: Results (with pilot data as preliminary)
- [ ] **Week 4**: Discussion + Conclusion
- [ ] **Week 5**: Revise, figures, format (CHI template)
- [ ] **Week 6**: Promotor feedback
- [ ] **Week 7**: Revisions
- [ ] **Week 8**: Submit (or: ready to submit when main study done)

**NOTE**: Możesz napisać draft z pilot data (N=20-30), potem update z main study (N=250) przed submitem.

---

## 🎯 MIESIĄC 5-6: STUDY 1 MAIN (N=250)

### Recruitment Campaign

**Budget**: ~1,250 PLN (250 participants × 5 PLN incentive)

#### Channels
- [ ] **Facebook Ads** (target: Polish adults 25-45, interest: interior design):
  - [ ] Budget: 500 PLN
  - [ ] Ad creative: AWA screenshots, compelling copy
  - [ ] Landing page: `/flow/path-selection`
- [ ] **Instagram** (organic + paid):
  - [ ] Budget: 300 PLN
  - [ ] Visuals: Beautiful AWA UI, 3D IDA character
  - [ ] Hashtags: #designwnętrz #AI #badanie
- [ ] **LinkedIn** (professional network):
  - [ ] Organic posts (no budget)
  - [ ] Target: Architects, designers, psychologists
- [ ] **University partnerships**:
  - [ ] ASP Warszawa (students, staff)
  - [ ] SWPS Psychology students (extra credit?)
  - [ ] Architecture schools
- [ ] **Design communities**:
  - [ ] Facebook groups (projektowanie wnętrz)
  - [ ] Reddit r/InteriorDesign (if international sample OK)
  - [ ] Polish design forums

#### Incentive
- [ ] **Option A**: Losowanie nagród (5× 100 PLN Ikea voucher)
- [ ] **Option B**: Każdy dostaje PDF z wynikiem (0 PLN, ale lower participation)
- [ ] **Option C**: First 50 dostają 10 PLN voucher, rest: lottery

**TARGET**: 250 complete sessions w ciągu 1-2 miesięcy

---

### Data Collection & Monitoring

- [ ] **Daily checks**:
  - [ ] Completion rate
  - [ ] Drop-off points
  - [ ] Bug reports
  - [ ] Time-on-task outliers
- [ ] **Weekly**:
  - [ ] Export data backup
  - [ ] Check data quality (missing values, outliers)
  - [ ] Adjust recruitment if needed
- [ ] **End of study**:
  - [ ] Final data export (JSON + CSV)
  - [ ] Data cleaning
  - [ ] Descriptive statistics

---

### Analysis Plan (PREREGISTER!)

**Preregister on OSF (Open Science Framework)**:
- [ ] Create OSF project: "AWA Dissertation Studies"
- [ ] Upload preregistration document:
  ```
  PREREGISTRATION: Study 1 - Gamified Scales Validation
  
  HYPOTHESES:
  H1: PRS gamified correlates r > 0.75 with traditional PRS
  H2: Biophilia gamified correlates r > 0.70 with traditional
  H3: Completion rate gamified > traditional (+100%)
  H4: Satisfaction gamified > traditional (+30%)
  
  SAMPLE:
  N=250, Polish adults, recruited via social media
  
  MEASURES:
  - PRS-11 (traditional Likert + 2D grid)
  - Biophilia (traditional scale + visual test)
  - Completion (binary)
  - Time-on-task (minutes)
  - Satisfaction (1-10)
  
  ANALYSIS:
  - Pearson correlations (H1, H2)
  - Chi-square (H3)
  - Independent t-tests (H4)
  - Cronbach's α (reliability)
  ```

**Analysis in R/Python**:
- [ ] Descriptive statistics
- [ ] Correlations (with 95% CI)
- [ ] Reliability (Cronbach's α)
- [ ] t-tests (completion, satisfaction)
- [ ] Effect sizes (Cohen's d)
- [ ] Visualizations (scatter plots, bar charts)

---

## 📅 LONG-TERM CHECKLIST (Rok 1-4)

### Rok 1 (Foundations)
- [x] ✅ System AWA completion (done!)
- [ ] Q1-Q2: Pilot Study (N=20-30)
- [ ] Q3-Q4: Study 1 data collection (N=250)
- [ ] Q4: Paper 1 submission (CHI 2026)
- [ ] Kolokwium 1 (jeśli wymagane)

### Rok 2 (Main Studies)
- [ ] Q1-Q2: Study 2 (Restorativeness, N=200)
- [ ] Q3-Q4: Study 3 (Preferences, N=300)
- [ ] Q4: Paper 2 submission (J. Environmental Psychology)
- [ ] Kolokwium 2

### Rok 3 (Completion)
- [ ] Q1-Q2: Study 4 (Functional, N=200)
- [ ] Q3: Papers 3-4 submission
- [ ] Q4: Framework integration (Chapter 8 draft)
- [ ] Kolokwium 3

### Rok 4 (Writing & Defense)
- [ ] Q1-Q2: Chapters 8-10 (Synthesis, Discussion, Summary)
- [ ] Q3: Full dissertation draft
- [ ] Q4: Revisions, defense preparation
- [ ] Q4: **DEFENSE** 🎓

---

## 💰 BUDGET (Szacunkowy)

### Recruitment Incentives
- Study 1 (N=250): 5 PLN × 250 = **1,250 PLN**
- Study 2 (N=200): 5 PLN × 200 = **1,000 PLN**
- Study 3 (N=300): 5 PLN × 300 = **1,500 PLN**
- Study 4 (N=200): 5 PLN × 200 = **1,000 PLN**
- **SUBTOTAL**: **4,750 PLN**

### Conference Travel (2-3 conferences)
- CHI 2026 (USA/Europe): **8,000-15,000 PLN**
- DIS 2026 (Europe): **4,000-6,000 PLN**
- Environmental Psychology (Europe): **3,000-5,000 PLN**
- **SUBTOTAL**: **15,000-26,000 PLN**

### Open Access Publication Fees
- 2-3 journals (€1,500-2,500 each): **12,000-18,000 PLN**

### Other
- Printing, software, misc: **2,000 PLN**

### **TOTAL**: **33,750 - 50,750 PLN** (over 4 years)

**Funding options**:
- [ ] ASP doctoral scholarship
- [ ] Grants (NCN, NPRH)
- [ ] Promotor research funds
- [ ] Industry partnerships (AI companies?)
- [ ] Personal savings

---

## ✅ IMMEDIATE ACTION ITEMS (TEN TYDZIEŃ!)

### Must Do (Priority 1)
- [ ] **Przeczytaj** Executive Summary + Full Plan (2h)
- [ ] **Sprawdź** wymagania ASP (1h)
- [ ] **Zaplanuj spotkanie** z promotorem (w ciągu 7 dni)
- [ ] **Przygotuj pytania** do promotora (30 min)

### Should Do (Priority 2)
- [ ] **Start reading**: Kaplan (1989), Pasini (2014), Greenwald (1998)
- [ ] **Test system AWA** end-to-end (30 min)
- [ ] **Draft Informed Consent** form (1h)
- [ ] **Plan pilot recruitment** (gdzie znajdziesz 20-30 osób?)

### Nice to Do (Priority 3)
- [ ] **Setup Zotero/Mendeley** (literature management)
- [ ] **Create OSF project** (for preregistration later)
- [ ] **Explore CHI past papers** (understand submission standards)

---

## 🎓 TIPS DLA SUKCESU

### 1. Regularność > Intensywność
- **DON'T**: Pracować 12h/dzień przez tydzień, potem burn out
- **DO**: 2-4h dziennie, 5 dni w tygodniu, konsekwentnie

### 2. Iteruj Szybko
- **DON'T**: Czekać na "perfect" przed testem
- **DO**: Pilot → Feedback → Iterate → Main study

### 3. Publikuj Wcześnie
- **DON'T**: Czekać do końca doktoratu z publikacjami
- **DO**: Pierwszy paper w Roku 1 (proof of concept)

### 4. Seek Feedback Often
- **DON'T**: Pracować w izolacji przez rok
- **DO**: Co-autor meetings (bi-weekly), promotor meetings (monthly)

### 5. Document Everything
- **DON'T**: "I'll remember this later" (nie pamiętasz)
- **DO**: Lab notebook, GitHub commits, version control

### 6. Balance Depth & Breadth
- **DON'T**: Read EVERYTHING (infinite literature)
- **DO**: Read strategically (top 10-20 papers well)

### 7. Network Actively
- **DON'T**: Stay in silo
- **DO**: Conferences, Twitter/X, collaborations

### 8. Self-Care Matters
- **DON'T**: Sacrifice sleep, health, relationships
- **DO**: Exercise, hobbies, social life (PhD is marathon, not sprint)

---

## 📞 KIEDY POPROSIĆ O POMOC

### Red Flags (Ask for help immediately!)
- ⚠️ Completion rate <50% (UX problem)
- ⚠️ Construct validity r <0.60 (instrument problem)
- ⚠️ Can't recruit enough participants (strategy problem)
- ⚠️ Data pipeline broken (technical problem)
- ⚠️ Burn out / overwhelm (personal problem)

### Green Lights (You're on track!)
- ✅ Pilot successful (completion >70%)
- ✅ Instruments validated (r >0.70)
- ✅ Paper 1 accepted/submitted
- ✅ Enjoying the process (most of the time)

---

## 🎯 SUCCESS MANTRA

```
"Done is better than perfect."
"Publish early, publish often."
"Iterate fast, learn faster."
"Ask for help when stuck."
"Celebrate small wins."
"PhD is a marathon, not a sprint."
"Your health > Your dissertation."
```

---

## 📚 RESOURCES (Bookmarks)

### Tools
- **Zotero** (literature): https://www.zotero.org/
- **OSF** (preregistration): https://osf.io/
- **R** (analysis): https://www.r-project.org/
- **Python** (analysis): https://www.python.org/
- **Overleaf** (LaTeX writing): https://www.overleaf.com/
- **Grammarly** (English writing): https://www.grammarly.com/

### Communities
- **CHI** (conference): https://chi2026.acm.org/
- **DIS** (conference): https://dis.acm.org/
- **r/PhD** (Reddit): https://www.reddit.com/r/PhD/
- **PhD Twitter/X** (#AcademicTwitter, #PhDChat)

### Learning
- **Coursera**: Statistics, R, Research Methods
- **YouTube**: Crash Course Statistics, 3Blue1Brown
- **Books**: "How to Write a Lot" (Paul Silvia), "The Craft of Research" (Booth et al.)

---

## ✨ FINAL CHECKLIST (Before starting full-time)

- [ ] ✅ Read all dissertation planning docs
- [ ] ✅ Understand ASP requirements
- [ ] ✅ Met with promotor (approved scope)
- [ ] ✅ Read top 4 foundational papers
- [ ] ✅ System AWA 100% ready
- [ ] ✅ Ethics approval obtained (if needed)
- [ ] ✅ Pilot recruitment plan ready
- [ ] ✅ Informed consent forms ready
- [ ] ✅ Zotero/Mendeley setup
- [ ] ✅ OSF project created
- [ ] ✅ Timeline agreed with promotor
- [ ] ✅ Funding secured (or plan B)

**When all checked → READY TO START PILOT!** 🚀

---

*Dokument stworzony: 2025-11-05*  
*Companion do: DISSERTATION_PLAN.md, EXECUTIVE_SUMMARY.md, VISUAL_OVERVIEW.md*

💪 **You got this! One step at a time.**

---

## 🆘 NEED HELP?

**Feeling stuck?** Re-read this checklist, talk to:
1. Promotor (research direction)
2. Peers (PhD students, for support)
3. Therapist/counselor (if overwhelmed)
4. Family/friends (life balance)

**Remember**: Every PhD student feels lost sometimes. You're not alone. 🤗

**Good luck!** 🎓✨
