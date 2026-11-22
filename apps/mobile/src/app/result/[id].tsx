import Ionicons from '@expo/vector-icons/Ionicons';
import { analyze } from '@mindset/rules-engine';
import { Stack, useLocalSearchParams } from 'expo-router';
import { type ComponentRef, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { consume, FREE_LIMITS, refund, remaining } from '@/core/limits';
import { aiToText } from '@/core/ocr-text';
import { aiAvailable, aiRecheck } from '@/platform/ai';
import { prepareForAi } from '@/platform/image';
import { canShareImage, copyLink, shareCardImage, shareLink } from '@/platform/share';
import { SHARE_BASE_URL, supabase } from '@/platform/supabase';
import { photoByEntry, useApp } from '@/state/app';
import { AnnotatedLabel, IngredientChip } from '@/ui/chips';
import { REPORT_REASONS } from '@/ui/copy';
import { Button, Card, H2, Mono, Notice, P, Screen, Stamp } from '@/ui/kit';
import { ShareCard } from '@/ui/ShareCard';
import { font, radius, space, useColors, verdictStyle } from '@/ui/theme';

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
  const input = { borderWidth: 1.5, borderColor: c.text, borderRadius: radius.sm, padding: space.md, color: c.text, backgroundColor: c.surface, fontSize: 16, fontFamily: font.body };

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

  const sourceLabel = { cache: 'Saved product', off: 'Open Food Facts', label: Platform.OS === 'web' ? 'Label text' : 'Label photo', ai: 'Label photo · AI read' }[entry.source] ?? '';
  const meta = [entry.brand, entry.barcode, sourceLabel].filter(Boolean).join('  ·  ');
  const toggle = (id: string) => setOpenId(openId === id ? null : id);

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: '' }} />

      <View testID="verdict" accessibilityLabel={`${v.label}. ${result.summary}`} style={{ gap: space.md, paddingBottom: space.lg, borderBottomWidth: 6, borderBottomColor: c.rule }}>
        <View style={{ gap: 2 }}>
          <Text accessibilityRole="header" style={{ fontFamily: font.heavy, fontSize: 30, lineHeight: 32, color: c.text, textTransform: 'uppercase' }}>
            {entry.productName ?? 'Label scan'}
          </Text>
          {meta ? <Mono>{meta}</Mono> : null}
        </View>
        <View style={{ paddingVertical: space.sm }}>
          <Stamp verdict={result.verdict} />
        </View>
        {/* The PRD sentence is "Not Approved — contains …"; the stamp already says the verdict, so show the rest. */}
        <Text testID="summary" accessibilityLabel={result.summary} style={{ fontFamily: font.medium, color: c.text, fontSize: 20, lineHeight: 27 }}>
          {detail(result.summary)}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md }}>
        <Button
          icon={entry.favourite ? 'heart' : 'heart-outline'}
          label={entry.favourite ? 'Saved' : 'Save'}
          onPress={() => app.setFavourite(entry.id, !entry.favourite)}
        />
        <Button icon="share-outline" label="Share" onPress={() => setSharing(!sharing)} />
        <Button
          icon="create-outline"
          label="Fix text"
          onPress={() => {
            setDraft(entry.text);
            setEditing(true);
          }}
        />
        {canAi ? (
          <Button
            icon="sparkles-outline"
            label={aiBusy ? 'Re-checking…' : `AI re-check · ${remaining(app.store, 'ai')} left`}
            disabled={aiBusy}
            onPress={() => void runAi()}
          />
        ) : null}
        {aiBusy ? <ActivityIndicator color={c.accent} /> : null}
      </View>

      {status ? (
        <View style={{ marginTop: space.md }}>
          <Notice tone={status.tone}>{status.text}</Notice>
        </View>
      ) : null}

      {result.verdict === 'cant_verify' ? (
        <View style={{ marginTop: space.md }}>
          <Notice tone="info">The text wasn’t clear enough to be sure, so this isn’t marked Approved. Retake the photo closer, fix the text, or re-check with AI.</Notice>
        </View>
      ) : null}

      {sharing ? (
        <Card style={{ marginTop: space.md, gap: space.md }}>
          <ShareCard ref={cardRef} result={result} productName={entry.productName} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {canShareImage ? (
              <Button
                kind="primary"
                icon="image-outline"
                label="Share image"
                onPress={() => void shareCardImage(cardRef).catch((e: Error) => setStatus({ text: e.message, tone: 'error' }))}
              />
            ) : null}
            {SHARE_BASE_URL && supabase && entry.remoteScanId ? (
              <>
                <Button kind={canShareImage ? 'secondary' : 'primary'} icon="link-outline" label="Share link" disabled={shareBusy} onPress={() => void onShareLink(false)} />
                <Button icon="copy-outline" label="Copy link" disabled={shareBusy} onPress={() => void onShareLink(true)} />
              </>
            ) : null}
          </View>
          <P muted style={{ fontSize: 13 }}>The link shows the verdict and the ingredients behind it, never your history or photos.</P>
        </Card>
      ) : null}

      {editing ? (
        <Card style={{ marginTop: space.md, gap: space.sm }}>
          <Text style={{ fontFamily: font.semi, color: c.text, fontSize: 16 }}>Fix any misread words, then check again</Text>
          <TextInput accessibilityLabel="Ingredient text" multiline value={draft} onChangeText={setDraft} style={[input, { minHeight: 140, textAlignVertical: 'top' }]} />
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Button
              kind="primary"
              label="Check again"
              disabled={!draft.trim()}
              onPress={() => {
                app.recheck(entry.id, draft);
                setEditing(false);
                setStatus(null);
              }}
            />
            <Button kind="ghost" label="Cancel" onPress={() => setEditing(false)} />
          </View>
        </Card>
      ) : null}

      <H2>On the label</H2>
      <AnnotatedLabel result={result} selected={openId} onSelect={toggle} />
      {result.unmatched.length ? (
        <P muted style={{ marginTop: space.sm, fontSize: 14 }}>
          Dotted words aren’t in the rules yet. We review new words every week.
        </P>
      ) : null}

      {result.flagged.length ? (
        <>
          <H2 count={result.flagged.length}>Flagged</H2>
          <View style={{ borderTopWidth: 1, borderTopColor: c.border }}>
            {result.flagged.map((chip) => (
              <IngredientChip key={chip.ingredientId} chip={chip} open={openId === chip.ingredientId} onToggle={() => toggle(chip.ingredientId)} />
            ))}
          </View>
          {result.flagged.some((f) => f.possible) ? <P muted style={{ marginTop: space.sm, fontSize: 14 }}>“Possible match” means the text was hard to read. Check it against the pack.</P> : null}
        </>
      ) : null}

      {result.good.length ? (
        <>
          <H2 count={result.good.length}>Good signs</H2>
          <View style={{ borderTopWidth: 1, borderTopColor: c.border }}>
            {result.good.map((chip) => (
              <IngredientChip key={chip.ingredientId} chip={chip} open={openId === chip.ingredientId} onToggle={() => toggle(chip.ingredientId)} />
            ))}
          </View>
        </>
      ) : null}

      <View style={{ marginTop: space.xl, gap: space.md }}>
        {entry.reported ? (
          <P muted>You reported this verdict. Thank you.</P>
        ) : reporting ? (
          <Card style={{ gap: space.sm }}>
            <Text style={{ fontFamily: font.semi, color: c.text, fontSize: 16 }}>What’s wrong?</Text>
            {REPORT_REASONS.map((r) => (
              <Pressable
                key={r}
                accessibilityRole="radio"
                accessibilityState={{ checked: reason === r }}
                onPress={() => setReason(r)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 40 }}
              >
                <Ionicons name={reason === r ? 'radio-button-on' : 'radio-button-off'} size={20} color={reason === r ? c.accent : c.muted} />
                <Text style={{ fontFamily: font.body, color: c.text, fontSize: 15 }}>{r}</Text>
              </Pressable>
            ))}
            <TextInput accessibilityLabel="Comment (optional)" placeholder="Comment (optional)" placeholderTextColor={c.muted} value={comment} onChangeText={setComment} style={input} />
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <Button kind="primary" label="Send report" onPress={() => void sendReport()} />
              <Button kind="ghost" label="Cancel" onPress={() => setReporting(false)} />
            </View>
          </Card>
        ) : (
          <Button kind="ghost" icon="flag-outline" label="Report a wrong verdict" style={{ alignSelf: 'flex-start' }} onPress={() => setReporting(true)} />
        )}
        <View style={{ borderTopWidth: 1, borderTopColor: c.border, paddingTop: space.sm, gap: 4 }}>
          <Mono>RULES V{result.rulesVersion}  ·  {new Date(entry.createdAt).toLocaleString()}</Mono>
          <P muted style={{ fontSize: 13, lineHeight: 18 }}>Verdicts reflect Mindset’s ingredient preferences, not medical advice.</P>
        </View>
      </View>
    </Screen>
  );
}
