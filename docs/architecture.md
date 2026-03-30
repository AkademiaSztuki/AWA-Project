# Architektura Projektu Aura

## Przegląd Systemu

Aura wykorzystuje hybrydową architekturę łączącą:
- **Frontend**: Next.js 14 + Three.js (Vercel)
- **Backend**: Google Cloud Run ([`apps/backend-gcp`](../apps/backend-gcp))
- **Database**: Cloud SQL (PostgreSQL); schema w [`infra/gcp/sql`](../infra/gcp/sql)
- **Image generation**: Google (Vertex / Gemini) z Next.js `/api/google/*`
- **Legacy Modal backend**: [`docs/archive/modal-backend`](../docs/archive/modal-backend)

## Przepływ Danych

```
User → Frontend (Vercel) → /api/google/* → Google image APIs
  ↓
  Research Data → Cloud Run (backend-gcp) → Cloud SQL / Storage
```

## Komponenty Systemu

### Frontend Architecture

```
src/
├── app/                 # Next.js App Router
│   ├── (flow)/         # Routed screens
│   ├── api/            # API routes
│   └── layout.tsx      # Global layout
├── components/
│   ├── awa/            # 3D character system
│   ├── screens/        # Flow screens
│   └── ui/             # Glassmorphism components
├── hooks/              # React hooks
├── lib/                # Utilities
└── types/              # TypeScript definitions
```

### Backend Architecture

```
apps/backend-gcp/
├── src/server.ts       # Express API
├── src/routes/         # participants, research, swipes, …
└── …
```
Archiwum Modal: `docs/archive/modal-backend/`.

## Kluczowe Technologie

### Three.js Integration
- GLTFLoader dla modelu Quinn
- Mouse tracking system
- Real-time head movement
- Performance optimization

### FLUX 1 Kontext
- State-of-the-art image editing
- Context preservation across iterations
- Unified generation/editing pipeline
- GPU-accelerated processing

### Research Through Design
- Triangulated data collection
- Behavioral analytics
- Session management
- GDPR compliance

## Data Flow

### 1. User Onboarding
```
Landing → Consent → Session Creation → User Hash Generation
```

### 2. Visual Preferences Discovery
```
Tinder Test → Swipe Data → Visual DNA Analysis → Preference Extraction
```

### 3. Need Assessment
```
Ladder Method → Progressive Questions → Core Need Identification
```

### 4. AI Generation
```
Visual DNA + Core Need → Prompt Building → FLUX Generation → Image Display
```

### 5. Iterative Refinement
```
User Feedback → Modification Selection → FLUX Editing → Updated Images
```

## Performance Considerations

### Frontend Optimization
- Three.js model lazy loading
- Image optimization with Next.js
- Progressive enhancement
- Mobile-first design

### Backend Scaling
- Modal auto-scaling
- GPU resource management
- Request queuing
- Cost optimization

### Database Design
- Efficient indexing
- Real-time subscriptions
- Bulk data operations
- Analytics aggregations

## Security & Privacy

### Data Protection
- Anonymous user hashing
- GDPR-compliant data handling
- Secure API endpoints
- Encrypted data transmission

### Research Ethics
- Informed consent process
- Data anonymization
- Academic use restrictions
- Participant withdrawal rights
