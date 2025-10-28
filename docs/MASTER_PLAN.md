# AWA Project - Master Plan

**Status**: In Development  
**Last Updated**: October 2025  
**Philosophy**: Product-First, Research-Embedded, Minimalist Glass Design

---

## 🎯 VISION

Build a **psychology-backed interior design AI** that:
1. Delivers real value to users (compelling UX)
2. Embeds validated research naturally (gamified assessment)
3. Collects rigorous data from production usage
4. Enables PhD-worthy papers from real-world data

---

## 🏗️ CURRENT ARCHITECTURE (WORKING)

### Full Experience Flow (KEEP ALL STEPS!)

```
Landing (/)
  ↓
Onboarding (/flow/onboarding)
  - Consent + Demographics
  - Clean glass design ✨
  ↓
Core Profile Wizard (/setup/profile)
  - Lifestyle preferences
  - Big Five Personality Test (IPIP-60) 🆕
  - Inspiration Images Upload (1-10) 🆕
  - Tinder swipes for style
  - Semantic differential scales
  - Sensory tests
  - Nature metaphor selection
  - Aspirational self description
  - PRS ideal space mapping
  - Biophilia assessment
  - Summary & save to profile
  ↓
Photo Upload (/flow/photo)
  - Upload or select example
  - AI room analysis (MiniCPM)
  - IDA commentary
  ↓
Tinder Test (/flow/tinder)
  - 33 living room images
  - Swipe left/right with behavioral tracking
  - Reaction time, dwell time, hesitation
  - IMPLICIT PREFERENCE DATA → Prompt
  ↓
DNA Analysis (/flow/dna)
  - Visual DNA extraction
  - Style preferences
  - VISUAL PATTERN DATA → Prompt
  ↓
Ladder (/flow/ladder)
  - Conversational laddering
  - Deep needs discovery
  - PSYCHOLOGICAL NEEDS → Prompt
  ↓
Survey 1 (/flow/survey1)
  - PRS-11 mood grid (pre-test)
  - BASELINE MOOD → Prompt
  ↓
Survey 2 (/flow/survey2)
  - Additional preferences
  - EXPLICIT PREFERENCES → Prompt
  ↓
Design Persona Report (/flow/persona) ⭐ NEW!
  - LLM generates personalized report
  - "Your Design DNA" (like 16 Personalities)
  - Science-backed explanation WHY this interior
  - Style + Psychology + Function breakdown
  - Synthesis of ALL collected data
  ↓
Generation (/flow/generate)
  - FLUX image generation (using synthesized prompt)
  - Multiple variants
  - User selection
  ↓
Thanks (/flow/thanks)
  - PRS-11 post-test
  - Satisfaction survey
  - Research completion
```

**KEY ADDITIONS**:
- ⭐ **Design Persona Report** - LLM-generated profile (like 16 Personalities)
- 🎯 **Prompt Synthesis** - All steps feed into final prompt
- 🔬 **Scientific validity** - Report explains methodology transparently

### Existing Components (REUSE THESE!)

**Screens** (`components/screens/`):
- `LandingScreen.tsx` - Hero page
- `OnboardingScreen.tsx` - Consent + demographics
- `TinderScreen.tsx` - Swipe interface (backup component)
- `DNAScreen.tsx` - Visual DNA results
- `LadderScreen.tsx` - Conversational laddering
- `Survey1Screen.tsx` - PRS pre-test
- `Survey2Screen.tsx` - Additional scales
- `GenerationScreen.tsx` - Image generation
- `ThanksScreen.tsx` - Completion + post-test

**UI** (`components/ui/`):
- `GlassCard` - Main container
- `GlassButton` - Primary/secondary buttons
- `GlassSurface` - Interactive surfaces
- `TinderCard` - Swipe card component
- All styled with **glassmorphism**, **no emojis**, **no colorful icons**

**AWA** (`components/awa/`):
- `AwaContainer` - 3D model container
- `AwaDialogue` - Bottom dialogue bar
- `AwaModel` - Three.js 3D character

**Design System**:
- Pearl/Platinum/Silver/Gold/Champagne palette
- Nasalization font (headers)
- Modern font (body)
- Glassmorphism effects
- Smooth animations (Framer Motion)
- **NO EMOJIS, NO COLORFUL ICONS** ✨

