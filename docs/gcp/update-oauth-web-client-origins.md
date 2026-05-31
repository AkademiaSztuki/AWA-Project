# Google OAuth Web Client — origins/redirects

## Production login (www.project-ida.com)

**Default (after 2026-05-31):** GIS **popup** (`initTokenClient`) — **no** `redirect_uri` on Google authorize. Popup works with **JavaScript origins** only; redirect URIs are optional unless you force redirect (`NEXT_PUBLIC_GOOGLE_OAUTH_USE_PKCE_REDIRECT=1`) or use dev fallback on localhost.

### JavaScript origins (required for popup)

Merge in [Google Cloud Console](https://console.cloud.google.com/apis/credentials?project=project-a2c75857-73b0-4982-acf) → OAuth 2.0 Client ID matching `NEXT_PUBLIC_GOOGLE_CLIENT_ID`:

- `https://www.project-ida.com`
- `https://project-ida.com`
- `http://localhost:3000`
- (plus any Vercel preview hosts you use)

### Redirect URIs (only if redirect flow is used)

If you enable PKCE redirect or need implicit fallback, register **all four** production lines (byte-for-byte, no trailing slash):

```
https://www.project-ida.com/auth/google/callback
https://project-ida.com/auth/google/callback
https://www.project-ida.com/auth/callback
https://project-ida.com/auth/callback
```

Also add localhost when testing redirect locally:

```
http://localhost:3000/auth/google/callback
http://localhost:3000/auth/callback
```

**Do not** set `NEXT_PUBLIC_GOOGLE_OAUTH_REDIRECT_URI` on Vercel production unless it matches one of the lines above exactly (a bad value with `\r\n` causes `redirect_uri_mismatch`).

| Item | Value |
|------|--------|
| Client ID suffix | `...njt0347si32k8llp4qdkdnv0e1h47tq5.apps.googleusercontent.com` |
| GCP project | `project-a2c75857-73b0-4982-acf` |

## CLI update status (2026-05-29)

**CLI update: FAILED** — no working public API/gcloud command for the **OAuth 2.0 Client ID (Web application)**.

### What was tried

1. **`gcloud iam oauth-clients`** — Workforce/IAM only; Web client NOT_FOUND.
2. **IAP / `clientauthconfig.googleapis.com`** — enable denied or 404.

## Vercel preview URLs

For each preview host `https://<deployment>.vercel.app`:

- Origin: `https://<deployment>.vercel.app`
- Redirect (if using redirect flow): `https://<deployment>.vercel.app/auth/google/callback` and optionally `/auth/callback`

## Helper script

From repo root:

```powershell
.\infra\gcp\scripts\Add-GoogleOAuthOrigins.ps1
```

Prints origins + redirect checklist for manual merge in Console.
