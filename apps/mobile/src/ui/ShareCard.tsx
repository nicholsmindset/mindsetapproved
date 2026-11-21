import Ionicons from '@expo/vector-icons/Ionicons';
import type { AnalyzeResult } from '@mindset/rules-engine';
import type { ComponentRef, Ref } from 'react';
import { Text, View } from 'react-native';
import { radius, space, useColors, verdictStyle } from './theme';

/**
 * The image people post: verdict, the ingredients behind it, and the brand mark. Always rendered in light
 * colours so it looks the same in every feed. Names ingredients only, never the company.
 */
function detail(summary: string): string {
  const rest = summary.split(' — ')[1] ?? summary;
  return rest.charAt(0).toUpperCase() + rest.slice(1);
}

export function ShareCard({ result, productName, ref }: { result: AnalyzeResult; productName?: string; ref?: Ref<ComponentRef<typeof View>> }) {
  const light = useColors.light;
  const v = verdictStyle(light, result.verdict);
  const flagged = result.flagged.slice(0, 4);
  return (
    <View ref={ref} collapsable={false} style={{ backgroundColor: light.bg, padding: space.lg, borderRadius: radius.lg, gap: space.md, width: '100%' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
        <View style={{ width: 26, height: 26, borderRadius: 7, backgroundColor: light.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="checkmark" size={18} color={light.onAccent} />
        </View>
        <Text style={{ fontWeight: '700', fontSize: 16, color: light.text }}>Mindset Approved</Text>
      </View>
      <View style={{ backgroundColor: v.bg, borderRadius: radius.md, padding: space.lg, gap: 6 }}>
        {productName ? <Text style={{ color: light.muted, fontSize: 14 }}>{productName}</Text> : null}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Ionicons name={v.icon} size={28} color={v.fg} />
          <Text style={{ color: v.fg, fontSize: 26, fontWeight: '800' }}>{v.label}</Text>
        </View>
        <Text style={{ color: light.text, fontSize: 16 }}>{detail(result.summary)}</Text>
      </View>
      {flagged.length ? (
        <View style={{ gap: 4 }}>
          {flagged.map((c) => (
            <Text key={c.ingredientId} style={{ color: light.text, fontSize: 14 }}>
              <Text style={{ color: c.tier === 'bad' ? light.bad : light.borderline, fontWeight: '700' }}>● </Text>
              {c.name}
            </Text>
          ))}
          {result.flagged.length > flagged.length ? <Text style={{ color: light.muted, fontSize: 13 }}>+{result.flagged.length - flagged.length} more</Text> : null}
        </View>
      ) : null}
      <Text style={{ color: light.muted, fontSize: 11 }}>Ingredient verdict based on Mindset preferences. Not medical advice.</Text>
    </View>
  );
}
