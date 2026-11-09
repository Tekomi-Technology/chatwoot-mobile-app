import { hslToCss, toAccentBase } from '../accent';
import { ThemeSpec, createThemeTailwind, darkClasses, themeKey } from '../createTheme';
import { getActiveThemeKey, setActiveTheme, tailwind } from '../tailwind';

const stock: ThemeSpec = {
  scheme: 'light',
  accent: null,
  corners: 'default',
  fontScale: 'default',
};
const look = (overrides: Partial<ThemeSpec>): ThemeSpec => ({ ...stock, ...overrides });

describe('darkClasses', () => {
  it('turns white surfaces into the dark surface but keeps white text', () => {
    expect(darkClasses('bg-white text-white')).toBe('bg-surface text-white');
  });

  it('keeps opacity modifiers on surfaces', () => {
    expect(darkClasses('bg-white/50')).toBe('bg-surface/50');
  });

  it('lifts low-contrast grey text', () => {
    expect(darkClasses('text-gray-700 text-gray-800 text-gray-900')).toBe(
      'text-gray-900 text-gray-900 text-gray-900',
    );
  });

  it('flips black text, borders and subtle overlays to their light counterparts', () => {
    expect(darkClasses('text-black border-black')).toBe('text-gray-950 border-gray-950');
    expect(darkClasses('border-blackA-A3 text-blackA-A11')).toBe(
      'border-whiteA-A3 text-whiteA-A11',
    );
    expect(darkClasses('bg-blackA-A3')).toBe('bg-whiteA-A3');
  });

  it('leaves strong overlays and unrelated classes alone', () => {
    expect(darkClasses('bg-blackA-A11 p-4')).toBe('bg-blackA-A11 p-4');
  });
});

describe('createThemeTailwind', () => {
  it('caches one instance per look', () => {
    expect(createThemeTailwind(stock)).toBe(createThemeTailwind({ ...stock }));
    expect(createThemeTailwind(stock)).not.toBe(createThemeTailwind(look({ scheme: 'dark' })));
    expect(themeKey(stock)).not.toBe(themeKey(look({ accent: '#7c5cfc' })));
  });

  it('draws white surfaces in light and elevated dark in dark', () => {
    const light = createThemeTailwind(stock).style('bg-white');
    const dark = createThemeTailwind(look({ scheme: 'dark' })).style('bg-white');
    expect(light.backgroundColor).toMatch(/^(#fff|#ffffff|rgb\(255, 255, 255\)|white)/i);
    expect(dark.backgroundColor).toBe('#1c1c1e');
  });

  it('applies the dark rewrite to arrays and conditional objects', () => {
    const dark = createThemeTailwind(look({ scheme: 'dark' }));
    expect(dark.style(['bg-white'], { 'bg-white': true }).backgroundColor).toBe('#1c1c1e');
    expect(dark.color('bg-white')).toBe('#1c1c1e');
  });

  it('serves the dark scale under the plain colour names', () => {
    const dark = createThemeTailwind(look({ scheme: 'dark' })).style('bg-gray-100');
    const light = createThemeTailwind(stock).style('bg-gray-100');
    expect(dark.backgroundColor).not.toBe(light.backgroundColor);
  });

  it('recolours the accent steps from the chosen brand colour', () => {
    const accent = '#7c5cfc';
    const themed = createThemeTailwind(look({ accent })).style('bg-blue-700');
    const original = createThemeTailwind(stock).style('bg-blue-700');
    expect(themed.backgroundColor).toBe(hslToCss(toAccentBase(accent)));
    expect(themed.backgroundColor).not.toBe(original.backgroundColor);
  });

  it('recolours the accent in dark mode too', () => {
    const accent = '#10b981';
    const dark = createThemeTailwind(look({ scheme: 'dark', accent })).style('bg-blue-700');
    expect(dark.backgroundColor).toBe(hslToCss(toAccentBase(accent)));
  });

  it('scales corner radii but keeps pills and squares', () => {
    const radius = (corners: ThemeSpec['corners'], cls: string) =>
      createThemeTailwind(look({ corners })).style(cls).borderRadius as number;
    expect(radius('round', 'rounded-lg')).toBeGreaterThan(radius('default', 'rounded-lg'));
    expect(radius('sharp', 'rounded-lg')).toBeLessThan(radius('default', 'rounded-lg'));
    expect(radius('round', 'rounded-full')).toBe(radius('default', 'rounded-full'));
    expect(radius('round', 'rounded-none')).toBe(0);
  });

  it('scales named text sizes including the custom ones', () => {
    const size = (fontScale: ThemeSpec['fontScale'], cls: string) =>
      createThemeTailwind(look({ fontScale })).style(cls).fontSize as number;
    expect(size('large', 'text-sm')).toBeGreaterThan(size('default', 'text-sm'));
    expect(size('small', 'text-base')).toBeLessThan(size('default', 'text-base'));
    expect(size('default', 'text-xs')).toBe(12);
    expect(size('large', 'text-cxs')).toBeGreaterThan(13);
  });
});

describe('tailwind proxy', () => {
  afterEach(() => {
    setActiveTheme(stock);
  });

  it('follows the active look without callers re-importing it', () => {
    const before = tailwind.style('bg-white').backgroundColor;
    expect(setActiveTheme(look({ scheme: 'dark' }))).toBe(true);
    expect(tailwind.style('bg-white').backgroundColor).toBe('#1c1c1e');
    expect(tailwind.color('bg-white')).toBe('#1c1c1e');
    setActiveTheme(stock);
    expect(tailwind.style('bg-white').backgroundColor).toBe(before);
  });

  it('reports whether the look changed', () => {
    expect(setActiveTheme(stock)).toBe(false);
    expect(setActiveTheme(look({ corners: 'round' }))).toBe(true);
    expect(setActiveTheme(look({ corners: 'round' }))).toBe(false);
    expect(getActiveThemeKey()).toBe(themeKey(look({ corners: 'round' })));
  });

  it('can be called like twrnc itself', () => {
    expect(tailwind`p-4`).toEqual(createThemeTailwind(stock)`p-4`);
  });
});
