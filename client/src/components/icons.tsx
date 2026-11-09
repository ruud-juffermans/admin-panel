import type { SVGProps } from 'react';

// Inline SVG icon set: 16px, 1.5px stroke, currentColor. Navigation icons and
// the status glyphs that always travel with a status colour so meaning
// survives colourblindness and grayscale (the Unicode fallback is the title).

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const base = (size: number): SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  focusable: false,
});

export const NAV_ICONS = {
  overview: ({ size = 16, ...p }: IconProps) => (
    <svg {...base(size)} {...p}>
      <rect x="2" y="2" width="5" height="5" rx="1" />
      <rect x="9" y="2" width="5" height="5" rx="1" />
      <rect x="2" y="9" width="5" height="5" rx="1" />
      <rect x="9" y="9" width="5" height="5" rx="1" />
    </svg>
  ),
  portfolio: ({ size = 16, ...p }: IconProps) => (
    <svg {...base(size)} {...p}>
      <circle cx="8" cy="8" r="6" />
      <path d="M2 8h12M8 2c2 2 2 10 0 12M8 2c-2 2-2 10 0 12" />
    </svg>
  ),
  revault: ({ size = 16, ...p }: IconProps) => (
    <svg {...base(size)} {...p}>
      <rect x="2.5" y="2.5" width="11" height="11" rx="1.5" />
      <circle cx="8" cy="8" r="2.5" />
      <path d="M8 5.5V4M8 12v-1.5M5.5 8H4M12 8h-1.5" />
    </svg>
  ),
  loodgieter: ({ size = 16, ...p }: IconProps) => (
    <svg {...base(size)} {...p}>
      <path d="M2 8.5 8 3l6 5.5" />
      <path d="M4 7.5V13h8V7.5" />
      <path d="M9.5 13v-3h-3v3" />
    </svg>
  ),
  askruud: ({ size = 16, ...p }: IconProps) => (
    <svg {...base(size)} {...p}>
      <path d="M3 3h10v7H7l-3 3v-3H3z" />
      <path d="M6 6.5h4" />
    </svg>
  ),
  inbox: ({ size = 16, ...p }: IconProps) => (
    <svg {...base(size)} {...p}>
      <path d="M2.5 9.5 4 3.5h8l1.5 6v3h-11z" />
      <path d="M2.5 9.5H6a2 2 0 0 0 4 0h3.5" />
    </svg>
  ),
  funds: ({ size = 16, ...p }: IconProps) => (
    <svg {...base(size)} {...p}>
      <rect x="2" y="4" width="12" height="8.5" rx="1.5" />
      <path d="M2 7h12" />
      <path d="M4.5 10.5h3" />
    </svg>
  ),
  more: ({ size = 16, ...p }: IconProps) => (
    <svg {...base(size)} {...p}>
      <circle cx="3.5" cy="8" r="1" fill="currentColor" />
      <circle cx="8" cy="8" r="1" fill="currentColor" />
      <circle cx="12.5" cy="8" r="1" fill="currentColor" />
    </svg>
  ),
  sun: ({ size = 16, ...p }: IconProps) => (
    <svg {...base(size)} {...p}>
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1.5v1.5M8 13v1.5M1.5 8H3M13 8h1.5M3.4 3.4l1 1M11.6 11.6l1 1M3.4 12.6l1-1M11.6 4.4l1-1" />
    </svg>
  ),
  moon: ({ size = 16, ...p }: IconProps) => (
    <svg {...base(size)} {...p}>
      <path d="M13 9.5A5.5 5.5 0 0 1 6.5 3a5.5 5.5 0 1 0 6.5 6.5z" />
    </svg>
  ),
  system: ({ size = 16, ...p }: IconProps) => (
    <svg {...base(size)} {...p}>
      <rect x="2" y="3" width="12" height="8" rx="1.5" />
      <path d="M6 13.5h4M8 11v2.5" />
    </svg>
  ),
  signout: ({ size = 16, ...p }: IconProps) => (
    <svg {...base(size)} {...p}>
      <path d="M6.5 2.5H3.5v11h3" />
      <path d="M10 5l3 3-3 3M13 8H6.5" />
    </svg>
  ),
  close: ({ size = 16, ...p }: IconProps) => (
    <svg {...base(size)} {...p}>
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  ),
  chevron: ({ size = 16, ...p }: IconProps) => (
    <svg {...base(size)} {...p}>
      <path d="M6 3.5 10.5 8 6 12.5" />
    </svg>
  ),
};
export type NavIconName = keyof typeof NAV_ICONS;

// Status glyphs. Shape carries the state: ● ok · ▲ warn · ◆ bad · ○ info ·
// ⊘ off/neutral · ◐ ◑ ◕ progress through a workflow.
export type Glyph = 'dot' | 'ring' | 'tri' | 'diamond' | 'slash' | 'half' | 'threequarter' | 'quarter';
const GLYPH_TEXT: Record<Glyph, string> = { dot: '●', ring: '○', tri: '▲', diamond: '◆', slash: '⊘', half: '◐', threequarter: '◕', quarter: '◑' };

export function StatusGlyph({ glyph, size = 10, title, style }: { glyph: Glyph; size?: number; title?: string; style?: React.CSSProperties }) {
  const common: SVGProps<SVGSVGElement> = {
    width: size,
    height: size,
    viewBox: '0 0 10 10',
    'aria-hidden': title ? undefined : true,
    role: title ? 'img' : undefined,
    focusable: false,
    style: { display: 'inline-block', verticalAlign: '-0.08em', flex: '0 0 auto', ...style },
  };
  const t = title ? <title>{title}</title> : null;
  switch (glyph) {
    case 'dot':
      return <svg {...common}>{t}<circle cx="5" cy="5" r="4" fill="currentColor" /></svg>;
    case 'ring':
      return <svg {...common}>{t}<circle cx="5" cy="5" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.5" /></svg>;
    case 'tri':
      return <svg {...common}>{t}<path d="M5 1 9.5 9h-9z" fill="currentColor" /></svg>;
    case 'diamond':
      return <svg {...common}>{t}<path d="M5 .8 9.2 5 5 9.2.8 5z" fill="currentColor" /></svg>;
    case 'slash':
      return <svg {...common}>{t}<circle cx="5" cy="5" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M2.5 7.5l5-5" stroke="currentColor" strokeWidth="1.5" /></svg>;
    case 'quarter':
      return <svg {...common}>{t}<circle cx="5" cy="5" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M5 1.5A3.5 3.5 0 0 1 8.5 5H5z" fill="currentColor" /></svg>;
    case 'half':
      return <svg {...common}>{t}<circle cx="5" cy="5" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M5 1.5a3.5 3.5 0 0 1 0 7z" fill="currentColor" /></svg>;
    case 'threequarter':
      return <svg {...common}>{t}<circle cx="5" cy="5" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.5" /><path d="M5 1.5a3.5 3.5 0 1 1-3.5 3.5H5z" fill="currentColor" /></svg>;
  }
}

export const glyphText = (g: Glyph) => GLYPH_TEXT[g];
