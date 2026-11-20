import Ionicons from '@expo/vector-icons/Ionicons';
import type { Chip } from '@mindset/rules-engine';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { radius, space, tierStyle, useColors } from './theme';

/** A flagged or good ingredient. Tap to see the rule behind it. */
export function IngredientChip({ chip }: { chip: Chip }) {
  const c = useColors();
  const t = tierStyle(c, chip.tier);
  const [open, setOpen] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={`${chip.name}, ${t.label}${chip.possible ? ', possible match' : ''}`}
      accessibilityHint="Shows why"
      onPress={() => setOpen(!open)}
      style={{ backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderLeftWidth: 4, borderLeftColor: t.fg, borderRadius: radius.md, padding: space.md, gap: space.xs }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <Text style={{ flex: 1, color: c.text, fontSize: 16, fontWeight: '600' }}>{chip.name}</Text>
        {chip.possible ? (
          <View style={{ backgroundColor: c.greyBg, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 }}>
            <Text style={{ color: c.grey, fontSize: 12, fontWeight: '600' }}>possible match</Text>
          </View>
        ) : null}
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={c.muted} />
      </View>
      <Text style={{ color: t.fg, fontSize: 13, fontWeight: '600' }}>
        {t.label}
        {chip.tier !== chip.baseTier ? ' (your rules)' : ''}
      </Text>
      {open ? (
        <View style={{ gap: space.xs, marginTop: space.xs }}>
          <Text style={{ color: c.text, fontSize: 15, lineHeight: 21 }}>{chip.reason}</Text>
          <Text style={{ color: c.muted, fontSize: 13 }}>On the label: “{chip.labelText}”</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
