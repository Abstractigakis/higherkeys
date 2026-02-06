# Authentication Configuration Guide

## 1. Environment Variables (.env)

| Variable | Development (Local) | Production |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://dxiavqvplkxeftjkwzit.supabase.co` | `https://auth.higherkeys.com` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | `[DEV_ANON_KEY]` | `[PROD_ANON_KEY]` |

---

## 2. Google Cloud Console (Two Separate Clients)

| Setting | Client A (Development) | Client B (Production) |
| :--- | :--- | :--- |
| **Authorized JS origins** | `http://localhost:3000` | `https://higherkeys.com` |
| **Authorized redirect URIs** | `https://dxiavqvplkxeftjkwzit.supabase.co/auth/v1/callback` | `https://auth.higherkeys.com/auth/v1/callback` |

---

## 3. Supabase Dashboard (Two Separate Projects)

### URL Configuration

| Setting | Dev Project (dxiavqv...) | Prod Project (auth.higher...) |
| :--- | :--- | :--- |
| **Site URL** | `http://localhost:3000` | `https://higherkeys.com` |
| **Redirect URLs** | `http://localhost:3000/auth/callback` | `https://higherkeys.com/auth/callback` |

### Custom Domain (Production Only)

| Record Type | Host | Value / Target |
| :--- | :--- | :--- |
| **CNAME** | `auth` | `[PROD_PROJECT_ID].supabase.co` |
| **TXT (SSL)** | `_acme-challenge.auth` | (Provided by Supabase) |

---

## 4. Code Implementation Details

| Feature | Implementation |
| :--- | :--- |
| **Cookie Domain** | `.higherkeys.com` (Prod) / `undefined` (Local) |
| **Account Selection** | `prompt: 'select_account'` (Forced) |
| **Callback Route** | `app/auth/callback/route.ts` |
| **Middleware** | `lib/supabase/middleware.ts` |
