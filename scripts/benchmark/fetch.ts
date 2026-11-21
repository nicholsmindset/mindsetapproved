/**
 * One-off snapshot of popular products from Open Food Facts for the accuracy benchmark.
 *   pnpm benchmark:fetch [--per-country 100]
 * Takes the most-scanned products per country (OFF's popularity ranking) that have English ingredient text.
 * Data from Open Food Facts, available under the Open Database License (ODbL).
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { arg, ROOT } from '../lib.ts';

export const COUNTRIES = [
  ['us', 'united-states'],
  ['uk', 'united-kingdom'],
  ['ca', 'canada'],
  ['au', 'australia'],
  ['nz', 'new-zealand'],
  ['ie', 'ireland'],
  ['sg', 'singapore'],
  ['in', 'india'],
] as const;

export interface BenchProduct {
  code: string;
  country: string;
  name: string;
  brand?: string;
  ingredients: string;
}

const UA = 'MindsetApproved/0.1 (food ingredient scanner; accuracy benchmark)';
const FIELDS = 'code,product_name,product_name_en,brands,ingredients_text_en,ingredients_text,lang';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function getJson(url: string): Promise<{ products: Array<Record<string, string>> }> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    const text = await res.text();
    if (res.ok) {
      try {
        return JSON.parse(text);
      } catch {
        // rate-limit page served as HTML
      }
    }
    console.error(`  retry ${attempt + 1} (${res.status}) ${url.slice(60, 110)}`);
    await sleep(10_000 * (attempt + 1));
  }
  throw new Error(`gave up on ${url}`);
}

/** English text only: prefer ingredients_text_en, else the main text when the product's language is English. */
function englishIngredients(p: Record<string, string>): string | null {
  const en = (p['ingredients_text_en'] ?? '').trim();
  if (en.length > 10) return en;
  const main = (p['ingredients_text'] ?? '').trim();
  if (p['lang'] === 'en' && main.length > 10) return main;
  return null;
}

async function main() {
  const perCountry = Number(arg('per-country') ?? 100);
  const seen = new Set<string>();
  const out: BenchProduct[] = [];
  for (const [key, tag] of COUNTRIES) {
    let got = 0;
    for (let page = 1; page <= 4 && got < perCountry; page++) {
      const url = `https://world.openfoodfacts.org/api/v2/search?countries_tags_en=${tag}&fields=${FIELDS}&page_size=100&page=${page}&sort_by=unique_scans_n`;
      const { products } = await getJson(url);
      for (const p of products) {
        if (got >= perCountry || !p['code'] || seen.has(p['code'])) continue;
        const ingredients = englishIngredients(p);
        if (!ingredients) continue;
        seen.add(p['code']);
        out.push({
          code: p['code'],
          country: key,
          name: (p['product_name_en'] || p['product_name'] || '').trim(),
          brand: p['brands']?.split(',')[0]?.trim() || undefined,
          ingredients,
        });
        got++;
      }
      await sleep(7_000); // OFF asks for at most ~10 search requests a minute
    }
    console.log(`${key}: ${got} products`);
  }
  const file = resolve(ROOT, 'data/benchmark/products.json');
  writeFileSync(
    file,
    `${JSON.stringify(
      {
        source: 'Open Food Facts (https://world.openfoodfacts.org), Open Database License (ODbL)',
        fetchedAt: new Date().toISOString(),
        selection: 'Most-scanned products per country with English ingredient text',
        products: out,
      },
      null,
      1,
    )}\n`,
  );
  console.log(`Wrote ${out.length} products to ${file}`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
