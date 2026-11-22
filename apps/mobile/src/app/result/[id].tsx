import Ionicons from '@expo/vector-icons/Ionicons';
import { analyze } from '@mindset/rules-engine';
import { Stack, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { type ComponentRef, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Text, TextInput, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { consume, FREE_LIMITS, refund, remaining } from '@/core/limits';
import { aiToText } from '@/core/ocr-text';
import { aiAvailable, aiRecheck } from '@/platform/ai';
import { prepareForAi } from '@/platform/image';
import { canShareImage, copyLink, shareCardImage, shareLink } from '@/platform/share';
import { SHARE_BASE_URL, supabase } from '@/platform/supabase';
import { photoByEntry, useApp } from '@/state/app';
import { AnnotatedLabel, IngredientChip } from '@/ui/chips';
import { REPORT_REASONS } from '@/ui/copy';
import { Button, Card, enter, Footnote, H2, Notice, P, Row, Screen, Section, VerdictHero } from '@/ui/kit';
import { Icon, type IconName } from '@/ui/Icon';
import { ShareCard } from '@/ui/ShareCard';
import { radius, space, type, useColors, verdictStyle } from '@/ui/theme';

function detail(summary: string): string {
  const rest = summary.split(' — ')[1] ?? summary;
  return rest.charAt(0).toUpperCase() + rest.slice(1);
}

export default function ResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const app = useApp();
  const c = useColors();
  const entry = useMemo(() => app.history.find((e) => e.id === id), [app.history, id]);
  const result = useMemo(
    () => (entry ? analyze(entry.text, app.rules, app.settings, { ocrConfidence: entry.ocrConfidence }) : null),
    [entry, app.rules, app.settings],
  );
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState<string>(REPORT_REASONS[0]);
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState<{ text: string; tone: 'ok' | 'error' } | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const cardRef = useRef<ComponentRef<typeof View>>(null);

  // A tap of feedback matched to the verdict, as the result appears (and again if a re-check changes it).
  const verdict = result?.verdict;
  useEffect(() => {
    if (!verdict || Platform.OS === 'web') return;
    const kind = verdict === 'approved' ? Haptics.NotificationFeedbackType.Success : verdict === 'not_approved' ? Haptics.NotificationFeedbackType.Error : Haptics.NotificationFeedbackType.Warning;
    void Haptics.notificationAsync(kind).catch(() => {});
  }, [verdict]);

  if (!entry || !result) {
    return (
      <Screen edges={[]}>
        <P muted>This scan is no longer in your history.</P>
      </Screen>
    );
  }

  const v = verdictStyle(c, result.verdict);
  const photo = photoByEntry.get(entry.id);
  const canAi = aiAvailable && Boolean(photo) && entry.source !== 'ai';
  const input = { borderRadius: radius.md, borderCurve: 'continuous' as const, padding: space.md, color: c.text, backgroundColor: c.fill, fontSize: 17 };

  async function runAi() {
    if (!photo) return;
    if (!consume(app.store, 'ai')) {
      setStatus({ text: `You've used today's ${FREE_LIMITS.ai} free AI re-checks.`, tone: 'error' });
      return;
    }
    setAiBusy(true);
    setStatus(null);
    try {
      const ai = await aiRecheck(await prepareForAi(photo), app.store.installId());
      if (!ai.ingredients.length) throw new Error('No ingredient list found in the photo.');
      app.recheck(entry!.id, aiToText(ai));
      app.store.updateEntry(entry!.id, { source: 'ai', ocrConfidence: 0.95 });
      app.touchHistory();
      setStatus({ text: 'Re-checked with AI. The rules decided the verdict on your phone.', tone: 'ok' });
    } catch (e) {
      refund(app.store, 'ai'); // a failed re-check doesn't count (the server refunds too)
      setStatus({ text: (e as Error).message, tone: 'error' });
    } finally {
      setAiBusy(false);
    }
  }

  async function linkFor(): Promise<string | null> {
    const r = await app.shareCode(entry!.id);
    if (!r.code) {
      setStatus({ text: r.error ?? 'Could not create a link.', tone: 'error' });
      return null;
    }
    return `${SHARE_BASE_URL}/v/${r.code}`;
  }

  async function onShareLink(copyOnly: boolean) {
    setShareBusy(true);
    try {
      const url = await linkFor();
      if (!url) return;
      if (copyOnly) {
        await copyLink(url);
        setStatus({ text: 'Link copied.', tone: 'ok' });
      } else {
        const how = await shareLink(`${result!.summary} Checked with Mindset Approved:`, url);
        if (how === 'copied') setStatus({ text: 'Link copied.', tone: 'ok' });
      }
    } catch (e) {
      setStatus({ text: (e as Error).message, tone: 'error' });
    } finally {
      setShareBusy(false);
    }
  }

  async function sendReport() {
    const r = await app.report(entry!.id, reason, comment.trim());
    setReporting(false);
    setStatus(
      r.ok
        ? { text: r.queued ? 'Saved. Your report will be sent when you’re back online.' : 'Thanks. We review every report.', tone: 'ok' }
        : { text: r.error ?? 'Could not send the report.', tone: 'error' },
    );
  }

  const sourceLabel = { cache: 'Saved product', off: 'Open Food Facts', label: Platform.OS === 'web' ? 'Label text' : 'Label photo', ai: 'Label photo · read by AI' }[entry.source] ?? '';
  const meta = [entry.brand, entry.barcode, sourceLabel].filter(Boolean).join(' · ');
  const toggle = (id: string) => setOpenId(openId === id ? null : id);

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: '' }} />

      <View testID="verdict" accessibilityLabel={`${v.label}. ${result.summary}`}>
        <VerdictHero verdict={result.verdict} title={entry.productName ?? 'Label scan'} meta={meta} summary={detail(result.summary)} />
      </View>

      <Animated.View entering={enter(80)} style={{ flexDirection: 'row', gap: space.sm, marginTop: space.md }}>
        <Action symbol={entry.favourite ? 'heart.fill' : 'heart'} label={entry.favourite ? 'Saved' : 'Save'} onPress={() => app.setFavourite(entry.id, !entry.favourite)} />
        <Action symbol="square.and.arrow.up" label="Share" onPress={() => setSharing(!sharing)} />
        <Action
          symbol="pencil"
          label="Edit"
          onPress={() => {
            setDraft(entry.text);
            setEditing(true);
          }}
        />
        {canAi ? <Action symbol="sparkles" label={aiBusy ? 'Reading…' : `AI · ${remaining(app.store, 'ai')}`} disabled={aiBusy} onPress={() => void runAi()} /> : null}
      </Animated.View>
      {aiBusy ? <ActivityIndicator style={{ marginTop: space.md }} color={c.accent} /> : null}

      {status ? (
        <View style={{ marginTop: space.md }}>
          <Notice tone={status.tone}>{status.text}</Notice>
        </View>
      ) : null}

      {result.verdict === 'cant_verify' ? (
        <View style={{ marginTop: space.md }}>
          <Notice tone="info">The text wasn’t clear enough to be sure, so this isn’t marked Approved. Retake the photo closer, edit the text, or re-check with AI.</Notice>
        </View>
      ) : null}

      {sharing ? (
        <Card style={{ marginTop: space.md, gap: space.md }}>
          <ShareCard ref={cardRef} result={result} productName={entry.productName} />
          <View style={{ gap: space.sm }}>
            {canShareImage ? (
              <Button
                kind="primary"
                symbol="photo"
                label="Share image"
                onPress={() => void shareCardImage(cardRef).catch((e: Error) => setStatus({ text: e.message, tone: 'error' }))}
              />
            ) : null}
            {SHARE_BASE_URL && supabase && entry.remoteScanId ? (
              <View style={{ flexDirection: 'row', gap: space.sm }}>
                <Button style={{ flex: 1 }} kind={canShareImage ? 'secondary' : 'primary'} symbol="link" label="Share link" disabled={shareBusy} onPress={() => void onShareLink(false)} />
                <Button style={{ flex: 1 }} symbol="doc.on.doc" label="Copy link" disabled={shareBusy} onPress={() => void onShareLink(true)} />
              </View>
            ) : null}
          </View>
          <Footnote>The link shows the verdict and the ingredients behind it, never your history or photos.</Footnote>
        </Card>
      ) : null}

      {editing ? (
        <Card style={{ marginTop: space.md, gap: space.md }}>
          <Text style={[type.headline, { color: c.text }]}>Fix any misread words</Text>
          <TextInput accessibilityLabel="Ingredient text" multiline value={draft} onChangeText={setDraft} style={[input, { minHeight: 140, textAlignVertical: 'top' }]} />
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Button kind="ghost" label="Cancel" onPress={() => setEditing(false)} />
            <Button
              style={{ flex: 1 }}
              kind="primary"
              label="Check again"
              disabled={!draft.trim()}
              onPress={() => {
                app.recheck(entry.id, draft);
                setEditing(false);
                setStatus(null);
              }}
            />
          </View>
        </Card>
      ) : null}

      {result.flagged.length ? (
        <>
          <H2 count={result.flagged.length}>Flagged</H2>
          <Section>
            {result.flagged.map((chip) => (
              <IngredientChip key={chip.ingredientId} chip={chip} open={openId === chip.ingredientId} onToggle={() => toggle(chip.ingredientId)} />
            ))}
          </Section>
          {result.flagged.some((f) => f.possible) ? <Footnote style={{ marginTop: space.sm, paddingHorizontal: space.lg }}>“Possible match” means the text was hard to read. Check it against the pack.</Footnote> : null}
        </>
      ) : null}

      {result.good.length ? (
        <>
          <H2 count={result.good.length}>Good signs</H2>
          <Section>
            {result.good.map((chip) => (
              <IngredientChip key={chip.ingredientId} chip={chip} open={openId === chip.ingredientId} onToggle={() => toggle(chip.ingredientId)} />
            ))}
          </Section>
        </>
      ) : null}

      <H2>On the label</H2>
      <AnnotatedLabel result={result} selected={openId} onSelect={toggle} />
      {result.unmatched.length ? <Footnote style={{ marginTop: space.sm, paddingHorizontal: space.lg }}>Grey words aren’t in the rules yet. We review new words every week.</Footnote> : null}

      <View style={{ marginTop: space.xl, gap: space.md }}>
        {entry.reported ? (
          <Footnote>You reported this verdict. Thank you.</Footnote>
        ) : reporting ? (
          <Card style={{ gap: space.sm }}>
            <Text style={[type.headline, { color: c.text }]}>What’s wrong?</Text>
            {REPORT_REASONS.map((r) => (
              <Pressable
                key={r}
                accessibilityRole="radio"
                accessibilityState={{ checked: reason === r }}
                onPress={() => setReason(r)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 40 }}
              >
                <Ionicons name={reason === r ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={reason === r ? c.accent : c.faint} />
                <Text style={[type.body, { color: c.text }]}>{r}</Text>
              </Pressable>
            ))}
            <TextInput accessibilityLabel="Comment (optional)" placeholder="Comment (optional)" placeholderTextColor={c.muted} value={comment} onChangeText={setComment} style={input} />
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <Button kind="ghost" label="Cancel" onPress={() => setReporting(false)} />
              <Button style={{ flex: 1 }} kind="primary" label="Send report" onPress={() => void sendReport()} />
            </View>
          </Card>
        ) : (
          <Section style={{ marginTop: 0 }}>
            <Row title={<Text style={[type.body, { color: c.bad }]}>Report a wrong verdict</Text>} leading={<Icon name="flag" size={20} color={c.bad} />} chevron onPress={() => setReporting(true)} />
          </Section>
        )}
        <Footnote style={{ textAlign: 'center' }}>
          Checked with rules v{result.rulesVersion} on {new Date(entry.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}.{'\n'}Verdicts reflect Mindset’s ingredient preferences, not medical advice.
        </Footnote>
      </View>
    </Screen>
  );
}

/** A square action under the verdict, like the buttons on a contact card. */
function Action({ symbol, label, onPress, disabled }: { symbol: IconName; label: string; onPress: () => void; disabled?: boolean }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({ flex: 1, alignItems: 'center', gap: 6, paddingVertical: space.md, borderRadius: radius.md, borderCurve: 'continuous', backgroundColor: c.surface, boxShadow: c.shadow, opacity: disabled ? 0.4 : pressed ? 0.6 : 1 })}
    >
      <Icon name={symbol} size={20} color={c.accent} />
      <Text numberOfLines={1} maxFontSizeMultiplier={1.3} style={[type.caption, { color: c.accent, fontWeight: '600' }]}>{label}</Text>
    </Pressable>
  );
}
