import Ionicons from '@expo/vector-icons/Ionicons';
import type { Verdict } from '@mindset/rules-engine';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '@/state/app';
import { Mono, P, Stamp, Title } from '@/ui/kit';
import { font, MAX_WIDTH, radius, space, useColors } from '@/ui/theme';

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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      <FlatList
        data={list}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ padding: space.lg, width: '100%', maxWidth: MAX_WIDTH, alignSelf: 'center' }}
        ListHeaderComponent={
          <View style={{ gap: space.md, marginBottom: space.md }}>
            <Title aside={<Mono>{app.history.length} SCANS</Mono>}>History</Title>
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
                    style={{ paddingHorizontal: 12, minHeight: 34, justifyContent: 'center', borderRadius: radius.sm, backgroundColor: on ? c.text : 'transparent', borderWidth: 1.5, borderColor: on ? c.text : c.border }}
                  >
                    <Text style={{ fontFamily: font.display, fontSize: 15, letterSpacing: 0.6, textTransform: 'uppercase', color: on ? c.bg : c.text }}>{label}</Text>
                  </Pressable>
                );
              }}
            />
          </View>
        }
        ListEmptyComponent={
          <View style={{ paddingVertical: space.xxl, gap: space.sm, alignItems: 'flex-start' }}>
            <Text style={{ fontFamily: font.display, fontSize: 22, textTransform: 'uppercase', color: c.text }}>{filter === 'all' ? 'Nothing scanned yet' : 'Nothing here yet'}</Text>
            <P muted>{filter === 'all' ? 'Every barcode and label you check is kept here, on this phone.' : 'Scans with this verdict will appear here.'}</P>
          </View>
        }
        renderItem={({ item: e }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${e.productName ?? 'Label scan'}: ${e.summary}`}
            onPress={() => router.push({ pathname: '/result/[id]', params: { id: e.id } })}
            style={({ pressed }) => ({ borderBottomWidth: 1, borderBottomColor: c.border, paddingVertical: space.md, gap: space.sm, backgroundColor: pressed ? c.surface2 : 'transparent' })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: space.md }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text numberOfLines={1} style={{ fontFamily: font.display, fontSize: 20, lineHeight: 24, color: c.text, textTransform: 'uppercase' }}>
                  {e.productName ?? (e.barcode ? `Barcode ${e.barcode}` : 'Label scan')}
                </Text>
                <Text numberOfLines={2} style={{ fontFamily: font.body, color: c.muted, fontSize: 14, lineHeight: 19 }}>
                  {sentence(e.summary)}
                </Text>
              </View>
              <Stamp verdict={e.verdict} size="sm" />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
              <Mono>{new Date(e.createdAt).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).toUpperCase()}</Mono>
              {e.favourite ? <Ionicons name="heart" size={13} color={c.bad} accessibilityLabel="Saved" /> : null}
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}
