import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Button, Footnote, Section, Row } from '@/ui/kit';
import { radius, space, type, useColors } from '@/ui/theme';
import type { ScannerProps } from './types';

/** Real labels in the shapes people meet on the shelf, so the web build shows what it does in one tap. */
const SAMPLES = [
  { name: 'Corn chips', color: '#ff9500', text: 'Ingredients: Corn, canola oil, salt, natural flavour, colour (paprika extract).' },
  { name: 'Oat crackers', color: '#34c759', text: 'Ingredients: Wholegrain oats (62%), olive oil, sea salt, raising agent (sodium bicarbonate).' },
  { name: 'Chinese biscuits · 饼干', color: '#ff3b30', text: '配料：小麦粉，白砂糖，棕榈油，食用盐，着色料（黄色4号），食用香精。' },
  { name: 'Malay biscuits · Biskut', color: '#5856d6', text: 'Bahan-bahan: Tepung gandum, gula, minyak sawit, garam, perisa tiruan.' },
];

/** The web build has no camera or on-device text reading: type a barcode or paste the label text instead. */
export function Scanner({ mode, active, onBarcode, onLabelText }: ScannerProps) {
  const c = useColors();
  const [code, setCode] = useState('');
  const [text, setText] = useState('');
  const input = { borderRadius: radius.lg, borderCurve: 'continuous' as const, padding: space.lg, color: c.text, backgroundColor: c.surface, fontSize: 17, boxShadow: c.shadow };

  if (mode === 'barcode') {
    return (
      <View style={{ gap: space.md }}>
        <Footnote>On the web, type the number under the barcode. The iPhone and Android app reads it with the camera.</Footnote>
        <TextInput
          accessibilityLabel="Barcode number"
          placeholder="9556001234567"
          placeholderTextColor={c.muted}
          inputMode="numeric"
          value={code}
          onChangeText={setCode}
          onSubmitEditing={() => code && onBarcode(code)}
          style={[input, { fontSize: 22, letterSpacing: 2, fontVariant: ['tabular-nums'] }]}
        />
        <Button kind="primary" label="Look up" symbol="magnifyingglass" disabled={!active || !code} onPress={() => onBarcode(code)} />
      </View>
    );
  }

  return (
    <View style={{ gap: space.md }}>
      <TextInput
        accessibilityLabel="Label text"
        placeholder="Paste the ingredient list, exactly as printed"
        placeholderTextColor={c.muted}
        multiline
        value={text}
        onChangeText={setText}
        style={[input, { minHeight: 150, lineHeight: 24, textAlignVertical: 'top' }]}
      />
      <Button kind="primary" label="Check ingredients" disabled={!active || !text.trim()} onPress={() => onLabelText(text)} />
      <Footnote>Works in English, Malay, Chinese, Japanese and Korean.</Footnote>
      <Section header="Try a sample label">
        {SAMPLES.map((s) => (
          <Row
            key={s.name}
            title={s.name}
            subtitle={<Text numberOfLines={1} style={[type.footnote, { color: c.muted }]}>{s.text.replace(/^[^:：]*[:：]\s*/, '')}</Text>}
            tile={{ symbol: 'list.bullet.rectangle.fill', color: s.color }}
            chevron
            accessibilityLabel={`Check the ${s.name} sample`}
            onPress={() => {
              if (!active) return;
              setText(s.text);
              onLabelText(s.text);
            }}
          />
        ))}
      </Section>
    </View>
  );
}
