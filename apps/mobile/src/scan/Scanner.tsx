import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { useCallback, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission, usePhotoOutput } from 'react-native-vision-camera';
import { useBarcodeScannerOutput, type Barcode } from 'react-native-vision-camera-barcode-scanner';
import { Button, P } from '@/ui/kit';
import { font, radius, space, useColors } from '@/ui/theme';
import type { ScannerProps } from './types';

const FORMATS = ['ean-13', 'ean-8', 'upc-a', 'upc-e'] as const;

/** Live camera: auto-detects grocery barcodes, or captures a label photo inside the guide box. */
export function Scanner({ mode, active, onBarcode, onPhoto }: ScannerProps) {
  const c = useColors();
  const { hasPermission, canRequestPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const [torch, setTorch] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const last = useRef({ code: '', at: 0 });

  const onBarcodeScanned = useCallback(
    (codes: Barcode[]) => {
      if (mode !== 'barcode' || !active) return;
      const code = codes.find((b) => b.rawValue)?.rawValue;
      if (!code) return;
      const now = Date.now();
      if (code === last.current.code && now - last.current.at < 3000) return;
      last.current = { code, at: now };
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onBarcode(code);
    },
    [mode, active, onBarcode],
  );

  const barcodeOutput = useBarcodeScannerOutput({
    barcodeFormats: [...FORMATS],
    onBarcodeScanned,
    onError: () => undefined,
  });
  const photoOutput = usePhotoOutput({ qualityPrioritization: 'balanced' });

  async function capture() {
    setCapturing(true);
    try {
      const file = await photoOutput.capturePhotoToFile({ flashMode: 'off' }, {});
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onPhoto(`file://${file.filePath}`);
    } finally {
      setCapturing(false);
    }
  }

  if (!hasPermission) {
    return (
      <View style={[styles.fill, styles.center, { backgroundColor: c.surface2, padding: space.xl, gap: space.lg }]}>
        <Ionicons name="camera-outline" size={40} color={c.muted} />
        <P style={{ textAlign: 'center' }}>Mindset Approved needs the camera to read barcodes and ingredient labels. Photos stay on your phone.</P>
        {canRequestPermission ? (
          <Button kind="primary" label="Allow camera" onPress={() => void requestPermission()} />
        ) : (
          <Button label="Open Settings" onPress={() => void Linking.openSettings()} />
        )}
      </View>
    );
  }
  if (!device) {
    return (
      <View style={[styles.fill, styles.center, { backgroundColor: c.surface2 }]}>
        <P muted>No camera found on this device.</P>
      </View>
    );
  }

  return (
    <View style={styles.fill}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={active}
        outputs={[barcodeOutput, photoOutput]}
        torchMode={torch ? 'on' : 'off'}
        enableNativeTapToFocusGesture
        enableNativeZoomGesture
      />
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center]}>
        <View style={mode === 'barcode' ? { width: '78%', aspectRatio: 2.2 } : { width: '86%', aspectRatio: 0.9 }}>
          {(['tl', 'tr', 'bl', 'br'] as const).map((k) => (
            <View
              key={k}
              style={[
                styles.corner,
                k[0] === 't' ? { top: 0, borderTopWidth: 4 } : { bottom: 0, borderBottomWidth: 4 },
                k[1] === 'l' ? { left: 0, borderLeftWidth: 4 } : { right: 0, borderRightWidth: 4 },
              ]}
            />
          ))}
          {mode === 'barcode' ? <View style={styles.scanLine} /> : null}
        </View>
        <Text style={styles.hint}>
          {mode === 'barcode' ? 'Point at the barcode' : 'Fit the whole ingredient list in the box'}
        </Text>
      </View>
      <View style={styles.controls}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={torch ? 'Turn torch off' : 'Turn torch on'}
          onPress={() => setTorch(!torch)}
          style={styles.round}
        >
          <Ionicons name={torch ? 'flashlight' : 'flashlight-outline'} size={22} color="#fff" />
        </Pressable>
        {mode === 'label' ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Take label photo"
            disabled={capturing || !active}
            onPress={() => void capture()}
            style={[styles.shutter, { opacity: capturing ? 0.5 : 1 }]}
          />
        ) : (
          <View style={{ width: 72 }} />
        )}
        <View style={{ width: 48 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: '#000', borderRadius: radius.md, overflow: 'hidden' },
  center: { alignItems: 'center', justifyContent: 'center' },
  corner: { position: 'absolute', width: 28, height: 28, borderColor: '#fff' },
  scanLine: { position: 'absolute', left: '8%', right: '8%', top: '50%', height: 2, backgroundColor: 'rgba(255,90,70,0.9)' },
  hint: { color: '#fff', marginTop: space.lg, fontSize: 17, fontFamily: font.display, letterSpacing: 0.8, textTransform: 'uppercase', textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 6 },
  controls: { position: 'absolute', bottom: space.lg, left: space.lg, right: space.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  round: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' },
  shutter: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff', borderWidth: 5, borderColor: 'rgba(255,255,255,0.45)' },
});
