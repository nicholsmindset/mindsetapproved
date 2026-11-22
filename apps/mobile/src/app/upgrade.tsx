import { StyleSheet, Text, View } from 'react-native';
import { PLAN_FEATURES, PREMIUM_PLANS, PURCHASES_LIVE } from '@/core/premium';
import { useApp } from '@/state/app';
import { Button, Card, H2, P, Screen, Title } from '@/ui/kit';
import { radius, space, type, useColors } from '@/ui/theme';

export default function Upgrade() {
  const c = useColors();
  const { store } = useApp();
  const premium = store.isPremium();
  const head = { ...type.footnote, fontWeight: '600' as const, textTransform: 'uppercase' as const };
  return (
    <Screen edges={[]}>
      <Title sub="Unlimited label scans and AI re-checks, plus your full history synced and exportable. The core scan stays free.">Premium</Title>

      <Card style={{ padding: 0 }}>
        <View style={{ flexDirection: 'row', padding: space.md, borderBottomWidth: StyleSheet.hairlineWidth, borderColor: c.border }}>
          <Text style={{ flex: 1.4 }}> </Text>
          <Text style={[head, { flex: 1, color: c.muted }]}>Free</Text>
          <Text style={[head, { flex: 1, color: c.accent }]}>Premium</Text>
        </View>
        {PLAN_FEATURES.map((f, i) => (
          <View key={f.feature} style={{ flexDirection: 'row', padding: space.md, borderBottomWidth: i < PLAN_FEATURES.length - 1 ? StyleSheet.hairlineWidth : 0, borderColor: c.border }}>
            <Text style={[type.subhead, { flex: 1.4, color: c.text, fontWeight: '600' }]}>{f.feature}</Text>
            <Text style={[type.subhead, { flex: 1, color: c.muted }]}>{f.free}</Text>
            <Text style={[type.subhead, { flex: 1, color: c.text }]}>{f.premium}</Text>
          </View>
        ))}
      </Card>

      <H2>Plans</H2>
      <View style={{ gap: space.sm }}>
        {PREMIUM_PLANS.map((p) => (
          <View key={p.id} style={{ backgroundColor: c.surface, boxShadow: c.shadow, borderRadius: radius.lg, borderCurve: 'continuous', padding: space.lg, gap: 2 }}>
            <Text style={[type.headline, { color: c.text }]}>{p.label}</Text>
            <Text style={[type.title2, { color: c.text }]}>{p.price}</Text>
            <Text style={[type.subhead, { color: c.muted }]}>{p.note}</Text>
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
