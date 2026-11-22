import { analyze } from '@mindset/rules-engine';
import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { useApp } from '@/state/app';
import { AnnotatedLabel } from '@/ui/chips';
import { DISCLAIMER } from '@/ui/copy';
import { Button, Mono, P, Screen, Stamp } from '@/ui/kit';
import { font, space, useColors } from '@/ui/theme';

const SAMPLE = 'Ingredients: Wheat flour, sugar, canola oil, cocoa powder (4%), salt, natural flavour.';

const STEPS = [
  {
    kicker: 'How it works',
    title: 'Scan the barcode. Or the label.',
    body: 'A barcode gives an instant answer. If the product isn’t in a database, photograph the ingredient list instead. That works for local and imported products, in English, Malay, Chinese, Japanese and Korean.',
  },
  {
    kicker: 'Every reason shown',
    title: 'Read the label the way we do.',
    body: 'Flagged ingredients are marked right on the ingredient list, in the order the pack lists them. Tap one to see the rule behind it.',
    sample: true,
  },
  {
    kicker: 'Three verdicts',
    title: 'Approved, Caution or Not Approved.',
    body: 'Turn on Strict mode, or switch off categories you don’t care about, like added sugar. Verdicts follow Mindset’s ingredient preferences, and you can change them.',
    stamps: true,
  },
];

export default function Onboarding() {
  const { completeOnboarding, rules } = useApp();
  const c = useColors();
  const [step, setStep] = useState(0);
  const last = step === STEPS.length;
  const sample = useMemo(() => analyze(SAMPLE, rules), [rules]);
  const s = STEPS[step];

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ flexDirection: 'row', gap: 4 }} accessibilityLabel={`Step ${step + 1} of ${STEPS.length + 1}`}>
        {[...STEPS, null].map((_, i) => (
          <View key={i} style={{ flex: 1, height: 4, backgroundColor: i <= step ? c.rule : c.border }} />
        ))}
      </View>

      <View style={{ flex: 1, justifyContent: 'center', gap: space.lg, paddingVertical: space.xl }}>
        <Mono>{last ? 'BEFORE YOU START' : `${String(step + 1).padStart(2, '0')} / ${s!.kicker.toUpperCase()}`}</Mono>
        <Text accessibilityRole="header" style={{ fontFamily: font.heavy, fontSize: 44, lineHeight: 44, color: c.text, textTransform: 'uppercase' }}>
          {last ? 'Not a medical device.' : s!.title}
        </Text>
        <View style={{ height: 6, backgroundColor: c.rule }} />
        {last ? (
          <P style={{ fontSize: 17, lineHeight: 25 }}>{DISCLAIMER}</P>
        ) : (
          <>
            <P style={{ fontSize: 17, lineHeight: 25 }}>{s!.body}</P>
            {s!.sample ? <AnnotatedLabel result={sample} selected={null} onSelect={() => {}} /> : null}
            {s!.stamps ? (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.lg, paddingTop: space.sm }}>
                <Stamp verdict="approved" size="md" />
                <Stamp verdict="caution" size="md" />
                <Stamp verdict="not_approved" size="md" />
              </View>
            ) : null}
          </>
        )}
      </View>

      <View style={{ flexDirection: 'row', gap: space.sm, justifyContent: 'flex-end' }}>
        {step > 0 ? <Button kind="ghost" label="Back" onPress={() => setStep(step - 1)} /> : null}
        {last ? (
          <Button kind="primary" label="I understand" icon="checkmark" onPress={completeOnboarding} />
        ) : (
          <Button kind="primary" label="Next" icon="arrow-forward" onPress={() => setStep(step + 1)} />
        )}
      </View>
    </Screen>
  );
}
