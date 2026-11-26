# Daftar V2

Arabic-first, RTL shop ledger built with React, TypeScript, Vite, Dexie, and Supabase.

## Run locally

```sh
npm install
npm run dev
```

The app seeds a local demo shop on first launch and stores shop data in IndexedDB. Product prices are never generated; the owner enters them.

## Enable Supabase

1. Create a Supabase project and enable phone/password authentication and SMS OTP.
2. Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. Apply `supabase/migrations/202611260001_daftar_core.sql` to the project database.
4. Restart Vite. Owners can create or sign into a shop account from **الإعدادات**; customer portal sign-in uses a verified phone OTP.

The migration creates tenant-scoped tables and row-level security policies. Offline edits remain in IndexedDB and a local sync queue until an authenticated owner is online. Conflicts are resolved by `updated_at`; older writes cannot replace newer cloud rows. Failed uploads remain queued.

## Build

```sh
npm run typecheck
npm run build
```
