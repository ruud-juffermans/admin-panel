import styled, { css } from 'styled-components';
import { Link } from 'react-router-dom';

// Shared primitives on top of the CSS variables in styles/tokens.css. A
// monitoring console: flat hairline cards on a grey plane, rectangular
// controls, grayscale chrome, colour reserved for status and data.

/* ---------- layout ---------- */

export const Page = styled.main`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px var(--gutter) 96px;
  max-width: var(--page-max);
  width: 100%;
  margin: 0 auto;

  @media (max-width: 720px) {
    padding: 16px var(--gutter-phone) 96px;
    gap: 16px;
  }
`;

export const PageHeader = styled.header`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
`;

export const Title = styled.h1`
  font: 700 var(--fs-20) / 1.2 var(--font-display);
  letter-spacing: -0.02em;
`;

export const Lead = styled.p`
  margin: 2px 0 0;
  color: var(--app-text-secondary);
  font-size: var(--fs-13);
  line-height: var(--lh-body);
`;

export const Grid = styled.div<{ $min?: number }>`
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(${({ $min = 320 }) => $min}px, 1fr));
`;

export const Tiles = styled.div`
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));

  @media (max-width: 520px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
`;

export const Card = styled.section`
  background: var(--app-surface-elevated);
  border: 1px solid var(--app-border);
  border-radius: var(--radius-3);
  padding: 16px;
  box-shadow: var(--shadow-1);
  min-width: 0;

  @media (max-width: 480px) {
    padding: 14px;
  }
`;

export const CardHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 24px;
  margin-bottom: 12px;
`;

export const SectionTitle = styled.h2`
  font-size: var(--fs-14);
  font-weight: 600;
  line-height: var(--lh-snug);
`;

export const Muted = styled.span`
  color: var(--app-text-muted);
  font-size: var(--fs-12);
  line-height: 1.4;
`;

// Group label / eyebrow: small caps in muted grey, never a colour.
export const Eyebrow = styled.div`
  font-size: var(--fs-11);
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--app-text-muted);
  line-height: 1.2;
`;

/* ---------- feedback ---------- */

// Errors are announced immediately, other notices politely (WCAG 4.1.3). The
// leading glyph carries the variant alongside the colour.
export const Alert = styled.div.attrs<{ $variant?: 'error' | 'success' | 'info' }>((p) => ({
  role: p.$variant === 'error' || p.$variant === undefined ? 'alert' : 'status',
}))<{ $variant?: 'error' | 'success' | 'info' }>`
  display: grid;
  grid-template-columns: 16px 1fr;
  gap: 8px;
  align-items: start;
  padding: 10px 12px;
  border-radius: var(--radius-2);
  font-size: var(--fs-13);
  line-height: 1.45;

  &::before {
    font-size: 10px;
    line-height: 19px;
    text-align: center;
  }

  ${({ $variant = 'error' }) =>
    $variant === 'success'
      ? css`
          border: 1px solid var(--status-ok-border);
          color: var(--status-ok-text);
          background: var(--status-ok-fill);
          &::before {
            content: '●';
          }
        `
      : $variant === 'info'
        ? css`
            border: 1px solid var(--app-border);
            color: var(--app-text-secondary);
            background: var(--status-neutral-fill);
            &::before {
              content: '○';
            }
          `
        : css`
            border: 1px solid var(--status-bad-border);
            color: var(--status-bad-text);
            background: var(--status-bad-fill);
            &::before {
              content: '◆';
            }
          `}
`;

export const Empty = styled.div`
  padding: 24px 8px;
  text-align: center;
  color: var(--app-text-muted);
  font-size: var(--fs-13);
