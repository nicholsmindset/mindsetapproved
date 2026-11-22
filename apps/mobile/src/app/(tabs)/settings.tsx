import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, Platform, Text, View } from 'react-native';
import { useApp } from '@/state/app';
import { AccountCard } from '@/ui/AccountCard';
import { DISCLAIMER, OFF_ATTRIBUTION } from '@/ui/copy';
import { historyToCsv } from '@/core/export';
import { exportCsv } from '@/platform/export';
import { SHARE_BASE_URL, supabase } from '@/platform/supabase';
import { H2, IconTile, Notice, Row, Screen, Section, Title } from '@/ui/kit';
import { Icon } from '@/ui/Icon';
import { space, type, useColors } from '@/ui/theme';
import { APPEARANCES, LABEL_SCRIPTS, type LabelScript } from '@/core/store';
import { setAppearance, useAppearance } from '@/state/appearance';

function confirm(title: string, message: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  return new Promise((resolve) =>
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
    ]),
  );
}

export default function Settings() {
  const app = useApp();
  const c = useColors();
  const [msg, setMsg] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [script, setScript] = useState<LabelScript>(() => app.store.getLabelScript());
  const appearance = useAppearance();
  const open = (path: string) => void Linking.openURL(`${SHARE_BASE_URL}${path}`);

  return (
    <Screen>
      <Title>Settings</Title>

      <Section style={{ marginTop: 0 }}>
        <Row
          title={<Text style={[type.headline, { color: c.text }]}>Mindset Approved Premium</Text>}
          subtitle={app.store.isPremium() ? 'You have Premium. Thank you.' : 'Unlimited label scans and AI re-checks'}
          leading={<IconTile symbol="crown.fill" color="#ff9f0a" size={44} />}
          chevron
          onPress={() => router.push('/upgrade')}
        />
      </Section>

      {supabase ? (
        <>
          <H2>Account</H2>
          <AccountCard />
        </>
      ) : null}

      <Section header="Appearance">
        {APPEARANCES.map((a) => (
          <Row
            key={a.id}
            title={a.label}
            subtitle={a.id === 'system' ? 'Match the phone’s light or dark setting' : undefined}
            tile={{ symbol: a.id === 'dark' ? 'moon.fill' : a.id === 'light' ? 'sun.max.fill' : 'circle.lefthalf.filled', color: a.id === 'dark' ? '#5856d6' : a.id === 'light' ? '#ff9f0a' : '#8e8e93' }}
            accessibilityLabel={`${a.label}${appearance === a.id ? ', selected' : ''}`}
            trailing={appearance === a.id ? <Icon name="checkmark" size={17} color={c.accent} weight="bold" /> : null}
            onPress={() => setAppearance(a.id)}
          />
        ))}
      </Section>

      <Section header="Label language" footer="The language of the ingredient lists you photograph. Every option also reads English.">
        {LABEL_SCRIPTS.map((s) => (
          <Row
            key={s.id}
            title={s.label}
            accessibilityLabel={`${s.label}${script === s.id ? ', selected' : ''}`}
            trailing={script === s.id ? <Icon name="checkmark" size={17} color={c.accent} weight="bold" /> : null}
            onPress={() => {
              app.store.setLabelScript(s.id);
              setScript(s.id);
            }}
          />
        ))}
      </Section>

      <Section
        header="Rules"
        footer={`Using rules v${app.rules.bundle.version} with ${app.rules.bundle.ingredients.length} ingredients. ${app.online ? 'Updates download in the background.' : 'Offline: using the rules on this phone.'}`}
      >
        <Row
          title={checking ? 'Checking…' : 'Check for updates'}
          tile={{ symbol: 'arrow.clockwise', color: '#007aff' }}
          onPress={async () => {
            setChecking(true);
            await app.syncRules();
            setChecking(false);
            setMsg('Checked for new rules.');
          }}
        />
        {SHARE_BASE_URL ? <Row title="See all the rules" tile={{ symbol: 'list.bullet.rectangle.fill', color: c.accent }} chevron onPress={() => open('/rules')} /> : null}
      </Section>

      <Section header="Your data" footer="Scans and favourites are stored on this phone. Label photos are never saved. Anonymous scan results (no photos) help improve the ingredient database.">
        <Row
          title="Export history"
          subtitle="CSV file"
          tile={{ symbol: 'arrow.down.doc.fill', color: '#5856d6' }}
          onPress={async () => {
            const list = app.store.getHistory();
            if (!list.length) return setMsg('No scans to export yet.');
            try {
              await exportCsv(historyToCsv(list), `mindset-approved-history-${new Date().toISOString().slice(0, 10)}.csv`);
              setMsg(`Exported ${list.length} scan${list.length === 1 ? '' : 's'}.`);
            } catch (e) {
              setMsg(`Export failed: ${(e as Error).message}`);
            }
          }}
        />
        <Row
          title={<Text style={[type.body, { color: c.bad }]}>Delete my data</Text>}
          tile={{ symbol: 'trash.fill', color: '#ff3b30' }}
          onPress={async () => {
            if (!(await confirm('Delete my data?', 'This removes your history, settings, shared links and the scans sent from this phone (and your account’s data if you’re signed in). It can’t be undone.'))) return;
            const r = await app.deleteMyData();
            setMsg(r.ok ? 'Your data was deleted.' : `Could not delete server data: ${r.error}`);
          }}
        />
      </Section>
      {msg ? (
        <View style={{ marginTop: space.md }}>
          <Notice tone="ok">{msg}</Notice>
        </View>
      ) : null}

      {SHARE_BASE_URL ? (
        <Section header="Help">
          <Row title="Send a correction" tile={{ symbol: 'pencil', color: '#34c759' }} chevron onPress={() => open('/corrections')} />
          <Row title="Privacy policy" tile={{ symbol: 'lock.fill', color: '#8e8e93' }} chevron onPress={() => open('/privacy')} />
        </Section>
      ) : null}

      <Section header="About">
        <Row title="Not medical advice" subtitle={DISCLAIMER} tile={{ symbol: 'hand.raised.fill', color: '#ff9500' }} />
        <Row title="Data sources" subtitle={OFF_ATTRIBUTION} tile={{ symbol: 'globe', color: '#007aff' }} />
      </Section>
    </Screen>
  );
}
