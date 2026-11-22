import Ionicons from '@expo/vector-icons/Ionicons';
import type { Verdict } from '@mindset/rules-engine';
import { LinearGradient } from 'expo-linear-gradient';
import { Children, Fragment, isValidElement } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View, type PressableProps, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Animated, { FadeInDown, ReduceMotion } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon, type IconName } from './Icon';
import { type Colors, mono, MAX_WIDTH, radius, space, type, useColors, verdictStyle } from './theme';

export const enter = (delay = 0) => FadeInDown.duration(380).delay(delay).springify().damping(18).reduceMotion(ReduceMotion.System);

export function Screen({ children, scroll = true, edges }: { children: React.ReactNode; scroll?: boolean; edges?: ('top' | 'bottom')[] }) {
  const c = useColors();
  const body = <View style={styles.inner}>{children}</View>;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={edges ?? ['top']}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="automatic">
          {body}
        </ScrollView>
      ) : (
        body
      )}
    </SafeAreaView>
  );
}

/** iOS large title, with an optional subtitle and a trailing accessory. */
export function Title({ children, sub, aside }: { children: React.ReactNode; sub?: React.ReactNode; aside?: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={{ marginBottom: space.lg, gap: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md }}>
        <Text accessibilityRole="header" style={[type.largeTitle, { color: c.text }]}>
          {children}
        </Text>
        {aside}
      </View>
      {sub ? <Text style={[type.subhead, { color: c.muted }]}>{sub}</Text> : null}
    </View>
  );
}

