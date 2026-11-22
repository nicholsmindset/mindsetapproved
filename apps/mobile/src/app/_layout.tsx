import { DarkTheme, DefaultTheme, type ErrorBoundaryProps, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initMonitoring, reportError } from '@/platform/monitoring';
import { AppProvider, useApp } from '@/state/app';
import { useScheme } from '@/state/appearance';
import { Button, IconTile } from '@/ui/kit';
import { type, useColors } from '@/ui/theme';

initMonitoring();

/** Shown instead of a blank screen if a screen crashes. Scans and history are untouched. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const c = useColors();
  useEffect(() => reportError(error), [error]);
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 }}>
      <IconTile symbol="exclamationmark.triangle.fill" color={c.borderline} size={64} />
      <Text accessibilityRole="header" style={[type.title2, { color: c.text, textAlign: 'center' }]}>
        Something went wrong
      </Text>
      <Text style={[type.body, { color: c.muted, textAlign: 'center' }]}>Your history and settings are safe. Try again, and if it keeps happening, restart the app.</Text>
      <Button kind="primary" label="Try again" style={{ alignSelf: 'stretch' }} onPress={() => void retry()} />
    </View>
  );
}

function RootStack() {
  const { onboarded } = useApp();
  const c = useColors();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: c.bg },
        headerShadowVisible: false,
        headerTintColor: c.accent,
        headerTitleStyle: { color: c.text },
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: c.bg },
      }}
    >
      <Stack.Protected guard={!onboarded}>
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
      </Stack.Protected>
      <Stack.Protected guard={onboarded}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="result/[id]" options={{ title: '', headerTransparent: false }} />
        <Stack.Screen name="upgrade" options={{ title: 'Premium', presentation: 'modal' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const scheme = useScheme();
  return (
    <SafeAreaProvider>
      <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AppProvider>
          <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
          <RootStack />
        </AppProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
