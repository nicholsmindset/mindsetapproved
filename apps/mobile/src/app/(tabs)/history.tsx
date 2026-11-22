import type { Verdict } from '@mindset/rules-engine';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '@/state/app';
import { Button, IconTile, Title } from '@/ui/kit';
import { Icon } from '@/ui/Icon';
import { MAX_WIDTH, radius, space, type, useColors, verdictStyle } from '@/ui/theme';

/** "Not Approved — contains canola oil." -> "Contains canola oil." (the stamp says the verdict). */
function sentence(summary: string): string {
  const rest = summary.split(' — ')[1] ?? summary;
  return rest.charAt(0).toUpperCase() + rest.slice(1);
}

type Filter = 'all' | 'favourites' | Verdict;
const FILTERS: [Filter, string][] = [
  ['all', 'All'],
  ['favourites', 'Saved'],
  ['approved', 'Approved'],
  ['caution', 'Caution'],
  ['not_approved', 'Not Approved'],
];

export default function History() {
  const app = useApp();
  const c = useColors();
  const [filter, setFilter] = useState<Filter>('all');
  const list = useMemo(() => {
    const all = app.history;
    if (filter === 'all') return all;
    if (filter === 'favourites') return all.filter((e) => e.favourite);
    return all.filter((e) => e.verdict === filter);
  }, [app.history, filter]);

  const today = new Date().toDateString();
  const when = (iso: string) => {
    const d = new Date(iso);
    return d.toDateString() === today ? d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      <FlatList
        data={list}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: 120, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' }}
        ListHeaderComponent={
          <View style={{ gap: space.md, marginBottom: space.lg }}>
            <Title sub={`${app.history.length} ${app.history.length === 1 ? 'scan' : 'scans'}, kept on this phone`}>History</Title>
            <FlatList
              horizontal
              data={FILTERS}
              keyExtractor={([k]) => k}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: space.sm }}
              renderItem={({ item: [k, label] }) => {
                const on = filter === k;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    onPress={() => setFilter(k)}
                    hitSlop={{ top: 5, bottom: 5 }}
                    style={{ paddingHorizontal: 14, minHeight: 34, justifyContent: 'center', borderRadius: radius.pill, backgroundColor: on ? c.accent : c.surface, boxShadow: on ? undefined : c.shadow }}
                  >
                    <Text style={[type.subhead, { fontWeight: '600', color: on ? c.onAccent : c.text }]}>{label}</Text>
                  </Pressable>
                );
              }}
            />
          </View>
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingVertical: 56, gap: space.md }}>
            <IconTile symbol="clock.fill" color={c.faint} size={56} />
            <Text style={[type.title3, { color: c.text }]}>{filter === 'all' ? 'No scans yet' : 'Nothing here yet'}</Text>
            <Text style={[type.subhead, { color: c.muted, textAlign: 'center', maxWidth: 280 }]}>
              {filter === 'all' ? 'Every barcode and label you check is kept here, on this phone.' : 'Scans that match this filter will appear here.'}
            </Text>
            {filter === 'all' ? <Button kind="primary" symbol="barcode.viewfinder" label="Scan your first product" onPress={() => router.navigate('/')} /> : null}
          </View>
        }
        ItemSeparatorComponent={() => (
          <View style={{ backgroundColor: c.surface }}>
            <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.border, marginLeft: 66 }} />
          </View>
        )}
        renderItem={({ item: e, index }) => {
          const v = verdictStyle(c, e.verdict);
          const first = index === 0;
          const last = index === list.length - 1;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${e.productName ?? 'Label scan'}: ${e.summary}`}
              onPress={() => router.push({ pathname: '/result/[id]', params: { id: e.id } })}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: space.md,
                paddingHorizontal: space.lg,
                paddingVertical: space.md,
                backgroundColor: pressed ? c.surface2 : c.surface,
                borderTopLeftRadius: first ? radius.lg : 0,
                borderTopRightRadius: first ? radius.lg : 0,
                borderBottomLeftRadius: last ? radius.lg : 0,
                borderBottomRightRadius: last ? radius.lg : 0,
              })}
            >
              <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: v.bg, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={v.symbol} size={20} color={v.fg} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text numberOfLines={1} style={[type.headline, { color: c.text, flexShrink: 1 }]}>
                    {e.productName ?? (e.barcode ? `Barcode ${e.barcode}` : 'Label scan')}
                  </Text>
                  {e.favourite ? <Icon name="heart.fill" size={12} color={c.bad} /> : null}
                </View>
                <Text numberOfLines={1} style={[type.subhead, { color: c.muted }]}>
                  <Text style={{ color: v.fg, fontWeight: '600' }}>{v.stamp}</Text> · {sentence(e.summary)}
                </Text>
              </View>
              <Text maxFontSizeMultiplier={1.4} style={[type.footnote, { color: c.muted }]}>{when(e.createdAt)}</Text>
              <Icon name="chevron.right" size={13} color={c.faint} weight="bold" />
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}
