# Rules to review

These rows were added while measuring accuracy on 800 real products (see `data/benchmark/report.md`). They need your decision because they involve a Mindset opinion rather than a fact. Until you change them, they behave as listed. After launch, edit them in **Admin → Ingredients** and publish; before launch, edit `data/starter-rules.json` and run `pnpm seed:build`.

| Ingredient | Category | Tier now | Strict mode | Why it’s here |
|---|---|---|---|---|
| Mono- and diglycerides and other emulsifiers | Emulsifiers | neutral | neutral | E471 and similar are in about 1 in 30 products. Many clean-label lists flag them; the PRD doesn’t. |
| Sorbates, propionates and sulphites | Preservatives | neutral | neutral | Potassium sorbate, calcium propionate and sulphites are common. The PRD flags sodium benzoate only. |
| Calcium disodium EDTA | Preservatives | neutral | neutral | Common in US dressings and drinks. Often flagged by clean-label apps. |
| Disodium inosinate / guanylate (ribonucleotides) | Flavour enhancers | borderline | bad | Usually paired with MSG (E621), which the PRD marks borderline; set to match MSG. |
| Stevia and sugar alcohols | Artificial sweeteners | neutral | neutral | Stevia, monk fruit and sugar alcohols. The PRD flags artificial sweeteners only. |
| Shea and other tropical fats | Other fats | borderline | borderline | Shea and similar fats are used like palm oil; set to match palm oil. |
| Peanut (groundnut) oil | Seed oils | borderline | bad | A refined legume oil not in the PRD list; set like unspecified vegetable oil. |
| Quinoline yellow | Dyes and colours | bad | bad | One of the six dyes with an EU warning label; set like the PRD’s other EU-warning dyes. |
| Carmoisine (azorubine) | Dyes and colours | bad | bad | One of the six dyes with an EU warning label; set like the PRD’s other EU-warning dyes. |
| Ponceau 4R | Dyes and colours | bad | bad | One of the six dyes with an EU warning label, common in Asian imports; set like the PRD’s other EU-warning dyes. |

Two accuracy decisions were made in code, not data:

- **“Fully hydrogenated” oils** are judged by the oil they contain, not as partially hydrogenated oil, because fully hydrogenated fats are not a trans-fat source. Plain “hydrogenated” still counts as partially hydrogenated, as in the PRD table.
- **“Non-hydrogenated vegetable oil”** counts as vegetable oil.

Everything else added during the benchmark is either a translation or label spelling of an existing rule (for example *sucre*, *rapsolje*, *aroma*), or an everyday ingredient the rules don’t flag (vitamins, live cultures, leavening agents, fruit, spices, Indian staples such as maida and atta).
