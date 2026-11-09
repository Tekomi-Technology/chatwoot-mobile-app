import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  ChannelIconManifest,
  MAX_MANIFEST_BYTES,
  isChannelIconManifest,
} from './channelIconManifest';

const CACHE_KEY = 'tconnect.channelIconManifest.v1';
const FETCH_TIMEOUT_MS = 8000;

type Cached = { url: string; manifest: ChannelIconManifest };

let current: ChannelIconManifest | null = null;
let currentUrl: string | null = null;
let refreshedFor: string | null = null;
let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();

const publish = (manifest: ChannelIconManifest, url: string) => {
  if (current?.version === manifest.version && currentUrl === url) return;
  current = manifest;
  currentUrl = url;
  listeners.forEach(listener => listener());
};

export const manifestUrlFor = (installationUrl: string) =>
  `${installationUrl.replace(/\/+$/, '')}/channel-icons.json`;

const readCache = async (url: string) => {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return;
    const cached = JSON.parse(raw) as Cached;
    // A cache written for another installation is not ours to show.
    if (cached.url === url && isChannelIconManifest(cached.manifest)) {
      publish(cached.manifest, url);
    }
  } catch {
    // An unreadable cache just means we fetch fresh.
  }
};

const fetchManifest = async (url: string) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
    });
    // Older servers do not publish the manifest yet; the bundled icons cover that.
    if (!response.ok) return;
    const text = await response.text();
    if (text.length > MAX_MANIFEST_BYTES) return;
    const parsed: unknown = JSON.parse(text);
    if (!isChannelIconManifest(parsed)) return;
    publish(parsed, url);
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ url, manifest: parsed } as Cached));
    refreshedFor = url;
  } catch {
    // Offline or unreachable: keep whatever we already have.
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Loads the cached manifest immediately, then refreshes it from the server once
 * per app session. Safe to call from many components.
 */
export const ensureChannelIconManifest = (installationUrl: string): Promise<void> => {
  if (!installationUrl) return Promise.resolve();
  const url = manifestUrlFor(installationUrl);
  if (currentUrl === url && refreshedFor === url) return Promise.resolve();
  if (inFlight) return inFlight;

  inFlight = (async () => {
    if (currentUrl !== url) {
      current = null;
      currentUrl = null;
      await readCache(url);
    }
    await fetchManifest(url);
  })().finally(() => {
    inFlight = null;
  });
  return inFlight;
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const getChannelIconManifest = () => current;

export const useChannelIconManifest = () =>
  useSyncExternalStore(subscribe, getChannelIconManifest, getChannelIconManifest);

/** Test helper: forget everything the store has loaded. */
export const resetChannelIconStore = () => {
  current = null;
  currentUrl = null;
  refreshedFor = null;
  inFlight = null;
  listeners.clear();
};
