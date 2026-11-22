# Deployment: what is live

Last updated 22 Nov 2026.

## Supabase: live, sharing the Onnify Growth OS project
| | |
|---|---|
| Project | Onnify Growth OS, `hombnfjwqhheyyvwemlk`, region `ap-southeast-1` (Singapore) |
| API URL | `https://hombnfjwqhheyyvwemlk.supabase.co` |
| App and website key | the **legacy anon JWT**, already in `apps/*/.env.example`. Edge Functions verify a JWT, so the `sb_publishable_` key won't work for them. |

The Free plan allows two projects, so for now Mindset shares a project with Onnify. The two don't overlap:
- **Tables:** no Mindset table, type or function name clashes with Onnify's.
- **`set_updated_at()`:** both use this name. The two bodies are identical, so replacing it changed nothing for Onnify.
- **Migration history:** Onnify's `supabase_migrations` was left untouched, so Onnify's own `supabase db push` keeps working. Mindset's applied files are recorded in `public.mindset_applied_migrations`, which has RLS on and no grants.

### What was applied
- Every file in `supabase/migrations` up to `20261128000002_fk_indexes.sql`, plus `supabase/seed.sql`.
- **Totals:** 71 rules, 2,581 names and 15 categories.
- **How:** the database fetched each file from this repository, pinned to commit `f667e7a`. Each file's SHA-256 was checked against the local copy before it ran. The last two migrations were run directly.
- **Corrections secret:** generated inside the database into `public.app_secrets`. It has never been in chat or in the repository.

### Checked
- RLS is on for every table.
- The anon key can't reach `app_secrets`, `product_submissions` or any Onnify table.
- `norm_key` matches the engine on Chinese, Japanese, Korean and accented names.
- `ocr-fallback` answers 400 to a bad request and 401 when there's no JWT.
- Onnify's row counts and migration history are unchanged.
- **Advisor finding, fixed:** the security advisor found that Supabase grants EXECUTE on new functions to `anon` and `authenticated` by default. That left `refund_ai_recheck` callable by phones. `20261128000001_tighten_grants.sql` fixes it. The local test database now copies Supabase's default grants, so `pnpm check:sql` catches this kind of bug.

### Edge Functions
| Function | Status |
|---|---|
| `ocr-fallback` | **Deployed** (v1, JWT verified). Needs `GEMINI_API_KEY`, see below. |
| `publish-bundle` | Not deployed yet. Only the admin website calls it. |

## Still to do (needs you)
1. **Gemini key:** Supabase dashboard → Edge Functions → Secrets → add `GEMINI_API_KEY` (from Google AI Studio). Until then, AI re-check returns an error and refunds the use.
2. **Temporary pieces to remove:** run this in the SQL editor. It's two drops that the MCP connector couldn't get confirmed. Neither is exposed: the function is owner-only.
   ```sql
   drop function if exists public.mindset_apply_file(text, text, text, boolean);
   drop extension if exists http;
   ```
3. **Website (Vercel):**
   - Import the repo with root directory `apps/admin`.
   - Set the variables from `apps/admin/.env.example`. `CORRECTIONS_SECRET` is the value from `select value from public.app_secrets where name = 'corrections';`.
   - Then deploy `publish-bundle`:
     ```bash
     npx supabase functions deploy publish-bundle --project-ref hombnfjwqhheyyvwemlk
     ```
4. **Admin user:**
   - Sign in on the website once.
   - Then: Authentication → Users → your user → `app_metadata` = `{"role": "admin"}`.
   - Mindset reads only this key; Onnify doesn't use it.
5. **Auth email (shared with Onnify):**
   - The app signs in with a 6-digit code. Add `{{ .Token }}` to the Magic Link email template next to the existing link; Onnify's sign-in keeps working.
   - Add the website's `/auth/callback` to the redirect URLs.
   - Do this when the website is live.
6. **Publish rules v1** from Admin → Publish. Phones already ship with v1 built in, so nothing is waiting on it.

## Moving to a dedicated project later
When the org has room (Pro plan, or a freed slot):
1. Create the project. Run `npx supabase link` and `npx supabase db push` (this applies every migration), then load `supabase/seed.sql`.
2. Copy the data tables if there are real users by then: `scans`, `reports`, `products`, `product_submissions`, `unmatched_terms`, `corrections`, `shared_verdicts`, `user_settings`, `ai_usage` and `rule_versions`, plus the `rules-bundles` storage files.
3. Point the app and website at the new URL and key.
4. In Onnify, drop the Mindset objects: the tables, types and functions listed in the migrations, plus `mindset_applied_migrations`. Keep `set_updated_at()`, because Onnify uses it.
