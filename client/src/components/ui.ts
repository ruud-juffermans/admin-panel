import styled, { css } from 'styled-components';
import { Link } from 'react-router-dom';

// Shared primitives on top of the CSS variables in styles/tokens.css. Same
// design language as the account app, tuned for dense dashboard content.

const ease = 'cubic-bezier(0.22, 0.61, 0.36, 1)';

/* ---------- layout ---------- */

export const Page = styled.main`
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 24px 24px 96px;
  max-width: 1240px;
  width: 100%;
  margin: 0 auto;

  @media (max-width: 720px) {
    padding: 16px 16px 96px;
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
  font-size: 1.6rem;
  line-height: 1.1;
`;

export const Lead = styled.p`
  margin: 4px 0 0;
  color: var(--app-text-secondary);
  font-size: 0.9375rem;
`;

export const Grid = styled.div<{ $min?: number }>`
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(${({ $min = 320 }) => $min}px, 1fr));
`;

export const Tiles = styled.div`
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));

  @media (max-width: 520px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

export const Card = styled.section`
  background: var(--app-surface-elevated);
  border: 1px solid var(--app-border);
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 1px 2px rgba(11, 17, 32, 0.04), 0 8px 24px rgba(11, 17, 32, 0.04);
  min-width: 0;

  @media (max-width: 480px) {
    padding: 16px;
    border-radius: 14px;
  }
`;

export const CardHead = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
`;

export const SectionTitle = styled.h2`
  font-size: 1.1rem;
  letter-spacing: -0.02em;
`;

export const Muted = styled.span`
  color: var(--app-text-muted);
  font-size: 0.85rem;
`;

export const Eyebrow = styled.div`
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--app-red-text);
`;

/* ---------- feedback ---------- */

// Errors are announced immediately, other notices politely (WCAG 4.1.3).
export const Alert = styled.div.attrs<{ $variant?: 'error' | 'success' | 'info' }>((p) => ({
  role: p.$variant === 'error' || p.$variant === undefined ? 'alert' : 'status',
}))<{ $variant?: 'error' | 'success' | 'info' }>`
  padding: 10px 14px;
  border-radius: 12px;
  font-size: 0.9rem;
  line-height: 1.5;
  ${({ $variant = 'error' }) =>
    $variant === 'success'
      ? css`
          border: 1px solid var(--app-green);
          color: var(--app-green);
          background: var(--app-green-muted);
        `
      : $variant === 'info'
        ? css`
            border: 1px solid var(--app-border);
            color: var(--app-text-secondary);
            background: var(--app-surface);
          `
        : css`
            border: 1px solid var(--app-red);
            color: var(--app-red-text);
            background: var(--app-red-muted);
          `}
`;

export const Empty = styled.div`
  padding: 24px 8px;
  text-align: center;
  color: var(--app-text-muted);
  font-size: 0.9rem;
`;

export const Skeleton = styled.div.attrs({ role: 'status', 'aria-label': 'Loading' })<{ $h?: number }>`
  height: ${({ $h = 120 }) => $h}px;
  border-radius: 12px;
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
  }
`;

/* ---------- badges ---------- */

export const Badge = styled.span<{ $tone?: 'red' | 'muted' | 'green' | 'blue' | 'amber' }>`
  display: inline-flex;
  align-items: center;
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  line-height: 1.5;
  white-space: nowrap;
  ${({ $tone = 'muted' }) =>
    $tone === 'red'
      ? css`
          color: var(--app-red-text);
          background: var(--app-red-muted);
        `
      : $tone === 'green'
        ? css`
            color: var(--app-green);
            background: var(--app-green-muted);
          `
        : $tone === 'blue'
          ? css`
              color: var(--app-blue-text);
              background: var(--app-blue-muted);
            `
          : $tone === 'amber'
            ? css`
                color: var(--app-amber);
                background: var(--app-amber-muted);
              `
            : css`
                color: var(--app-text-secondary);
                background: var(--app-gray-100);
              `}
`;

/* ---------- buttons ---------- */

