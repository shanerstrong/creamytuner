import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { FreezeTimer } from '@/src/types';

export type FreezeReminderResult = {
  scheduled: boolean;
  notificationId?: string;
  message: string;
};

export function configureFreezeNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function scheduleFreezeReminder(timer: FreezeTimer): Promise<FreezeReminderResult> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('freeze-reminders', {
      name: 'Freeze reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 150, 250],
      lightColor: '#F14E9B',
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  const permission = existing.granted ? existing : await Notifications.requestPermissionsAsync();
  if (!permission.granted) {
    return { scheduled: false, message: 'The in-app timer is active. Device notifications are turned off.' };
  }

  const seconds = Math.max(1, Math.round((Date.parse(timer.endsAt) - Date.now()) / 1000));
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Your pint is ready to spin',
      body: `${timer.recipeName} has finished its 24-hour freeze.`,
      sound: 'default',
      data: { url: `/recipe/${timer.recipeId}`, recipeId: timer.recipeId },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      channelId: 'freeze-reminders',
    },
  });
  return { scheduled: true, notificationId, message: 'We will notify you when the pint is ready.' };
}

export async function cancelFreezeReminder(notificationId?: string) {
  if (notificationId) await Notifications.cancelScheduledNotificationAsync(notificationId);
}
