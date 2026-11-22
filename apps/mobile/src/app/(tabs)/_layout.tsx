import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { font, useColors } from '@/ui/theme';

export default function TabsLayout() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const icon = (name: keyof typeof Ionicons.glyphMap, active: keyof typeof Ionicons.glyphMap) => {
    function TabIcon({ color, size, focused }: { color: ColorValue; size: number; focused: boolean }) {
      return <Ionicons name={focused ? active : name} color={color as string} size={size} />;
    }
    return TabIcon;
  };
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.text,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { backgroundColor: c.bg, borderTopColor: c.rule, borderTopWidth: 1.5, height: 64 + insets.bottom, paddingBottom: insets.bottom + 4, paddingTop: 4 },
        tabBarLabelStyle: { fontFamily: font.display, fontSize: 12, lineHeight: 15, letterSpacing: 0.6, textTransform: 'uppercase' },
        sceneStyle: { backgroundColor: c.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Scan', tabBarIcon: icon('scan-outline', 'scan') }} />
      <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: icon('time-outline', 'time') }} />
      <Tabs.Screen name="rules" options={{ title: 'Rules', tabBarIcon: icon('options-outline', 'options') }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: icon('settings-outline', 'settings') }} />
    </Tabs>
  );
}
