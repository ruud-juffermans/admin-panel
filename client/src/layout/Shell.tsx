import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../auth';
import { useContactStats, useRevaultIntakeStats, useTwinApprovals } from '../api/queries';
import { RangePicker } from '../components/RangePicker';
import { ThemeToggle } from '../components/ThemeToggle';
import { NAV_ICONS, type NavIconName } from '../components/icons';
import { Button, Eyebrow } from '../components/ui';

// App shell: grouped left nav on wide screens, a 48px top bar (breadcrumb,
// date range, theme, sign out) and a five-item bottom nav on phones whose
// "More" sheet holds the rest. Colour in the chrome is grayscale; the active
// item is marked by a neutral fill plus a 2px accent bar.
interface NavItem {
  to: string;
  label: string;
  icon: NavIconName;
  phone?: boolean;
}
interface NavGroup {
  label: string | null;
  items: NavItem[];
}

const GROUPS: NavGroup[] = [
  { label: null, items: [{ to: '/', label: 'Overview', icon: 'overview', phone: true }] },
  {
    label: 'Sites',
    items: [
      { to: '/site', label: 'Portfolio', icon: 'portfolio' },
      { to: '/revault', label: 'Revault', icon: 'revault', phone: true },
      { to: '/loodgieter', label: 'Loodgieter', icon: 'loodgieter' },
    ],
  },
  { label: 'Ask Ruud', items: [{ to: '/ask-ruud', label: 'Ask Ruud', icon: 'askruud', phone: true }] },
  {
    label: 'Ops',
    items: [
      { to: '/inbox', label: 'Inbox', icon: 'inbox', phone: true },
      { to: '/funds', label: 'Funds', icon: 'funds' },
    ],
  },
];
const ALL = GROUPS.flatMap((g) => g.items.map((i) => ({ ...i, group: g.label })));

