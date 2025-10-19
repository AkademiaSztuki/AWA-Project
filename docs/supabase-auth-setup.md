# Supabase Auth Setup Guide

## 🔐 Enable Authentication

### 1. Enable Google OAuth

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/zcaaqbbcqpkzunepnhpb/auth/providers)
2. Navigate to: **Authentication → Providers**
3. Find **Google** and click **Enable**

4. **Get Google OAuth Credentials**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create new project or select existing
   - Enable **Google+ API**
   - Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
   - Application type: **Web application**
   - Authorized redirect URIs: `https://zcaaqbbcqpkzunepnhpb.supabase.co/auth/v1/callback`
   - Copy **Client ID** and **Client Secret**

5. **Paste in Supabase**:
   - Client ID → paste
   - Client Secret → paste
   - Click **Save**

### 2. Enable Email (Magic Link)

1. In Supabase: **Authentication → Providers**
2. **Email** should be enabled by default
3. Verify **Enable Email Confirmations** is OFF (for magic links to work)
4. Site URL: `http://localhost:3002` (development)
5. Redirect URLs: Add `http://localhost:3002/auth/callback`

### 3. Configure Email Templates (Optional)

1. **Authentication → Email Templates**
2. Customize **Magic Link** email:
   - Subject: "Twój link do IDA AURA"
   - Body: Add Polish translation

---

## 🔗 How It Works

### User Flow

1. **Anonymous Start**: User begins without login (user_hash in sessionStorage)
2. **Complete Core Profile**: ~15 minutes of personalization
3. **Login Prompt**: "Zapisz swój profil aby wrócić później?"
4. **Google or Magic Link**: User chooses authentication method
5. **Link user_hash**: Backend links anonymous data to authenticated user
6. **Persistent Access**: User can now access Dashboard from any device

### Technical Flow

```
Anonymous Session (sessionStorage)
  user_hash: "user_abc123..."
  coreProfile: { lifestyle, swipes, ... }
  ↓
Complete Core Profile
  ↓
Login Modal (Google OAuth or Magic Link)
  ↓
Supabase Auth creates user.id
  ↓
Link user_hash to user.id in user_profiles table
  ↓
Dashboard shows saved data
```

---

## 🧪 Testing

### Test Google OAuth

1. Start dev server: `cd apps/frontend; pnpm dev`
2. Complete Core Profile: `http://localhost:3002/setup/profile`
3. Click "Complete" → Login Modal appears
4. Click "Continue with Google"
5. Authorize app
6. Redirects to `/dashboard`
7. Check Supabase: **Authentication → Users** - should see new user

### Test Magic Link

1. Complete Core Profile
2. Click "Wyślij Magic Link"
3. Check email inbox
4. Click link in email
5. Redirects to `/dashboard`

### Verify Data Linking

```sql
-- In Supabase SQL Editor:
SELECT 
  up.user_hash, 
  up.aesthetic_dna,
  up.profile_completed_at,
  au.email
FROM user_profiles up
LEFT JOIN auth.users au ON au.id = up.auth_user_id;
```

Should show user_hash linked to email.

---

## 🚨 Troubleshooting

### "redirect_uri_mismatch" Error

**Cause**: Google OAuth redirect URI not configured

**Fix**: Add to Google Cloud Console → Authorized redirect URIs:
```
https://zcaaqbbcqpkzunepnhpb.supabase.co/auth/v1/callback
http://localhost:3002/auth/callback
```

### Magic Link Not Received

**Cause**: Email confirmations enabled or wrong email provider

**Fix**:
1. Supabase → **Authentication → Email Templates**
2. Check "Enable Email Confirmations" is **OFF**
3. Verify SMTP settings if using custom email

### User Data Not Showing in Dashboard

**Cause**: user_hash not linked to auth user

**Fix**: Check `linkUserHashToAuth()` was called after login

---

## 📋 Production Checklist

Before deploying:

- [ ] Configure production redirect URLs in Google Cloud
- [ ] Update Site URL in Supabase to production domain
- [ ] Add production domain to Redirect URLs
- [ ] Test Google OAuth in production
- [ ] Test Magic Link in production
- [ ] Enable Rate Limiting in Supabase
- [ ] Configure email templates with branding
- [ ] Add email verification flow (if needed)

---

## 🎯 Features Enabled

✅ **Google OAuth** - One-click sign in
✅ **Magic Link** - Passwordless email auth
✅ **Anonymous Sessions** - Start without login
✅ **Data Persistence** - Link anonymous→authenticated
✅ **Cross-device Access** - Login from anywhere
✅ **Secure** - Supabase handles tokens, sessions
✅ **Bilingual** - All UI text in PL/EN

---

*Auth system ready for production!* 🚀

