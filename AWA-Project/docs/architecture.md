# Architektura Projektu Aura

## Przegląd Systemu

Aura wykorzystuje hybrydową architekturę łączącą:
- **Frontend**: Next.js 14 + Three.js (Vercel)
- **Backend**: Python + FLUX 1 Kontext (Modal.com)  
- **Database**: Supabase PostgreSQL
- **Storage**: Supabase Storage + Modal filesystem

## Przepływ Danych

```
User → Frontend (Vercel) → Modal API → FLUX Model → Generated Images
  ↓                          ↓
  Research Data → Supabase → Analytics
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
apps/modal-backend/
├── main.py             # FastAPI + Modal app
├── requirements.txt    # Python dependencies
├── modal.toml         # Modal configuration
└── utils/             # Helper functions
```

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
