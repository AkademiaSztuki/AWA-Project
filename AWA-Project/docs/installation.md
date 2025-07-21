# Instalacja i Konfiguracja Aura

## Wymagania Systemowe

- Node.js 18+ 
- Python 3.11+
- Modal CLI
- Supabase account
- Hugging Face account (dla FLUX)

## Krok 1: Klonowanie i Instalacja

```bash
# Rozpakuj projekt
unzip aura-research-monorepo.zip
cd aura-research-monorepo

# Instaluj zależności (główne)
npm install

# Instaluj zależności w poszczególnych aplikacjach
cd apps/frontend && npm install && cd ../..
cd apps/modal-backend && pip install -r requirements.txt && cd ../..
```

## Krok 2: Konfiguracja Modal.com

```bash
# Zainstaluj Modal CLI
pip install modal

# Zaloguj się do Modal
modal setup

# Stwórz sekrety (Hugging Face token)
modal secret create huggingface-secret HUGGINGFACE_TOKEN=your_hf_token
```

## Krok 3: Konfiguracja Supabase

1. Utwórz nowy projekt na supabase.com
2. Skopiuj URL i anon key
3. Utwórz plik `.env.local` w `apps/frontend/`:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_MODAL_API_URL=https://your-workspace--aura-flux-api.modal.run
```

## Krok 4: Deployment

### Backend (Modal.com)
```bash
cd apps/modal-backend
modal deploy main.py
```

### Frontend (Vercel)
```bash
cd apps/frontend
npm run build
vercel deploy
```

## Krok 5: Upload Modelu Quinn

1. Skopiuj plik `SKM_Quinn.gltf` do `apps/frontend/public/models/`
2. Upewnij się, że wszystkie tekstury są w tym samym folderze

## Troubleshooting

### Modal nie uruchamia się
- Sprawdź czy masz poprawny token Hugging Face
- Upewnij się, że masz dostęp do GPU H100

### Model Quinn nie ładuje się
- Sprawdź ścieżkę do pliku GLTF
- Upewnij się, że plik ma poprawną strukturę eksportu z Unreal

### Frontend nie łączy się z backend
- Sprawdź URL Modal API w zmiennych środowiskowych
- Upewnij się, że CORS jest poprawnie skonfigurowany
