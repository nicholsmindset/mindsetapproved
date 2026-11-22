import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Button, Mono, P } from '@/ui/kit';
import { font, radius, space, useColors } from '@/ui/theme';
import type { ScannerProps } from './types';

/** Real labels in the shapes people meet on the shelf, so the web build shows what it does in one tap. */
const SAMPLES = [
  { name: 'Corn chips', text: 'Ingredients: Corn, canola oil, salt, natural flavour, colour (paprika extract).' },
  { name: 'Oat crackers', text: 'Ingredients: Wholegrain oats (62%), olive oil, sea salt, raising agent (sodium bicarbonate).' },
  { name: '饼干 (Chinese)', text: '配料：小麦粉，白砂糖，棕榈油，食用盐，着色料（黄色4号），食用香精。' },
  { name: 'Biskut (Malay)', text: 'Bahan-bahan: Tepung gandum, gula, minyak sawit, garam, perisa tiruan.' },
];

/** The web build has no camera or on-device text reading: type a barcode or paste the label text instead. */
export function Scanner({ mode, active, onBarcode, onLabelText }: ScannerProps) {
  const c = useColors();
  const [code, setCode] = useState('');
  const [text, setText] = useState('');
  const input = { borderWidth: 1.5, borderColor: c.text, borderRadius: radius.sm, padding: space.md, color: c.text, backgroundColor: c.surface, fontSize: 16, fontFamily: font.body };

  if (mode === 'barcode') {
    return (
      <View style={{ gap: space.md }}>
        <P muted>On the web, type the number under the barcode. The phone app reads it with the camera.</P>
        <TextInput
          accessibilityLabel="Barcode number"
          placeholder="9556001234567"
          placeholderTextColor={c.muted}
          inputMode="numeric"
          value={code}
          onChangeText={setCode}
          onSubmitEditing={() => code && onBarcode(code)}
          style={[input, { fontFamily: font.mono, fontSize: 20, letterSpacing: 2 }]}
        />
        <Button kind="primary" label="Look up" icon="search" disabled={!active || !code} onPress={() => onBarcode(code)} />
      </View>
    );
  }

  return (
    <View style={{ gap: space.md }}>
      <P muted>Paste or type the ingredient list exactly as printed, in English, Malay, Chinese, Japanese or Korean.</P>
      <View style={{ borderWidth: 1.5, borderColor: c.text, borderTopWidth: 6, borderRadius: radius.sm, backgroundColor: c.surface }}>
        <TextInput
          accessibilityLabel="Label text"
          placeholder="Ingredients: …"
          placeholderTextColor={c.muted}
          multiline
          value={text}
          onChangeText={setText}
          style={{ minHeight: 150, padding: space.md, color: c.text, fontSize: 16, lineHeight: 24, fontFamily: font.body, textAlignVertical: 'top' }}
        />
      </View>
      <Button kind="primary" label="Check ingredients" icon="checkmark-done" disabled={!active || !text.trim()} onPress={() => onLabelText(text)} />
      <View style={{ gap: space.sm, marginTop: space.sm }}>
        <Mono>OR TRY A SAMPLE LABEL</Mono>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {SAMPLES.map((s) => (
            <Pressable
              key={s.name}
              accessibilityRole="button"
              accessibilityLabel={`Check the ${s.name} sample`}
              disabled={!active}
              onPress={() => {
                setText(s.text);
                onLabelText(s.text);
              }}
              style={({ pressed }) => ({ borderWidth: 1, borderColor: c.border, borderRadius: radius.sm, paddingHorizontal: space.md, minHeight: 38, justifyContent: 'center', backgroundColor: pressed ? c.surface2 : c.surface })}
            >
              <Text style={{ fontFamily: font.medium, fontSize: 15, color: c.text }}>{s.name}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}
