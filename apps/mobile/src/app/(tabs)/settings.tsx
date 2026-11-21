import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, Platform, View } from 'react-native';
import { useApp } from '@/state/app';
import { AccountCard } from '@/ui/AccountCard';
import { DISCLAIMER, OFF_ATTRIBUTION } from '@/ui/copy';
import { historyToCsv } from '@/core/export';
import { exportCsv } from '@/platform/export';
import { SHARE_BASE_URL, supabase } from '@/platform/supabase';
import { Button, Card, H2, P, Screen, Title } from '@/ui/kit';
import { space } from '@/ui/theme';

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
  const [msg, setMsg] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  return (
    <Screen>
      <Title>Settings</Title>

      {supabase ? (
        <>
          <H2>Account</H2>
          <AccountCard />
        </>
      ) : null}

      <H2>Premium</H2>
      <P>{app.store.isPremium() ? 'You have Premium.' : 'Unlimited label scans and AI re-checks, and your full history synced and exportable.'}</P>
      <View style={{ flexDirection: 'row', marginTop: space.sm }}>
        <Button icon="sparkles-outline" label="See Premium" onPress={() => router.push('/upgrade')} />
      </View>

      <H2>About the verdicts</H2>
      <Card>
        <P>{DISCLAIMER}</P>
      </Card>

      <H2>Rules</H2>
      <P>
        Using rules v{app.rules.bundle.version} ({app.rules.bundle.ingredients.length} ingredients). {app.online ? 'Updates download in the background.' : 'Offline: using the rules on this phone.'}
      </P>
      <View style={{ flexDirection: 'row', marginTop: space.sm }}>
        <Button
          icon="refresh"
          label={checking ? 'Checking…' : 'Check for updates'}
          disabled={checking}
          onPress={async () => {
            setChecking(true);
            await app.syncRules();
            setChecking(false);
            setMsg('Checked for new rules.');
          }}
        />
      </View>

      <H2>Your data</H2>
      <View style={{ flexDirection: 'row', marginBottom: space.sm }}>
        <Button
          icon="download-outline"
          label="Export history (CSV)"
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
      </View>
      <P>Scans and favourites are stored on this phone. Label photos are never saved. Anonymous scan results (no photos) help improve the ingredient database.</P>
      <View style={{ flexDirection: 'row', marginTop: space.sm }}>
        <Button
          kind="danger"
          icon="trash-outline"
          label="Delete my data"
          onPress={async () => {
            if (!(await confirm('Delete my data?', 'This removes your history, settings, shared links and the scans sent from this phone (and your account’s data if you’re signed in). It can’t be undone.'))) return;
            const r = await app.deleteMyData();
            setMsg(r.ok ? 'Your data was deleted.' : `Could not delete server data: ${r.error}`);
          }}
        />
      </View>
      {msg ? <P muted style={{ marginTop: space.sm }}>{msg}</P> : null}

      {SHARE_BASE_URL ? (
        <>
          <H2>Corrections</H2>
          <P>Manufacturers and shoppers can report wrong ingredient data. We fix errors quickly.</P>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.sm }}>
            <Button icon="create-outline" label="Send a correction" onPress={() => void Linking.openURL(`${SHARE_BASE_URL}/corrections`)} />
            <Button icon="list-outline" label="See all the rules" onPress={() => void Linking.openURL(`${SHARE_BASE_URL}/rules`)} />
            <Button icon="shield-checkmark-outline" label="Privacy policy" onPress={() => void Linking.openURL(`${SHARE_BASE_URL}/privacy`)} />
          </View>
        </>
      ) : null}

      <H2>Data sources</H2>
      <P muted>{OFF_ATTRIBUTION}</P>
    </Screen>
  );
}