---

## ✨ NEW FEATURES (IMPLEMENTED)

### 1. Big Five Personality Test (IPIP-60)

**Purpose**: Research-backed personality assessment for deeper personalization

**Implementation**:
- 60-item IPIP questionnaire in Polish/English
- Reverse scoring for accurate measurement
- 5 domains: Openness, Conscientiousness, Extraversion, Agreeableness, Neuroticism
- Integrated into Core Profile Wizard
- Results mapped to design preferences:
  - **Openness** → Visual complexity, creativity
  - **Conscientiousness** → Storage needs, organization
  - **Extraversion** → Social spaces, lighting
  - **Agreeableness** → Harmony, balance
  - **Neuroticism** → Calming elements, comfort

**Files**:
- `lib/questions/ipip-60.ts` - Test items and scoring
- `components/steps/BigFiveStep.tsx` - UI component
- `lib/prompt-synthesis/scoring.ts` - Personality mapping

### 2. Inspiration Images Upload & Analysis

**Purpose**: Visual preference learning through user-uploaded images

**Implementation**:
- Upload 1-10 inspiration images
- VLM (Gemma 3 4B-IT) analysis via Modal.com
- Automatic tagging: styles, colors, materials, biophilia
- Background processing (non-blocking)
- Integration with prompt synthesis

**Features**:
- Drag & drop upload interface
- Real-time preview with tags
- Supabase Storage integration
- Fallback tags if VLM fails
- Progress indicators

**Files**:
- `app/flow/inspirations/page.tsx` - Standalone page
- `components/steps/InspirationsStep.tsx` - Wizard step
- `lib/vision/gamma-tagging.ts` - VLM integration
- `apps/modal-backend/main.py` - Backend API

### 3. Enhanced Prompt Synthesis

**Purpose**: Integrate personality and inspiration data into image generation

**New PromptWeights**:
- `storageNeeds` - From conscientiousness
- `harmonyLevel` - From agreeableness + low neuroticism
- Enhanced `visualComplexity` - Combined with personality
- Enhanced `privateVsShared` - From extraversion
- Enhanced color/material palettes - From inspirations
- Enhanced biophilia - From inspiration analysis

**Research Foundation**:
- Big Five mapping based on environmental psychology research
- Inspiration analysis using computer vision best practices
- Transparent, explainable scoring algorithms

---

## 🚀 PLANNED EXTENSIONS (TO ADD)

### 1. Multi-Session Architecture

**Goal**: Allow users to return and design multiple rooms

**New Data Layers**:
```
USER (global profile - completed once)
  └─ HOUSEHOLDS (home, office, etc)
      └─ ROOMS (bedroom, living room, kitchen)
          └─ SESSIONS (multiple design attempts per room)
```

**Database Schema**: Already created in `20250120000000_deep_personalization_schema.sql`

**Tables**:
- `user_profiles` - Core aesthetic DNA, psychology, lifestyle
- `households` - Physical spaces
- `rooms` - Individual rooms with photos, activities, pain points
- `design_sessions` - Generation attempts with feedback
- `enhanced_swipes` - Behavioral tracking from Tinder

### 2. Dual Path System

**Path A: Fast Track** (3-5 min, 10 generations limit)
- Quick photo → 10 swipes → Generate
- Skip deep profiling
- Skip Design Persona Report
- Limited generations
- Upgrade prompt when exhausted

**Path B: Full Experience** (15-20 min, **WORTH IT!**)
- ✅ Complete psychological profiling (all steps)
- ⭐ **Design Persona Report** - personalized analysis
- 🎨 Science-backed interior generation
- 📊 See WHY this interior fits you
- ♾️ Unlimited generations
- 🏠 Multi-room support
- 🔬 Contribute to research

**Entry Point**: `/flow/path-selection` (NEW - keep this)

**Value Proposition for Full Experience**:
> "Like 16 Personalities, but for your interior design DNA. 
> Get a personalized report explaining WHY this space works for you,
> backed by psychology research."

### 3. Returning User Flow (FUTURE FEATURE - NOT IMPLEMENTED YET!)

