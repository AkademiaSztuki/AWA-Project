# Konfiguracja Resend (maile Magic Link)

Backend wysyła maile z linkiem logowania przez [Resend](https://resend.com). Plan Free: 3000 e-maili/mies., 100/dzień.

## 1. Gdzie dodać klucz API

- **Backend działa na Cloud Run** – klucz musi być w zmiennych środowiskowych Cloud Run.
- **Skrypt deployu** (`.\deploy-backend.ps1`) czyta `apps/frontend/.env.local` i przekazuje zmienne do Cloud Run. Wystarczy dodać klucz do `.env.local` i zrobić deploy.

**Nie dodawaj klucza do Vercel** – frontend nie wysyła maili; wysyła backend na Cloud Run. Na Vercel dodajesz tylko zmienne frontendu (np. `NEXT_PUBLIC_*`).

## 2. Zmienne w `.env.local`

W pliku **`apps/frontend/.env.local`** dopisz (bez cudzysłowów, w jednej linii):

```env
RESEND_API_KEY=re_TwojKluczZResend
RESEND_FROM=AWA <onboarding@resend.dev>
```

- **`RESEND_API_KEY`** – klucz z [Resend Dashboard](https://resend.com/api-keys) → Create API Key. Skopiuj klucz (zaczyna się od `re_`) i wklej tutaj.
- **`RESEND_FROM`** – nadawca maila.  
  - Na start możesz zostawić `AWA <onboarding@resend.dev>` (domena testowa Resend).  
  - Żeby wysyłać z własnej domeny (np. `login@twoja-domena.com`): w [Resend → Domains](https://resend.com/domains) dodaj domenę, dodaj podane rekordy DNS (SPF, DKIM), po weryfikacji ustaw np. `RESEND_FROM=AWA <login@twoja-domena.com>`.

Plik `.env.local` jest w `.gitignore` – klucz nie trafi do repozytorium.

## 3. Deploy backendu

Po zapisaniu `.env.local` uruchom deploy (skrypt weźmie stamtąd `RESEND_API_KEY` i `RESEND_FROM` i ustawi je na Cloud Run):

```powershell
cd infra/gcp
.\deploy-backend.ps1
```

## 4. (Opcja) Własna domena w Resend

1. [Resend](https://resend.com) → **Domains** → **Add Domain** → wpisz domenę (np. `twoja-domena.com`).
2. W DNS domeny dodaj rekordy, które Resend pokaże (SPF, DKIM – zwykle 2–3 wpisy CNAME/TXT).
3. Po weryfikacji (status „Verified”) ustaw w `.env.local`:  
   `RESEND_FROM=AWA <login@twoja-domena.com>`  
   (albo inny adres z tej domeny, np. `noreply@twoja-domena.com`).
4. Zrób ponownie `.\deploy-backend.ps1`.

## 5. Bezpieczeństwo

- **Nie commituj** `.env.local` ani klucza do gita.
- Jeśli klucz wyciekł (np. wklejony w czat), w [Resend → API Keys](https://resend.com/api-keys) **revoke** stary klucz i utwórz nowy, potem zaktualizuj `RESEND_API_KEY` w `.env.local` i zrób deploy.
