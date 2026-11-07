import { useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from '../auth';
import { useContactStats, useRevaultIntakeStats, useTwinApprovals } from '../api/queries';
import { RangePicker } from '../components/RangePicker';

// App shell: left nav on wide screens, a top bar with the date range, and a
// bottom nav on phones.
const NAV = [
  { to: '/', label: 'Overview', icon: '◎', mobile: true },
  { to: '/site', label: 'Site', icon: '▤', mobile: true },
  { to: '/ask-ruud', label: 'Ask Ruud', icon: '✦', mobile: true },
  { to: '/inbox', label: 'Inbox', icon: '✉', mobile: true },
  { to: '/funds', label: 'Funds', icon: '◈', mobile: true },
  { to: '/revault', label: 'Revault', icon: '◆', mobile: true },
];

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

  // Each route is a page: update the title and move focus to the page heading
  // so screen readers announce where they landed (WCAG 2.4.2 / 2.4.3).
  const location = useLocation();
  const mainRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);
  useEffect(() => {
    const current = NAV.find((n) => (n.to === '/' ? location.pathname === '/' : location.pathname.startsWith(n.to)));
    document.title = current ? `${current.label} · ruudjuffermans admin` : 'ruudjuffermans admin';
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const heading = mainRef.current?.querySelector<HTMLElement>('h1');
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  }, [location.pathname]);

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
          {NAV.map((n) => (
            <SideLink key={n.to} to={n.to} end={n.to === '/'}>
              <Icon aria-hidden="true">{n.icon}</Icon>
              {n.label}
              {badgeFor(n.to) > 0 && (
                <>
                  <Count aria-hidden="true">{badgeFor(n.to)}</Count>
                  <span className="sr-only">, {badgeFor(n.to)} {badgeLabel(n.to)}</span>
                </>
              )}
            </SideLink>
          ))}
        </SideNav>
        <SideFoot>
          <Who title={user?.name}>{user?.name}</Who>
          <SignOut type="button" onClick={() => void logout()}>
            Sign out
          </SignOut>
        </SideFoot>
      </Side>

      <Main ref={mainRef}>
        <TopBar>
          <TopBrand>
            <Dot />
            admin
          </TopBrand>
          <RangePicker />
        </TopBar>
        <Outlet />
      </Main>

      <BottomNav aria-label="Main (mobile)">
        {NAV.filter((n) => n.mobile).map((n) => (
          <BottomLink key={n.to} to={n.to} end={n.to === '/'}>
            <Icon aria-hidden="true">{n.icon}</Icon>
            <span>{n.label}</span>
            {badgeFor(n.to) > 0 && (
              <>
                <Count aria-hidden="true">{badgeFor(n.to)}</Count>
                <span className="sr-only">, {badgeFor(n.to)} {badgeLabel(n.to)}</span>
              </>
            )}
          </BottomLink>
        ))}
      </BottomNav>
    </Frame>
  );
}

const SIDE = 220;

const Frame = styled.div`
  min-height: 100vh;
  display: flex;
`;

const Side = styled.aside`
  position: sticky;
  top: 0;
  height: 100vh;
  width: ${SIDE}px;
  flex: 0 0 ${SIDE}px;
  display: flex;
  flex-direction: column;
  padding: 20px 14px;
  border-right: 1px solid var(--app-border);
  background: var(--app-surface);

  @media (max-width: 860px) {
    display: none;
  }
`;

const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px 20px;
  font-family: 'Bricolage Grotesque Variable', Georgia, serif;
  font-weight: 800;
  letter-spacing: -0.02em;
  font-size: 0.95rem;

  b {
    color: var(--app-red);
    font-weight: 800;
  }
`;

const Dot = styled.span`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--app-red);
  box-shadow: 0 0 0 4px var(--app-red-muted);
  flex: 0 0 auto;
`;

const SideNav = styled.nav`
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const Icon = styled.span`
  width: 18px;
  text-align: center;
  color: var(--app-text-muted);
  font-size: 0.95rem;
`;

const SideLink = styled(NavLink)`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border-radius: 10px;
  color: var(--app-text-secondary);
  font-weight: 600;
  font-size: 0.92rem;
  text-decoration: none;

  &:hover {
    background: var(--app-gray-100);
    color: var(--app-text-primary);
    text-decoration: none;
  }

  &.active {
    background: var(--app-red-muted);
    color: var(--app-red-text);

    ${Icon} {
      color: var(--app-red-text);
    }
  }
`;

const Count = styled.span`
  margin-left: auto;
  min-width: 20px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--app-red);
  color: #fff;
  font-size: 0.7rem;
  font-weight: 700;
  line-height: 20px;
  text-align: center;
`;

const SideFoot = styled.div`
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px;
  font-size: 0.82rem;
`;

const Who = styled.div`
  color: var(--app-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const SignOut = styled.button`
  align-self: flex-start;
  border: none;
  background: none;
  padding: 2px 0;
  min-height: 24px;
  color: var(--app-red-text);
  font-weight: 600;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
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
  padding: 10px 24px;
  background: color-mix(in srgb, var(--app-bg) 86%, transparent);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--app-border-soft);

  @media (max-width: 720px) {
    padding: 10px 16px;
  }
`;

const TopBrand = styled.div`
  display: none;
  align-items: center;
  gap: 8px;
  font-family: 'Bricolage Grotesque Variable', Georgia, serif;
  font-weight: 800;

  @media (max-width: 860px) {
    display: flex;
  }
`;

const BottomNav = styled.nav`
  display: none;
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  padding: 6px 8px calc(6px + env(safe-area-inset-bottom));
  background: var(--app-surface-elevated);
  border-top: 1px solid var(--app-border);

  @media (max-width: 860px) {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 1fr;
  }
`;

const BottomLink = styled(NavLink)`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 4px;
  border-radius: 10px;
  color: var(--app-text-secondary);
  font-size: 0.72rem;
  font-weight: 600;
  text-decoration: none;

  ${Icon} {
    font-size: 1.15rem;
  }

  &.active {
    color: var(--app-red-text);
    ${Icon} {
      color: var(--app-red-text);
    }
  }

  ${Count} {
    position: absolute;
    top: 2px;
    right: calc(50% - 22px);
    margin: 0;
  }
`;
