import Ionicons from '@expo/vector-icons/Ionicons';
import { analyze } from '@mindset/rules-engine';
import { Stack, useLocalSearchParams } from 'expo-router';
import { type ComponentRef, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { consume, FREE_LIMITS, remaining } from '@/core/limits';
import { aiToText } from '@/core/ocr-text';
import { aiAvailable, aiRecheck } from '@/platform/ai';
import { prepareForAi } from '@/platform/image';
import { canShareImage, copyLink, shareCardImage, shareLink } from '@/platform/share';
import { SHARE_BASE_URL, supabase } from '@/platform/supabase';
import { photoByEntry, useApp } from '@/state/app';
import { IngredientChip } from '@/ui/chips';
import { REPORT_REASONS } from '@/ui/copy';
import { Button, Card, H2, P, Screen } from '@/ui/kit';
import { ShareCard } from '@/ui/ShareCard';
import { radius, space, tierStyle, useColors, verdictStyle } from '@/ui/theme';

function detail(summary: string): string {
  const rest = summary.split(' — ')[1] ?? summary;
  return rest.charAt(0).toUpperCase() + rest.slice(1);
}

export default function ResultScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const app = useApp();
  const c = useColors();
  // historyVersion makes this re-read after edits, favourites and reports.
  const entry = useMemo(() => app.store.getEntry(id), [app.store, id, app.historyVersion]);
  const result = useMemo(
    () => (entry ? analyze(entry.text, app.rules, app.settings, { ocrConfidence: entry.ocrConfidence }) : null),
    [entry, app.rules, app.settings],
  );
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [showAll, setShowAll] = useState(false);
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
  const input = { borderWidth: 1, borderColor: c.border, borderRadius: radius.sm, padding: space.md, color: c.text, backgroundColor: c.surface, fontSize: 15 };

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
    setStatus(r.ok ? { text: 'Thanks. We review every report.', tone: 'ok' } : { text: r.error ?? 'Could not send the report.', tone: 'error' });
  }

  return (
    <Screen edges={[]}>
      <Stack.Screen options={{ title: entry.productName ?? (entry.source === 'label' || entry.source === 'ai' ? 'Label scan' : 'Result') }} />

      <View
        testID="verdict"
        accessibilityLabel={`${v.label}. ${result.summary}`}
        style={{ backgroundColor: v.bg, borderRadius: radius.lg, padding: space.lg, gap: space.sm }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
          <Ionicons name={v.icon} size={30} color={v.fg} />
          <Text style={{ color: v.fg, fontSize: 22, fontWeight: '700', flex: 1 }}>{v.label}</Text>
        </View>
        {/* The PRD sentence is "Not Approved — contains …"; the heading already says the verdict, so show the rest. */}
        <Text testID="summary" accessibilityLabel={result.summary} style={{ color: c.text, fontSize: 17, lineHeight: 23 }}>
          {detail(result.summary)}
        </Text>
        {entry.brand || entry.barcode ? (
          <Text style={{ color: c.muted, fontSize: 13 }}>{[entry.brand, entry.barcode].filter(Boolean).join(' · ')}</Text>
        ) : null}
      </View>

      {status ? (
        <View accessibilityRole="alert" style={{ marginTop: space.md, padding: space.md, borderRadius: radius.md, backgroundColor: status.tone === 'ok' ? c.goodBg : c.badBg }}>
          <Text style={{ color: status.tone === 'ok' ? c.good : c.bad, fontWeight: '600' }}>{status.text}</Text>
        </View>
      ) : null}

      {result.verdict === 'cant_verify' ? (
        <Card style={{ marginTop: space.md, gap: space.sm }}>
          <P>The photo wasn’t clear enough to be sure, so this isn’t marked Approved. Retake it closer, fix the text below, or re-check with AI.</P>
        </Card>
      ) : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md }}>
        <Button
          icon={entry.favourite ? 'heart' : 'heart-outline'}
          label={entry.favourite ? 'Favourite' : 'Add to favourites'}
          onPress={() => {
            app.store.updateEntry(entry.id, { favourite: !entry.favourite });
            app.touchHistory();
          }}
        />
        <Button
          icon="create-outline"
          label="Edit text"
          onPress={() => {
            setDraft(entry.text);
            setEditing(true);
          }}
        />
        {canAi ? (
          <Button
            icon="sparkles-outline"
            label={aiBusy ? 'Re-checking…' : `Re-check with AI (${remaining(app.store, 'ai')} left)`}
            disabled={aiBusy}
            onPress={() => void runAi()}
          />
        ) : null}
        <Button icon="share-outline" label="Share" onPress={() => setSharing(!sharing)} />
        {aiBusy ? <ActivityIndicator color={c.accent} /> : null}
      </View>

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
          <Text style={{ color: c.text, fontWeight: '600' }}>Fix any misread words, then re-check</Text>
          <TextInput accessibilityLabel="Ingredient text" multiline value={draft} onChangeText={setDraft} style={[input, { minHeight: 140, textAlignVertical: 'top' }]} />
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Button
              kind="primary"
              label="Re-check"
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

      {result.flagged.length ? (
        <>
          <H2>Flagged ({result.flagged.length})</H2>
          <View style={{ gap: space.sm }}>
            {result.flagged.map((chip) => (
              <IngredientChip key={chip.ingredientId} chip={chip} />
            ))}
          </View>
        </>
      ) : null}

      {result.good.length ? (
        <>
          <H2>Good signs</H2>
          <View style={{ gap: space.sm }}>
            {result.good.map((chip) => (
              <IngredientChip key={chip.ingredientId} chip={chip} />
            ))}
          </View>
        </>
      ) : null}

      {result.flagged.some((f) => f.possible) ? <P muted style={{ marginTop: space.sm }}>“Possible match” means the text was hard to read. Check it against the pack.</P> : null}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: showAll }}
        onPress={() => setShowAll(!showAll)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.xl, minHeight: 44 }}
      >
        <Text style={{ color: c.text, fontSize: 17, fontWeight: '600', flex: 1 }}>All ingredients ({result.items.filter((i) => !i.container).length})</Text>
        <Ionicons name={showAll ? 'chevron-up' : 'chevron-down'} size={20} color={c.muted} />
      </Pressable>
      {showAll ? (
        <Card style={{ gap: 6 }}>
          {result.items.map((it) => {
            const m = it.matches[0];
            const chip = m ? [...result.flagged, ...result.good, ...result.neutral].find((x) => x.ingredientId === m.ingredientId) : undefined;
            const ts = chip ? tierStyle(c, chip.tier) : null;
            return (
              <View key={it.position} style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingLeft: it.depth * 16 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: ts ? ts.fg : it.container ? 'transparent' : c.border }} />
                <Text style={{ color: it.unmatched ? c.muted : c.text, flex: 1, fontSize: 15 }}>
                  {it.text || '(group)'}
                  {it.unmatched ? '  · not recognised yet' : ''}
                </Text>
              </View>
            );
          })}
        </Card>
      ) : null}

      {result.notes.length ? (
        <>
          <H2>Also on the label</H2>
          <P muted>{result.notes.join('. ')}. “May contain” statements never change the verdict.</P>
        </>
      ) : null}

      {result.unmatched.length ? (
        <P muted style={{ marginTop: space.lg }}>
          Not recognised yet: {result.unmatched.join(', ')}. We review new words every week.
        </P>
      ) : null}

      <View style={{ marginTop: space.xl, gap: space.sm }}>
        {entry.reported ? (
          <P muted>You reported this verdict. Thank you.</P>
        ) : reporting ? (
          <Card style={{ gap: space.sm }}>
            <Text style={{ color: c.text, fontWeight: '600' }}>What’s wrong?</Text>
            {REPORT_REASONS.map((r) => (
              <Pressable
                key={r}
                accessibilityRole="radio"
                accessibilityState={{ checked: reason === r }}
                onPress={() => setReason(r)}
                style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 40 }}
              >
                <Ionicons name={reason === r ? 'radio-button-on' : 'radio-button-off'} size={20} color={reason === r ? c.accent : c.muted} />
                <Text style={{ color: c.text, fontSize: 15 }}>{r}</Text>
              </Pressable>
            ))}
            <TextInput accessibilityLabel="Comment (optional)" placeholder="Comment (optional)" placeholderTextColor={c.muted} value={comment} onChangeText={setComment} style={input} />
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <Button kind="primary" label="Send report" onPress={() => void sendReport()} />
              <Button kind="ghost" label="Cancel" onPress={() => setReporting(false)} />
            </View>
          </Card>
        ) : (
          <Button kind="ghost" icon="flag-outline" label="Report a wrong verdict" onPress={() => setReporting(true)} />
        )}
        <P muted style={{ fontSize: 13 }}>
          Checked with rules v{result.rulesVersion} · {new Date(entry.createdAt).toLocaleString()}. Verdicts reflect Mindset’s ingredient preferences, not medical advice.
        </P>
      </View>
    </Screen>
  );
}
