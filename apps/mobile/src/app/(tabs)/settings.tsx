import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, Platform, Pressable, Text, View } from 'react-native';
import { useApp } from '@/state/app';
import { AccountCard } from '@/ui/AccountCard';
import { DISCLAIMER, OFF_ATTRIBUTION } from '@/ui/copy';
import { historyToCsv } from '@/core/export';
import { exportCsv } from '@/platform/export';
import { SHARE_BASE_URL, supabase } from '@/platform/supabase';
import { H2, IconTile, Notice, Row, Screen, Section, Title, ToggleRow } from '@/ui/kit';
import { Icon } from '@/ui/Icon';
import { space, type, useColors } from '@/ui/theme';
import { APPEARANCES, LABEL_SCRIPTS, type LabelScript, REMINDER_DAYS, REMINDER_TIMES, type ReminderPref, reminderLabel } from '@/core/store';
import { disableReminder, enableReminder, remindersAvailable } from '@/platform/reminders';
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
  const [reminder, setReminderState] = useState<ReminderPref>(() => app.store.getReminder());

  async function changeReminder(next: ReminderPref) {
    app.store.setReminder(next);
    setReminderState(next);
    if (!next.enabled) return void (await disableReminder());
    if ((await enableReminder(next)) === 'denied') {
      const off = { ...next, enabled: false };
      app.store.setReminder(off);
      setReminderState(off);
      setMsg('Notifications are off for Mindset Approved. Turn them on in your phone’s Settings, then try again.');
    }
  }
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

      <Section
        header="Shop-day reminder"
        footer={remindersAvailable ? 'One notification a week, on the day you choose. It comes from your phone, not a server, and you can turn it off any time.' : 'Reminders are notifications on your phone, so they’re in the iPhone and Android app.'}
      >
        <ToggleRow
          label="Remind me on shop day"
          hint={reminder.enabled ? reminderLabel(reminder) : 'Off'}
          tile={{ symbol: 'bell.fill', color: '#ff9f0a' }}
          value={reminder.enabled && remindersAvailable}
          disabled={!remindersAvailable}
          onChange={(on) => void changeReminder({ ...reminder, enabled: on })}
        />
        {reminder.enabled && remindersAvailable ? (
          <View style={{ padding: space.lg, gap: space.md }}>
            <Choices
              label="Day"
              options={REMINDER_DAYS.map((d) => ({ id: d.id, text: d.short }))}
              value={reminder.weekday}
              onChange={(weekday) => void changeReminder({ ...reminder, weekday })}
            />
            <Choices
              label="Time"
              options={REMINDER_TIMES.map((t) => ({ id: t.hour, text: t.label }))}
              value={reminder.hour}
              onChange={(hour) => void changeReminder({ ...reminder, hour })}
            />
          </View>
        ) : null}
      </Section>

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

/** A row of pill choices (day of week, time of day). */
function Choices({ label, options, value, onChange }: { label: string; options: { id: number; text: string }[]; value: number; onChange: (id: number) => void }) {
  const c = useColors();
  return (
    <View style={{ gap: space.sm }}>
      <Text style={[type.footnote, { color: c.muted, fontWeight: '600', textTransform: 'uppercase' }]}>{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
        {options.map((o) => {
          const on = o.id === value;
          return (
            <Pressable
              key={o.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${label}: ${o.text}`}
              onPress={() => onChange(o.id)}
              hitSlop={{ top: 4, bottom: 4 }}
              style={{ paddingHorizontal: 14, minHeight: 36, justifyContent: 'center', borderRadius: 999, backgroundColor: on ? c.accent : c.fill }}
            >
              <Text style={[type.subhead, { fontWeight: '600', color: on ? c.onAccent : c.text }]}>{o.text}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
