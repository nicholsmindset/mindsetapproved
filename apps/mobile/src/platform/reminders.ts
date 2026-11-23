import * as Notifications from 'expo-notifications';
import { AndroidImportance, SchedulableTriggerInputTypes } from 'expo-notifications';
import { Platform } from 'react-native';
import type { ReminderPref } from '@/core/store';

export const remindersAvailable = true;

const ID = 'shop-day';
const CHANNEL = 'shop-day';

/** What the notification says: the feeling it answers (standing in the aisle), not "we miss you". */
const CONTENT = { title: 'Mindset Approved', body: 'Heading to the shop? Check labels before they hit the basket.' };

async function schedule(p: ReminderPref) {
  await Notifications.cancelScheduledNotificationAsync(ID).catch(() => {});
  if (!p.enabled) return;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, { name: 'Shop-day reminder', importance: AndroidImportance.DEFAULT });
  }
  await Notifications.scheduleNotificationAsync({
    identifier: ID,
    content: CONTENT,
    trigger: { type: SchedulableTriggerInputTypes.WEEKLY, weekday: p.weekday, hour: p.hour, minute: 0, channelId: CHANNEL },
  });
}

/** Asks for permission if needed, then schedules the weekly reminder. */
export async function enableReminder(p: ReminderPref): Promise<'ok' | 'denied'> {
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') ({ status } = await Notifications.requestPermissionsAsync());
  if (status !== 'granted') return 'denied';
  await schedule({ ...p, enabled: true });
  return 'ok';
}

export async function disableReminder(): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(ID).catch(() => {});
}

/** On app start: make sure a saved reminder is still scheduled (idempotent). Never prompts for permission. */
export async function syncReminder(p: ReminderPref): Promise<void> {
  if (!p.enabled) return;
  const { status } = await Notifications.getPermissionsAsync();
  if (status === 'granted') await schedule(p);
}
