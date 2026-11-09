import { useSyncExternalStore } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { normalizeHex } from './accent';
import { WorkspaceTheme } from './appearanceConfig';

const CACHE_KEY = 'tconnect.workspaceTheme.v1';
const FETCH_TIMEOUT_MS = 8000;
const MAX_BYTES = 16 * 1024;

type Cached = { url: string; theme: WorkspaceTheme | null };

let current: WorkspaceTheme | null = null;
let currentUrl: string | null = null;
let refreshedFor: string | null = null;
let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();

export const workspaceThemeUrlFor = (installationUrl: string) =>
  `${installationUrl.replace(/\/+$/, '')}/mobile-theme.json`;

/** Keeps only the fields we understand; anything else the server sends is ignored. */
export const parseWorkspaceTheme = (value: unknown): WorkspaceTheme | null => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
  const accent = (value as { accent?: unknown }).accent;
  const normalized = typeof accent === 'string' ? normalizeHex(accent) : null;
  return normalized ? { accent: normalized } : null;
};

const publish = (theme: WorkspaceTheme | null, url: string) => {
  if (currentUrl === url && current?.accent === theme?.accent) return;
  current = theme;
  currentUrl = url;
  listeners.forEach(listener => listener());
};

const readCache = async (url: string) => {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return;
    const cached = JSON.parse(raw) as Cached;
    if (cached.url === url) publish(parseWorkspaceTheme(cached.theme), url);
  } catch {
    // Unreadable cache: fetch fresh.
  }
};

const fetchTheme = async (url: string) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
    });
    if (response.status === 404) {
      // The workspace publishes no branding (any more): drop what we cached.
      publish(null, url);
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ url, theme: null } as Cached));
      refreshedFor = url;
      return;
    }
    if (!response.ok) return;
    const text = await response.text();
    if (text.length > MAX_BYTES) return;
    const theme = parseWorkspaceTheme(JSON.parse(text));
    publish(theme, url);
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ url, theme } as Cached));
    refreshedFor = url;
  } catch {
    // Offline or unreachable: keep whatever we have.
  } finally {
    clearTimeout(timer);
  }
};

/** Loads the cached workspace theme, then refreshes it from the server once per session. */
export const ensureWorkspaceTheme = (installationUrl: string): Promise<void> => {
  if (!installationUrl) return Promise.resolve();
  const url = workspaceThemeUrlFor(installationUrl);
  if (currentUrl === url && refreshedFor === url) return Promise.resolve();
  if (inFlight) return inFlight;

  inFlight = (async () => {
    if (currentUrl !== url) {
      current = null;
      currentUrl = null;
      await readCache(url);
    }
    await fetchTheme(url);
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

export const getWorkspaceTheme = () => current;

export const useWorkspaceTheme = () =>
  useSyncExternalStore(subscribe, getWorkspaceTheme, getWorkspaceTheme);

export const resetWorkspaceThemeStore = () => {
  current = null;
  currentUrl = null;
  refreshedFor = null;
  inFlight = null;
  listeners.clear();
};
