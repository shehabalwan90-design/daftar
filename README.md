# Daftar V2

Arabic-first, RTL shop ledger built with React, TypeScript, Vite, Dexie, and Supabase.

## Run locally

```sh
npm install
npm run dev
```

The app seeds a local demo shop on first launch and stores shop data in IndexedDB. Product prices are never generated; the owner enters them.

## Daftari Smart

The existing voice-entry screen also accepts typed Yemeni Arabic commands and common Latin transliterations. Speech input uses the browser Web Speech API; speech recognition availability and processing depend on the browser. Command interpretation is rule-based in the app, with no LLM. The assistant looks up prices from the active shop's product list, multiplies recognized quantities by the saved unit price, and requires an explicit confirmation before saving a debt or payment. Ambiguous customer names are not selected automatically. Confirmed first-name preferences are stored locally per shop; balance questions are answered without creating a transaction.

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
