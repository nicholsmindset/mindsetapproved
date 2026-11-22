import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '@/state/app';
import { DISCLAIMER } from '@/ui/copy';
import { Button, enter, IconTile } from '@/ui/kit';
import { Icon, type IconName } from '@/ui/Icon';
import { MAX_WIDTH, space, type, useColors } from '@/ui/theme';

const FEATURES: { symbol: IconName; color: 'accent' | 'good' | 'borderline' | 'bad'; title: string; body: string }[] = [
  {
    symbol: 'barcode.viewfinder',
    color: 'accent',
    title: 'Scan a barcode or a label',
    body: 'Barcodes give an instant answer. For anything else, photograph the ingredient list, in English, Malay, Chinese, Japanese or Korean.',
  },
  {
    symbol: 'checkmark.seal.fill',
    color: 'good',
    title: 'A clear verdict',
    body: 'Approved, Caution or Not Approved, with every flagged ingredient marked on the label and the rule behind it.',
  },
  {
    symbol: 'slider.horizontal.3',
    color: 'borderline',
    title: 'Your rules',
    body: 'Turn on Strict mode, or switch off what you don’t care about. Every verdict follows your settings.',
  },
];

/** Apple-style welcome: the app's promise in three lines, then the medical disclaimer. */
export default function Onboarding() {
  const { completeOnboarding } = useApp();
  const c = useColors();
  const [disclaimer, setDisclaimer] = useState(false);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.surface }} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, alignItems: 'center' }}>
        <View style={{ width: '100%', maxWidth: MAX_WIDTH, flexGrow: 1, paddingHorizontal: space.xl, paddingTop: 56, paddingBottom: space.xl }}>
          {disclaimer ? (
            <Animated.View key="d" entering={enter()} style={{ gap: space.lg, alignItems: 'center' }}>
              <IconTile symbol="hand.raised.fill" color={c.borderline} size={72} />
              <Text accessibilityRole="header" style={[type.largeTitle, { color: c.text, textAlign: 'center' }]}>
                Before you start
              </Text>
              <Text style={[type.body, { color: c.muted, textAlign: 'center' }]}>{DISCLAIMER}</Text>
            </Animated.View>
          ) : (
            <Animated.View key="w" entering={enter()} style={{ gap: space.xl }}>
              <View style={{ alignItems: 'center', gap: space.lg }}>
                <IconTile symbol="checkmark.seal.fill" color={c.accent} size={84} />
                <Text accessibilityRole="header" style={[type.largeTitle, { color: c.text, textAlign: 'center' }]}>
                  Welcome to{'\n'}Mindset Approved
                </Text>
              </View>
              <View style={{ gap: space.xl, marginTop: space.md }}>
                {FEATURES.map((f, i) => (
                  <Animated.View key={f.title} entering={enter(120 + i * 90)} style={{ flexDirection: 'row', gap: space.lg, alignItems: 'flex-start' }}>
                    <View style={{ width: 44, alignItems: 'center', paddingTop: 2 }}>
                      <Icon name={f.symbol} size={32} color={c[f.color]} />
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={[type.headline, { color: c.text }]}>{f.title}</Text>
                      <Text style={[type.subhead, { color: c.muted }]}>{f.body}</Text>
                    </View>
                  </Animated.View>
                ))}
              </View>
            </Animated.View>
          )}
          <View style={{ flex: 1, minHeight: space.xl }} />
          <View style={{ gap: space.md }}>
            {disclaimer ? (
              <>
                <Button kind="primary" label="I understand" onPress={completeOnboarding} />
                <Button kind="ghost" label="Back" onPress={() => setDisclaimer(false)} />
              </>
            ) : (
              <Button kind="primary" label="Continue" onPress={() => setDisclaimer(true)} />
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