`;

export const Skeleton = styled.div.attrs({ role: 'status', 'aria-label': 'Loading' })<{ $h?: number }>`
  height: ${({ $h = 120 }) => $h}px;
  border-radius: var(--radius-2);
  background: linear-gradient(90deg, var(--app-surface) 25%, var(--app-gray-100) 50%, var(--app-surface) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;

  @keyframes shimmer {
    from {
      background-position: 200% 0;
    }
    to {
      background-position: -200% 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
    background: var(--app-surface);
  }
`;

/* ---------- badges ---------- */

export type Tone = 'ok' | 'warn' | 'bad' | 'info' | 'neutral';
// Legacy tone names still accepted by older pages.
export type BadgeTone = Tone | 'red' | 'muted' | 'green' | 'blue' | 'amber';
export const toneOf = (t: BadgeTone | undefined): Tone =>
  t === 'red' ? 'bad' : t === 'green' ? 'ok' : t === 'amber' ? 'warn' : t === 'blue' ? 'info' : t === 'muted' || t === undefined ? 'neutral' : t;

// Status chip: 20px, rectangular, tonal fill. Callers add a StatusGlyph as the
// first child so the state is never carried by colour alone.
export const Badge = styled.span<{ $tone?: BadgeTone }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 20px;
  padding: 0 7px;
  border-radius: var(--radius-1);
  border: 1px solid transparent;
  font-size: var(--fs-11);
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  ${({ $tone }) => {
    const t = toneOf($tone);
    return css`
      color: var(--status-${t}-text);
      background: var(--status-${t}-fill);
    `;
  }}

  @media (forced-colors: active) {
    border-color: currentColor;
  }
`;

/* ---------- buttons ---------- */

export const Button = styled.button<{ $variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; $size?: 'sm' | 'md' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: var(--radius-2);
  font-weight: 600;

  /* Phone: controls inside a detail sheet are thumb targets. */
  @media (max-width: 860px) {
    [role='region'] &,
    [role='dialog'] & {
      min-height: 40px;
    }
  }
  white-space: nowrap;
  cursor: pointer;
  transition: background-color var(--dur-1) var(--ease), border-color var(--dur-1) var(--ease), opacity var(--dur-1) var(--ease);
  ${({ $size = 'md' }) =>
    $size === 'sm'
      ? css`
          padding: 0 10px;
          min-height: 28px;
          font-size: var(--fs-12);
        `
      : css`
          padding: 0 12px;
          min-height: 32px;
          font-size: var(--fs-13);
        `}

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  ${({ $variant = 'secondary' }) =>
    $variant === 'primary'
      ? css`
          background: var(--app-text-primary);
          color: var(--app-text-inverse);
          border: 1px solid var(--app-text-primary);
          &:hover:not(:disabled) {
            opacity: 0.9;
          }
        `
      : $variant === 'danger'
        ? css`
            background: transparent;
            color: var(--status-bad-text);
            border: 1px solid var(--status-bad-border);
            &:hover:not(:disabled) {
              background: var(--status-bad-fill);
            }
          `
        : $variant === 'ghost'
          ? css`
              background: transparent;
              color: var(--app-text-secondary);
              border: 1px solid transparent;
              &:hover:not(:disabled) {
                background: var(--app-gray-100);
                color: var(--app-text-primary);
              }
            `
          : css`
              background: transparent;
              color: var(--app-text-primary);
              border: 1px solid var(--app-input-border);
              &:hover:not(:disabled) {
                background: var(--app-gray-100);
              }
            `}
`;

export const ButtonRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

// A segmented control: a row of segments with one selected. Wraps instead of
// overflowing on narrow screens (WCAG 1.4.10). Use `Segment` with
// aria-pressed for filters and `SegmentLink` (aria-current) for URL tabs.
export const Segmented = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  max-width: 100%;
  padding: 2px;
  gap: 2px;
  border-radius: var(--radius-2);
  border: 1px solid var(--app-border);
  background: var(--app-surface);
`;

const segmentStyle = css<{ $active?: boolean }>`
  border: none;
  border-radius: var(--radius-1);
  padding: 0 10px;
  min-height: 28px;
  font-size: var(--fs-12);
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: ${({ $active }) => ($active ? 'var(--app-surface-elevated)' : 'transparent')};
  color: ${({ $active }) => ($active ? 'var(--app-text-primary)' : 'var(--app-text-secondary)')};
  /* The selected segment carries a 3:1 hairline, not only a tint (WCAG 1.4.11). */
  box-shadow: ${({ $active }) => ($active ? 'inset 0 0 0 1px var(--app-input-border)' : 'none')};
  transition: background-color var(--dur-1) var(--ease), color var(--dur-1) var(--ease);

  &:hover {
    color: var(--app-text-primary);
    text-decoration: none;
  }

  @media (forced-colors: active) {
    &[aria-pressed='true'],
    &[aria-current] {
      outline: 2px solid ButtonText;
    }
  }
`;

// Filter segment: exposes its state as aria-pressed unless the caller sets a role.
export const Segment = styled.button.attrs<{ $active?: boolean }>((p) => (p.role ? {} : { 'aria-pressed': !!p.$active }))<{
  $active?: boolean;
}>`
  ${segmentStyle}
`;

// Tab segment backed by the URL (?tab=), so back/forward and deep links work.
export const SegmentLink = styled(Link).attrs<{ $active?: boolean }>((p) => ({ 'aria-current': p.$active ? 'page' : undefined }))<{
  $active?: boolean;
}>`
  ${segmentStyle}
`;

export const inputStyle = css`
  min-height: 32px;
  padding: 0 10px;
  border-radius: var(--radius-2);
  border: 1px solid var(--app-input-border);
  background: var(--app-surface-elevated);
  color: var(--app-text-primary);
  font-size: var(--fs-13);

  &::placeholder {
    color: var(--app-text-muted);
  }

  &:focus-visible {
    outline: 2px solid transparent;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-muted);
  }
`;

export const Input = styled.input`
  ${inputStyle}
`;

export const Select = styled.select`
  ${inputStyle}
`;

export const Textarea = styled.textarea`
  ${inputStyle}
  min-height: 96px;
  padding: 8px 10px;
  line-height: var(--lh-body);
  resize: vertical;
`;

export const VisuallyHidden = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
`;

/* ---------- tables ---------- */

export const TableWrap = styled.div`
  overflow-x: auto;
  margin: 0 -4px;
  padding: 0 4px;
`;

export const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: var(--fs-13);

  th {
    text-align: left;
    height: 32px;
    font-size: var(--fs-11);
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--app-text-muted);
    padding: 0 10px;
    border-bottom: 1px solid var(--app-border);
    white-space: nowrap;
  }

  td {
    padding: 8px 10px;
    border-bottom: 1px solid var(--app-divider);
    vertical-align: middle;
    line-height: 1.4;
  }

  tbody tr:hover td {
    background: var(--app-gray-50);
  }

  tr:last-child td {
    border-bottom: none;
  }

  .num {
    text-align: right;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .mono {
    font-family: var(--font-mono);
    font-size: var(--fs-12);
  }
`;

/* ---------- lists ---------- */

// A selectable list row (master–detail lists): neutral hover, accent-marked
// selection that does not depend on colour alone (inset bar + aria-current).
export const rowButtonStyle = css<{ $active?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
  text-align: left;
  padding: 10px 12px;
  border-radius: var(--radius-2);
  border: 1px solid transparent;
  background: ${({ $active }) => ($active ? 'var(--row-selected-bg)' : 'transparent')};
  box-shadow: ${({ $active }) => ($active ? 'inset 2px 0 0 var(--accent)' : 'none')};
  cursor: pointer;
  color: inherit;

  &:hover {
    background: ${({ $active }) => ($active ? 'var(--row-selected-bg)' : 'var(--app-gray-50)')};
  }
`;

export const Mono = styled.span`
  font-family: var(--font-mono);
  font-size: var(--fs-12);
`;