> ⚠️ **Status**: Architecture designed, components exist, but NOT connected to current flow
> 
> **Files exist but unused**:
> - `components/wizards/CoreProfileWizard.tsx` (duplicate of existing flow)
> - `components/setup/HouseholdSetup.tsx` (future: multi-household)
> - `components/setup/RoomSetup.tsx` (future: multi-room)
> - `app/dashboard/page.tsx` (exists but needs work)

**Future Vision** (when implemented):

**Dashboard** (`/dashboard`):
- Show user's households
- List rooms per household
- Access previous sessions
- Add new room/household

**Add Household** (`/setup/household`):
- Name, type, living situation
- Household goals
- 2-3 min

**Add Room** (`/setup/room/[householdId]`):
- Room type, social context
- Photo upload (REUSE `/flow/photo` logic)
- Activities, pain points
- Room-specific Tinder (30 images)
- Target PRS state
- 8-10 min

**Design Session** (`/flow/generate?roomId=X`):
- Load room context
- Generate designs
- Save to `design_sessions`
- PRS post-test
- Satisfaction scores

**Why Not Implemented Now?**
- First focus: Perfect the **single-room flow**
- Validate research methodology
- Collect pilot data
- THEN add multi-room complexity

---

## 🎯 PROMPT SYNTHESIS PIPELINE

**All steps feed into final prompt generation**:

```typescript
// STEP 1: Data Collection (entire flow)
const userData = {
  // From Tinder (implicit)
  implicitPreferences: {
    likedStyles: ['scandinavian', 'minimalist'],
    likedColors: ['warm-neutrals', 'white'],
    likedMaterials: ['wood', 'ceramics'],
    swipePatterns: { /* behavioral data */ }
  },
  
  // From DNA (pattern analysis)
  visualDNA: {
    dominantStyle: 'scandinavian',
    secondaryStyle: 'biophilic',
    accuracyScore: 0.87
  },
  
  // From Ladder (psychology)
  deepNeeds: {
    coreNeed: 'peaceful sanctuary',
    values: ['calm', 'nature', 'order'],
    conflicts: ['clutter', 'overstimulation']
  },
  
  // From Survey 1 (PRS pre-test)
  currentMood: {
    beingAway: 2.1,
    fascination: 3.4,
    coherence: 2.8,
    // ... PRS dimensions
  },
  
  // From Survey 2 (explicit)
  explicitPreferences: {
    colorPalette: ['beige', 'off-white', 'sage-green'],
    lighting: 'natural + warm-accent',
    biophilia: 2 // level 0-3
  },
  
  // From Photo (context)
  roomContext: {
    type: 'living_room',
    currentState: { /* analysis */ },
    painPoints: ['cluttered', 'dark']
  }
};

// STEP 2: Weighted Scoring (transparent algorithm)
const weights = calculatePromptWeights(userData);
// → { needsCalm: 0.92, natureDensity: 0.67, warmth: 0.81, ... }

// STEP 3: Template Assembly (rule-based)
const promptTemplate = buildPromptFromWeights(weights, roomContext);
// → "A serene Scandinavian living room with warm beige tones..."

// STEP 4: LLM Refinement (syntax only, <65 tokens)
const finalPrompt = await refinePromptSyntax(promptTemplate);
// → FLUX generation

// STEP 5: Design Persona Report (LLM explanation)
const personaReport = await generatePersonaReport(userData, weights);
// → User-facing explanation of WHY
```

**Why This Approach?**
- ✅ **Transparent** - Know exactly why decisions made
- ✅ **Reproducible** - Same input → Same output
- ✅ **Research-valid** - Can document algorithm in papers
- ✅ **Testable** - A/B test different weights
- ✅ **Explainable** - LLM generates human-readable report

---

## 🌟 DESIGN PERSONA REPORT (NEW!)

**Concept**: Like 16 Personalities test report

**User Journey**:
1. Complete full flow (15-20 min)
2. See "Analyzing your Design DNA..." loader
3. Receive **Design Persona Report**:
   - **Style Profile** - Primary + secondary styles with %
   - **Psychological Needs** - Why this space works for you
   - **Functional Priorities** - How you'll use the space
   - **Visual DNA** - Colors, materials, lighting breakdown
   - **Science Behind It** - Transparent methodology
   - **Your Numbers** - PRS scores, preference patterns
4. Then see generated interiors
5. Understand WHY these designs fit

**Report Structure**:

