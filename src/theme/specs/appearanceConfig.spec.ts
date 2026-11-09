import {
  CUSTOM_PRESET_ID,
  DEFAULT_APPEARANCE,
  THEME_PRESETS,
  ACCENT_SWATCHES,
  resolveAccent,
  resolveColorScheme,
  sanitizeAppearance,
} from '../appearanceConfig';
import { isValidHex } from '../accent';

describe('sanitizeAppearance', () => {
  it('falls back to defaults for missing or empty state', () => {
    expect(sanitizeAppearance()).toEqual(DEFAULT_APPEARANCE);
    expect(sanitizeAppearance(null)).toEqual(DEFAULT_APPEARANCE);
    expect(sanitizeAppearance({})).toEqual(DEFAULT_APPEARANCE);
  });

  it('keeps valid values and normalizes the accent', () => {
    expect(
      sanitizeAppearance({
        mode: 'dark',
        accent: '#ABC',
        corners: 'round',
        fontScale: 'large',
        presetId: CUSTOM_PRESET_ID,
        followWorkspace: false,
      }),
    ).toEqual({
      mode: 'dark',
      accent: '#aabbcc',
      corners: 'round',
      fontScale: 'large',
      presetId: CUSTOM_PRESET_ID,
      followWorkspace: false,
    });
  });

  it('discards junk instead of crashing the theme', () => {
    const result = sanitizeAppearance({
      mode: 'neon',
      accent: 'not-a-colour',
      corners: 'blob',
      fontScale: 'huge',
      followWorkspace: 'yes',
    } as never);
    expect(result).toEqual(DEFAULT_APPEARANCE);
  });
});

describe('resolveAccent', () => {
  const base = { ...DEFAULT_APPEARANCE, accent: '#112233' };

  it('uses the user colour when there is no workspace theme', () => {
    expect(resolveAccent(base, null)).toBe('#112233');
    expect(resolveAccent(base, {})).toBe('#112233');
  });

  it('prefers the workspace colour when it is followed', () => {
    expect(resolveAccent(base, { accent: '#AA00FF' })).toBe('#aa00ff');
  });

  it('ignores the workspace colour when not followed', () => {
    expect(resolveAccent({ ...base, followWorkspace: false }, { accent: '#aa00ff' })).toBe(
      '#112233',
    );
  });

  it('ignores an unusable workspace colour', () => {
    expect(resolveAccent(base, { accent: 'purple' })).toBe('#112233');
  });
});

describe('resolveColorScheme', () => {
  it('follows the system only in system mode', () => {
    expect(resolveColorScheme('system', 'dark')).toBe('dark');
    expect(resolveColorScheme('system', 'light')).toBe('light');
    expect(resolveColorScheme('system', null)).toBe('light');
    expect(resolveColorScheme('light', 'dark')).toBe('light');
    expect(resolveColorScheme('dark', 'light')).toBe('dark');
  });
});

describe('presets and swatches', () => {
  it('has unique preset ids, starting with the stock look', () => {
    const ids = THEME_PRESETS.map(preset => preset.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(THEME_PRESETS[0]).toMatchObject({ accent: null, corners: 'default' });
    expect(ids).not.toContain(CUSTOM_PRESET_ID);
  });

  it('only uses valid colours', () => {
    THEME_PRESETS.forEach(({ accent }) => accent && expect(isValidHex(accent)).toBe(true));
    ACCENT_SWATCHES.forEach(swatch => expect(isValidHex(swatch)).toBe(true));
  });
});
