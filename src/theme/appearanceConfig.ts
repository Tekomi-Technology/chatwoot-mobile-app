import { Theme } from '@/types/common/Theme';

import { normalizeHex } from './accent';

export type ColorScheme = 'light' | 'dark';
export type CornerStyle = 'sharp' | 'default' | 'round';
export type FontScale = 'small' | 'default' | 'large';

/** Everything the user can change about how the app looks. */
export type AppearanceSettings = {
  /** Light, dark, or follow the phone. */
  mode: Theme;
  /** The preset last applied; `custom` once the user tweaks a value by hand. */
  presetId: string;
  /** Brand colour as `#rrggbb`, or null for the stock Chatwoot blue. */
  accent: string | null;
  corners: CornerStyle;
  fontScale: FontScale;
  /** Use the colour the workspace publishes (mobile-theme.json) when there is one. */
  followWorkspace: boolean;
  /** Bottom tab bar background as `#rrggbb`, or null for the standard bar. */
  tabBarColor: string | null;
};

/** Optional branding the workspace admin publishes at `<server>/mobile-theme.json`. */
export type WorkspaceTheme = {
  accent?: string;
};

export const CUSTOM_PRESET_ID = 'custom';

export const DEFAULT_APPEARANCE: AppearanceSettings = {
  mode: 'system',
  presetId: 'chatwoot',
  accent: null,
  corners: 'default',
  fontScale: 'default',
  followWorkspace: true,
  tabBarColor: null,
};

/** Multiplier for the rounded-* scale. Fully round (pill) and square stay as they are. */
export const CORNER_SCALE: Record<CornerStyle, number> = { sharp: 0.35, default: 1, round: 1.6 };
/** Multiplier for the named text sizes (text-sm, text-base …). */
export const FONT_SCALE: Record<FontScale, number> = { small: 0.92, default: 1, large: 1.12 };

export const CORNER_STYLES = Object.keys(CORNER_SCALE) as CornerStyle[];
export const FONT_SCALES = Object.keys(FONT_SCALE) as FontScale[];
export const THEME_MODES: Theme[] = ['system', 'light', 'dark'];

export type ThemePreset = {
  id: string;
  accent: string | null;
  corners: CornerStyle;
  fontScale: FontScale;
};

export const THEME_PRESETS: ThemePreset[] = [
  { id: 'chatwoot', accent: null, corners: 'default', fontScale: 'default' },
  { id: 'emerald', accent: '#10b981', corners: 'default', fontScale: 'default' },
  { id: 'violet', accent: '#7c5cfc', corners: 'round', fontScale: 'default' },
  { id: 'sunset', accent: '#f97316', corners: 'round', fontScale: 'default' },
  { id: 'rose', accent: '#e5484d', corners: 'default', fontScale: 'default' },
  { id: 'graphite', accent: '#52525b', corners: 'sharp', fontScale: 'small' },
  { id: 'comfort', accent: null, corners: 'round', fontScale: 'large' },
];

export const ACCENT_SWATCHES: string[] = [
  '#1f93ff',
  '#3e63dd',
  '#7c5cfc',
  '#d6409f',
  '#e5484d',
  '#f97316',
  '#f5a524',
  '#30a46c',
  '#10b981',
  '#0d9488',
  '#52525b',
];

const isOneOf = <T extends string>(value: unknown, allowed: readonly T[]): value is T =>
  typeof value === 'string' && (allowed as readonly string[]).includes(value);

/**
 * Turns whatever was persisted (older app versions, hand-edited state, nothing at
 * all) into settings the theme code can trust.
 */
export const sanitizeAppearance = (
  input?: Partial<AppearanceSettings> | null,
): AppearanceSettings => {
  const value = input ?? {};
  const accent = typeof value.accent === 'string' ? normalizeHex(value.accent) : null;
  return {
    mode: isOneOf(value.mode, THEME_MODES) ? value.mode : DEFAULT_APPEARANCE.mode,
    presetId:
      typeof value.presetId === 'string' && value.presetId
        ? value.presetId
        : DEFAULT_APPEARANCE.presetId,
    accent,
    corners: isOneOf(value.corners, CORNER_STYLES) ? value.corners : DEFAULT_APPEARANCE.corners,
    fontScale: isOneOf(value.fontScale, FONT_SCALES)
      ? value.fontScale
      : DEFAULT_APPEARANCE.fontScale,
    followWorkspace:
      typeof value.followWorkspace === 'boolean'
        ? value.followWorkspace
        : DEFAULT_APPEARANCE.followWorkspace,
    tabBarColor: typeof value.tabBarColor === 'string' ? normalizeHex(value.tabBarColor) : null,
  };
};

/** The accent actually drawn: the workspace's, when followed and published, else the user's. */
export const resolveAccent = (
  appearance: AppearanceSettings,
  workspace?: WorkspaceTheme | null,
): string | null => {
  if (appearance.followWorkspace && workspace?.accent) {
    return normalizeHex(workspace.accent) ?? appearance.accent;
  }
  return appearance.accent;
};

export const resolveColorScheme = (
  mode: Theme,
  systemScheme: string | null | undefined,
): ColorScheme => {
  if (mode === 'light' || mode === 'dark') return mode;
  return systemScheme === 'dark' ? 'dark' : 'light';
};

/** Black or white, whichever reads better on the given `#rrggbb` background. */
export const readableOn = (background: string): string => {
  const hex = background.replace('#', '');
  const [r, g, b] = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const luminance = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return luminance > 0.45 ? '#171717' : '#FFFFFF';
};
