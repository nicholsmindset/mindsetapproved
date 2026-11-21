# apps/admin

Next.js 16 admin dashboard for growing and publishing the rules database without an app release.

| Page | What it does |
|---|---|
| Test bench | Paste a label and see the app's verdict on the **draft** rules. Includes user settings and OCR confidence, can compare with the published version, and loads regression fixtures as samples |
| Ingredients | Search and filter, edit tier, strict tier, reasons and sources, and activate or deactivate. Health-claim words are rejected in reasons |
| Ingredient → aliases | Paste many aliases at once, with a live preview of how each one normalises and any conflict with another ingredient |
| Unmatched | Unknown words from real scans: map one to an ingredient, create a new ingredient from it, or ignore it |
| Reports | Wrong-verdict reports with the scanned text. Re-run them on the draft rules, then resolve or dismiss |
| Publish | Diff against the live bundle and run the 106 regression labels, then publish through the `publish-bundle` Edge Function |
| Products | Correct the cached barcode → ingredients text, and mark products verified |
| Stats | Scans, cache and AI-fallback rates, report rate, verdict mix, top flagged ingredients |

**Public pages:** `/v/<code>` is a shared verdict, with a generated social preview image. It is built server-side from the
sharer's own scan by `share_verdict()`, never from text the phone sends. A product name appears only when an admin has
verified that product. Shared pages are `noindex`. Every other route is admin-only.

Access needs a Supabase user with `app_metadata.role = "admin"`, which is the same claim as `public.is_admin()`. Everything
goes through RLS as that user, and no service key is used. With no Supabase env vars, the admin runs in **offline mode**, where only the test bench works,
against `data/starter-rules.json`.

## Run it

```bash
cp apps/admin/.env.example apps/admin/.env.local   # fill in URL + anon/publishable key
pnpm --filter admin dev
```

Login is by magic link. In Supabase → Authentication → URL Configuration, add `<admin origin>/auth/callback` to the redirect URLs.

## Local Supabase (what I tested against)

```bash
npx supabase start            # applies migrations + seed
npx supabase functions serve publish-bundle
```

Create an admin user with the service key:
`POST /auth/v1/admin/users {"email": "...", "email_confirm": true, "app_metadata": {"role": "admin"}}`.
Magic-link emails show up in Mailpit (http://127.0.0.1:54324).
