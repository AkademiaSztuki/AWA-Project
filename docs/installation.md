# Instalacja i Konfiguracja Aura

## Wymagania Systemowe

- Node.js 18+
- pnpm (zalecane) lub npm
- Opcjonalnie: Python tylko jeśli eksperymentujesz ze zarchiwizowanym Modal (`docs/archive/modal-backend`)
- Konto Google Cloud (Cloud Run, Cloud SQL) dla pełnej persystencji

## Krok 1: Klonowanie i Instalacja

```bash
# Rozpakuj projekt
unzip aura-research-monorepo.zip
cd aura-research-monorepo

pnpm install
```

## Krok 2: Konfiguracja frontendu i GCP

1. Utwórz plik `.env.local` w `apps/frontend/` (patrz też `infra/gcp/INSTRUKCJA_PL.md`):

```env
NEXT_PUBLIC_GCP_API_BASE_URL=https://your-cloud-run-url
# + zmienne dla Google image generation (projekt dokumentuje w kodzie / Vercel)
```

2. Dla lokalnego **backend-gcp** ustaw `DATABASE_URL` (Postgres) zgodnie z instrukcją GCP.

## Krok 3: Deployment

### Backend (Cloud Run)

Wdrożenie wg dokumentacji w `infra/gcp/` (obraz Dockera / `gcloud run deploy`).

### Frontend (Vercel)
```bash
cd apps/frontend
npm run build
vercel deploy
```

## Krok 4: Upload modelu Quinn

1. Skopiuj plik `SKM_Quinn.gltf` do `apps/frontend/public/models/`
2. Upewnij się, że wszystkie tekstury są w tym samym folderze

## Troubleshooting

### Backend GCP nie startuje lokalnie
- Ustaw `DATABASE_URL` (Postgres) — patrz `infra/gcp/INSTRUKCJA_PL.md`

### Model Quinn nie ładuje się
- Sprawdź ścieżkę do pliku GLTF
- Upewnij się, że plik ma poprawną strukturę eksportu z Unreal

### Frontend nie zapisuje danych badawczych
- Sprawdź `NEXT_PUBLIC_GCP_API_BASE_URL` oraz odpowiedzi `200` z Cloud Run (`/api/session`, `/api/research/events`)
