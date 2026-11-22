# Launch checklist

Everything in the repo is built and tested locally. These are the steps that need your accounts, in order. Commands run from the repo root unless noted.

> **Start with [go-live.md](go-live.md)**, the ordered runbook. **Status:** the database and `ocr-fallback` are live in the Onnify Growth OS project. See [deployment.md](deployment.md) for what is done and the steps left. Section 1 below is for a fresh, dedicated project.

## 1. Supabase (database, auth, storage, functions)
1. Create a project (Pro plan, region `ap-southeast-1` Singapore for PDPA and latency).
2. Link and push the schema:
   ```bash
   npx supabase link --project-ref <ref>
   npx supabase db push          # applies supabase/migrations in order
   psql "$DATABASE_URL" -f supabase/seed.sql
   ```
   Optional: `pnpm off:import --url https://raw.githubusercontent.com/openfoodfacts/openfoodfacts-server/main/taxonomies/additives.txt --out supabase/off-import-additives.sql`, then apply it the same way. This gives you inactive, untiered rows for the admin's review queue.
3. **Auth → URL configuration:** set the site URL to the website, and add `https://<site>/auth/callback` to the redirect URLs.
4. **Auth → Email templates:** keep `{{ .Token }}` in the magic-link template. The app signs in with the 6-digit code.
5. **Make yourself admin:** Authentication → Users → your user → set `app_metadata` to `{"role": "admin"}`.
6. **Functions:**
   ```bash
   npx supabase secrets set GEMINI_API_KEY=<key>      # Google AI Studio key
   npx supabase functions deploy publish-bundle
   npx supabase functions deploy ocr-fallback
   ```
7. **Corrections secret:** generate one with `openssl rand -hex 32` and store it in the database, then put the same value in the website's `CORRECTIONS_SECRET` (section 2):
   ```sql
   insert into public.app_secrets (name, value) values ('corrections', '<secret>');
   ```
8. In the admin: **Publish v1** (Admin → Publish). Phones download it on their next open.

## 2. Website and admin (Vercel)
1. Import the GitHub repo. Set the root directory to `apps/admin`; the framework is Next.js.
2. Env vars:

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon/publishable key |
   | `NEXT_PUBLIC_SITE_URL` | `https://<your domain>` |
   | `CORRECTIONS_SECRET` | the secret from Supabase step 7 (server-only, not `NEXT_PUBLIC_`) |

3. Add the domain. The site serves `/`, `/rules`, `/corrections`, `/privacy`, `/terms` and the share pages `/v/<code>`; the admin is at `/admin`.

## 3. App builds (Expo / EAS)
1. `cd apps/mobile && npx eas-cli@latest init` (creates the EAS project).
2. Env vars (EAS → Environment variables, or `.env` for local builds):
   - `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - `EXPO_PUBLIC_SHARE_BASE_URL` = the website URL (shows share links, corrections, rules, privacy)
3. `npx eas-cli build --profile development --platform ios` (and `android`). Install it on a phone and check:
   - camera permission;
   - barcode scan;
   - label photo → OCR;
   - share image;
   - AI re-check.
4. Store builds: `--profile production`, then `eas submit`.

## 4. Store listings
- **App Store review notes:** "Mindset Approved is an ingredient-preference filter, not a medical device. It does not diagnose, treat, cure or prevent any condition. Verdicts reflect stated ingredient preferences that users can change. Sign-in is optional; reviewers can use the app without an account."
- **Google Play:** complete the Health apps declaration ("not a medical device"), Data safety (scans linked to a random install ID; no location, contacts or ads ID), and the content rating.
- **Privacy policy URL:** `https://<site>/privacy`, once it has been reviewed by your lawyer.
- **Screenshots:** the Result, Rules and History screens. Run the web build (`npx expo start --web`) at phone size for drafts.

## 5. Purchases (when ready)
1. Create App Store and Play subscriptions: monthly US$2.99 and yearly US$19.99.
2. Create a RevenueCat project with a `premium` entitlement.
3. Add `react-native-purchases`, call `store.setPremium(true)` when the entitlement is active, and set `PURCHASES_LIVE = true` in `apps/mobile/src/core/premium.ts`.

## 6. Before you announce
- [ ] Lawyer review of `/privacy` and `/terms`. Both are marked as drafts on the page.
- [ ] Trademark search for "Mindset Approved" with IPOS and USPTO; register it under ONN Group LLP.
- [ ] Review the 10 rules in `docs/rules-review.md`.
- [ ] Set the Data Protection Officer contact in `/privacy`.
- [ ] Run a real-device accuracy check on 20–30 local shelf products, with photos and barcodes.
