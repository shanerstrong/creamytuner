import type { FreezeTimer } from '@/src/types';

export type FreezeReminderResult = {
  scheduled: boolean;
  notificationId?: string;
  message: string;
};

export function configureFreezeNotifications() {
  // Web preview uses the persisted in-app countdown. Native builds schedule the system notification.
}

export async function scheduleFreezeReminder(_timer: FreezeTimer): Promise<FreezeReminderResult> {
  return { scheduled: false, message: 'The in-app timer is active. Install the phone app for a device notification.' };
}

export async function cancelFreezeReminder(_notificationId?: string) {
  // No system notification is scheduled by the static web preview.
}
