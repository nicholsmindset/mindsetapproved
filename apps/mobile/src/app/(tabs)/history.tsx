import Ionicons from '@expo/vector-icons/Ionicons';
import type { Verdict } from '@mindset/rules-engine';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '@/state/app';
import { P, VerdictBadge } from '@/ui/kit';
import { MAX_WIDTH, radius, space, useColors } from '@/ui/theme';

type Filter = 'all' | 'favourites' | Verdict;
const FILTERS: Array<[Filter, string]> = [
  ['all', 'All'],
  ['favourites', 'Favourites'],
  ['approved', 'Approved'],
  ['caution', 'Caution'],
  ['not_approved', 'Not Approved'],
];

export default function History() {
  const app = useApp();
  const c = useColors();
  const [filter, setFilter] = useState<Filter>('all');
  const list = useMemo(() => {
    const all = app.store.getHistory();
    if (filter === 'all') return all;
    if (filter === 'favourites') return all.filter((e) => e.favourite);
    return all.filter((e) => e.verdict === filter);
  }, [app.store, app.historyVersion, filter]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      <FlatList
        data={list}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ padding: space.lg, gap: space.sm, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' }}
        ListHeaderComponent={
          <View style={{ gap: space.md, marginBottom: space.sm }}>
            <Text accessibilityRole="header" style={{ fontSize: 28, fontWeight: '700', color: c.text, letterSpacing: -0.5 }}>
              History
            </Text>
            <FlatList
              horizontal
              data={FILTERS}
              keyExtractor={([k]) => k}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: space.sm }}
              renderItem={({ item: [k, label] }) => (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: filter === k }}
                  onPress={() => setFilter(k)}
                  style={{ paddingHorizontal: 14, minHeight: 36, justifyContent: 'center', borderRadius: radius.pill, backgroundColor: filter === k ? c.accent : c.surface, borderWidth: 1, borderColor: filter === k ? c.accent : c.border }}
                >
                  <Text style={{ color: filter === k ? c.onAccent : c.text, fontWeight: '600' }}>{label}</Text>
                </Pressable>
              )}
            />
          </View>
        }
        ListEmptyComponent={<P muted>{filter === 'all' ? 'Your scans will appear here.' : 'Nothing here yet.'}</P>}
        renderItem={({ item: e }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${e.productName ?? 'Label scan'}: ${e.summary}`}
            onPress={() => router.push({ pathname: '/result/[id]', params: { id: e.id } })}
            style={({ pressed }) => ({ backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: radius.md, padding: space.md, gap: 6, opacity: pressed ? 0.85 : 1 })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <Text numberOfLines={1} style={{ flex: 1, color: c.text, fontSize: 16, fontWeight: '600' }}>
                {e.productName ?? (e.barcode ? `Barcode ${e.barcode}` : 'Label scan')}
              </Text>
              {e.favourite ? <Ionicons name="heart" size={16} color={c.bad} accessibilityLabel="Favourite" /> : null}
            </View>
            <VerdictBadge verdict={e.verdict} size="sm" />
            <Text numberOfLines={2} style={{ color: c.muted, fontSize: 14 }}>
              {e.summary}
            </Text>
            <Text style={{ color: c.muted, fontSize: 12 }}>{new Date(e.createdAt).toLocaleString()}</Text>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}
