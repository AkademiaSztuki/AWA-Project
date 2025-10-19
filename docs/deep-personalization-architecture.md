# Deep Personalization Architecture

## Overview

Complete redesign of AWA Project to support **multi-session, multi-room, multi-household** interior design with **deep personalization methodologies** and **embedded research validation**.

## Key Innovations

### 1. **Product-First, Research-Embedded**
- Build a compelling product that users WANT to use
- Embed validated research methodologies naturally (gamified)
- Collect rigorous data from real-world usage
- Extract PhD-worthy papers from production data

### 2. **4-Layer Data Architecture**

```
USER (Global - answered ONCE)
├── Core Profile
│   ├── Aesthetic DNA (implicit + explicit)
│   ├── Psychological baseline (PRS ideal, biophilia)
│   ├── Lifestyle & values
│   └── Sensory preferences
│
├── HOUSEHOLD (per space: home, office, etc)
│   ├── Who lives there
│   ├── Household dynamics
│   └── ROOMS
│       │
│       ├── ROOM (per room)
│       │   ├── Room type & social context
│       │   ├── Current state (photos, PRS pre-test)
│       │   ├── Activities & pain points
│       │   ├── Room-specific visual DNA
│       │   └── SESSIONS (multiple design attempts)
│       │       ├── Session 1: Initial design
│       │       ├── Session 2: Refinement
│       │       └── Session N: Evolution
```

### 3. **Dual Path System**

#### Fast Track (3-5 min)
- Photo upload
- Quick style detection (10 swipes)
- Basic generation (10x limit)
- Upgrade prompt when exhausted

#### Full Experience (15-20 min first time, 5-8 min returning)
- Complete Core Profile (once)
- Per-room deep dive
- Unlimited generations
- Multi-room support

### 4. **3-Tier Question System**

#### Tier 1: Validated Scales (IMMUTABLE)
- **PRS Mood Grid**: 2D spatial mapping (Pasini et al., 2014)
- **Biophilia Test**: Visual dosage 0-3 (Kellert, 2008)
- **Implicit Preferences**: Tinder swipes (IAT methodology)
- **Semantic Differential**: Sliders (Osgood, 1957)
- **Sensory Tests**: Music, texture, light (novel)
- **Projective Techniques**: Nature metaphor (novel)

#### Tier 2: Adaptive Questions (PARAMETRIC)
- Room-type specific activities
- Social dynamics (solo vs shared)
- Conditional follow-ups
- Pain points library

#### Tier 3: Conversational Polish (LLM)
- MiniCPM generates natural IDA dialogue
- Refers to previous answers
- Warm, personal tone
- Does NOT generate content, only form

### 5. **Hybrid Prompt Synthesis**

```
User Data (4 layers)
  ↓
STEP 1: Scoring Matrix (deterministic)
  ├─ PRS gap analysis → mood weights
  ├─ Visual DNA → style (implicit 60% + explicit 40%)
  ├─ Biophilia → nature density
  ├─ Activities → functional requirements
  └─ Social context → zoning needs
  ↓
STEP 2: Template Builder (rule-based)
  ├─ Room type + style + mood
  ├─ Colors + materials + lighting
  ├─ Biophilia + functional + layout
  └─ Weighted assembly (stay under 65 tokens)
  ↓
STEP 3: LLM Refinement (optional)
  └─ Modal API: syntax polish only
  ↓
FINAL PROMPT → FLUX Kontext
```

**Why Hybrid?**
- ✅ Transparent (know exactly why decisions made)
- ✅ Reproducible (same inputs → same output)
- ✅ Research valid (can document algorithm)
- ✅ Fast (no LLM call required)
- ✅ Testable (A/B test different weights)

## Research Embedded

### Validated Instruments

| Instrument | Source | Gamified As | Research Value |
|-----------|--------|-------------|----------------|
| **PRS-11** | Pasini et al. (2014) | 2D mood grid | Pre/post comparison |
| **Biophilia** | Kellert (2008) | 4-option visual test | Nature orientation |
| **IAT** | Greenwald et al. (1998) | Tinder swipes | Implicit preferences |
| **Semantic Differential** | Osgood (1957) | Interactive sliders | Explicit preferences |
| **PEO** | Law et al. (1996) | Activity + satisfaction | Functional fit |

### Research Papers Enabled

