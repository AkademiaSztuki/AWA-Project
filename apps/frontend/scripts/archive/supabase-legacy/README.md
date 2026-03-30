# Supabase-only maintenance scripts (archived)

These Node scripts targeted **Supabase** (`@supabase/supabase-js`). Production persistence uses **Google Cloud SQL** via `apps/backend-gcp`.

They are kept for **historical reference** or one-off work against an old Supabase project. Paths to `apps/frontend/.env.local` and `apps/frontend/supabase/` are adjusted for this folder depth.

Run from repo root or `apps/frontend` with `node scripts/archive/supabase-legacy/<script>.js` (see root `package.json` / frontend scripts for aliases).

**Note:** `@supabase/supabase-js` is not a dependency of the frontend package anymore; install it locally if you still run these scripts.
