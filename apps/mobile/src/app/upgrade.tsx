import Ionicons from '@expo/vector-icons/Ionicons';
import { Text, View } from 'react-native';
import { PLAN_FEATURES, PREMIUM_PLANS, PURCHASES_LIVE } from '@/core/premium';
import { useApp } from '@/state/app';
import { Button, Card, H2, P, Screen } from '@/ui/kit';
import { radius, space, useColors } from '@/ui/theme';

export default function Upgrade() {
  const c = useColors();
  const { store } = useApp();
  const premium = store.isPremium();
  return (
    <Screen edges={[]}>
      <View style={{ gap: space.sm, marginBottom: space.lg }}>
        <Ionicons name="sparkles" size={32} color={c.accent} />
        <Text accessibilityRole="header" style={{ color: c.text, fontSize: 26, fontWeight: '700' }}>
          Mindset Approved Premium
        </Text>
        <P muted>Unlimited label scans and AI re-checks, plus your full history synced and exportable. The core scan stays free.</P>
      </View>

      <Card style={{ padding: 0 }}>
        <View style={{ flexDirection: 'row', padding: space.md, borderBottomWidth: 1, borderColor: c.border }}>
          <Text style={{ flex: 1.4, color: c.muted, fontWeight: '600' }}> </Text>
          <Text style={{ flex: 1, color: c.muted, fontWeight: '600' }}>Free</Text>
          <Text style={{ flex: 1, color: c.accent, fontWeight: '700' }}>Premium</Text>
        </View>
        {PLAN_FEATURES.map((f, i) => (
          <View key={f.feature} style={{ flexDirection: 'row', padding: space.md, borderBottomWidth: i < PLAN_FEATURES.length - 1 ? 1 : 0, borderColor: c.border }}>
            <Text style={{ flex: 1.4, color: c.text, fontWeight: '600' }}>{f.feature}</Text>
            <Text style={{ flex: 1, color: c.muted }}>{f.free}</Text>
            <Text style={{ flex: 1, color: c.text }}>{f.premium}</Text>
          </View>
        ))}
      </Card>

      <H2>Plans</H2>
      <View style={{ gap: space.sm }}>
        {PREMIUM_PLANS.map((p) => (
          <View key={p.id} style={{ borderWidth: 1, borderColor: c.border, backgroundColor: c.surface, borderRadius: radius.md, padding: space.lg }}>
            <Text style={{ color: c.text, fontSize: 17, fontWeight: '700' }}>{p.label}</Text>
            <Text style={{ color: c.text, fontSize: 16 }}>{p.price}</Text>
            <Text style={{ color: c.muted }}>{p.note}</Text>
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
