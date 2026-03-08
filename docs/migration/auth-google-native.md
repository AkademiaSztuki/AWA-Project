# Migracja logowania na bezpośrednie Google (bez Supabase)

## Po co

Obecnie „Zaloguj przez Google” idzie przez **Supabase OAuth** (Supabase przekierowuje do Google i z powrotem). To generuje limit MAU w Supabase i wymaga utrzymywania Supabase tylko do auth. **Logowanie bezpośrednio przez Google** (Google Identity Services w tym samym projekcie GCP) usuwa tę zależność i ograniczenia quota.

## Co już jest w projekcie

- **Backend GCP** ma endpointy:
  - `POST /api/participants/link-auth` – łączy `user_hash` z `auth_user_id` (Google `sub`)
  - `GET /api/participants/by-auth/:authUserId` – zwraca uczestnika po Google ID
- Tabela `participants` ma kolumnę `auth_user_id` (UUID/TEXT) do przechowywania Google `sub`.

## Kroki po stronie GCP (jednorazowo)

1. **Google Cloud Console** → [APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials) (projekt `project-a2c75857-73b0-4982-acf` lub Twój).
2. **Create Credentials** → **OAuth 2.0 Client ID**.
3. Typ: **Web application**.
4. **Authorized JavaScript origins**:
   - `http://localhost:3000`
   - `https://www.project-ida.com`
   - `https://project-ida.com` (jeśli używana też domena bez www)
5. **Authorized redirect URIs** (dla opcji z redirect):
   - `http://localhost:3000/auth/callback`
   - `https://www.project-ida.com/auth/callback`
   - `https://project-ida.com/auth/callback` (jeśli używana też domena bez www)  
   (dla samego „token model” / popup nie zawsze jest wymagany redirect).
6. Skopiuj **Client ID** (np. `xxxx.apps.googleusercontent.com`).

## Zmienne frontendu

W `apps/frontend/.env.local`:

```env
# Włącz logowanie bezpośrednio przez Google (zamiast Supabase OAuth)
NEXT_PUBLIC_USE_GOOGLE_NATIVE_AUTH=1
# Client ID z GCP Console (OAuth 2.0 Client ID – Web application)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=TWÓJ_CLIENT_ID.apps.googleusercontent.com
```

Działanie:

- Gdy `NEXT_PUBLIC_USE_GOOGLE_NATIVE_AUTH=1` i podany `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, przycisk „Zaloguj przez Google” używa **Google Identity Services** i backendu GCP (`link-auth`, `by-auth`).
- Gdy zmienne nie są ustawione, nadal używany jest Supabase OAuth (obecne zachowanie).

## Flow (Google native)

1. Użytkownik klika „Zaloguj przez Google”.
2. Frontend ładuje skrypt GIS (`accounts.google.com/gsi/client`), wywołuje `google.accounts.oauth2.initTokenClient` (albo One Tap) z `client_id` i `scope: 'openid email profile'`.
3. Po zgodzie użytkownika Google zwraca credential (ID token JWT).
4. Frontend dekoduje JWT (bez weryfikacji po stronie klienta wystarczy `sub`; w produkcji token można wysłać do backendu do weryfikacji).
5. Frontend wywołuje `POST /api/participants/link-auth`: `userHash` = obecny lokalny hash (lub nowy), `authUserId` = `sub` z JWT.
6. Backend zapisuje/aktualizuje `participants.auth_user_id`, ewentualnie zwraca `existingUserHash` jeśli konto było już linkowane.
7. Frontend zapisuje w stanie/localStorage: `authUserId` (sub), `userHash` (z backendu lub lokalny), email/name z JWT – i traktuje użytkownika jako „zalogowanego”.
8. Przy następnych wejściach: jeśli w localStorage jest `authUserId`, frontend może wywołać `GET /api/participants/by-auth/:authUserId` i ustawić `userHash` (restore sesji).

## Co zostaje przy Supabase

- **Email OTP** (magic link) – nadal przez `supabase.auth.signInWithOtp` albo osobny flow, dopóki nie zdecydujecie się go zastąpić.
- Opcjonalnie: Supabase Auth można wyłączyć całkowicie po migracji wszystkich użytkowników i usunięciu wywołań.

## Pliki do zmiany (implementacja)

- `apps/frontend/src/lib/google-auth.ts` – inicjalizacja GIS, `signInWithGoogleNative()`, dekodowanie JWT, wywołanie `gcpApi.participants.linkAuth` / `fetchByAuth`.
- `apps/frontend/src/contexts/AuthContext.tsx` – jeśli `NEXT_PUBLIC_USE_GOOGLE_NATIVE_AUTH=1`, `signInWithGoogle` wywołuje `google-auth`, stan „user” budowany z `authUserId` + `userHash` (adapter do obecnego typu `User`).
- `apps/frontend/.env.local.example` (lub README) – dopisać `NEXT_PUBLIC_USE_GOOGLE_NATIVE_AUTH` i `NEXT_PUBLIC_GOOGLE_CLIENT_ID`.

Po wdrożeniu: ustaw zmienne, utwórz Client ID w GCP, przetestuj logowanie; quota Supabase przestanie dotyczyć logowania Google.
