import { Text, View } from 'react-native';
import { PLAN_FEATURES, PREMIUM_PLANS, PURCHASES_LIVE } from '@/core/premium';
import { useApp } from '@/state/app';
import { Button, Card, H2, P, Screen, Title } from '@/ui/kit';
import { font, radius, space, useColors } from '@/ui/theme';

export default function Upgrade() {
  const c = useColors();
  const { store } = useApp();
  const premium = store.isPremium();
  const head = { fontFamily: font.display, fontSize: 15, letterSpacing: 0.6, textTransform: 'uppercase' as const };
  return (
    <Screen edges={[]}>
      <Title sub="Unlimited label scans and AI re-checks, plus your full history synced and exportable. The core scan stays free.">Premium</Title>

      <Card style={{ padding: 0, borderTopWidth: 6, borderTopColor: c.rule }}>
        <View style={{ flexDirection: 'row', padding: space.md, borderBottomWidth: 1, borderColor: c.border }}>
          <Text style={{ flex: 1.4 }}> </Text>
          <Text style={[head, { flex: 1, color: c.muted }]}>Free</Text>
          <Text style={[head, { flex: 1, color: c.accent }]}>Premium</Text>
        </View>
        {PLAN_FEATURES.map((f, i) => (
          <View key={f.feature} style={{ flexDirection: 'row', padding: space.md, borderBottomWidth: i < PLAN_FEATURES.length - 1 ? 1 : 0, borderColor: c.border }}>
            <Text style={{ flex: 1.4, color: c.text, fontFamily: font.semi }}>{f.feature}</Text>
            <Text style={{ flex: 1, color: c.muted, fontFamily: font.body }}>{f.free}</Text>
            <Text style={{ flex: 1, color: c.text, fontFamily: font.medium }}>{f.premium}</Text>
          </View>
        ))}
      </Card>

      <H2>Plans</H2>
      <View style={{ gap: space.sm }}>
        {PREMIUM_PLANS.map((p) => (
          <View key={p.id} style={{ borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, borderRadius: radius.md, padding: space.lg, gap: 2 }}>
            <Text style={[head, { color: c.text, fontSize: 20 }]}>{p.label}</Text>
            <Text style={{ color: c.text, fontSize: 17, fontFamily: font.mono }}>{p.price}</Text>
            <Text style={{ color: c.muted, fontFamily: font.body }}>{p.note}</Text>
          </View>
        ))}
      </View>

      <View style={{ marginTop: space.xl, gap: space.sm }}>
        {premium ? (
          <P>You have Premium. Thank you.</P>
        ) : (
          <Button kind="primary" label={PURCHASES_LIVE ? 'Continue' : 'Coming soon'} disabled={!PURCHASES_LIVE} />
        )}
        <P muted style={{ fontSize: 13 }}>
          {PURCHASES_LIVE
            ? 'Billed through your App Store or Google Play account. Cancel any time in your subscription settings.'
            : 'Premium opens at launch. Until then every feature works with the free daily limits.'}
        </P>
      </View>
    </Screen>
  );
}
