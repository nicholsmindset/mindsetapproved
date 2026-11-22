import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { useApp } from '@/state/app';
import { Button, Card, P } from './kit';
import { font, radius, space, useColors } from './theme';

/** Optional sign-in with an emailed 6-digit code: syncs rules and links scans across devices. */
export function AccountCard() {
  const app = useApp();
  const c = useColors();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = { borderWidth: 1.5, borderColor: c.text, borderRadius: radius.sm, padding: space.md, color: c.text, backgroundColor: c.surface, fontSize: 16, fontFamily: font.body };

  if (app.account) {
    return (
      <Card style={{ gap: space.sm }}>
        <P>
          Signed in as <Text style={{ fontFamily: font.semi }}>{app.account}</Text>. Your rules sync across your devices.
        </P>
        <View style={{ flexDirection: 'row' }}>
          <Button label="Sign out" onPress={() => void app.signOut()} />
        </View>
      </Card>
    );
  }

  async function run(fn: () => Promise<{ ok: boolean; error?: string }>, next?: () => void) {
    setBusy(true);
    setError(null);
    const r = await fn();
    setBusy(false);
    if (r.ok) next?.();
    else setError(r.error ?? 'Something went wrong.');
  }

  return (
    <Card style={{ gap: space.sm }}>
      <P muted>Optional. Sign in to keep your rules on every device. Scanning never needs an account.</P>
      {step === 'email' ? (
        <>
          <TextInput
            accessibilityLabel="Email"
            placeholder="you@example.com"
            placeholderTextColor={c.muted}
            autoCapitalize="none"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChangeText={setEmail}
            style={input}
          />
          <View style={{ flexDirection: 'row' }}>
            <Button kind="primary" label={busy ? 'Sending…' : 'Email me a code'} disabled={busy || !/.+@.+\..+/.test(email)} onPress={() => void run(() => app.sendCode(email.trim()), () => setStep('code'))} />
          </View>
        </>
      ) : (
        <>
          <P>We sent a 6-digit code to {email}.</P>
          <TextInput
            accessibilityLabel="Sign-in code"
            placeholder="123456"
            placeholderTextColor={c.muted}
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChangeText={setCode}
            style={input}
          />
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Button kind="primary" label={busy ? 'Checking…' : 'Sign in'} disabled={busy || code.trim().length < 6} onPress={() => void run(() => app.verifyCode(email.trim(), code))} />
            <Button kind="ghost" label="Use another email" onPress={() => setStep('email')} />
          </View>
        </>
      )}
      {error ? <Text style={{ color: c.bad, fontFamily: font.medium }}>{error}</Text> : null}
    </Card>
  );
}
