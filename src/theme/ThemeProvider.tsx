import React, {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
} from 'react';
import { Appearance, useColorScheme } from 'react-native';

import { useAppSelector } from '@/hooks';
import { selectAppearance, selectInstallationUrl } from '@/store/settings/settingsSelectors';

import {
  AppearanceSettings,
  ColorScheme,
  resolveAccent,
  resolveColorScheme,
} from './appearanceConfig';
import { themeKey } from './createTheme';
import { saveNavigationSnapshot } from './navigationSnapshot';
import { setActiveTheme } from './tailwind';
import { ensureWorkspaceTheme, useWorkspaceTheme } from './workspaceThemeStore';

type ThemeContextValue = {
  scheme: ColorScheme;
  isDark: boolean;
  appearance: AppearanceSettings;
  /** The accent actually in use (workspace or user), or null for the stock blue. */
  accent: string | null;
  /** Whether the workspace publishes a colour the user is currently following. */
  workspaceAccent: string | null;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Applies the user's appearance to the whole app.
 *
 * Screens style themselves with `tailwind.style(...)` while rendering, so after a
 * change they have to render again. Keying the children by the active look
 * remounts them once; the screen the user is on is restored (see
 * navigationSnapshot) and app state lives in Redux, so nothing is lost.
 */
export const ThemeProvider = ({ children }: PropsWithChildren) => {
  const appearance = useAppSelector(selectAppearance);
  const installationUrl = useAppSelector(selectInstallationUrl);
  const workspace = useWorkspaceTheme();
  const systemScheme = useColorScheme();

  useEffect(() => {
    ensureWorkspaceTheme(installationUrl);
  }, [installationUrl]);

  const scheme = resolveColorScheme(appearance.mode, systemScheme);
  const accent = resolveAccent(appearance, workspace);
  const spec = {
    scheme,
    accent,
    corners: appearance.corners,
    fontScale: appearance.fontScale,
  };
  const key = themeKey(spec);

  // Swap the live look before the children render so they read the new one. Doing
  // it more than once for the same look is harmless.
  if (setActiveTheme(spec)) saveNavigationSnapshot();

  // Native chrome (keyboard, menus, alerts) follows the same choice as the app.
  useLayoutEffect(() => {
    Appearance.setColorScheme(appearance.mode === 'system' ? 'unspecified' : appearance.mode);
  }, [appearance.mode]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      scheme,
      isDark: scheme === 'dark',
      appearance,
      accent,
      workspaceAccent: appearance.followWorkspace ? (workspace?.accent ?? null) : null,
    }),
    [scheme, appearance, accent, workspace],
  );

  return (
    <ThemeContext.Provider value={value}>
      <React.Fragment key={key}>{children}</React.Fragment>
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextValue => {
  const value = useContext(ThemeContext);
  if (!value) throw new Error('useTheme must be used inside ThemeProvider');
  return value;
};
