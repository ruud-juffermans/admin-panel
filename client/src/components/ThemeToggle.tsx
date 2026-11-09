import styled from 'styled-components';
import { setThemePref, useThemePref, type ThemePref } from '../theme';
import { NAV_ICONS } from './icons';

const OPTIONS: Array<{ value: ThemePref; label: string; Icon: (typeof NAV_ICONS)['sun'] }> = [
  { value: 'light', label: 'Light theme', Icon: NAV_ICONS.sun },
  { value: 'dark', label: 'Dark theme', Icon: NAV_ICONS.moon },
  { value: 'system', label: 'Follow the system theme', Icon: NAV_ICONS.system },
];

// Three-state colour-scheme switch in the top bar (stored in localStorage).
export function ThemeToggle() {
  const pref = useThemePref();
  return (
    <Group role="radiogroup" aria-label="Colour scheme">
      {OPTIONS.map(({ value, label, Icon }) => (
        <Option
          key={value}
          type="button"
          role="radio"
          aria-checked={pref === value}
          aria-label={label}
          title={label}
          $active={pref === value}
          onClick={() => setThemePref(value)}
        >
          <Icon />
        </Option>
      ))}
    </Group>
  );
}

const Group = styled.div`
  display: inline-flex;
  padding: 2px;
  gap: 2px;
  border-radius: var(--radius-2);
  border: 1px solid var(--app-border);
  background: var(--app-surface);
`;

const Option = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: var(--radius-1);
  cursor: pointer;
  color: ${({ $active }) => ($active ? 'var(--app-text-primary)' : 'var(--app-text-muted)')};
  background: ${({ $active }) => ($active ? 'var(--app-surface-elevated)' : 'transparent')};
  box-shadow: ${({ $active }) => ($active ? 'inset 0 0 0 1px var(--app-input-border)' : 'none')};

  &:hover {
    color: var(--app-text-primary);
  }

  @media (max-width: 860px) {
    width: 36px;
    height: 36px;
  }
`;
