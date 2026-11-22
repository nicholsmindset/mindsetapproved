# Store listing kit

Everything you need for App Store Connect and Google Play Console. Copy the text as-is and adjust it if you want. Lengths are within each store's limits.

## Screenshots
| Folder | Size | Use for |
|---|---|---|
| `docs/store/ios-6.9in/` | 1320 × 2868 | App Store, iPhone 6.9" (required) |
| `docs/store/ios-6.5in/` | 1284 × 2778 | App Store, iPhone 6.5" |

The six slides, in order:
1. Know what's in it. In a second.
2. Every flag, marked on the label.
3. Approved means approved.
4. Your rules. Your call.
5. Reads labels in five languages.
6. Beautiful in the dark.

The same 6.9" images work for Google Play phone screenshots, which accept up to 8 images with a 9:16 to 9:21 ratio.

**Before you submit:** these come from the web build, so they show labels checked from text. Once you have the phone build, swap in one real camera screenshot as slide 1 (pointing at a barcode). Apple asks that screenshots show the app in use, and the camera is the main feature. To regenerate the slides after a design change, see "Regenerating" at the end.

## App Store Connect

**Name** (30): `Mindset Approved`

**Subtitle** (30): `Ingredient scanner & checker`

**Category:** Food & Drink, with Lifestyle as the secondary category. Don't pick Health & Fitness: the app makes no health claims, and that category brings medical-device scrutiny.

**Keywords** (100, comma-separated, no spaces after commas):
```
ingredients,scanner,food label,barcode,seed oil,additives,food dye,sugar,clean eating,grocery
```

**Promotional text** (170):
> Scan a barcode or snap the ingredient list and know in a second whether a product meets Mindset Approved ingredient preferences. Every flag marked, every reason shown.

**Description:**
> Mindset Approved tells you, in a second, whether a food product meets our ingredient preferences, and shows you exactly why.
>
> SCAN ANYTHING
> • Point the camera at a barcode for an instant answer.
> • No barcode, or a local or imported product? Photograph the ingredient list instead.
> • Reads labels in English, Malay, Chinese, Japanese and Korean.
>
> A CLEAR VERDICT
> • Approved, Caution or Not Approved.
> • Every flagged ingredient is marked right on the ingredient list, in the order the pack lists it, with the rule behind it.
> • Good signs, like olive or avocado oil, are highlighted too.
>
> YOUR RULES
> • Strict mode treats borderline ingredients as Not Approved.
> • Switch off the categories you don't care about, or allow single ingredients.
> • Every verdict and your whole history update when you change a rule.
>
> PRIVATE BY DESIGN
> • No account needed. Your history stays on your phone.
> • Label photos are read on your phone and never stored.
>
> Mindset Approved is an ingredient-preference filter, not a medical device. It does not diagnose, treat, cure or prevent any condition. Verdicts reflect Mindset's ingredient preferences, which you can change. Talk to a healthcare professional about your diet.
>
> Product data from Open Food Facts (ODbL).

**What's New** (version 1.0.0):
> The first release of Mindset Approved: scan barcodes and ingredient labels, see every flagged ingredient marked on the label, and set your own rules. Light and dark mode included.

**Support URL:** `https://<your site>/corrections`. **Marketing URL:** `https://<your site>/`. **Privacy policy URL:** `https://<your site>/privacy`. All three need the website live.

**Age rating:** 4+. Answer "None" to every content question. There's no user-generated content shown to others: share links show only a verdict.

**Copyright:** `© 2026 ONN Group LLP`

### App Review notes
> Mindset Approved is an ingredient-preference filter, not a medical device. It does not diagnose, treat, cure or prevent any condition. Verdicts reflect stated ingredient preferences that users can change in the Rules tab.
>
> No account is needed. Sign-in (email code) is optional and only syncs settings.
>
> To test: open the Scan tab and point the camera at any grocery barcode. For a product that isn't found, choose Ingredients and photograph the ingredient list. The camera is used only for barcodes and ingredient labels; photos are processed on the device and not stored.
>
> Premium is shown as "coming soon". There are no in-app purchases in this version.

### App Privacy ("nutrition label")
Answer **Yes, we collect data**, then declare the following. Nothing is used for tracking.

| Data type | Linked to the person? | Purpose | What it is |
|---|---|---|---|
| **User Content → Other User Content** | No (Yes if signed in) | App Functionality, Product Personalization | The ingredient text of scans and reports, used to cache products and improve the rules. No photos. |
| **Identifiers → User ID** | No (Yes if signed in) | App Functionality | A random ID created on install, used to rate-limit and to group a phone's scans. |
| **Contact Info → Email Address** | Yes | App Functionality | Only if the person chooses to sign in. |
| **Diagnostics → Crash Data** | No | App Functionality | Only once crash reporting (Sentry) is switched on. Label text is removed before sending. |

These match the privacy manifest in `apps/mobile/app.json`. If you change what the app collects, update both.

## Google Play Console

**App name:** `Mindset Approved`. **Short description** (80):
> Scan barcodes and ingredient labels. See every flagged ingredient, and why.

**Full description:** the App Store description above.

**Category:** Food & Drink. **Tags:** Food & drink, Shopping lists, Nutrition.

**Health apps declaration:** the app is **not** a medical device and makes no medical claims. Choose "Nutrition and diet" only if you're asked to classify it, and state that it isn't a medical device.

**Data safety:**
- Data is collected: User IDs (app-generated), App activity → Other user-generated content, Email address (optional), and Crash logs (once crash reporting is on).
- None of it is shared with third parties for advertising.
- Data is encrypted in transit.
- People can delete their data: Settings → Delete my data, which also removes the server copy.
- Collection is **optional** for email and **required** for scan content (needed for barcode lookups).

**Content rating:** IARC questionnaire → no objectionable content → "Everyone".

**Target audience:** 18 and over. That keeps the app outside the Families policy; the app isn't designed for children.

## Regenerating the screenshots
The scripts that made these slides are not in the repo: the web preview build, a Playwright capture at 440 × 956 points at 3×, and an HTML frame. Ask Claude to "regenerate the store screenshots" after a design change, or replace them with captures from a real phone in the same sizes.
