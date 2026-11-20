import { useApp } from '@/state/app';
import { H2, P, Screen, Title, ToggleRow } from '@/ui/kit';

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
      <ToggleRow
        label="Strict mode"
        hint="Natural flavours, added sugars, gums and other borderline ingredients count as Not Approved."
        value={settings.strictMode}
        onChange={(v) => setSettings({ ...settings, strictMode: v })}
      />
      <ToggleRow
        label="No gelatin"
        hint="Treat gelatin and other animal-derived ingredients as Not Approved."
        value={settings.noGelatin}
        onChange={(v) => setSettings({ ...settings, noGelatin: v })}
      />

      <H2>Categories</H2>
      <P muted>Switch off anything you don’t care about. Its ingredients are then treated as neutral.</P>
      {categories.map((cat) => (
        <ToggleRow key={cat.id} label={cat.label} value={!settings.disabledCategories.includes(cat.id)} onChange={(on) => toggle('disabledCategories', cat.id, on)} />
      ))}

      <H2>Ingredients</H2>
      <P muted>Allow single ingredients, for example high-oleic sunflower oil.</P>
      {flaggable.map((ing) => (
        <ToggleRow
          key={ing.id}
          label={ing.name}
          hint={settings.disabledCategories.includes(ing.category) ? 'Category switched off' : undefined}
          value={!settings.disabledIngredients.includes(ing.id)}
          onChange={(on) => toggle('disabledIngredients', ing.id, on)}
        />
      ))}
    </Screen>
  );
}