export function Shell() {
  const { user, logout } = useAuth();
  const contactStats = useContactStats();
  const newCount = contactStats.data?.counts.new ?? 0;
  const approvals = useTwinApprovals();
  const pendingCount = approvals.data?.pending.length ?? 0;
  const revaultStats = useRevaultIntakeStats();
  const newIntakes = revaultStats.data?.counts.NEW ?? 0;
  const badgeFor = (to: string) => (to === '/inbox' ? newCount : to === '/ask-ruud' ? pendingCount : to === '/revault' ? newIntakes : 0);
  const badgeLabel = (to: string) => (to === '/inbox' ? 'new messages' : to === '/revault' ? 'new intake requests' : 'pending approvals');
  const moreCount = ALL.filter((n) => !n.phone).reduce((n, i) => n + badgeFor(i.to), 0);

  const [moreOpen, setMoreOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Each route is a page: update the title and move focus to the page heading
  // so screen readers announce where they landed (WCAG 2.4.2 / 2.4.3).
  const location = useLocation();
  const mainRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);
  const current = ALL.find((n) => (n.to === '/' ? location.pathname === '/' : location.pathname.startsWith(n.to)));
  useEffect(() => {
    document.title = current ? `${current.label} · ruudjuffermans admin` : 'ruudjuffermans admin';
    setMoreOpen(false);
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const heading = mainRef.current?.querySelector<HTMLElement>('h1');
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  }, [location.pathname, current]);

  useEffect(() => {
    if (!moreOpen) return;
    sheetRef.current?.querySelector<HTMLElement>('a, button')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMoreOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [moreOpen]);

  const badge = (to: string) =>
    badgeFor(to) > 0 && (
      <>
        <Count aria-hidden="true">{badgeFor(to)}</Count>
        <span className="sr-only">, {badgeFor(to)} {badgeLabel(to)}</span>
      </>
    );

  return (
    <Frame>
      <Side>
        <Brand>
          <Dot />
          <span>
            ruudjuffermans<b>/admin</b>
          </span>
        </Brand>
        <SideNav aria-label="Main">
          {GROUPS.map((g, gi) => (
            <Group key={gi}>
              {g.label && <GroupLabel>{g.label}</GroupLabel>}
              {g.items.map((n) => {
                const Icon = NAV_ICONS[n.icon];
                return (
                  <SideLink key={n.to} to={n.to} end={n.to === '/'}>
                    <Icon />
                    {n.label}
                    {badge(n.to)}
                  </SideLink>
                );
              })}
            </Group>
          ))}
        </SideNav>
        <SideFoot>
          <Who title={user?.name}>{user?.name}</Who>
        </SideFoot>
      </Side>

      <Main ref={mainRef}>
        <TopBar>
          <Crumb aria-label="Current page">
            <TopDot />
            {current?.group && (
              <>
                <CrumbGroup>{current.group}</CrumbGroup>
                <CrumbSep aria-hidden="true">›</CrumbSep>
              </>
            )}
            <CrumbPage>{current?.label ?? 'Admin'}</CrumbPage>
          </Crumb>
          <TopTools>
            <RangePicker />
            <HideOnPhone>
              <ThemeToggle />
            </HideOnPhone>
            <HideOnPhone>
              <Button type="button" $variant="ghost" $size="sm" onClick={() => void logout()}>
                <NAV_ICONS.signout />
                Sign out
              </Button>
            </HideOnPhone>
          </TopTools>
        </TopBar>
        <Outlet />
      </Main>

      <BottomNav aria-label="Main (mobile)">
        {ALL.filter((n) => n.phone).map((n) => {
          const Icon = NAV_ICONS[n.icon];
          return (
            <BottomLink key={n.to} to={n.to} end={n.to === '/'}>
              <Icon size={20} />
              <span>{n.label}</span>
              {badge(n.to)}
            </BottomLink>
          );
        })}
        <BottomButton type="button" aria-haspopup="dialog" aria-expanded={moreOpen} onClick={() => setMoreOpen(true)}>
          <NAV_ICONS.more size={20} />
          <span>More</span>
          {moreCount > 0 && (
            <>
              <Count aria-hidden="true">{moreCount}</Count>
              <span className="sr-only">, {moreCount} items</span>
            </>
          )}
        </BottomButton>
      </BottomNav>

      {moreOpen && (
        <>
          <Scrim onClick={() => setMoreOpen(false)} aria-hidden="true" />
          <Sheet ref={sheetRef} role="dialog" aria-modal="true" aria-label="More">
            <SheetHead>
              <Eyebrow>More</Eyebrow>
              <IconButton type="button" aria-label="Close" onClick={() => setMoreOpen(false)}>
                <NAV_ICONS.close />
              </IconButton>
            </SheetHead>
            {ALL.filter((n) => !n.phone).map((n) => {
              const Icon = NAV_ICONS[n.icon];
              return (
                <SheetLink key={n.to} to={n.to}>
                  <Icon />
                  {n.label}
                  {badge(n.to)}
                </SheetLink>
              );
            })}
            <SheetRow>
              <span>Theme</span>
              <ThemeToggle />
            </SheetRow>
            <SheetRow>
              <span>{user?.name}</span>
              <Button type="button" $variant="secondary" $size="sm" onClick={() => void logout()}>
                <NAV_ICONS.signout />
                Sign out
              </Button>
            </SheetRow>
          </Sheet>
        </>
      )}
    </Frame>
  );
}

const PHONE = '@media (max-width: 860px)';

const Frame = styled.div`
  min-height: 100vh;
  display: flex;
`;

const Side = styled.aside`
  position: sticky;
  top: 0;
  height: 100vh;
  width: var(--shell-side);
  flex: 0 0 var(--shell-side);
  display: flex;
  flex-direction: column;
  padding: 16px 12px;
  border-right: 1px solid var(--app-border);
  background: var(--app-surface-elevated);

  ${PHONE} {
    display: none;
  }
`;

const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 0 10px 8px;
  font: 700 var(--fs-14) / 1 var(--font-display);
  letter-spacing: -0.02em;
  color: var(--app-text-primary);

  b {
    color: var(--app-text-muted);
    font-weight: 700;
  }
`;

const Dot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--brand);
  flex: 0 0 auto;
`;

const SideNav = styled.nav`
  display: flex;
  flex-direction: column;
`;

const Group = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1px;
`;

const GroupLabel = styled(Eyebrow)`
  padding: 16px 10px 4px;
`;

const SideLink = styled(NavLink)`
  display: flex;
  align-items: center;
  gap: 10px;
  height: 34px;
  padding: 0 10px;
  border-radius: var(--radius-2);
  color: var(--app-text-secondary);
  font-weight: 500;
  font-size: var(--fs-13);
  text-decoration: none;

  svg {
    color: var(--app-text-muted);
    flex: 0 0 auto;
  }

  &:hover {
    background: var(--app-gray-100);
    color: var(--app-text-primary);
    text-decoration: none;
  }

  &.active {
    background: var(--nav-active-bg);
    color: var(--app-text-primary);
    font-weight: 600;
    box-shadow: inset 2px 0 0 var(--accent);

    svg {
      color: var(--accent);
    }
  }
`;

const Count = styled.span`
  margin-left: auto;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--app-text-primary);
  color: var(--app-text-inverse);
  font-size: 10px;
  font-weight: 700;
  line-height: 18px;
  text-align: center;
  font-variant-numeric: tabular-nums;
