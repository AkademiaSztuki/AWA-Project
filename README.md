# Aura - AI Interior Design Dialogue Research Platform

## Architektura Hybrydowa

- **Frontend (Vercel)**: Next.js 14 + Three.js + Glassmorphism UI
- **Backend (Modal.com)**: Python API + FLUX 1 Kontext + GPU Processing  
- **Database**: Supabase PostgreSQL + Storage
- **Monitoring**: Research Through Design data collection

## Szybki Start

```bash
# Instalacja zależności
npm install

# Rozwój lokalny 
npm run dev:frontend  # Next.js na :3000
npm run dev:backend   # Modal serve

# Deployment
npm run deploy:frontend  # Vercel
npm run deploy:backend   # Modal.com
```

## Struktura Projektu

- `apps/frontend/` - Aplikacja Next.js z postacią AWA
- `apps/modal-backend/` - API Modal.com z FLUX generacją
- `packages/shared-types/` - Wspólne typy TypeScript/Python
- `packages/ui-components/` - Komponenty glassmorphism UI

## Konfiguracja

### Frontend (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-key
NEXT_PUBLIC_MODAL_API_URL=your-modal-endpoint
```

### Backend (Modal secrets)  
```
HUGGINGFACE_TOKEN=your-hf-token
FLUX_API_KEY=your-flux-key
```

## Badania Naukowe

Aplikacja zbiera dane zgodnie z metodologią Research Through Design:
- Dane deklaratywne (odpowiedzi użytkownika)
- Dane behawioralne (interakcje z AWA)  
- Dane wynikowe (parametry AI, generacje)

## Akademia Sztuk Pięknych - Doktorat

Projekt realizowany w ramach badań nad współpracą człowiek-AI w projektowaniu wnętrz.
