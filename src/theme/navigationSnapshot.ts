import type { NavigationState, PartialState } from '@react-navigation/native';

import { navigationRef } from '@/utils/navigationUtils';

type Snapshot = NavigationState | PartialState<NavigationState> | undefined;

let snapshot: Snapshot;

/**
 * A theme change remounts the navigation tree so every screen restyles. Keep the
 * screen the user is on by remembering the stack just before it goes away.
 */
export const saveNavigationSnapshot = () => {
  snapshot = navigationRef.current?.isReady() ? navigationRef.current.getRootState() : undefined;
};

/** Hands the saved stack to the freshly mounted navigator, once. */
export const takeNavigationSnapshot = (): Snapshot => {
  const saved = snapshot;
  snapshot = undefined;
  return saved;
};
