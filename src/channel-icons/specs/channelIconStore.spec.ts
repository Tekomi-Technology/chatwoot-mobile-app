import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  ensureChannelIconManifest,
  getChannelIconManifest,
  manifestUrlFor,
  resetChannelIconStore,
} from '../channelIconStore';
import { manifestFixture } from './manifestFixture';

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
const URL = 'https://chat.example.com/channel-icons.json';

const respond = (body: unknown, ok = true) =>
  jest.fn().mockResolvedValue({ ok, text: async () => JSON.stringify(body) });

describe('channelIconStore', () => {
  beforeEach(() => {
    resetChannelIconStore();
    jest.clearAllMocks();
    Object.keys((AsyncStorage as unknown as { __data: object }).__data).forEach(
      key => delete (AsyncStorage as unknown as { __data: Record<string, string> }).__data[key],
    );
  });

  it('builds the manifest url without a double slash', () => {
    expect(manifestUrlFor(INSTALLATION)).toBe(URL);
    expect(manifestUrlFor('https://chat.example.com')).toBe(URL);
  });

  it('fetches, publishes and caches the manifest', async () => {
    global.fetch = respond(manifestFixture) as unknown as typeof fetch;
    await ensureChannelIconManifest(INSTALLATION);
    expect(global.fetch).toHaveBeenCalledWith(URL, expect.any(Object));
    expect(getChannelIconManifest()?.version).toBe('v1');
    expect(AsyncStorage.setItem).toHaveBeenCalledTimes(1);
  });

  it('shows the cached manifest when the server is unreachable', async () => {
    global.fetch = respond(manifestFixture) as unknown as typeof fetch;
    await ensureChannelIconManifest(INSTALLATION);
    resetChannelIconStore();

    global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;
    await ensureChannelIconManifest(INSTALLATION);
    expect(getChannelIconManifest()?.version).toBe('v1');
  });

  it('ignores a cache written for another installation', async () => {
    global.fetch = respond(manifestFixture) as unknown as typeof fetch;
    await ensureChannelIconManifest('https://other.example.com');
    resetChannelIconStore();

    global.fetch = jest.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;
    await ensureChannelIconManifest(INSTALLATION);
    expect(getChannelIconManifest()).toBeNull();
  });

  it('keeps bundled icons when the server has no manifest', async () => {
    global.fetch = respond({}, false) as unknown as typeof fetch;
    await ensureChannelIconManifest(INSTALLATION);
    expect(getChannelIconManifest()).toBeNull();
  });

  it('rejects a malformed manifest', async () => {
    global.fetch = respond({ version: 'x', icons: 'nope' }) as unknown as typeof fetch;
    await ensureChannelIconManifest(INSTALLATION);
    expect(getChannelIconManifest()).toBeNull();
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('only refreshes once per session', async () => {
    global.fetch = respond(manifestFixture) as unknown as typeof fetch;
    await ensureChannelIconManifest(INSTALLATION);
    await ensureChannelIconManifest(INSTALLATION);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
