/* eslint-disable @typescript-eslint/no-require-imports */
import { create } from 'twrnc';

import { buildAccentScale } from './accent';
import { CORNER_SCALE, ColorScheme, CornerStyle, FONT_SCALE, FontScale } from './appearanceConfig';
import { twConfig } from './tailwind.config';

const defaultTheme = require('tailwindcss/defaultTheme');
const darkPalette: Record<string, Record<string, string>> = require('./colors/dark');

export type ThemeTailwind = ReturnType<typeof create>;

export type ThemeSpec = {
  scheme: ColorScheme;
  /** `#rrggbb` brand colour, or null for the stock blue. */
  accent: string | null;
  corners: CornerStyle;
  fontScale: FontScale;
};

// --- dark colours -----------------------------------------------------------

// Radix dark scales are published as `grayDark`, `blueDark` …; dark mode serves them
// under the plain names so every existing `bg-gray-100` follows the scheme.
const darkColors = Object.fromEntries(
  Object.entries(darkPalette).map(([name, shades]) => [name.replace(/Dark$/, ''), shades]),
);

const DARK_SURFACE = '#1c1c1e';
const DARK_GROUND = '#111113';

/**
 * Light screens are built from white surfaces on gray-50 grounds. On dark, white
 * surfaces become an elevated dark tone and the foreground scales flip. Only
 * white surfaces change: white text on accent buttons and badges stays white.
 */
export const darkClasses = (value: string): string =>
  value
    .replace(/\bbg-white\b/g, 'bg-surface')
    .replace(/\btext-gray-(700|800)\b/g, 'text-gray-900')
    .replace(/\bbg-\[#EBEBEB\]/g, 'bg-gray-200')
    .replace(/\b(text|border(?:-[tblrxy])?)-black\b(?!A)/g, '$1-gray-950')
    .replace(/\b(text|border(?:-[tblrxy])?)-blackA-/g, '$1-whiteA-')
    .replace(/\bbg-blackA-(A[1-6])\b/g, 'bg-whiteA-$1');

const mapInput = (input: unknown): unknown => {
  if (typeof input === 'string') return darkClasses(input);
  if (Array.isArray(input)) return input.map(mapInput);
  if (input && typeof input === 'object') {
    return Object.fromEntries(
      Object.entries(input).map(([className, enabled]) => [darkClasses(className), enabled]),
    );
  }
  return input;
};

// --- corners and type -------------------------------------------------------

const scaleLength = (value: string, factor: number): string => {
  const match = value.match(/^(-?[\d.]+)(rem|px)$/);
  if (!match) return value;
  const scaled = Number(match[1]) * factor;
  return `${Math.round(scaled * 1000) / 1000}${match[2]}`;
};

const scaledRadius = (factor: number) =>
  Object.fromEntries(
    Object.entries(defaultTheme.borderRadius as Record<string, string>).map(([key, value]) => [
      key,
      key === 'none' || key === 'full' ? value : scaleLength(value, factor),
    ]),
  );

type FontSizeEntry = string | [string, string | { lineHeight?: string; letterSpacing?: string }];

const scaleFontSize = (entry: FontSizeEntry, factor: number): FontSizeEntry => {
  if (typeof entry === 'string') return scaleLength(entry, factor);
  const [size, extra] = entry;
  if (typeof extra === 'string') return [scaleLength(size, factor), scaleLength(extra, factor)];
  return [
    scaleLength(size, factor),
    extra?.lineHeight
      ? { ...extra, lineHeight: scaleLength(extra.lineHeight, factor) }
      : (extra ?? {}),
  ];
};

const scaledFontSizes = (factor: number) => {
  const stock = defaultTheme.fontSize as Record<string, FontSizeEntry>;
  const custom = (twConfig.theme.extend.fontSize ?? {}) as Record<string, FontSizeEntry>;
  return Object.fromEntries(
    Object.entries({ ...stock, ...custom }).map(([key, entry]) => [
      key,
      scaleFontSize(entry, factor),
    ]),
  );
};

// --- assembly ---------------------------------------------------------------

const buildConfig = ({ scheme, accent, corners, fontScale }: ThemeSpec) => {
  const colors: Record<string, unknown> = { ...twConfig.theme.extend.colors };

  if (scheme === 'dark') {
    Object.assign(colors, darkColors, {
      gray: { ...darkColors.gray, 50: DARK_GROUND },
      surface: DARK_SURFACE,
    });
  }
  if (accent) {
    colors.blue = { ...(colors.blue as object), ...buildAccentScale(accent, scheme) };
  }

  return {
    ...twConfig,
    theme: {
      ...twConfig.theme,
      extend: {
        ...twConfig.theme.extend,
        colors,
        borderRadius: scaledRadius(CORNER_SCALE[corners]),
        fontSize: scaledFontSizes(FONT_SCALE[fontScale]),
      },
    },
  };
};

const instances = new Map<string, ThemeTailwind>();

export const themeKey = ({ scheme, accent, corners, fontScale }: ThemeSpec) =>
  [scheme, accent ?? 'stock', corners, fontScale].join('|');

/** A twrnc instance for the given look. Instances are cached per look. */
export const createThemeTailwind = (spec: ThemeSpec): ThemeTailwind => {
  const key = themeKey(spec);
  const cached = instances.get(key);
  if (cached) return cached;

  const instance = create(buildConfig(spec));

  if (spec.scheme === 'dark') {
    const style = instance.style.bind(instance);
    instance.style = ((...inputs: Parameters<typeof instance.style>) =>
      style(
        ...(inputs.map(mapInput) as Parameters<typeof instance.style>),
      )) as typeof instance.style;
    const color = instance.color.bind(instance);
    instance.color = (value: string) => color(darkClasses(value));
  }

  instances.set(key, instance);
  return instance;
};