**Paper 1**: "Gamified vs Traditional Environmental Psychology Scales"
- RQ: Do gamified scales maintain construct validity?
- Data: PRS mood grid scores vs traditional Likert
- Expected: Equal validity, 3x completion rate

**Paper 2**: "AI-Generated Interiors Improve Perceived Restorativeness"
- RQ: Do AI designs improve PRS scores?
- Data: PRS pre (current room) vs PRS post (AI design)
- Expected: Mean improvement 1.8 points, 78% show improvement

**Paper 3**: "Implicit Preferences Predict Design Satisfaction"
- RQ: Do implicit > explicit for satisfaction prediction?
- Data: Swipe patterns + explicit rankings + final satisfaction
- Expected: Implicit R²=0.42, Explicit R²=0.28, Combined R²=0.61

**Paper 4**: "Functional Context in Personalized AI Design"
- RQ: Does activity context improve satisfaction?
- Data: Activity patterns + design features + satisfaction
- Expected: 23% higher satisfaction with functional integration

## Technical Stack

### Frontend
- **Next.js 14** (App Router)
- **React** with TypeScript
- **Framer Motion** (animations)
- **Three.js** (3D IDA model)
- **Tailwind CSS** (glassmorphism)
- **Supabase** (database + auth)

### Backend
- **Modal.com** (serverless Python)
- **FLUX Kontext** (image generation)
- **MiniCPM-o-2.6** (room analysis, comments)
- **FastAPI** (REST endpoints)

### Database
- **PostgreSQL** (Supabase)
- 4-layer schema
- Research-grade tracking
- Helper functions for complex queries

## File Structure

```
apps/frontend/src/
├── lib/
│   ├── questions/
│   │   ├── validated-scales.ts      # Tier 1: Research instruments
│   │   ├── adaptive-questions.ts    # Tier 2: Parametric library
│   │   └── question-router.ts       # Flow orchestration
│   │
│   ├── prompt-synthesis/
│   │   ├── scoring.ts               # Step 1: Weighted scoring
│   │   ├── builder.ts               # Step 2: Template assembly
│   │   ├── refinement.ts            # Step 3: Optional LLM polish
│   │   └── index.ts                 # Main pipeline
│   │
│   ├── research/
│   │   └── data-export.ts           # Research validation tools
│   │
│   └── supabase-deep-personalization.ts  # Database helpers
│
├── components/
│   ├── research/
│   │   ├── MoodGrid.tsx             # PRS 2D interface
│   │   ├── BiophiliaTest.tsx        # Nature dosage test
│   │   ├── SensoryTests.tsx         # Multi-modal preferences
│   │   └── ProjectiveTechniques.tsx # Nature metaphor, aspirational self
│   │
│   ├── wizards/
│   │   └── CoreProfileWizard.tsx    # One-time profile (10 steps)
│   │
│   ├── dashboard/
│   │   └── UserDashboard.tsx        # Main control panel
│   │
│   ├── setup/
│   │   ├── HouseholdSetup.tsx       # Household questions
│   │   └── RoomSetup.tsx            # Room setup wizard
│   │
│   └── screens/
│       └── PathSelectionScreen.tsx  # Fast vs Full choice
│
├── contexts/
│   └── LanguageContext.tsx          # Bilingual PL/EN support
│
├── types/
│   └── deep-personalization.ts      # Complete type definitions
│
└── app/
    ├── flow/
    │   ├── path-selection/          # Choose path
    │   └── fast-track/              # Quick 10x limit flow
    │
    ├── dashboard/                   # User panel
    │
    ├── setup/
    │   ├── profile/                 # Core profile wizard
    │   ├── household/               # Household setup
    │   └── room/[householdId]/      # Room setup
    │
    ├── design/[roomId]/             # Design session (future)
    │
    └── research/
        └── analytics/               # Research dashboard
```

## User Journey

### New User - Full Experience

1. **Landing** → "Create personalized interior"
2. **Consent** → Research participation opt-in
3. **Path Selection** → Choose "Full Experience"
4. **Core Profile** (~15 min, ONE TIME):
   - Lifestyle questions
   - Tinder swipes (50 mixed images)
   - Semantic differential sliders
   - Color/material preferences
   - Sensory tests (music, texture, light)
   - Nature metaphor (projective)
   - PRS ideal baseline
   - Biophilia test
5. **Dashboard** → Shows empty state, "Add first space"
6. **Household Setup** (~2 min):
   - Name and type
   - Living situation
   - Goals
