import type { AnalyzeResult, Chip, Tier } from '@mindset/rules-engine';
import { Fragment, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from './Icon';
import { radius, space, tierStyle, type, useColors } from './theme';

const RANK: Record<Tier, number> = { bad: 3, borderline: 2, good: 1, neutral: 0 };

/** A flagged or good ingredient as a row. Tap to see the rule behind it. */
export function IngredientChip({ chip, open: openProp, onToggle }: { chip: Chip; open?: boolean; onToggle?: () => void }) {
  const c = useColors();
  const t = tierStyle(c, chip.tier);
  const [openState, setOpen] = useState(false);
  const open = openProp ?? openState;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={`${chip.name}, ${t.label}${chip.possible ? ', possible match' : ''}, number ${chip.position} on the label`}
      accessibilityHint="Shows why"
      onPress={() => (onToggle ? onToggle() : setOpen(!open))}
      style={({ pressed }) => ({ paddingHorizontal: space.lg, paddingVertical: space.md, gap: space.sm, backgroundColor: pressed ? c.surface2 : 'transparent' })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <View style={{ backgroundColor: t.bg, width: 34, height: 34, borderRadius: 10, borderCurve: 'continuous', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={[type.footnote, { color: t.fg, fontWeight: '700', fontVariant: ['tabular-nums'] }]}>{chip.position}</Text>
        </View>
        <View style={{ flex: 1, gap: 1 }}>
          <Text style={[type.body, { color: c.text, fontWeight: '500' }]}>{chip.name}</Text>
          <Text style={[type.footnote, { color: t.fg, fontWeight: '500' }]}>
            {t.label}
            {chip.tier !== chip.baseTier ? ' · your rules' : ''}
            {chip.possible ? ' · possible match' : ''}
          </Text>
        </View>
        <Icon name={open ? 'chevron.up' : 'chevron.down'} size={13} color={c.faint} weight="bold" />
      </View>
      {open ? (
        <View style={{ gap: space.xs, paddingLeft: 34 + space.md }}>
          <Text style={[type.subhead, { color: c.text }]}>{chip.reason}</Text>
          <Text style={[type.footnote, { color: c.muted }]}>On the label: “{chip.labelText}”</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/**
 * The ingredient list as printed, with each recognised ingredient marked the way you'd mark the pack:
 * red and yellow highlighter for flagged items, a green underline for good signs, a dotted line under
 * words the rules don't know yet. Tapping a marked word selects that ingredient.
 */
export function AnnotatedLabel({ result, selected, onSelect }: { result: AnalyzeResult; selected: string | null; onSelect: (id: string) => void }) {
  const c = useColors();
  const chips = new Map<string, Chip>([...result.flagged, ...result.good, ...result.neutral].map((ch) => [ch.ingredientId, ch]));
  const items = result.items.filter((it) => it.text);

  const parts = items.map((it, i) => {
    const prev = i > 0 ? items[i - 1]!.depth : it.depth;
    const sep = i === 0 ? '' : it.depth > prev ? ' (' : it.depth < prev ? ')'.repeat(prev - it.depth) + ', ' : ', ';
    const best = it.matches
      .map((m) => chips.get(m.ingredientId))
      .filter((x): x is Chip => Boolean(x))
      .sort((a, b) => RANK[b.tier] - RANK[a.tier])[0];
    let style: object = { color: c.text };
    let onPress: (() => void) | undefined;
    if (best && (best.tier === 'bad' || best.tier === 'borderline')) {
      const t = tierStyle(c, best.tier);
      const on = selected === best.ingredientId;
      style = { backgroundColor: on ? t.fg : t.bg, color: on ? '#fff' : c.text, fontWeight: '600' };
      onPress = () => onSelect(best.ingredientId);
    } else if (best?.tier === 'good') {
      style = { color: c.good, fontWeight: '600' };
      onPress = () => onSelect(best.ingredientId);
    } else if (it.unmatched && !it.container) {
      style = { color: c.muted, textDecorationLine: 'underline', textDecorationStyle: 'dotted', textDecorationColor: c.muted };
    }
    return (
      <Fragment key={it.position}>
        {sep}
        <Text onPress={onPress} suppressHighlighting style={style}>
          {it.text}
        </Text>
      </Fragment>
    );
  });
  const close = ')'.repeat(items.at(-1)?.depth ?? 0);

  return (
    <View style={{ borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: c.surface, boxShadow: c.shadow, padding: space.lg, gap: space.md }}>
      <Text accessibilityLabel="Ingredient list with marked ingredients" style={[type.callout, { lineHeight: 27, color: c.text }]}>
        <Text style={{ fontWeight: '700' }}>Ingredients: </Text>
        {parts}
        {close}.
      </Text>
      {result.notes.length ? <Text style={[type.footnote, { color: c.muted }]}>{result.notes.join('. ')}.</Text> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: space.lg, rowGap: space.xs, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border, paddingTop: space.md }}>
        <Legend swatch={<View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: c.badBg }} />} label="Doesn’t meet rules" />
        <Legend swatch={<View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: c.borderlineBg }} />} label="Borderline" />
        <Legend swatch={<View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: c.good }} />} label="Good sign" />
        <Legend swatch={<View style={{ width: 14, borderBottomWidth: 2, borderStyle: 'dotted', borderColor: c.muted }} />} label="Not recognised" />
      </View>
    </View>
  );
}

function Legend({ swatch, label }: { swatch: React.ReactNode; label: string }) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {swatch}
      <Text style={[type.caption, { color: c.muted }]}>{label}</Text>
    </View>
  );
}