/** Section heading above a group, in the style of the Health app. */
export function H2({ children, count, style }: { children: React.ReactNode; count?: number; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return (
    <View style={[{ marginTop: space.xl, marginBottom: space.sm, flexDirection: 'row', alignItems: 'baseline', gap: space.sm, paddingHorizontal: 4 }, style]}>
      <Text accessibilityRole="header" style={[type.title3, { color: c.text, fontWeight: '700' }]}>
        {children}
      </Text>
      {count !== undefined ? <Text style={[type.subhead, { color: c.muted, fontVariant: ['tabular-nums'] }]}>{count}</Text> : null}
    </View>
  );
}

export function P({ children, muted, style }: { children: React.ReactNode; muted?: boolean; style?: StyleProp<TextStyle> }) {
  const c = useColors();
  return <Text style={[type.body, { color: muted ? c.muted : c.text }, style]}>{children}</Text>;
}

export function Footnote({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  const c = useColors();
  return <Text style={[type.footnote, { color: c.muted, paddingHorizontal: 4 }, style]}>{children}</Text>;
}

/** Barcodes and codes. */
export function Mono({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  const c = useColors();
  return <Text style={[{ fontFamily: mono, fontSize: 13, color: c.muted }, style]}>{children}</Text>;
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  return <View style={[styles.card, { backgroundColor: c.surface, boxShadow: c.shadow }, style]}>{children}</View>;
}

/** An inset grouped section: rows on one rounded card, separated by inset hairlines. */
export function Section({ children, header, footer, style }: { children: React.ReactNode; header?: string; footer?: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View style={[{ marginTop: header ? 0 : space.lg }, style]}>
      {header ? <H2>{header}</H2> : null}
      <View style={[styles.section, { backgroundColor: c.surface, boxShadow: c.shadow }]}>
        {rows.map((row, i) => (
          <Fragment key={row.key ?? i}>
            {row}
            {i < rows.length - 1 ? <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.border, marginLeft: 58 }} /> : null}
          </Fragment>
        ))}
      </View>
      {footer ? <Footnote style={{ marginTop: space.sm, paddingHorizontal: space.lg }}>{footer}</Footnote> : null}
    </View>
  );
}

/** Settings-app icon: a white symbol on a coloured rounded square. */
export function IconTile({ symbol, color, size = 30 }: { symbol: IconName; color: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.24, borderCurve: 'continuous', backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={symbol} size={size * 0.56} color="#fff" />
    </View>
  );
}

/** One row of a Section. */
export function Row({
  title,
  subtitle,
  tile,
  leading,
  trailing,
  chevron,
  onPress,
  accessibilityLabel,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  tile?: { symbol: IconName; color: string };
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  chevron?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const c = useColors();
  const body = (
    <>
      {tile ? <IconTile symbol={tile.symbol} color={tile.color} /> : leading}
      <View style={{ flex: 1, gap: 2 }}>
        {typeof title === 'string' ? <Text style={[type.body, { color: c.text }]}>{title}</Text> : title}
        {subtitle ? typeof subtitle === 'string' ? <Text style={[type.subhead, { color: c.muted }]}>{subtitle}</Text> : subtitle : null}
      </View>
      {trailing}
      {chevron ? <Icon name="chevron.right" size={14} color={c.faint} weight="bold" /> : null}
    </>
  );
  return onPress ? (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} style={({ pressed }) => [styles.row, { backgroundColor: pressed ? c.surface2 : 'transparent' }]}>
      {body}
    </Pressable>
  ) : (
    <View style={styles.row}>{body}</View>
  );
}

type ButtonKind = 'primary' | 'secondary' | 'ghost' | 'danger';

/** Filled (primary), tinted (secondary), plain (ghost) or destructive capsule button. */
export function Button({
  label,
  icon,
  symbol,
  kind = 'secondary',
  style,
  ...rest
}: { label: string; icon?: keyof typeof Ionicons.glyphMap; symbol?: IconName; kind?: ButtonKind; style?: StyleProp<ViewStyle> } & Omit<PressableProps, 'style'>) {
  const c = useColors();
  const bg = kind === 'primary' ? c.accent : kind === 'ghost' ? 'transparent' : kind === 'danger' ? c.badBg : c.fill;
  const fg = kind === 'primary' ? c.onAccent : kind === 'danger' ? c.bad : c.accent;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.button, kind === 'ghost' && { paddingHorizontal: space.sm }, { backgroundColor: bg, opacity: rest.disabled ? 0.38 : pressed ? 0.7 : 1 }, style]}
      {...rest}
    >
      {symbol ? <Icon name={symbol} size={17} color={fg} /> : icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
      <Text style={[type.headline, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export function ToggleRow({ label, hint, value, onChange, disabled, tile }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean; tile?: { symbol: IconName; color: string } }) {
  const c = useColors();
  return (
    <Row
      title={label}
      subtitle={hint}
      tile={tile}
      trailing={
        <Switch
          accessibilityLabel={label}
          value={value}
          onValueChange={onChange}
          disabled={disabled}
          trackColor={{ true: c.good, false: c.fill }}
          {...({ activeThumbColor: '#fff' } as object)}
        />
      }
    />
  );
}

/** Small verdict capsule for lists. */
export function VerdictBadge({ verdict }: { verdict: Verdict; size?: 'sm' | 'md' }) {
  const c = useColors();
  const v = verdictStyle(c, verdict);
  return (
    <View accessibilityLabel={v.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: v.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill }}>
      <Icon name={v.symbol} size={12} color={v.fg} />
      <Text style={[type.caption, { color: v.fg, fontWeight: '600' }]}>{v.stamp}</Text>
    </View>
  );
}

/** Kept name: the verdict mark. On the result screen use VerdictHero. */
export function Stamp({ verdict, colors }: { verdict: Verdict; size?: 'sm' | 'md' | 'lg'; colors?: Colors }) {
  const themed = useColors();
  const c = colors ?? themed;
  const v = verdictStyle(c, verdict);
  return (
    <View accessibilityLabel={v.label} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, alignSelf: 'flex-start' }}>
      <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: v.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={v.symbol} size={20} color={v.fg} />
      </View>
      <Text style={[type.title2, { color: v.fg }]}>{v.label}</Text>
    </View>
  );
}

