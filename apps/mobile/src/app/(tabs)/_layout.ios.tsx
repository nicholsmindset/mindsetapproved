import Ionicons from '@expo/vector-icons/Ionicons';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColors } from '@/ui/theme';

/** The system tab bar: UITabBar on iOS (Liquid Glass on iOS 26), Material on Android. */
export default function TabsLayout() {
  const c = useColors();
  return (
    <NativeTabs tintColor={c.accent} backgroundColor={c.bg}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Scan</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="barcode.viewfinder" src={<NativeTabs.Trigger.VectorIcon family={Ionicons} name="scan" />} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="history">
        <NativeTabs.Trigger.Label>History</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'clock', selected: 'clock.fill' }} src={<NativeTabs.Trigger.VectorIcon family={Ionicons} name="time" />} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="rules">
        <NativeTabs.Trigger.Label>Rules</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="slider.horizontal.3" src={<NativeTabs.Trigger.VectorIcon family={Ionicons} name="options" />} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'gearshape', selected: 'gearshape.fill' }} src={<NativeTabs.Trigger.VectorIcon family={Ionicons} name="settings" />} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