7. **Room Setup** (~8 min):
   - Room basics
   - Photo upload → AI analysis
   - PRS current state
   - Pain points
   - Activities + satisfaction
   - Room-specific swipes (30 images)
   - PRS target state
8. **Design Session**:
   - AI synthesizes prompt from all data
   - FLUX generates 3-4 concepts
   - User selects, rates
   - PRS post-test
   - Satisfaction scores
   - Optional refinement
9. **Continue** → Add more rooms or refine designs

### Returning User

- **Dashboard** → Select existing room or add new
- **New Room**: Only steps 6-8 (Core Profile reused!)
- **Refine Existing**: Only step 8 with context from previous sessions

### Fast Track User

- Photo → 10 swipes → Generate → 10x limit → Upgrade prompt

## Research Data Quality

### Behavioral Metrics Captured
- Dwell time (how long looking at image before swipe)
- Reaction time (decision speed)
- Hesitation count (false starts)
- Swipe velocity (gesture speed)
- Activity patterns
- Temporal context

### Validated Measures
- PRS pre/post (restorativeness improvement)
- Biophilia score (nature orientation)
- Place identity (does design reflect self?)
- Satisfaction scores
- Implementation intention

### Data Export Formats
- **JSON**: Complete structured data with metadata
- **CSV**: Flat tables for R, Python, SPSS
- **Anonymized**: No personal identifiers
- **Timestamped**: Version controlled

## Development Status

### ✅ Completed (100%)

1. Database schema (4-layer architecture)
2. Question architecture (3-tier system)
3. Prompt synthesis (hybrid algorithm)
4. Language support (PL/EN throughout)
5. Research components (MoodGrid, Biophilia, Sensory, Projective)
6. Core Profile Wizard
7. Dashboard
8. Household Setup
9. Room Setup
10. Fast Track flow
11. Path Selection
12. Research validation tools
13. Analytics dashboard

### 🚧 To Implement (placeholders in place)

- Actual Tinder swipe implementation (images + tracking)
- Color palette ranking component
- Material selection component
- Photo upload to Supabase storage
- Conversational IDA responses (LLM integration)
- Design session UI for room
- Real Supabase data fetching (currently mocked)

### 📊 Research Validation Next Steps

1. **Pilot study** (N=20-30):
   - Test completion rates
   - Validate gamified scales vs traditional
   - Collect feedback on UX

2. **Main study** (N=200-300):
   - Full data collection
   - Statistical validation
   - Paper writing

3. **A/B Testing**:
   - Fast Track vs Full Experience
   - Gamified vs traditional scales
   - Implicit-first vs explicit-first ordering

## Design System

### Colors
- **Pearl**: #F8F9FA
- **Platinum**: #E5E7EB
- **Silver**: #94A3B8
- **Gold**: #D4AF37
- **Champagne**: #F7E7CE
- **Graphite**: #1F2937

### Typography
- **Nasalization**: Headers, titles
- **Modern (Inter/Exo 2)**: Body text

### Components
- **GlassCard**: Glassmorphism containers
- **GlassButton**: Primary/secondary actions
- **GlassSlider**: Value selection
- **MoodGrid**: 2D spatial input
- All with smooth Framer Motion animations

### Visual Principles
- Glassmorphism (backdrop-blur, transparency)
- Aurora effects (background gradients)
- Smooth transitions (300-500ms)
- Hover states (scale, shadow, color)
- Progress indicators
- Responsive design

## API Endpoints

### Frontend API Routes
- `POST /api/modal/generate` - Image generation
- `POST /api/modal/analyze-room` - Room photo analysis
- `POST /api/modal/refine-prompt` - Prompt optimization
- `POST /api/log` - Behavioral logging

### Modal Backend
- `POST /generate` - FLUX Kontext generation
- `POST /analyze-room` - MiniCPM room analysis
- `POST /llm-comment` - IDA comments
- `POST /refine-prompt` - Prompt refinement
- `GET /health` - Health check

## Database Schema

### Tables

**user_profiles**
- Core profile data (Tier 1)
- Aesthetic DNA, psychological baseline
- Lifestyle, sensory preferences
- One-time completion

**households**
- User's physical spaces
- Living situation, dynamics
- Household goals

**rooms**
- Individual rooms within households
- Room type, social context
- Current state (photos, PRS pre-test)
- Activities, pain points
- Room-specific visual DNA
- Target state (PRS, aspirations)

