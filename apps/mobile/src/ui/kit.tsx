import Ionicons from '@expo/vector-icons/Ionicons';
import type { Verdict } from '@mindset/rules-engine';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View, type PressableProps, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { type Colors, font, MAX_WIDTH, radius, space, useColors, verdictStyle } from './theme';

export function Screen({ children, scroll = true, edges }: { children: React.ReactNode; scroll?: boolean; edges?: ('top' | 'bottom')[] }) {
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

/** Page title in the style of a nutrition panel head: bold condensed, then a heavy ink rule. */
export function Title({ children, sub, aside }: { children: React.ReactNode; sub?: React.ReactNode; aside?: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={{ marginBottom: space.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: space.md }}>
        <Text accessibilityRole="header" style={[styles.title, { color: c.text }]}>
          {children}
        </Text>
        {aside ? <View style={{ paddingBottom: 6 }}>{aside}</View> : null}
      </View>
      <View style={{ height: 6, backgroundColor: c.rule, marginTop: 2 }} />
      {sub ? <Text style={[styles.body, { color: c.muted, marginTop: space.sm }]}>{sub}</Text> : null}
    </View>
  );
}

/** Section head: small caps label on a hairline, like the sub-heads of a nutrition panel. */
export function H2({ children, count }: { children: React.ReactNode; count?: number }) {
  const c = useColors();
  return (
    <View style={{ marginTop: space.xl, marginBottom: space.sm, borderTopWidth: 1.5, borderTopColor: c.rule, paddingTop: 6, flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text accessibilityRole="header" style={[styles.h2, { color: c.text }]}>
        {children}
      </Text>
      {count !== undefined ? <Text style={[styles.h2, { color: c.muted, fontFamily: font.mono, fontSize: 13 }]}>{count}</Text> : null}
    </View>
  );
}

export function P({ children, muted, style }: { children: React.ReactNode; muted?: boolean; style?: StyleProp<TextStyle> }) {
  const c = useColors();
  return <Text style={[styles.body, { color: muted ? c.muted : c.text }, style]}>{children}</Text>;
}

/** Numbers that come off the pack or the system (barcodes, rule versions, dates). */
export function Mono({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  const c = useColors();
  return <Text style={[{ fontFamily: font.mono, fontSize: 12, color: c.muted, letterSpacing: 0.2 }, style]}>{children}</Text>;
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
  const bg = kind === 'primary' ? c.accent : 'transparent';
  const fg = kind === 'primary' ? c.onAccent : kind === 'danger' ? c.bad : c.text;
  const border = kind === 'primary' ? c.accent : kind === 'ghost' ? 'transparent' : kind === 'danger' ? c.bad : c.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.button,
        kind === 'ghost' && { paddingHorizontal: space.sm },
        { backgroundColor: pressed && kind !== 'primary' ? c.surface2 : bg, borderColor: border, opacity: rest.disabled ? 0.4 : pressed && kind === 'primary' ? 0.85 : 1 },
        style,
      ]}
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
      <View style={{ flex: 1, paddingRight: space.md, gap: 2 }}>
        <Text style={[styles.body, { color: c.text, fontFamily: font.medium }]}>{label}</Text>
        {hint ? <Text style={[styles.small, { color: c.muted }]}>{hint}</Text> : null}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ true: c.accent, false: c.border }}
        thumbColor={c.surface}
        {...({ activeThumbColor: c.surface } as object)}
      />
    </View>
  );
}

/**
 * The verdict as an inspection stamp: a double-ruled box in the verdict colour, set slightly off-square.
 * Large on the result screen, small in lists.
 */
