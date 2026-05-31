# Google OAuth — napraw `redirect_uri_mismatch` (5 min)

## Co wysyła aplikacja (produkcja www.project-ida.com)

| Kontekst | Przepływ | `redirect_uri` w żądaniu do Google |
|----------|----------|-------------------------------------|
| **Chrome / Safari** (zwykła przeglądarka) | GIS popup — **bez** `redirect_uri` | *(brak — tylko JavaScript origins)* |
| **Cursor / VS Code embedded** | Pełna strona → implicit OAuth | `https://www.project-ida.com/auth/callback` |
| **Apex** `project-ida.com` | jak wyżej | `https://project-ida.com/auth/callback` |

Błąd **`redirect_uri_mismatch`** = w Google Cloud **brakuje dokładnie** tego wiersza w **Authorized redirect URIs** (wielkość liter, https, **bez** końcowego `/`).

Błąd **`origin_mismatch`** (inny komunikat) = brakuje wpisu w **Authorized JavaScript origins** — też wklej poniżej.

---

## Krok po kroku (Google Cloud Console)

1. Otwórz: [Credentials — OAuth 2.0 Client IDs](https://console.cloud.google.com/apis/credentials?project=project-a2c75857-73b0-4982-acf)
2. Kliknij klienta Web, którego **Client ID** kończy się na:  
   `njt0347si32k8llp4qdkdnv0e1h47tq5.apps.googleusercontent.com`  
   (musi być ten sam co `NEXT_PUBLIC_GOOGLE_CLIENT_ID` na Vercel).
3. **Authorized JavaScript origins** — dodaj (jeśli brakuje), po jednym w wierszu:

```
https://www.project-ida.com
https://project-ida.com
```

4. **Authorized redirect URIs** — dodaj **wszystkie cztery** (skopiuj 1:1):

```
https://www.project-ida.com/auth/callback
https://project-ida.com/auth/callback
https://www.project-ida.com/auth/google/callback
https://project-ida.com/auth/google/callback
```

5. **Save** → odczekaj 1–2 minuty → w Cursor kliknij **„Otwórz w Chrome”** albo zaloguj się w zwykłym Chrome na https://www.project-ida.com

---

## Diagnostyka po deployu

- **Preview / dev:** `GET /api/debug/oauth-config`
- **Produkcja:** ustaw `OAUTH_DEBUG_SECRET` na Vercel, potem:  
  `GET https://www.project-ida.com/api/debug/oauth-config?secret=TWÓJ_SEKRET`  
  Odpowiedź zawiera `redirectUri`, `isEmbedded`, `flow`, `clientIdSuffix`.

---

## Czego NIE robić na Vercel Production

- **Nie** ustawiaj `NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI`, chyba że jest **identyczny** z jednym z 4 redirectów powyżej (bez `\r\n`).
- **Nie** włączaj `NEXT_PUBLIC_GOOGLE_OAUTH_USE_PKCE_REDIRECT=1` bez `GOOGLE_CLIENT_SECRET` i bez PKCE redirectów w GCP.

---

## Cursor nadal nie działa?

Użyj przycisku **„Otwórz w Chrome”** w modalu logowania — logowanie w systemowej przeglądarce używa GIS popup (tylko origins, bez redirect).
