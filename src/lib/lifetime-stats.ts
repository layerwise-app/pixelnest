import { useSyncExternalStore } from 'react';

export type LifetimeStats = { images: number; originalBytes: number; outputBytes: number };

const KEY = 'pixelnest:lifetime:v1';
const EMPTY: LifetimeStats = { images: 0, originalBytes: 0, outputBytes: 0 };
const listeners = new Set<() => void>();
let cache: LifetimeStats | null = null;

// Storage can be unavailable (private mode, blocked site data); stats then live for this tab only.
function read(): LifetimeStats {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (parsed && typeof parsed === 'object') {
      const { images, originalBytes, outputBytes } = parsed as Record<string, unknown>;
      if ([images, originalBytes, outputBytes].every((value) => typeof value === 'number' && value >= 0)) {
        return parsed as LifetimeStats;
      }
    }
  } catch {
    // Fall through to empty stats.
  }
  return EMPTY;
}

function snapshot() {
  cache ??= read();
  return cache;
}

export function recordLifetime(delta: LifetimeStats) {
  const current = snapshot();
  cache = {
    images: current.images + delta.images,
    originalBytes: Math.max(0, current.originalBytes + delta.originalBytes),
    outputBytes: Math.max(0, current.outputBytes + delta.outputBytes),
  };
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // Keep the in-memory total.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== KEY) return;
    cache = read();
    listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function useLifetimeStats() {
  return useSyncExternalStore(subscribe, snapshot, () => EMPTY);
}
