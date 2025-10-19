# 🚀 Quick Auth Setup (2 min)

## Problem

Po zakończeniu Core Profile widzisz błędy:
- **Google:** `"provider is not enabled"`
- **Email:** Link nie wysyła się

## Fix w 2 minuty

### 1️⃣ Enable Google OAuth

1. Idź do [Supabase Dashboard → Auth → Providers](https://supabase.com/dashboard/project/zcaaqbbcqpkzunepnhpb/auth/providers)
2. Find **Google** → Click **Enable**
3. **For testing locally**: Możesz użyć Supabase Development Keys (automatic)
   - Lub skonfiguruj własne Google OAuth (see full guide in `docs/supabase-auth-setup.md`)
4. Click **Save**

### 2️⃣ Enable Email (Magic Link)

1. W Supabase: **Authentication → Providers**
2. Find **Email** → Should be enabled by default
3. **IMPORTANT**: Verify these settings:
   - ✅ **Enable Email Signup** - ON
   - ❌ **Confirm Email** - OFF (for magic links to work instantly)
4. Add redirect URLs:
   - Site URL: `http://localhost:3002`
   - Redirect URLs: Add `http://localhost:3002/auth/callback`
5. Click **Save**

### 3️⃣ Test

```bash
# Restart dev server
cd apps/frontend
pnpm dev
```

1. Complete Core Profile
2. Try **Google** login → should redirect to Google
3. Try **Email** login → check email for magic link

---

## Still Not Working?

### Google Error persists
- Clear browser cache
- Check Supabase → Auth → Providers → Google is **GREEN** (enabled)
- Restart dev server

### Email not sending
1. Supabase → Auth → Email Templates
2. Check "Magic Link" template exists
3. Verify "Confirm Email" is **OFF**
4. Check spam folder

### Google shows "DEPLOYMENT_NOT_FOUND" or redirects to wrong URL
**Problem:** Google OAuth Redirect URI mismatch

**Quick Fix:**
1. Supabase → Auth → Providers → Google
2. Enable **"Use development keys"** (for local testing)
3. OR add to Google Cloud Console Authorized Redirect URIs:
   - `https://zcaaqbbcqpkzunepnhpb.supabase.co/auth/v1/callback`
   - `http://localhost:3002/auth/callback`

**Test:** Use **Magic Link (email)** first to verify auth works

### Both fail
- Verify `.env.local` has correct Supabase URL and anon key
- Check Supabase project is not paused

---

**Full instructions:** `docs/supabase-auth-setup.md`

