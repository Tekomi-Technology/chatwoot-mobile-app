import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  ensureWorkspaceTheme,
  getWorkspaceTheme,
  parseWorkspaceTheme,
  resetWorkspaceThemeStore,
  workspaceThemeUrlFor,
} from '../workspaceThemeStore';

jest.mock('@react-native-async-storage/async-storage', () => {
  const data: Record<string, string> = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (key: string) => data[key] ?? null),
      setItem: jest.fn(async (key: string, value: string) => {
        data[key] = value;
      }),
      __data: data,
    },
  };
});

const INSTALLATION = 'https://chat.example.com/';
const URL = 'https://chat.example.com/mobile-theme.json';

const respond = (body: unknown, status = 200) =>
  jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  });

describe('parseWorkspaceTheme', () => {
  it('keeps a valid accent, normalized', () => {
    expect(parseWorkspaceTheme({ accent: '#ABC' })).toEqual({ accent: '#aabbcc' });
  });

  it.each([null, [], 'x', 3, {}, { accent: 'red' }, { accent: 5 }])('rejects %p', value => {
    expect(parseWorkspaceTheme(value)).toBeNull();
  });

  it('drops fields it does not know', () => {
    expect(parseWorkspaceTheme({ accent: '#123456', script: '<x>' })).toEqual({
      accent: '#123456',
    });
  });
});

describe('workspaceThemeStore', () => {
  beforeEach(() => {
    resetWorkspaceThemeStore();
    jest.clearAllMocks();
    const data = (AsyncStorage as unknown as { __data: Record<string, string> }).__data;
    Object.keys(data).forEach(key => delete data[key]);
  });

  it('builds the url without a double slash', () => {
    expect(workspaceThemeUrlFor(INSTALLATION)).toBe(URL);
  });

  it('fetches, publishes and caches the theme', async () => {
    global.fetch = respond({ accent: '#7c5cfc' }) as unknown as typeof fetch;
    await ensureWorkspaceTheme(INSTALLATION);
    expect(getWorkspaceTheme()).toEqual({ accent: '#7c5cfc' });
    expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
  });

  it('uses the cached theme when offline', async () => {
    global.fetch = respond({ accent: '#7c5cfc' }) as unknown as typeof fetch;
    await ensureWorkspaceTheme(INSTALLATION);
    resetWorkspaceThemeStore();
    global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;
    await ensureWorkspaceTheme(INSTALLATION);
    expect(getWorkspaceTheme()).toEqual({ accent: '#7c5cfc' });
  });

  it('forgets the theme once the workspace stops publishing one', async () => {
    global.fetch = respond({ accent: '#7c5cfc' }) as unknown as typeof fetch;
    await ensureWorkspaceTheme(INSTALLATION);
    resetWorkspaceThemeStore();
    global.fetch = respond({}, 404) as unknown as typeof fetch;
    await ensureWorkspaceTheme(INSTALLATION);
    expect(getWorkspaceTheme()).toBeNull();
  });

  it('does not show another installation its cached colour', async () => {
    global.fetch = respond({ accent: '#7c5cfc' }) as unknown as typeof fetch;
    await ensureWorkspaceTheme('https://other.example.com');
    resetWorkspaceThemeStore();
    global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;
    await ensureWorkspaceTheme(INSTALLATION);
    expect(getWorkspaceTheme()).toBeNull();
  });

  it('keeps the current theme on a server error', async () => {
    global.fetch = respond({ accent: '#7c5cfc' }) as unknown as typeof fetch;
    await ensureWorkspaceTheme(INSTALLATION);
    resetWorkspaceThemeStore();
    global.fetch = respond({}, 500) as unknown as typeof fetch;
    await ensureWorkspaceTheme(INSTALLATION);
    expect(getWorkspaceTheme()).toEqual({ accent: '#7c5cfc' });
  });
});
