import { useApp } from '@/state/app';
import { Screen, Section, Title, ToggleRow } from '@/ui/kit';
import type { IconName } from '@/ui/Icon';

/** One Settings-app tile per category, so the list scans like iOS Settings. */
const CATEGORY_TILES: Record<string, { symbol: IconName; color: string }> = {
  seed_oil: { symbol: 'drop.fill', color: '#ff9500' },
  trans_fat: { symbol: 'flask.fill', color: '#ff3b30' },
  fat: { symbol: 'drop.fill', color: '#a2845e' },
  dye: { symbol: 'paintpalette.fill', color: '#af52de' },
  sugar: { symbol: 'cube.fill', color: '#ff2d55' },
  sweetener: { symbol: 'sparkles', color: '#5ac8fa' },
  flavor: { symbol: 'leaf.fill', color: '#34c759' },
  flavor_enhancer: { symbol: 'bolt.fill', color: '#ffcc00' },
  preservative: { symbol: 'shield.lefthalf.filled', color: '#5856d6' },
  emulsifier: { symbol: 'flask.fill', color: '#00c7be' },
  thickener: { symbol: 'cube.fill', color: '#8e8e93' },
  animal_derived: { symbol: 'pawprint.fill', color: '#a2845e' },
};

export default function Rules() {
  const { settings, setSettings, rules } = useApp();
  const toggle = (key: 'disabledCategories' | 'disabledIngredients', id: string, on: boolean) =>
    setSettings({ ...settings, [key]: on ? settings[key].filter((x) => x !== id) : [...settings[key], id] });

  const categories = rules.bundle.categories.filter((c) => c.toggleable);
  const flaggable = rules.bundle.ingredients
    .filter((i) => i.tier === 'bad' || i.tier === 'borderline' || i.strictTier === 'bad' || i.strictTier === 'borderline')
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Screen>
      <Title sub="Your rules apply to every scan, including your history.">Rules</Title>
      <Section style={{ marginTop: 0 }}>
        <ToggleRow
          label="Strict mode"
          hint="Borderline ingredients count as Not Approved"
          tile={{ symbol: 'shield.lefthalf.filled', color: '#ff3b30' }}
          value={settings.strictMode}
          onChange={(v) => setSettings({ ...settings, strictMode: v })}
        />
        <ToggleRow
          label="No gelatin"
          hint="Treat animal-derived ingredients as Not Approved"
          tile={{ symbol: 'pawprint.fill', color: '#a2845e' }}
          value={settings.noGelatin}
          onChange={(v) => setSettings({ ...settings, noGelatin: v })}
        />
      </Section>

      <Section header="Categories" footer="Switch off anything you don’t care about. Its ingredients are then treated as neutral.">
        {categories.map((cat) => (
          <ToggleRow
            key={cat.id}
            label={cat.label}
            tile={CATEGORY_TILES[cat.id] ?? { symbol: 'cube.fill', color: '#8e8e93' }}
            value={!settings.disabledCategories.includes(cat.id)}
            onChange={(on) => toggle('disabledCategories', cat.id, on)}
          />
        ))}
      </Section>

      <Section header="Ingredients" footer="Allow single ingredients, for example high-oleic sunflower oil.">
        {flaggable.map((ing) => (
          <ToggleRow
            key={ing.id}
            label={ing.name}
            hint={settings.disabledCategories.includes(ing.category) ? 'Category switched off' : undefined}
            value={!settings.disabledIngredients.includes(ing.id)}
            onChange={(on) => toggle('disabledIngredients', ing.id, on)}
          />
        ))}
      </Section>
    </Screen>
  );
}
