import type { ReminderPref } from '@/core/store';

/** Reminders are local phone notifications; the web build has none. */
export const remindersAvailable = false;
export async function enableReminder(_p: ReminderPref): Promise<'ok' | 'denied'> {
  return 'denied';
}
export async function disableReminder(): Promise<void> {}
export async function syncReminder(_p: ReminderPref): Promise<void> {}
