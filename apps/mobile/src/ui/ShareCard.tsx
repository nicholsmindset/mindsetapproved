import type { AnalyzeResult } from '@mindset/rules-engine';
import { LinearGradient } from 'expo-linear-gradient';
import type { ComponentRef, Ref } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { IconTile } from './kit';
import { Icon } from './Icon';
import { space, tierStyle, type, useColors, verdictStyle } from './theme';

/**
 * The image people post: a card in the style of the result, always light so it looks the same in every feed.
 * Names ingredients only, never the company.
 */
function detail(summary: string): string {
  const rest = summary.split(' — ')[1] ?? summary;
  return rest.charAt(0).toUpperCase() + rest.slice(1);
}

export function ShareCard({ result, productName, ref }: { result: AnalyzeResult; productName?: string; ref?: Ref<ComponentRef<typeof View>> }) {
  const c = useColors.light;
  const v = verdictStyle(c, result.verdict);
  const flagged = result.flagged.slice(0, 4);
  return (
    <View ref={ref} collapsable={false} style={{ backgroundColor: c.surface, borderRadius: 28, borderCurve: 'continuous', overflow: 'hidden', padding: space.xl, gap: space.md, width: '100%' }}>
      <LinearGradient colors={[v.bg, 'rgba(255,255,255,0)']} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <IconTile symbol="checkmark.seal.fill" color={c.accent} size={26} />
        <Text style={[type.subhead, { color: c.text, fontWeight: '600' }]}>Mindset Approved</Text>
      </View>
      {productName ? <Text style={[type.headline, { color: c.text }]}>{productName}</Text> : null}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: v.fg, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name={v.symbol} size={26} color="#fff" weight="bold" />
        </View>
        <Text style={[type.title1, { color: v.fg, flex: 1 }]}>{v.label}</Text>
      </View>
      <Text style={[type.title3, { color: c.text, fontWeight: '500' }]}>{detail(result.summary)}</Text>
      {flagged.length ? (
        <View style={{ gap: 6 }}>
          {flagged.map((ch) => {
            const t = tierStyle(c, ch.tier);
            return (
              <View key={ch.ingredientId} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.fg }} />
                <Text style={[type.subhead, { color: c.text, flex: 1 }]}>{ch.name}</Text>
              </View>
            );
          })}
          {result.flagged.length > flagged.length ? <Text style={[type.footnote, { color: c.muted }]}>+{result.flagged.length - flagged.length} more</Text> : null}
        </View>
      ) : null}
      <Text style={[type.caption, { color: c.muted }]}>Ingredient verdict based on Mindset preferences. Not medical advice.</Text>
    </View>
  );
}
