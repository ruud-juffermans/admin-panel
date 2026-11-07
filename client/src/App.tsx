import { Navigate, Route, Routes } from 'react-router-dom';
import styled from 'styled-components';
import { useAuth } from './auth';
import { Shell } from './layout/Shell';
import { ErrorPage } from './pages/Forbidden';
import { FundsPage } from './pages/Funds';
import { InboxPage } from './pages/Inbox';
import { LoginPage } from './pages/Login';
import { OverviewPage } from './pages/Overview';
import { SitePage } from './pages/Site';
import { RevaultPage } from './pages/Revault';
import { AskRuudPage } from './pages/AskRuud';

export function App() {
  const { user, loading, error } = useAuth();

  if (loading) return <Splash>Loading…</Splash>;
  if (error) return <ErrorPage message={error} />;
  if (!user) return <LoginPage />;

  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<OverviewPage />} />
        <Route path="/site" element={<SitePage />} />
        <Route path="/ask-ruud" element={<AskRuudPage />} />
        <Route path="/inbox" element={<InboxPage />} />
        <Route path="/funds" element={<FundsPage />} />
        <Route path="/revault" element={<RevaultPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

const Splash = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--app-text-muted);
`;
