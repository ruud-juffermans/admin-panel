// Formatting helpers shared by tiles, tables and the chart.

const compact = new Intl.NumberFormat('en-GB', { notation: 'compact', maximumFractionDigits: 1 });
const plain = new Intl.NumberFormat('en-GB');

export function fmtNumber(n: number): string {
  return n >= 10_000 ? compact.format(n) : plain.format(n);
}

export function fmtPercent(part: number, whole: number): string {
  if (!whole) return '0%';
  const pct = (part / whole) * 100;
  return `${pct < 10 ? pct.toFixed(1) : Math.round(pct)}%`;
}

// Signed change vs a previous value, e.g. "+12%" / "−8%" / "new".
export function fmtDelta(current: number, previous: number): string {
  if (!previous) return current ? 'new' : '±0%';
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return '±0%';
  return pct > 0 ? `+${pct}%` : `−${Math.abs(pct)}%`;
}

export function fmtDateTime(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function fmtDay(day: string): string {
  // "2026-10-22" → "22 Oct"
  const [y, m, d] = day.split('-').map(Number);
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' }).format(new Date(Date.UTC(y, m - 1, d)));
}
