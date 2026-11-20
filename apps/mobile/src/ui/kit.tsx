import Ionicons from '@expo/vector-icons/Ionicons';
import type { Verdict } from '@mindset/rules-engine';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View, type PressableProps, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MAX_WIDTH, radius, space, useColors, verdictStyle } from './theme';

export function Screen({ children, scroll = true, edges }: { children: React.ReactNode; scroll?: boolean; edges?: Array<'top' | 'bottom'> }) {
  const c = useColors();
  const body = <View style={styles.inner}>{children}</View>;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={edges ?? ['top']}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {body}
        </ScrollView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}

export function Title({ children, sub }: { children: React.ReactNode; sub?: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={{ marginBottom: space.lg }}>
      <Text accessibilityRole="header" style={[styles.title, { color: c.text }]}>
        {children}
      </Text>
      {sub ? <Text style={[styles.body, { color: c.muted, marginTop: 2 }]}>{sub}</Text> : null}
    </View>
  );
}

export function H2({ children }: { children: React.ReactNode }) {
  const c = useColors();
  return (
    <Text accessibilityRole="header" style={[styles.h2, { color: c.text }]}>
      {children}
    </Text>
  );
}

export function P({ children, muted, style }: { children: React.ReactNode; muted?: boolean; style?: StyleProp<TextStyle> }) {
  const c = useColors();
  return <Text style={[styles.body, { color: muted ? c.muted : c.text }, style]}>{children}</Text>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }, style]}>{children}</View>;
}

type ButtonKind = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  label,
  icon,
  kind = 'secondary',
  style,
  ...rest
}: { label: string; icon?: keyof typeof Ionicons.glyphMap; kind?: ButtonKind; style?: StyleProp<ViewStyle> } & Omit<PressableProps, 'style'>) {
  const c = useColors();
  const bg = kind === 'primary' ? c.accent : kind === 'ghost' ? 'transparent' : c.surface;
  const fg = kind === 'primary' ? c.onAccent : kind === 'danger' ? c.bad : c.text;
  const border = kind === 'primary' || kind === 'ghost' ? 'transparent' : c.border;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.button, { backgroundColor: bg, borderColor: border, opacity: rest.disabled ? 0.5 : pressed ? 0.85 : 1 }, style]}
      {...rest}
    >
      {icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
      <Text style={[styles.buttonText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function ToggleRow({ label, hint, value, onChange, disabled }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  const c = useColors();
  return (
    <View style={[styles.toggleRow, { borderColor: c.border }]}>
      <View style={{ flex: 1, paddingRight: space.md }}>
        <Text style={[styles.body, { color: c.text }]}>{label}</Text>
        {hint ? <Text style={[styles.small, { color: c.muted }]}>{hint}</Text> : null}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ true: c.accent, false: c.border }}
        thumbColor={c.surface}
      />
    </View>
  );
}

export function VerdictBadge({ verdict, size = 'md' }: { verdict: Verdict; size?: 'sm' | 'md' }) {
  const c = useColors();
  const v = verdictStyle(c, verdict);
  return (
    <View style={[styles.badge, { backgroundColor: v.bg }]} accessibilityLabel={v.label}>
      <Ionicons name={v.icon} size={size === 'sm' ? 14 : 18} color={v.fg} />
      <Text style={[size === 'sm' ? styles.small : styles.body, { color: v.fg, fontWeight: '600' }]}>{v.label}</Text>
    </View>
  );
}

export const styles = StyleSheet.create({
  scroll: { flexGrow: 1, alignItems: 'center' },
  inner: { width: '100%', maxWidth: MAX_WIDTH, paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.xxl, flexGrow: 1 },
  title: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  h2: { fontSize: 17, fontWeight: '600', marginTop: space.xl, marginBottom: space.sm },
  body: { fontSize: 16, lineHeight: 22 },
  small: { fontSize: 13, lineHeight: 18 },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, padding: space.lg },
  button: {
    minHeight: 48,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  buttonText: { fontSize: 16, fontWeight: '600' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.md, borderBottomWidth: StyleSheet.hairlineWidth, minHeight: 56 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill },
});