**design_sessions**
- Generation attempts per room
- Prompt used + synthesis data
- Generated images
- PRS post-test
- Satisfaction scores
- Feedback

**enhanced_swipes**
- Enhanced behavioral tracking
- Dwell time, hesitation, velocity
- Image metadata for pattern analysis

### Helper Functions
- `get_user_complete_profile()` - Fetch all user data
- `get_completion_status()` - Check what's missing
- `get_next_session_number()` - Session counter

## Research Methodologies

### Deep Personalization Techniques

1. **Behavioral > Self-Report**
   - Tinder swipes reveal authentic preferences
   - Dwell time, hesitation tracking
   - What they DO vs what they SAY

2. **Conversational Laddering**
   - IDA asks follow-ups naturally
   - Discovers social context, conflicts, values
   - Feels like conversation, not interrogation

3. **Projective Techniques**
   - Nature metaphor (ocean, forest, mountain...)
   - Aspirational self ("best version in a year")
   - Bypasses cognitive filters

4. **Photo Context Analysis**
   - AI analyzes current space
   - IDA comments naturally
   - Baseline for transformation

5. **Temporal/Activity Mapping**
   - "Typical day in this room?"
   - Activity timeline
   - Design for LIFE, not Instagram

6. **Multi-Sensory Profiling**
   - Music (auditory association)
   - Texture (tactile preference)
   - Light (visual comfort)
   - Synesthetic design input

7. **Identity Mirroring**
   - Design for WHO you want to be
   - Aspirational, not just current
   - Transformation tool, not just decoration

8. **Progressive Reveal**
   - Start fast (photo + basic swipes)
   - Deepen when engaged
   - Show impact ("You said X → I did Y")

## Research Papers Roadmap

### Paper 1: Gamified Assessment Validation
**Target**: HCI / UX conference (CHI, DIS, TEI)
**N**: 250 participants
**Design**: Within-subjects (gamified vs traditional)
**Measures**: Completion rate, time, satisfaction, construct validity
**Expected**: Equal validity, 3x completion, 2x satisfaction

### Paper 2: AI-Restorativeness
**Target**: Environmental Psychology journal
**N**: 200 participants  
**Design**: Pre/post with control
**Measures**: PRS-11 adapted, satisfaction, implementation
**Expected**: 1.8 point improvement, 78% positive change

### Paper 3: Implicit vs Explicit Preferences
**Target**: Design Studies / Cognition journal
**N**: 300 participants
**Design**: Correlational + predictive modeling
**Measures**: Swipes, rankings, final satisfaction
**Expected**: Implicit stronger predictor, combined best

### Paper 4: Functional-Aesthetic Integration
**Target**: Design Research journal
**N**: 200 participants
**Design**: Comparative (with vs without functional context)
**Measures**: PEO fit, satisfaction, implementation
**Expected**: 23% higher satisfaction with functional integration

## Next Implementation Steps

### Priority 1: Complete MVP (2-3 weeks)
1. Real Tinder swipe component with image library
2. Color palette and material selection UI
3. Photo upload to Supabase Storage
4. Wire up all Supabase calls (currently mocked)
5. Test complete flow end-to-end

### Priority 2: Polish & Test (1-2 weeks)
6. IDA conversational responses (MiniCPM integration)
7. Design session UI for room-specific generation
8. Refinement flow
9. History tracking
10. Error handling

### Priority 3: Research (2-3 weeks)
11. Pilot study (N=20)
12. Validate instruments
13. Adjust based on feedback
14. Prepare for main study

## Usage

### Development
```bash
# Frontend
cd apps/frontend
npm run dev  # http://localhost:3000

# Backend
cd apps/modal-backend
modal serve main.py
```

### Database Migration
```bash
# Run migration
cd apps/frontend
supabase db push
```

### Testing New Flow
1. Navigate to `/flow/path-selection`
2. Choose "Full Experience"
3. Complete Core Profile
4. Add household
5. Add room
6. Generate design

## Credits

- **Research Foundation**: Pasini, Hartig, Kellert, Greenwald, Osgood, Lai, Law
- **Design System**: Custom glassmorphism + aurora aesthetic
- **AI Models**: FLUX Kontext (BFL), MiniCPM (OpenBMB)
- **Infrastructure**: Vercel, Modal.com, Supabase

## License

Academic research project - Akademia Sztuk Pięknych

