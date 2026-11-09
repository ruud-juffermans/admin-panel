import { useSyncExternalStore } from 'react';

// Colour scheme: the stored preference (light / dark / system) resolved
// against the OS, stamped on <html data-theme> which tokens.css keys off.
// index.html runs the same resolution inline before first paint.
export type ThemePref = 'light' | 'dark' | 'system';
const STORAGE_KEY = 'admin.theme';
const PREFS: ThemePref[] = ['light', 'dark', 'system'];
const listeners = new Set<() => void>();
const mq = () => window.matchMedia('(prefers-color-scheme: dark)');

export function getThemePref(): ThemePref {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && (PREFS as string[]).includes(stored)) return stored as ThemePref;
  } catch {
    /* storage unavailable */
  }
  return 'system';
}

function apply(): void {
  const pref = getThemePref();
  const dark = pref === 'system' ? mq().matches : pref === 'dark';
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}

export function setThemePref(pref: ThemePref): void {
  try {
    if (pref === 'system') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, pref);
  } catch {
    /* ignore */
  }
  apply();
  for (const l of listeners) l();
}

export function initTheme(): void {
  apply();
  mq().addEventListener('change', apply);
}

export function useThemePref(): ThemePref {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getThemePref,
    () => 'system' as ThemePref,
  );
}
