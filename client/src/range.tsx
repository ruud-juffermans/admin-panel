import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

// The global date range: the last N days, shared by every page. Presets 7/30/90
// plus a custom day count (1–365, the server's cap). Remembered per tab.
export const PRESETS = [7, 30, 90] as const;
const STORAGE_KEY = 'admin.range.days';
const MAX_DAYS = 365;

interface RangeState {
  days: number;
  setDays: (days: number) => void;
}

const RangeContext = createContext<RangeState | null>(null);

function clamp(n: number): number {
  if (!Number.isFinite(n)) return 30;
  return Math.min(MAX_DAYS, Math.max(1, Math.round(n)));
}

function initial(): number {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) return clamp(Number(stored));
  } catch {
    /* storage unavailable */
  }
  return 30;
}

export function RangeProvider({ children }: { children: ReactNode }) {
  const [days, setDaysState] = useState<number>(initial);
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, String(days));
    } catch {
      /* ignore */
    }
  }, [days]);
  const value = useMemo(() => ({ days, setDays: (d: number) => setDaysState(clamp(d)) }), [days]);
  return <RangeContext.Provider value={value}>{children}</RangeContext.Provider>;
}

export function useRange(): RangeState {
  const ctx = useContext(RangeContext);
  if (!ctx) throw new Error('useRange must be used within a RangeProvider');
  return ctx;
}

export function rangeLabel(days: number): string {
  return days === 1 ? 'last 24 hours' : `last ${days} days`;
}
