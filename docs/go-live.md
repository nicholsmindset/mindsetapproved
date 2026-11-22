# Go live: the steps that need you

Everything in the repo is built and tested. These are the steps only you can do, in order, with exact commands. Tick them off as you go.

- **Background and details:** [deployment.md](deployment.md).
- **Store copy and screenshots:** [app-store.md](app-store.md).

---

## 1. Finish Supabase (5 minutes)
The database and the AI function are live in the **Onnify Growth OS** project.

- [ ] **Remove two temporary helpers.** In the Supabase dashboard, open SQL Editor and run:
  ```sql
  drop function if exists public.mindset_apply_file(text, text, text, boolean);
  drop extension if exists http;
  ```
- [ ] **AI re-check key.** Go to Edge Functions → Secrets → Add `GEMINI_API_KEY`, using a key from [Google AI Studio](https://aistudio.google.com/apikey). Don't paste the key into chat.

## 2. Install the app on your phone and try it (about 1 hour)
The build settings already point at the live backend (`apps/mobile/eas.json`).

- [ ] Create a free account at [expo.dev](https://expo.dev).
- [ ] On your computer, from the repo's `apps/mobile` folder:
  ```bash
  npx eas-cli@latest login
  ```
  ```bash
  npx eas-cli init
  ```
  ```bash
  npx eas-cli build --profile preview --platform android
  ```
  Open the link EAS gives you on your Android phone and install it. For iPhone, use `--platform ios`. This needs the Apple Developer account from step 4, and EAS will ask to register your device.
- [ ] Try 20–30 real products from your kitchen and a shop: by barcode, by label photo, a Chinese or Malay label, and one blurry photo. Note any wrong verdicts. They're fixed in the admin, not in the app.
- [ ] Check light, dark and Automatic in Settings → Appearance.

## 3. Website and admin (about 30 minutes)
- [ ] On [vercel.com](https://vercel.com), choose New Project, import `nicholsmindset/mindsetapproved` and set **Root directory** to `apps/admin`.
- [ ] Set these environment variables:

  | Name | Value |
  |---|---|
  | `NEXT_PUBLIC_SUPABASE_URL` | `https://hombnfjwqhheyyvwemlk.supabase.co` |
  | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the anon key in `apps/admin/.env.example` |
  | `NEXT_PUBLIC_SITE_URL` | your domain, e.g. `https://mindsetapproved.com` |
  | `CORRECTIONS_SECRET` | the result of `select value from public.app_secrets where name = 'corrections';` in the Supabase SQL editor |

- [ ] Add your domain in Vercel → Domains.
- [ ] Deploy the publishing function from your computer, at the repo root:
  ```bash
  npx supabase login
  ```
  ```bash
  npx supabase functions deploy publish-bundle --project-ref hombnfjwqhheyyvwemlk
  ```
- [ ] **Shared sign-in email.** Supabase → Authentication → Emails → Magic Link: add `Your code: {{ .Token }}` under the existing link, so Onnify's link keeps working.
- [ ] **Redirect URL.** Authentication → URL Configuration → add `https://<your domain>/auth/callback`.
- [ ] **Make yourself admin.** Sign in once at `https://<your domain>/admin`. Then go to Authentication → Users → your user → set `app_metadata` to `{"role": "admin"}`, and sign in again.
- [ ] **Publish rules v1:** Admin → Publish → Publish v1.
- [ ] Put the website address into the app's build settings so share links, corrections and privacy appear: in `apps/mobile/eas.json`, set `EXPO_PUBLIC_SHARE_BASE_URL` for the preview and production profiles. Ask Claude to do it.

## 4. Store accounts and listings
- [ ] **Apple Developer Program:** [developer.apple.com/programs](https://developer.apple.com/programs/), US$99 a year. Enrol as an organisation (ONN Group LLP) so the seller name is the company, not you. That needs a D-U-N-S number, which is free and takes a few days.
- [ ] **Google Play Console:** [play.google.com/console](https://play.google.com/console), US$25 once.
- [ ] Create the listings using [app-store.md](app-store.md): text, privacy answers, review notes, and the screenshots in `docs/store/`. Add one real camera screenshot from your phone as slide 1.
- [ ] Build and send to testers:
  ```bash
  npx eas-cli build --profile production --platform all
  ```
  ```bash
  npx eas-cli submit --platform ios
  ```
  ```bash
  npx eas-cli submit --platform android
  ```
  Test with TestFlight (iOS) and Internal testing (Android) for a few days, then submit for review.

## 5. Before you announce
- [ ] A lawyer reviews `/privacy` and `/terms` (both are marked as drafts on the site). Then remove the draft banners: ask Claude.
- [ ] Set the Data Protection Officer contact in `/privacy`. Singapore's PDPA requires one.
- [ ] Run a trademark search for "Mindset Approved" with IPOS (Singapore) and USPTO, and file under ONN Group LLP.
- [ ] Review the rules and translations listed in `docs/rules-review.md`.

## 6. Strongly recommended before a public launch
- [ ] **Give Mindset its own Supabase project on the Pro plan** (US$25 a month). The current shared Free project:
  - pauses after a week without activity;
  - has no daily backups;
  - shares sign-in emails with Onnify.

  The move is in [deployment.md](deployment.md#moving-to-a-dedicated-project-later): about 30 minutes, and Claude can do most of it.

## 7. Optional
- [ ] **Crash reports:** create a project at [sentry.io](https://sentry.io). Add its DSN as `EXPO_PUBLIC_SENTRY_DSN` in `eas.json`, and `SENTRY_AUTH_TOKEN` as an EAS secret for readable stack traces. Until then, crash reporting stays off.
- [ ] **Premium purchases:** set up subscriptions and RevenueCat. The steps are in [launch-checklist.md](launch-checklist.md#5-purchases-when-ready).
