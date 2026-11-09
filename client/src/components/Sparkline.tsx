// Inline sparkline for tiles and site cards. Scaled from 0 to the series max
// (honest amplitude), 1.5px stroke, end dot on the latest value. Decorative:
// the tile's delta text carries the meaning.
export function Sparkline({ values, width = 96, height = 24 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) return null;
  const max = Math.max(1, ...values);
  const pad = 3;
  const step = (width - pad * 2) / (values.length - 1);
  const y = (v: number) => height - pad - (v / max) * (height - pad * 2);
  const pts = values.map((v, i) => [pad + i * step, y(v)] as const);
  const points = pts.map(([x, py]) => `${x.toFixed(1)},${py.toFixed(1)}`).join(' ');
  const [lx, ly] = pts[pts.length - 1]!;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" style={{ display: 'block', marginTop: 2, overflow: 'visible' }}>
      <polyline points={points} fill="none" stroke="var(--chart-1)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lx} cy={ly} r="2.5" fill="var(--chart-1)" stroke="var(--app-surface-elevated)" strokeWidth="1.5" />
    </svg>
  );
}
