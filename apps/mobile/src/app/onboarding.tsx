import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { useApp } from '@/state/app';
import { Button, Card, P, Screen, VerdictBadge } from '@/ui/kit';
import { DISCLAIMER } from '@/ui/copy';
import { space, useColors } from '@/ui/theme';

const STEPS = [
  {
    icon: 'scan' as const,
    title: 'Scan a barcode or a label',
    body: 'Point the camera at a barcode for an instant answer. If the product isn’t in a database, photograph the ingredient list instead. That works for local and imported products too.',
  },
  {
    icon: 'list' as const,
    title: 'Three verdicts, every reason shown',
    body: 'Every flagged ingredient shows the rule behind it. Good signs, like avocado oil, are highlighted too.',
    verdicts: true,
  },
  {
    icon: 'options' as const,
    title: 'Your rules, your call',
    body: 'Turn on Strict mode, or switch off categories you don’t care about, like added sugar. Verdicts follow Mindset’s ingredient preferences.',
  },
];

export default function Onboarding() {
  const { completeOnboarding } = useApp();
  const c = useColors();
  const [step, setStep] = useState(0);
  const last = step === STEPS.length;

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ flex: 1, justifyContent: 'center', gap: space.xl }}>
        {!last ? (
          <>
            <Ionicons name={STEPS[step]!.icon} size={44} color={c.accent} />
            <Text accessibilityRole="header" style={{ fontSize: 28, fontWeight: '700', color: c.text, letterSpacing: -0.5 }}>
              {STEPS[step]!.title}
            </Text>
            <P>{STEPS[step]!.body}</P>
            {STEPS[step]!.verdicts ? (
              <View style={{ gap: space.sm }}>
                <VerdictBadge verdict="approved" />
                <VerdictBadge verdict="caution" />
                <VerdictBadge verdict="not_approved" />
              </View>
            ) : null}
          </>
        ) : (
          <>
            <Ionicons name="information-circle" size={44} color={c.accent} />
            <Text accessibilityRole="header" style={{ fontSize: 28, fontWeight: '700', color: c.text }}>
              Before you start
            </Text>
            <Card>
              <P>{DISCLAIMER}</P>
            </Card>
          </>
        )}
      </View>
      <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center', marginTop: space.xl }}>
        <View style={{ flexDirection: 'row', gap: 6, flex: 1 }} accessibilityLabel={`Step ${step + 1} of ${STEPS.length + 1}`}>
          {[...STEPS, null].map((_, i) => (
            <View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: i === step ? c.accent : c.border }} />
          ))}
        </View>
        {last ? (
          <Button kind="primary" label="I understand" onPress={completeOnboarding} />
        ) : (
          <Button kind="primary" label="Next" onPress={() => setStep(step + 1)} />
        )}
      </View>
    </Screen>
  );
}