`;

const SideFoot = styled.div`
  margin-top: auto;
  padding: 8px 10px;
  font-size: var(--fs-12);
  color: var(--app-text-muted);
`;

const Who = styled.div`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Main = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
`;

const TopBar = styled.div`
  position: sticky;
  top: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  height: var(--shell-top);
  padding: 0 var(--gutter);
  background: color-mix(in srgb, var(--app-bg) 88%, transparent);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--app-border);

  @media (max-width: 720px) {
    padding: 0 var(--gutter-phone);
  }
`;

const Crumb = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font-size: var(--fs-13);
  white-space: nowrap;
`;

const TopDot = styled(Dot)`
  display: none;
  margin-right: 2px;

  ${PHONE} {
    display: inline-block;
  }
`;

const CrumbGroup = styled.span`
  color: var(--app-text-muted);

  ${PHONE} {
    display: none;
  }
`;

const CrumbSep = styled.span`
  color: var(--app-text-muted);

  ${PHONE} {
    display: none;
  }
`;

const CrumbPage = styled.span`
  color: var(--app-text-primary);
  font-weight: 600;
`;

const TopTools = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
`;

const HideOnPhone = styled.div`
  display: contents;

  ${PHONE} {
    display: none;
  }
`;

const BottomNav = styled.nav`
  display: none;
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  height: calc(var(--shell-bottom-nav) + env(safe-area-inset-bottom));
  padding: 0 4px env(safe-area-inset-bottom);
  background: var(--app-surface-elevated);
  border-top: 1px solid var(--app-border);

  ${PHONE} {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 1fr;
  }
`;

const bottomItem = `
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  min-height: 44px;
  height: 100%;
  padding: 4px 2px;
  border: none;
  background: none;
  color: var(--app-text-secondary);
  font-size: 11px;
  font-weight: 600;
  text-decoration: none;
  cursor: pointer;
`;

const BottomLink = styled(NavLink)`
  ${bottomItem}

  &.active {
    color: var(--accent-text);
    box-shadow: inset 0 2px 0 var(--accent);
  }

  ${Count} {
    position: absolute;
    top: 4px;
    right: calc(50% - 22px);
    margin: 0;
    min-width: 16px;
    height: 16px;
    line-height: 16px;
  }
`;

const BottomButton = styled.button`
  ${bottomItem}

  &[aria-expanded='true'] {
    color: var(--accent-text);
  }

  ${Count} {
    position: absolute;
    top: 4px;
    right: calc(50% - 22px);
    margin: 0;
    min-width: 16px;
    height: 16px;
    line-height: 16px;
  }
`;

const Scrim = styled.div`
  position: fixed;
  inset: 0;
  z-index: 20;
  background: rgba(10, 15, 28, 0.5);
`;

const Sheet = styled.div`
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 21;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 12px 12px calc(16px + env(safe-area-inset-bottom));
  background: var(--app-surface-elevated);
  border-top: 1px solid var(--app-border);
  border-radius: var(--radius-3) var(--radius-3) 0 0;
  box-shadow: var(--shadow-2);
`;

const SheetHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 4px 6px;
`;

const IconButton = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: var(--radius-2);
  background: none;
  color: var(--app-text-secondary);
  cursor: pointer;

  &:hover {
    background: var(--app-gray-100);
    color: var(--app-text-primary);
  }
`;

const SheetLink = styled(NavLink)`
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 0 10px;
  border-radius: var(--radius-2);
  color: var(--app-text-primary);
  font-size: var(--fs-14);
  font-weight: 500;
  text-decoration: none;

  svg {
    color: var(--app-text-muted);
  }

  &.active {
    background: var(--nav-active-bg);
    box-shadow: inset 2px 0 0 var(--accent);
    svg {
      color: var(--accent);
    }
  }
`;

const SheetRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 44px;
  padding: 0 10px;
  font-size: var(--fs-13);
  color: var(--app-text-secondary);
  border-top: 1px solid var(--app-divider);
`;
