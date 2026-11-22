import Ionicons from '@expo/vector-icons/Ionicons';
import type { AnalyzeResult, Chip, Tier } from '@mindset/rules-engine';
import { Fragment, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { font, space, tierStyle, useColors } from './theme';

const RANK: Record<Tier, number> = { bad: 3, borderline: 2, good: 1, neutral: 0 };

/** "3" -> "03", "3.2" -> "03.2": positions line up in a column. */
function pos(p: string): string {
  const [a, ...rest] = p.split('.');
  return [a!.padStart(2, '0'), ...rest].join('.');
}

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
      style={({ pressed }) => ({ borderBottomWidth: 1, borderBottomColor: c.border, paddingVertical: space.md, gap: space.sm, backgroundColor: pressed ? c.surface2 : 'transparent' })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <View style={{ backgroundColor: t.bg, minWidth: 40, paddingVertical: 3, paddingHorizontal: 4, alignItems: 'center', borderRadius: 3 }}>
          <Text style={{ fontFamily: font.mono, fontSize: 13, color: t.fg }}>{pos(chip.position)}</Text>
        </View>
        <View style={{ flex: 1, gap: 1 }}>
          <Text style={{ fontFamily: font.semi, fontSize: 17, lineHeight: 22, color: c.text }}>{chip.name}</Text>
          <Text style={{ fontFamily: font.medium, fontSize: 13, color: t.fg }}>
            {t.label}
            {chip.tier !== chip.baseTier ? ' · your rules' : ''}
            {chip.possible ? ' · possible match' : ''}
          </Text>
        </View>
        <Ionicons name={open ? 'remove' : 'add'} size={20} color={c.muted} />
      </View>
      {open ? (
        <View style={{ gap: space.xs, paddingLeft: 40 + space.md }}>
          <Text style={{ fontFamily: font.body, color: c.text, fontSize: 15, lineHeight: 22 }}>{chip.reason}</Text>
          <Text style={{ fontFamily: font.body, color: c.muted, fontSize: 13 }}>On the label: “{chip.labelText}”</Text>
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
      style = { backgroundColor: on ? t.fg : t.bg, color: on ? c.bg : c.text, fontFamily: font.semi };
      onPress = () => onSelect(best.ingredientId);
    } else if (best?.tier === 'good') {
      style = { color: c.text, textDecorationLine: 'underline', textDecorationColor: c.good, textDecorationStyle: 'solid', fontFamily: font.medium };
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
    <View style={{ borderWidth: 1, borderColor: c.border, borderTopWidth: 6, borderTopColor: c.rule, backgroundColor: c.surface, padding: space.lg, gap: space.md }}>
      <Text accessibilityLabel="Ingredient list with marked ingredients" style={{ fontFamily: font.body, fontSize: 16, lineHeight: 26, color: c.text }}>
        <Text style={{ fontFamily: font.heavy, fontSize: 17, letterSpacing: 0.5, textTransform: 'uppercase' }}>Ingredients: </Text>
        {parts}
        {close}.
      </Text>
      {result.notes.length ? <Text style={{ fontFamily: font.body, fontSize: 14, lineHeight: 20, color: c.muted }}>{result.notes.join('. ')}.</Text> : null}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: space.lg, rowGap: space.xs, borderTopWidth: 1, borderTopColor: c.border, paddingTop: space.sm }}>
        <Legend swatch={<View style={{ width: 14, height: 10, backgroundColor: c.badBg }} />} label="Doesn’t meet rules" />
        <Legend swatch={<View style={{ width: 14, height: 10, backgroundColor: c.borderlineBg }} />} label="Borderline" />
        <Legend swatch={<View style={{ width: 14, height: 2, backgroundColor: c.good }} />} label="Good sign" />
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
      <Text style={{ fontFamily: font.body, fontSize: 12, color: c.muted }}>{label}</Text>
    </View>
  );
}