export const Button = styled.button<{ $variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; $size?: 'sm' | 'md' }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 999px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s ${ease};
  ${({ $size = 'md' }) =>
    $size === 'sm'
      ? css`
          padding: 5px 12px;
          min-height: 32px;
          font-size: 0.82rem;
        `
      : css`
          padding: 8px 18px;
          min-height: 40px;
          font-size: 0.9rem;
        `}

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  ${({ $variant = 'secondary' }) =>
    $variant === 'primary'
      ? css`
          background: var(--app-red);
          color: #fff;
          border: none;
          &:hover:not(:disabled) {
            background: var(--app-red-hover);
          }
        `
      : $variant === 'danger'
        ? css`
            background: transparent;
            color: var(--app-red-text);
            border: 1.5px solid var(--app-red-glow);
            &:hover:not(:disabled) {
              border-color: var(--app-red);
              background: var(--app-red-muted);
            }
          `
        : $variant === 'ghost'
          ? css`
              background: transparent;
              color: var(--app-text-secondary);
              border: 1.5px solid transparent;
              &:hover:not(:disabled) {
                background: var(--app-gray-100);
                color: var(--app-text-primary);
              }
            `
          : css`
              background: transparent;
              color: var(--app-text-primary);
              border: 1.5px solid var(--app-border);
              &:hover:not(:disabled) {
                border-color: var(--app-red);
                background: var(--app-red-muted);
              }
            `}
`;

export const ButtonRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

// A segmented control: a row of pills with one selected. Wraps instead of
// overflowing on narrow screens (WCAG 1.4.10). Use `Segment` with
// aria-pressed for filters and `SegmentLink` (aria-current) for URL tabs.
export const Segmented = styled.div`
  display: inline-flex;
  flex-wrap: wrap;
  max-width: 100%;
  padding: 3px;
  gap: 2px;
  border-radius: 18px;
  border: 1px solid var(--app-border);
  background: var(--app-surface);
`;

const segmentStyle = css<{ $active?: boolean }>`
  border: none;
  border-radius: 999px;
  padding: 5px 12px;
  min-height: 30px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  text-decoration: none;
  white-space: nowrap;
  background: ${({ $active }) => ($active ? 'var(--app-surface-elevated)' : 'transparent')};
  color: ${({ $active }) => ($active ? 'var(--app-text-primary)' : 'var(--app-text-secondary)')};
  /* The selected pill carries a hairline, not only a tint (WCAG 1.4.11). */
  box-shadow: ${({ $active }) => ($active ? 'inset 0 0 0 1px var(--app-text-muted), 0 1px 2px rgba(11, 17, 32, 0.12)' : 'none')};
  transition: all 0.2s ${ease};

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

// Filter pill: exposes its state as aria-pressed unless the caller sets a role.
export const Segment = styled.button.attrs<{ $active?: boolean }>((p) => (p.role ? {} : { 'aria-pressed': !!p.$active }))<{
  $active?: boolean;
}>`
  ${segmentStyle}
`;

// Tab pill backed by the URL (?tab=), so back/forward and deep links work.
export const SegmentLink = styled(Link).attrs<{ $active?: boolean }>((p) => ({ 'aria-current': p.$active ? 'page' : undefined }))<{
  $active?: boolean;
}>`
  display: inline-flex;
  align-items: center;
  ${segmentStyle}
`;

export const Input = styled.input`
  min-height: 36px;
  padding: 6px 12px;
  border-radius: 10px;
  border: 1.5px solid var(--app-input-border);
  background: var(--app-bg);
  color: var(--app-text-primary);
  font-size: 0.9rem;

  &::placeholder {
    color: var(--app-text-secondary);
  }

  &:focus-visible {
    outline: 2px solid transparent;
    border-color: var(--app-red);
    box-shadow: 0 0 0 3px var(--app-red-muted);
  }
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
  font-size: 0.9rem;

  th {
    text-align: left;
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--app-text-muted);
    padding: 6px 8px;
    border-bottom: 1px solid var(--app-border);
    white-space: nowrap;
  }

  td {
    padding: 8px;
    border-bottom: 1px solid var(--app-divider);
    vertical-align: middle;
  }

  tr:last-child td {
    border-bottom: none;
  }

  .num {
    text-align: right;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
`;