```
╔═══════════════════════════════════════════════════╗
║         TWÓJ PROFIL DESIGNOWY                     ║
║         Your Design Persona                       ║
╚═══════════════════════════════════════════════════╝

🎨 STYL / STYLE
   Główny: Scandinavian Minimalism (67%)
   Akcent: Biophilic Elements (33%)
   
   "Preferujesz czystość linii i funkcjonalność
    skandynawskiego designu, ożywioną elementami
    natury, które dodają ciepła i życia."

🧠 PSYCHOLOGIA / PSYCHOLOGY
   Potrzeby: Spokój, Regeneracja, Kontakt z naturą
   PRS Baseline: Being Away (2.1/5) → Target (4.2/5)
   
   "Twoje odpowiedzi wskazują na potrzebę przestrzeni
    restoratywnej - miejsca, gdzie możesz się
    'wyłączyć' od zewnętrznego świata. Naturalne
    elementy (plants, wood, light) wspierają tę potrzebę."

🎯 FUNKCJA / FUNCTION
   Priorytet: Multi-functional space + hidden storage
   Aktywności: Praca (40%), Relaks (35%), Socializing (25%)
   
   "Cenisz wielofunkcyjność - przestrzeń, która płynnie
    adaptuje się między pracą, odpoczynkiem i życiem
    towarzyskim. Ukryty storage pozwala zachować
    wizualny spokój przy codziennym chaosie."

✨ DLACZEGO TO WNĘTRZE? / WHY THIS INTERIOR?

   Na podstawie Twoich wyborów:
   
   → Tinder Test: 67% ❤️ dla ciepłego drewna
   → Tinder Test: 82% ❤️ dla naturalnego światła
   → Ladder: Główna wartość: "peaceful sanctuary"
   → PRS: Potrzeba +2.1 wzrostu w "Being Away"
   → Explicit: Wybór palety warm neutrals
   
   Algorytm połączył te dane i stworzył przestrzeń,
   która maksymalizuje Twój potencjał restoratywności
   przy zachowaniu funkcjonalności i estetyki.

📊 TWOJE DNA DESIGNOWE / YOUR DESIGN DNA

   Kolory:
   ▓▓▓▓▓▓▓▓░░ Warm Neutrals (Beige, Off-white) 80%
   ▓▓▓░░░░░░░ Sage Green (Accent) 30%
   ▓░░░░░░░░░ Terracotta (Touch) 10%
   
   Materiały:
   ▓▓▓▓▓▓▓▓▓░ Natural Wood 90%
   ▓▓▓▓▓░░░░░ Linen/Cotton textiles 50%
   ▓▓▓░░░░░░░ Ceramics 30%
   
   Oświetlenie:
   ▓▓▓▓▓▓▓▓▓▓ Maximum natural light 100%
   ▓▓▓▓▓▓░░░░ Warm accent lighting 60%
   
   Biophilia:
   ▓▓▓▓▓▓░░░░ Medium density plants (Level 2/3)

🔬 NAUKA ZA TYM / SCIENCE BEHIND IT

   Metodologia:
   • IAT (Implicit Association Test) - Tinder swipes
   • Means-End Laddering - Deep needs discovery  
   • PRS-11 (Perceived Restorativeness Scale)
   • Semantic Differential - Explicit preferences
   • Behavioral tracking - Reaction times, patterns
   
   Twój profil powstał z analizy:
   • 33 implicit choices (Tinder)
   • 8-12 deep needs (Ladder)
   • 11 PRS dimensions
   • 15+ explicit preferences
   • ~180 behavioral data points
   
   = 250+ punktów danych → Spersonalizowany profil

📈 TWOJE LICZBY / YOUR NUMBERS

   Implicit Consistency: 87% (wysoka pewność preferencji)
   Reaction Time Avg: 2.3s (przemyślane decyzje)
   PRS Target Improvement: +2.1 points (ambitne, osiągalne)
   Style Confidence: 67% Scandinavian (silna preferencja)

```

**Implementation**:
- New route: `/flow/persona`
- LLM generates report from all collected data
- Beautiful glass design (match existing flow)
- Scrollable, shareable (screenshot/PDF later)
- Shows BEFORE generating images
- Builds anticipation + understanding

---

## 🔬 RESEARCH INTEGRATION

