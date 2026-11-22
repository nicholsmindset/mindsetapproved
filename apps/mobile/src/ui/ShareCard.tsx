import type { AnalyzeResult } from '@mindset/rules-engine';
import type { ComponentRef, Ref } from 'react';
import { Text, View } from 'react-native';
import { Stamp } from './kit';
import { font, space, tierStyle, useColors } from './theme';

/**
 * The image people post, laid out like a nutrition panel: product, stamp, the ingredients behind it,
 * then the small print. Always light so it looks the same in every feed. Names ingredients only, never the company.
 */
function detail(summary: string): string {
  const rest = summary.split(' — ')[1] ?? summary;
  return rest.charAt(0).toUpperCase() + rest.slice(1);
}

export function ShareCard({ result, productName, ref }: { result: AnalyzeResult; productName?: string; ref?: Ref<ComponentRef<typeof View>> }) {
  const c = useColors.light;
  const flagged = result.flagged.slice(0, 4);
  return (
    <View ref={ref} collapsable={false} style={{ backgroundColor: c.surface, padding: space.lg, gap: space.md, width: '100%', borderWidth: 2, borderColor: c.text }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <Text style={{ fontFamily: font.heavy, fontSize: 22, letterSpacing: 0.4, textTransform: 'uppercase', color: c.text }}>Mindset Approved</Text>
        <Text style={{ fontFamily: font.mono, fontSize: 11, color: c.muted }}>RULES V{result.rulesVersion}</Text>
      </View>
      <View style={{ height: 8, backgroundColor: c.text, marginTop: -space.sm }} />
      {productName ? <Text style={{ fontFamily: font.display, fontSize: 20, textTransform: 'uppercase', color: c.text }}>{productName}</Text> : null}
      <View style={{ paddingVertical: space.xs }}>
        <Stamp verdict={result.verdict} colors={c} />
      </View>
      <Text style={{ fontFamily: font.medium, color: c.text, fontSize: 17, lineHeight: 23 }}>{detail(result.summary)}</Text>
      {flagged.length ? (
        <View style={{ borderTopWidth: 2, borderTopColor: c.text }}>
          {flagged.map((ch) => {
            const t = tierStyle(c, ch.tier);
            return (
              <View key={ch.ingredientId} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: c.border, gap: space.sm }}>
                <Text style={{ fontFamily: font.semi, fontSize: 15, color: c.text, flex: 1 }}>{ch.name}</Text>
                <Text style={{ fontFamily: font.display, fontSize: 13, letterSpacing: 0.5, textTransform: 'uppercase', color: t.fg }}>{ch.tier === 'bad' ? 'Not approved' : 'Borderline'}</Text>
              </View>
            );
          })}
          {result.flagged.length > flagged.length ? <Text style={{ fontFamily: font.body, color: c.muted, fontSize: 13, paddingTop: 6 }}>+{result.flagged.length - flagged.length} more</Text> : null}
        </View>
      ) : null}
      <Text style={{ fontFamily: font.body, color: c.muted, fontSize: 11 }}>Ingredient verdict based on Mindset preferences. Not medical advice.</Text>
    </View>
  );
}
