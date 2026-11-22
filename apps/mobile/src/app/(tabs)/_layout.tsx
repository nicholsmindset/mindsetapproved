import { BlurView } from 'expo-blur';
import { Tabs } from 'expo-router';
import { type ColorValue, StyleSheet, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon, type IconName } from '@/ui/Icon';
import { useColors } from '@/ui/theme';

/**
 * Android and the web: an iOS-style translucent tab bar (iPhone uses the system tab bar, see _layout.ios.tsx).
 */
export default function TabsLayout() {
  const c = useColors();
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const icon = (name: IconName, active: IconName) => {
    function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
      return <Icon name={focused ? active : name} size={24} color={color as string} />;
    }
    return TabIcon;
  };
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.accent,
        tabBarInactiveTintColor: c.muted,
        tabBarStyle: { position: 'absolute', height: 64 + insets.bottom, paddingTop: 4, paddingBottom: insets.bottom + 4, borderTopColor: c.border, borderTopWidth: StyleSheet.hairlineWidth, backgroundColor: 'transparent', elevation: 0 },
        tabBarBackground: () => <BlurView intensity={80} tint={scheme === 'dark' ? 'systemChromeMaterialDark' : 'systemChromeMaterialLight'} style={StyleSheet.absoluteFill} />,
        tabBarLabelStyle: { fontSize: 10, lineHeight: 13, fontWeight: '500', letterSpacing: 0.1 },
        sceneStyle: { backgroundColor: c.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Scan', tabBarIcon: icon('barcode.viewfinder', 'barcode.viewfinder') }} />
      <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: icon('clock', 'clock.fill') }} />
      <Tabs.Screen name="rules" options={{ title: 'Rules', tabBarIcon: icon('slider.horizontal.3', 'slider.horizontal.3') }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings', tabBarIcon: icon('gearshape', 'gearshape.fill') }} />
    </Tabs>
  );
}
