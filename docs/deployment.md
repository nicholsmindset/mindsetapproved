# Deployment: what is live

> **To finish going live, follow [go-live.md](go-live.md)**: every remaining step, in order.

Last updated 22 Nov 2026.

## Supabase: live in its own project
| | |
|---|---|
| Project | **mindset-approved**, `ywunhcftvroykiquejpg`, region `ap-southeast-1` (Singapore) |
| API URL | `https://ywunhcftvroykiquejpg.supabase.co` |
| App and website key | the **legacy anon JWT**, already in `apps/mobile/eas.json` and `apps/*/.env.example`. Edge Functions verify a JWT, so the `sb_publishable_` key won't work for them. |

### What was applied
- **Migrations:** every file in `supabase/migrations`, from `20261120000001` to `20261128000002`, recorded in Supabase's own migration history (`supabase_migrations.schema_migrations`). That means `npx supabase db push` works normally from now on and only applies new files.
- **Seed:** `supabase/seed.sql`, with 71 rules, 2,581 ingredient names and 15 categories.
- **How:** the database fetched each file from this repository, pinned to commit `01815d7`, and checked its SHA-256 against the local copy before running it.
- **Corrections secret:** generated inside the database into `public.app_secrets`. It has never been in chat or in the repository.

### Checked
- RLS is on for every table.
- The public (anon) key can't refund AI re-checks or read `app_secrets`.
- `norm_key` matches the engine (accented and CJK names, e.g. 黄色4号 → Yellow 5).
- `ocr-fallback` answers 400 to a bad request and 401 without a JWT.
- **Security advisor:** what remains is the public functions the app is designed to call (each validates its input), plus `rls_auto_enable`, a helper Supabase adds to new projects.

### Edge Functions
| Function | Status |
|---|---|
| `ocr-fallback` | **Deployed** (v1, JWT verified). Needs `GEMINI_API_KEY`, see go-live step 1. |
| `publish-bundle` | Not deployed yet. Only the admin website calls it. Deploy it with the Supabase CLI (go-live step 3). |

The temporary `http` extension used to fetch the files during setup has been removed.

## The earlier copy in Onnify Growth OS
Before this project existed, Mindset was set up inside the **Onnify Growth OS** project (`hombnfjwqhheyyvwemlk`). Nothing uses that copy any more. `supabase/cleanup-onnify.sql` removes it:
- it runs as one transaction;
- it only touches Mindset objects;
- it keeps `set_updated_at()`, which Onnify uses;
- it was tested on an identical local copy.

Run it in Onnify's SQL editor when convenient, then delete the empty `rules-bundles` bucket under Storage.

## Moving or recreating the project
To set up Mindset in another project:
1. Run `npx supabase link --project-ref <ref>`.
2. Run `npx supabase db push`, which applies every migration.
3. Load the seed: `psql "$DATABASE_URL" -f supabase/seed.sql`.
4. Deploy both functions.
5. Insert a corrections secret into `public.app_secrets`.
6. Point `apps/mobile/eas.json` and the website's environment variables at the new URL and key.
