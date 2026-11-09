import { ThemeSpec, ThemeTailwind, createThemeTailwind, themeKey } from './createTheme';

const STOCK_LOOK: ThemeSpec = {
  scheme: 'light',
  accent: null,
  corners: 'default',
  fontScale: 'default',
};

let active: ThemeTailwind = createThemeTailwind(STOCK_LOOK);
let activeKey = themeKey(STOCK_LOOK);
let boundMembers = new Map<PropertyKey, unknown>();

/**
 * Switches the look every `tailwind.style(...)` call resolves against. Returns
 * true when the look actually changed, in which case mounted screens must be
 * re-rendered to pick it up (see ThemeProvider).
 */
export const setActiveTheme = (spec: ThemeSpec): boolean => {
  const key = themeKey(spec);
  if (key === activeKey) return false;
  active = createThemeTailwind(spec);
  activeKey = key;
  boundMembers = new Map();
  return true;
};

export const getActiveThemeKey = () => activeKey;

/**
 * The app styles itself with `tailwind.style('bg-white p-4')` at render time. This
 * is a stand-in for the current theme's twrnc instance, so those calls follow the
 * theme without every component having to subscribe to it.
 */
export const tailwind: ThemeTailwind = new Proxy(function themedTailwind() {} as never, {
  apply: (_target, _thisArg, args) =>
    (active as unknown as (...params: unknown[]) => unknown)(...args),
  get: (_target, property) => {
    const cached = boundMembers.get(property);
    if (cached !== undefined) return cached;
    const member = Reflect.get(active, property);
    if (typeof member !== 'function') return member;
    const bound = member.bind(active);
    boundMembers.set(property, bound);
    return bound;
  },
});
