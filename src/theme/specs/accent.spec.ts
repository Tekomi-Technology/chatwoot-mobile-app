import {
  ACCENT_BASE_STEP,
  buildAccentScale,
  hexToHsl,
  hslToCss,
  isValidHex,
  normalizeHex,
  toAccentBase,
} from '../accent';

const lightnessOf = (css: string) => Number(css.match(/,\s*([\d.]+)%\)/)?.[1]);
const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

describe('hex helpers', () => {
  it('normalizes short, long and prefixless hex', () => {
    expect(normalizeHex('#ABC')).toBe('#aabbcc');
    expect(normalizeHex('1F93FF')).toBe('#1f93ff');
    expect(normalizeHex(' #1f93ff ')).toBe('#1f93ff');
  });

  it.each(['', '#12', '#12345', 'blue', '#gggggg', '#1234567'])('rejects %p', value => {
    expect(normalizeHex(value)).toBeNull();
    expect(isValidHex(value)).toBe(false);
  });

  it('converts hex to hsl', () => {
    expect(hexToHsl('#ff0000')).toEqual({ h: 0, s: 100, l: 50 });
    expect(hexToHsl('#808080')).toMatchObject({ s: 0 });
    const blue = hexToHsl('#1f93ff');
    expect(blue.h).toBeCloseTo(208.9, 1);
    expect(blue.l).toBeCloseTo(56, 0);
  });

  it('formats hsl css with wrapped hue and clamped values', () => {
    expect(hslToCss({ h: 370, s: 120, l: -5 })).toBe('hsl(10, 100%, 0%)');
  });
});

describe('toAccentBase', () => {
  it('keeps readable colours unchanged', () => {
    expect(toAccentBase('#1f93ff').l).toBeCloseTo(56, 0);
  });

  it('darkens colours too light to sit behind white text', () => {
    expect(toAccentBase('#ffee88').l).toBeLessThanOrEqual(58);
  });

  it('lightens colours too dark to read as an accent', () => {
    expect(toAccentBase('#050510').l).toBeGreaterThanOrEqual(32);
  });
});

describe('buildAccentScale', () => {
  it.each(['light', 'dark'] as const)('puts the base colour on step 700 (%s)', scheme => {
    const scale = buildAccentScale('#7c5cfc', scheme);
    expect(scale[ACCENT_BASE_STEP]).toBe(hslToCss(toAccentBase('#7c5cfc')));
  });

  it('makes the light scale darken from 50 to 950', () => {
    const scale = buildAccentScale('#e5484d', 'light');
    const values = steps.map(step => lightnessOf(scale[step]));
    expect([...values].sort((a, b) => b - a)).toEqual(values);
  });

  it('makes the dark scale lighten from 50 to 950', () => {
    const scale = buildAccentScale('#e5484d', 'dark');
    const values = steps.map(step => lightnessOf(scale[step]));
    expect([...values].sort((a, b) => a - b)).toEqual(values);
  });

  it('defines every step with valid hsl colours', () => {
    const scale = buildAccentScale('#10b981', 'light');
    expect(Object.keys(scale).map(Number)).toEqual(steps);
    Object.values(scale).forEach(css =>
      expect(css).toMatch(/^hsl\(\d+(\.\d)?, \d+(\.\d)?%, \d+(\.\d)?%\)$/),
    );
  });

  it('stays close to the stock blue when given the stock accent', () => {
    // Stock light blue-900 is hsl(211, 90%, 42%).
    const scale = buildAccentScale('#0a84ff', 'light');
    expect(lightnessOf(scale[900])).toBeGreaterThan(30);
    expect(lightnessOf(scale[900])).toBeLessThan(50);
  });

  it('keeps greys grey', () => {
    const scale = buildAccentScale('#808080', 'light');
    Object.values(scale).forEach(css => expect(css).toMatch(/, 0%, /));
  });

  it('rejects invalid colours', () => {
    expect(() => buildAccentScale('nope', 'light')).toThrow();
  });
});
