import { getFilteredNotifications } from './notificationSelectors';
import type { RootState } from '@/store';
import type { Notification } from '@/types/Notification';

const notification = (id: number, createdAt: number, vip: boolean) =>
  ({
    id,
    createdAt,
    primaryActor: { meta: { sender: { vip } } },
  }) as unknown as Notification;

describe('getFilteredNotifications', () => {
  it('keeps VIP notifications above newer non-VIP notifications', () => {
    const state = {
      notifications: {
        ids: [1, 2],
        entities: {
          1: notification(1, 1, true),
          2: notification(2, 10, false),
        },
      },
    } as unknown as RootState;

    expect(getFilteredNotifications(state, 'desc').map(item => item.id)).toEqual([1, 2]);
  });
});
