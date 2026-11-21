# Mindset Approved

Scan a food label and get a verdict (Approved, Caution, Not Approved, or Can't verify), with the exact
ingredients behind it. This repo holds the rules engine, the starter rules, the Supabase schema and the
admin dashboard. The Expo app comes next (see `apps/mobile`).

Verdicts reflect Mindset's ingredient preferences. They are not health or safety findings.

## Layout

| Path | What it is |
|---|---|
| `data/starter-rules.json` | **Source of truth** for the 37 PRD rules, their aliases and E-numbers, plus everyday neutral ingredients |
| `packages/rules-engine` | Pure TypeScript engine: isolate → split → match → settings → verdict, plus `compileBundle`, `diffBundles`, `runFixtures` and `preparePublish`. Has no runtime dependencies and is safe for React Native |
| `apps/admin` | Next.js: the public website (`/`, `/rules`, `/corrections`, `/privacy`, `/terms`, share pages `/v/<code>`) and the admin at `/admin` ([README](apps/admin/README.md)) |
| `apps/mobile` | Expo app for iOS and Android ([README](apps/mobile/README.md)) |
| `data/benchmark` | 800 real products from Open Food Facts (US, UK, CA, AU, NZ, IE, SG, IN) and the accuracy report |
| `docs/` | [Launch checklist](docs/launch-checklist.md) and [rules to review](docs/rules-review.md) |
| `supabase/functions/publish-bundle` | Edge Function: compile → diff → regression → upload `rules-bundle.v{n}.json.gz` → `publish_rule_version()` |
| `supabase/migrations` | Schema, RLS, and RPCs (`log_unmatched`, `submit_product`, `delete_my_data`, `export_rules`, `publish_rule_version`, `map_unmatched`, `admin_stats`) |
| `supabase/seed.sql` | Generated from the JSON. Don't edit it by hand |
| `scripts/` | Seed generator, bundle compiler, OFF taxonomy importer, SQL checks |

## Commands

```bash
pnpm install
pnpm typecheck
pnpm test            # engine (321 tests) + scripts
pnpm seed:build      # data/starter-rules.json -> supabase/seed.sql
pnpm bundle:build    # -> dist/rules-bundle.v1.json(.gz)
pnpm check:sql       # applies migrations + seed to a throwaway local Postgres and runs RLS checks
pnpm deno:shared     # re-bundle the engine for Edge Functions after engine changes (a test checks it's current)
pnpm --filter admin dev
pnpm benchmark       # accuracy on 800 real products -> data/benchmark/report.md (93.6% coverage)
NODE_USE_ENV_PROXY=1 pnpm benchmark:fetch   # refresh the product snapshot from Open Food Facts
pnpm off:import --file additives.txt   # OFF taxonomy -> inactive, untiered rows (supabase/off-import.sql)
```

Before launch, change the starter rules in `data/starter-rules.json` and run `pnpm seed:build` (a test fails if `seed.sql` is stale).
After the database is live, edit rules in the admin and press Publish. Phones download the new bundle on their next open.
If a rule change intentionally changes a regression label's verdict, update `packages/rules-engine/test/fixtures/labels.json`.

## Using the engine

```ts
import { analyze, loadRules } from '@mindset/rules-engine';

const rules = loadRules(bundleJson);            // once per bundle version
const r = analyze(ocrText, rules, { strictMode: false, noGelatin: true }, { ocrConfidence: 0.92 });
r.verdict;     // 'approved' | 'caution' | 'not_approved' | 'cant_verify'
r.summary;     // "Not Approved — contains canola oil and Red 40."
r.flagged;     // chips: tier, reason, label text, position, possible (fuzzy) flag
r.unmatched;   // send to log_unmatched()
r.suggestAiRecheck;
```

### Matching rules
1. Exact alias, scanned longest-first ("high oleic sunflower oil" beats "sunflower oil"; "cocoa butter" is not butter).
2. E/INS codes (`E129`, `E 129`, `INS 129`, `E322(i)`, and bare numbers under a class label such as `Colour (102)`).
3. Head nouns are borrowed from the parent or an "or" list: `vegetable oil (canola, soybean)`, `canola, soybean or sunflower oil`.
4. OCR fixes (0/O, 1/l, rn↔m) only when the fixed word is a known alias.
5. Fuzzy matching only for words over 6 letters. A word must keep its first letter and its digits, so "sodium citrate" never becomes "sodium nitrate". A fuzzy match is shown as *possible*, and it never counts toward Approved.

### Verdict
Any bad ingredient gives Not Approved. Otherwise any borderline ingredient gives Caution. Otherwise the verdict is Approved, but only with at least 3 confidently
matched items, an OCR confidence of at least 0.8, and no more than half the items unmatched. Anything else is **Can't verify**. "May contain" text
never affects the verdict.

## Accuracy
`pnpm benchmark` runs the engine on 800 popular products, 100 from each of eight English-speaking markets. Currently **93.6%** of ingredient items are recognised (the PRD target is 90%), and every market is at 87.8% or above. The report also lists the label text that triggered each rule, so false positives can be audited. A test fails if coverage drops below 93%.

## Data attribution
Data imported from Open Food Facts is available under the Open Database License (ODbL).