/** The result's headline card: a soft wash of the verdict colour, its symbol, the verdict and the reason. */
export function VerdictHero({ verdict, summary, title, meta }: { verdict: Verdict; summary: string; title: string; meta?: string }) {
  const c = useColors();
  const v = verdictStyle(c, verdict);
  return (
    <Animated.View entering={enter()} style={[styles.hero, { backgroundColor: c.surface, boxShadow: c.shadow }]}>
      <LinearGradient colors={[v.bg, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <View style={{ gap: 2 }}>
        <Text numberOfLines={2} style={[type.headline, { color: c.text }]}>{title}</Text>
        {meta ? <Text style={[type.footnote, { color: c.muted }]}>{meta}</Text> : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.lg }}>
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: v.fg, alignItems: 'center', justifyContent: 'center', boxShadow: `0px 8px 24px ${v.bg}` }}>
          <Icon name={v.symbol} size={32} color="#fff" weight="bold" />
        </View>
        <Text accessibilityRole="header" style={[type.title1, { color: v.fg, flex: 1 }]}>
          {v.label}
        </Text>
      </View>
      <Text testID="summary" style={[type.title3, { color: c.text, fontWeight: '500', marginTop: space.md }]}>
        {summary}
      </Text>
    </Animated.View>
  );
}

/** iOS segmented control. */
export function Tabs<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string; icon?: keyof typeof Ionicons.glyphMap; symbol?: IconName }[]; onChange: (v: T) => void }) {
  const c = useColors();
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', backgroundColor: c.fill, borderRadius: 10, padding: 2, borderCurve: 'continuous' }}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Pressable
            key={o.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.id)}
            style={{ flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, borderRadius: 8, borderCurve: 'continuous', backgroundColor: on ? c.surface : 'transparent', boxShadow: on ? '0px 3px 8px rgba(0,0,0,0.12), 0px 3px 1px rgba(0,0,0,0.04)' : undefined }}
          >
            {o.symbol ? <Icon name={o.symbol} size={15} color={c.text} /> : null}
            <Text style={[type.subhead, { color: c.text, fontWeight: on ? '600' : '500' }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A short message on a tinted card. */
export function Notice({ tone, children, action }: { tone: 'ok' | 'info' | 'error'; children: React.ReactNode; action?: React.ReactNode }) {
  const c = useColors();
  const fg = tone === 'ok' ? c.good : tone === 'error' ? c.bad : c.borderline;
  const bg = tone === 'ok' ? c.goodBg : tone === 'error' ? c.badBg : c.borderlineBg;
  const symbol: IconName = tone === 'ok' ? 'checkmark.circle.fill' : tone === 'error' ? 'exclamationmark.triangle.fill' : 'info.circle.fill';
  return (
    <View accessibilityRole="alert" style={{ backgroundColor: bg, borderRadius: radius.md, borderCurve: 'continuous', padding: space.md, gap: space.sm }}>
      <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' }}>
        <Icon name={symbol} size={18} color={fg} />
        <Text style={[type.subhead, { color: c.text, flex: 1, fontWeight: '500' }]}>{children}</Text>
      </View>
      {action}
    </View>
  );
}

export const styles = StyleSheet.create({
  scroll: { flexGrow: 1, alignItems: 'center' },
  inner: { width: '100%', maxWidth: MAX_WIDTH, paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: 120, flexGrow: 1 },
  card: { borderRadius: radius.lg, borderCurve: 'continuous', padding: space.lg },
  section: { borderRadius: radius.lg, borderCurve: 'continuous', overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingVertical: 11, minHeight: 52 },
  hero: { borderRadius: radius.xl, borderCurve: 'continuous', padding: space.xl, overflow: 'hidden' },
  button: { minHeight: 50, paddingHorizontal: space.lg, borderRadius: 14, borderCurve: 'continuous', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
});