### Validated Instruments (Gamified)

| Instrument | Source | Current Implementation | Research Value |
|-----------|--------|----------------------|----------------|
| **PRS-11** | Pasini et al. (2014) | Survey1/Thanks (pre/post) | Restorativeness improvement |
| **IAT** | Greenwald et al. (1998) | Tinder swipes | Implicit preferences |
| **Laddering** | Reynolds & Gutman (1988) | Ladder screen | Deep needs |
| **Satisfaction** | Custom | Thanks screen | Design satisfaction |
| **Behavioral** | Custom | Tinder tracking | Reaction time, dwell |

### Papers Enabled

1. **Gamified Scales Validation** (HCI - CHI, DIS)
2. **AI-Generated Restorativeness** (Environmental Psychology)
3. **Implicit vs Explicit Preferences** (Design Studies)
4. **Behavioral Preference Indicators** (Cognition)

---

## 📝 IMPLEMENTATION PRIORITIES

### ✅ What Already Works (DON'T TOUCH!)

- [x] Landing page with glass design
- [x] Onboarding (consent + demographics)
- [x] Photo upload with AI analysis
- [x] Tinder (33 images, behavioral tracking)
- [x] DNA analysis
- [x] Ladder (conversational needs discovery)
- [x] Survey 1 (PRS pre-test)
- [x] Survey 2 (explicit preferences)
- [x] Generation (FLUX with prompt)
- [x] Thanks (PRS post-test + satisfaction)
- [x] 3D IDA model + dialogue system
- [x] Glass design system (components/ui)

### Phase 1: Clean Up + Fix Visuals (PRIORITY 1 - THIS WEEK)

**Critical Fixes** ✅:
- [x] **Archive old docs** → Moved to `/docs/archive/`
- [x] **Fix OnboardingScreen routing** → Now goes to `/flow/photo` for Full Experience (not `/setup/profile`)
- [x] **Add Dashboard link** → Top-right button for logged-in users on landing page

**Visual Consistency** (NO EMOJIS!):
- [ ] Audit `components/research/` - remove emojis or redesign
- [ ] Audit `components/wizards/` - DOCUMENT AS FUTURE FEATURE (not used in current flow)
- [ ] Audit `components/dashboard/` - match glass design, remove emojis
- [ ] Audit `components/setup/` - DOCUMENT AS FUTURE FEATURE (multi-room support)
- [ ] Fix any broken 3D model layouts

**Route Status**:
- `/flow/onboarding` → `/flow/photo` ✅ **FIXED** (full experience now uses existing flow!)
- `/flow/fast-track` - TO IMPLEMENT (quick path)
- `/dashboard` - EXISTS but needs polish
- `/setup/profile`, `/setup/household`, `/setup/room` - **FUTURE FEATURE** (multi-room, returning users)

