import { useState } from 'react';
import { TextInput, View } from 'react-native';
import { Button, Card, P } from '@/ui/kit';
import { radius, space, useColors } from '@/ui/theme';
import type { ScannerProps } from './types';

/** The web build has no camera or ML Kit: type a barcode or paste the label text instead. */
export function Scanner({ mode, active, onBarcode, onLabelText }: ScannerProps) {
  const c = useColors();
  const [code, setCode] = useState('');
  const [text, setText] = useState('');
  const input = { borderWidth: 1, borderColor: c.border, borderRadius: radius.sm, padding: space.md, color: c.text, backgroundColor: c.surface, fontSize: 16 };
  return (
    <Card style={{ gap: space.md }}>
      <P muted>The camera works in the iOS and Android app. On the web, enter the details by hand.</P>
      {mode === 'barcode' ? (
        <View style={{ gap: space.sm }}>
          <TextInput
            accessibilityLabel="Barcode number"
            placeholder="e.g. 9556001234567"
            placeholderTextColor={c.muted}
            inputMode="numeric"
            value={code}
            onChangeText={setCode}
            onSubmitEditing={() => code && onBarcode(code)}
            style={input}
          />
          <Button kind="primary" label="Look up barcode" disabled={!active || !code} onPress={() => onBarcode(code)} />
        </View>
      ) : (
        <View style={{ gap: space.sm }}>
          <TextInput
            accessibilityLabel="Label text"
            placeholder="Ingredients: …"
            placeholderTextColor={c.muted}
            multiline
            value={text}
            onChangeText={setText}
            style={[input, { minHeight: 140, textAlignVertical: 'top' }]}
          />
          <Button kind="primary" label="Check ingredients" disabled={!active || !text.trim()} onPress={() => onLabelText(text)} />
        </View>
      )}
    </Card>
  );
}
