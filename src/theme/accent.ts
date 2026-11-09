/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Builds a full accent colour scale (the 50-950 steps the app styles with, as in
 * `bg-blue-800`) from a single brand colour.
 *
 * The scale keeps the shape of the app's stock blue: for every step we copy how
 * far its lightness sits from the base step, and how saturated and hue-shifted
 * it is, onto the new colour. The base colour lands exactly on step 700, which
 * is the same in light and dark mode in the stock palette.
 */

export type ColorScheme = 'light' | 'dark';
export type Hsl = { h: number; s: number; l: number };
export type Scale = Record<number, string>;

export const ACCENT_BASE_STEP = 700;
const STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;

// Solid-colour steps are used behind white text, so keep the base readable.
const MIN_LIGHTNESS = 32;
const MAX_LIGHTNESS = 58;

const lightBlue: Record<string, string> = require('./colors/light').blue;
const darkBlue: Record<string, string> = require('./colors/dark').blueDark;

const HEX = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i;

export const isValidHex = (value: string): boolean => HEX.test(value.trim());

/** `#abc` / `abc` / `#AABBCC` -> `#aabbcc`, or null when it is not a colour. */
export const normalizeHex = (value: string): string | null => {
  const match = value.trim().match(HEX);
  if (!match) return null;
  const digits = match[1].length === 3 ? [...match[1]].map(c => c + c).join('') : match[1];
  return `#${digits.toLowerCase()}`;
};

export const hexToHsl = (hex: string): Hsl => {
  const normalized = normalizeHex(hex);
  if (!normalized) throw new Error(`Invalid hex colour: ${hex}`);
  const r = parseInt(normalized.slice(1, 3), 16) / 255;
  const g = parseInt(normalized.slice(3, 5), 16) / 255;
  const b = parseInt(normalized.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l: l * 100 };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s: s * 100, l: l * 100 };
};

const parseHsl = (css: string): Hsl => {
  const match = css.match(/hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)/);
  if (!match) throw new Error(`Unexpected colour format: ${css}`);
  return { h: Number(match[1]), s: Number(match[2]), l: Number(match[3]) };
};

const round = (value: number) => Math.round(value * 10) / 10;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const hslToCss = ({ h, s, l }: Hsl) =>
  `hsl(${round(((h % 360) + 360) % 360)}, ${round(clamp(s, 0, 100))}%, ${round(clamp(l, 0, 100))}%)`;

/** Pulls a brand colour into the lightness range that stays readable behind white text. */
export const toAccentBase = (hex: string): Hsl => {
  const hsl = hexToHsl(hex);
  return { ...hsl, l: clamp(hsl.l, MIN_LIGHTNESS, MAX_LIGHTNESS) };
};

const deriveScale = (base: Hsl, source: Record<string, string>): Scale => {
  const anchor = parseHsl(source[ACCENT_BASE_STEP]);
  const scale: Scale = {};
  for (const step of STEPS) {
    const stock = parseHsl(source[step]);
    // How far this step sits between the anchor and white (+) or black (-).
    const towardWhite = (stock.l - anchor.l) / (100 - anchor.l);
    const towardBlack = (stock.l - anchor.l) / anchor.l;
    const fraction = stock.l >= anchor.l ? towardWhite : towardBlack;
    const l = fraction >= 0 ? base.l + fraction * (100 - base.l) : base.l + fraction * base.l;
    scale[step] = hslToCss({
      h: base.h + (stock.h - anchor.h),
      s: base.s * (stock.s / anchor.s),
      l,
    });
  }
  scale[ACCENT_BASE_STEP] = hslToCss(base);
  return scale;
};

const cache = new Map<string, Scale>();

/** Accent scale for a brand colour in the given colour scheme. */
export const buildAccentScale = (hex: string, scheme: ColorScheme): Scale => {
  const normalized = normalizeHex(hex);
  if (!normalized) throw new Error(`Invalid hex colour: ${hex}`);
  const key = `${scheme}:${normalized}`;
  let scale = cache.get(key);
  if (!scale) {
    scale = deriveScale(toAccentBase(normalized), scheme === 'dark' ? darkBlue : lightBlue);
    cache.set(key, scale);
  }
  return scale;
};
