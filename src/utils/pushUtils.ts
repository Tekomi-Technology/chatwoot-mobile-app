import { Platform } from 'react-native';
import { NOTIFICATION_TYPES } from '@/constants';
import { Notification } from '@/types/Notification';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const notifee: typeof import('@notifee/react-native').default = require('@notifee/react-native')
  .default as typeof import('@notifee/react-native').default;

// FCM notification payloads are not rendered by the OS while the app is in
// the foreground, so Notifee is loaded on both platforms for the local banner.

export const clearAllDeliveredNotifications = async () => {
  if (Platform.OS === 'ios' && notifee) {
    await notifee.cancelAllNotifications();
  }
};

export const updateBadgeCount = async ({ count = 0 }) => {
  if (Platform.OS === 'ios' && count >= 0 && notifee) {
    await notifee.setBadgeCount(count);
  }
};

type ForegroundPushMessage = {
  notification?: { title?: string; body?: string };
  data?: Record<string, unknown>;
};

export const displayForegroundNotification = async ({
  message,
}: {
  message: ForegroundPushMessage;
}) => {
  if (!notifee) return;

  const channelId = 'chatwoot-messages';
  if (Platform.OS === 'android') {
    await notifee.createChannel({
      id: channelId,
      name: 'Messages',
      importance: 4,
      sound: 'default',
    });
  }

  await notifee.displayNotification({
    title: message.notification?.title || 'New message',
    body: message.notification?.body || 'You have a new conversation message',
    data: Object.fromEntries(
      Object.entries(message.data || {})
        .filter(([, value]) => value !== undefined)
        .map(([key, value]) => [
          key,
          typeof value === 'string' ? value : (JSON.stringify(value) ?? String(value)),
        ]),
    ),
    android:
      Platform.OS === 'android'
        ? { channelId, pressAction: { id: 'default' }, smallIcon: 'ic_launcher' }
        : undefined,
    ios: {
      foregroundPresentationOptions: { alert: true, badge: true, sound: true },
    },
  });
};

export const findConversationLinkFromPush = ({
  notification,
  installationUrl,
  currentAccountId,
}: {
  notification: Notification;
  installationUrl: string;
  currentAccountId?: number;
}) => {
  const { notificationType } = notification;

  if (NOTIFICATION_TYPES.includes(notificationType)) {
    const { primaryActor, primaryActorId, primaryActorType } = notification;
    let conversationId = null;
    if (primaryActorType === 'Conversation') {
      conversationId = primaryActor.id;
    } else if (primaryActorType === 'Message') {
      conversationId = primaryActor.conversationId;
    }
    if (conversationId) {
      // Older servers omit accountId; fall back to the active account so the link stays valid.
      const accountId = notification.accountId ?? currentAccountId;
      const conversationLink = `${installationUrl}/app/accounts/${accountId}/conversations/${conversationId}/${primaryActorId}/${primaryActorType}`;
      return conversationLink;
    }
  }
  return;
};

interface FCMMessage {
  data?: {
    payload?: string;
    notification?: string;
  };
}

// A push can arrive without the field the branch below reads, and its contents
// come from the server, so a parse is never assumed to succeed.
const parseJSON = (value?: string) => {
  if (!value) {
    return null;
  }
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

export const findNotificationFromFCM = ({ message }: { message: FCMMessage }) => {
  // FCM HTTP v1
  if (message?.data?.payload) {
    return parseJSON(message.data.payload)?.data?.notification ?? null;
  }
  // FCM legacy. It will be deprecated soon
  return parseJSON(message?.data?.notification);
};