**Rules for fixes**:
- Use existing `GlassCard`, `GlassButton`, `GlassSurface`
- NO emojis in UI (👎 never!)
- NO colorful icons (🌈 not our style)
- Match existing flow visual language
- Keep 3D model visible (don't cut off)

### Phase 2: Design Persona Report (PRIORITY 2 - NEXT WEEK)

**NEW Feature** - The "16 Personalities" moment!

- [ ] **Create `/flow/persona` page**:
  - Beautiful glass design (match existing)
  - "Analyzing your Design DNA..." loader animation
  - Display personalized report
  - Scrollable sections (Style, Psychology, Function, DNA, Science)
  - Progress bars for DNA breakdown
  - Clean, elegant, NO EMOJIS
  
- [ ] **Build Prompt Synthesis Pipeline**:
  - Collect data from all flow steps
  - Weight calculation algorithm
  - Template-based prompt builder
  - LLM syntax refinement (optional)
  - Save synthesis data for research
  
- [ ] **LLM Report Generation**:
  - API endpoint: `POST /api/persona/generate`
  - Input: All user data from flow
  - Output: Structured persona report
  - Language: Polish + English support
  - Transparent methodology (cite research)
  
- [ ] **Integration**:
  - Route Survey 2 → Persona → Generate
  - Pass prompt to generation page
  - Save report to session/database
  - Option to regenerate/refine

### Phase 3: Path Selection + Fast Track (PRIORITY 3)

- [ ] **Polish Path Selection**:
  - Match glass design
  - Clear value prop for Full Experience
  - "Like 16 Personalities for your interior DNA"
  - Show time investment (Fast: 5 min, Full: 20 min)
  
- [ ] **Implement Fast Track properly**:
  - Photo → 10 swipes → Generate (skip persona)
  - Show generation counter (X/10 used)
  - Upgrade prompt when exhausted
  - CTA: "Want deeper personalization? Unlock Full Experience"

### Phase 4: Multi-Room Architecture (PRIORITY 4 - LATER)

- [ ] Dashboard (returning users)
- [ ] Household setup
- [ ] Room-specific sessions
- [ ] Session history

### Phase 5: Research Tools (PRIORITY 5 - LATER)

- [ ] Analytics dashboard
- [ ] Data export
- [ ] Statistical analysis

---

## 🎨 DESIGN SYSTEM RULES

### ✅ DO:
- Use `GlassCard`, `GlassButton`, `GlassSurface`
- Pearl/Platinum/Silver/Gold/Champagne colors
- Nasalization (headers) + Modern (body)
- Glassmorphism (backdrop-blur, subtle borders)
- Smooth Framer Motion animations
- Lucide icons with glass backgrounds
- Minimalist, clean, elegant

### ❌ DON'T:
- **NO EMOJIS** (👎 never use these)
- **NO COLORFUL ICONS** (🎨 not this style)
- No busy layouts
- No inconsistent spacing
- No different component styles

---

## 🗂️ FILE STRUCTURE

```
apps/frontend/src/
├── app/
│   ├── page.tsx                    # Landing
│   ├── flow/
│   │   ├── onboarding/            # ✅ Working - don't touch
│   │   ├── photo/                 # ✅ Working - don't touch
│   │   ├── tinder/                # ✅ Working - don't touch
│   │   ├── dna/                   # ✅ Working - don't touch
│   │   ├── ladder/                # ✅ Working - don't touch
│   │   ├── survey1/               # ✅ Working - don't touch
│   │   ├── survey2/               # ✅ Working - don't touch
│   │   ├── generate/              # ✅ Working - don't touch
│   │   ├── thanks/                # ✅ Working - don't touch
│   │   ├── path-selection/        # 🔧 New - needs polish
│   │   └── fast-track/            # 🔧 New - needs implementation
│   ├── dashboard/                 # 🔧 New - fix design
│   └── setup/
│       ├── household/             # 🔧 New - fix design
│       └── room/[householdId]/    # 🔧 New - fix design
├── components/
│   ├── screens/                   # ✅ Existing - reuse these!
│   ├── ui/                        # ✅ Existing - reuse these!
│   ├── awa/                       # ✅ Existing - reuse these!
│   ├── dashboard/                 # 🔧 New - needs redesign
│   ├── setup/                     # 🔧 New - needs redesign
│   ├── research/                  # 🗑️ Remove emojis or delete
│   └── wizards/                   # 🗑️ Probably delete
├── lib/
│   ├── supabase.ts                # ✅ Working
│   ├── supabase-deep-personalization.ts  # 🔧 New helpers
│   ├── questions/                 # 🔧 Question library
│   └── prompt-synthesis/          # 🔧 Prompt generation
└── types/
    ├── index.ts                   # ✅ Working
    ├── supabase.ts                # ✅ Working
    └── deep-personalization.ts    # 🔧 New types
```

---

## 🚦 NEXT ACTIONS

1. **Read this document** ✅
2. **Delete old docs** (next)
3. **Audit new pages** - which to keep, which to delete
4. **Fix design consistency** - remove emojis, match glass
5. **Create action plan** for extensions
6. **Test existing flow** - make sure nothing broke

---

## 📚 REFERENCES

**Research Foundation**:
- Pasini et al. (2014) - PRS-11
- Kellert (2008) - Biophilia
- Greenwald et al. (1998) - IAT
- Reynolds & Gutman (1988) - Laddering

**Technical Stack**:
- Next.js 14 (App Router)
- Framer Motion (animations)
- Three.js (3D model)
- Tailwind CSS (styling)
- Supabase (database + auth)
- Modal.com (FLUX + MiniCPM)

---

*Last Review: October 2025*
*Maintainer: AWA Research Team*