export function Stamp({ verdict, size = 'lg', colors }: { verdict: Verdict; size?: 'sm' | 'md' | 'lg'; colors?: Colors }) {
  const themed = useColors();
  const c = colors ?? themed;
  const v = verdictStyle(c, verdict);
  const s = {
    sm: { fs: 13, pad: 5, b: 1.5, inner: 1, gap: 2, rot: '0deg', ls: 0.8 },
    md: { fs: 18, pad: 7, b: 2, inner: 1, gap: 2, rot: '-2deg', ls: 1 },
    lg: { fs: 34, pad: 10, b: 3.5, inner: 1.5, gap: 3, rot: '-3deg', ls: 1.5 },
  }[size];
  return (
    <View accessibilityRole="text" accessibilityLabel={v.label} style={{ alignSelf: 'flex-start', transform: [{ rotate: s.rot }] }}>
      <View style={{ borderWidth: s.b, borderColor: v.fg, borderRadius: radius.sm, padding: s.gap }}>
        <View style={{ borderWidth: s.inner, borderColor: v.fg, borderRadius: 2, paddingHorizontal: s.pad + 2, paddingVertical: s.pad * 0.45 }}>
          <Text style={{ fontFamily: font.heavy, fontSize: s.fs, lineHeight: s.fs * 1.08, color: v.fg, letterSpacing: s.ls, textTransform: 'uppercase' }}>{v.stamp}</Text>
        </View>
      </View>
    </View>
  );
}

/** Kept for existing callers: the small stamp. */
export function VerdictBadge({ verdict, size = 'md' }: { verdict: Verdict; size?: 'sm' | 'md' }) {
  return <Stamp verdict={verdict} size={size === 'sm' ? 'sm' : 'md'} />;
}

/** Two or more views of one thing, with an ink bar under the current one. */
export function Tabs<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string; icon?: keyof typeof Ionicons.glyphMap }[]; onChange: (v: T) => void }) {
  const c = useColors();
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: c.border }}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Pressable
            key={o.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.id)}
            style={{ flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, borderBottomWidth: 3, borderBottomColor: on ? c.rule : 'transparent', marginBottom: -1 }}
          >
            {o.icon ? <Ionicons name={o.icon} size={18} color={on ? c.text : c.muted} /> : null}
            <Text style={{ fontFamily: font.display, fontSize: 17, letterSpacing: 0.6, textTransform: 'uppercase', color: on ? c.text : c.muted }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A one-line message with a coloured rule on the left. */
export function Notice({ tone, children, action }: { tone: 'ok' | 'info' | 'error'; children: React.ReactNode; action?: React.ReactNode }) {
  const c = useColors();
  const fg = tone === 'ok' ? c.good : tone === 'error' ? c.bad : c.borderline;
  const bg = tone === 'ok' ? c.goodBg : tone === 'error' ? c.badBg : c.borderlineBg;
  return (
    <View accessibilityRole="alert" style={{ backgroundColor: bg, borderLeftWidth: 4, borderLeftColor: fg, paddingVertical: space.sm + 2, paddingHorizontal: space.md, gap: space.sm }}>
      <Text style={[styles.body, { color: c.text, fontFamily: font.medium }]}>{children}</Text>
      {action}
    </View>
  );
}

export const styles = StyleSheet.create({
  scroll: { flexGrow: 1, alignItems: 'center' },
  inner: { width: '100%', maxWidth: MAX_WIDTH, paddingHorizontal: space.lg, paddingTop: space.lg, paddingBottom: space.xxl, flexGrow: 1 },
  title: { fontFamily: font.heavy, fontSize: 40, lineHeight: 42, letterSpacing: -0.3, textTransform: 'uppercase' },
  h2: { fontFamily: font.display, fontSize: 16, letterSpacing: 0.8, textTransform: 'uppercase' },
  body: { fontFamily: font.body, fontSize: 16, lineHeight: 23 },
  small: { fontFamily: font.body, fontSize: 13, lineHeight: 18 },
  card: { borderWidth: 1, borderRadius: radius.md, padding: space.lg },
  button: {
    minHeight: 46,
    paddingHorizontal: space.lg,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  buttonText: { fontFamily: font.display, fontSize: 17, letterSpacing: 0.6, textTransform: 'uppercase' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: space.md, borderBottomWidth: 1, minHeight: 60 },
});
