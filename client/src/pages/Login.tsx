import { useState, type FormEvent } from 'react';
import styled from 'styled-components';
import { useAuth } from '../auth';
import { ApiError } from '../api/client';
import { Alert, Button, Eyebrow, Input } from '../components/ui';

// The only way in: the username and password from the server's .env. Five
// wrong attempts per 15 minutes and the server answers 429 for a while.
export function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not sign in. Is the server running?');
      setBusy(false);
    }
  }

  return (
    <Center>
      <Card onSubmit={submit} aria-labelledby="login-title">
        <Brand>
          <Dot />
          <span>
            ruudjuffermans<b>/admin</b>
          </span>
        </Brand>
        <Eyebrow>Private</Eyebrow>
        <h1 id="login-title">Sign in</h1>
        <Field>
          <label htmlFor="username">Username</label>
          <Input id="username" name="username" autoComplete="username" autoFocus required value={username} onChange={(e) => setUsername(e.target.value)} />
        </Field>
        <Field>
          <label htmlFor="password">Password</label>
          <Input id="password" name="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>
        {error && <Alert>{error}</Alert>}
        <Button type="submit" $variant="primary" disabled={busy || !username || !password}>
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </Card>
    </Center>
  );
}

const Center = styled.main`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
`;

const Card = styled.form`
  width: 100%;
  max-width: 360px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 28px 24px;
  background: var(--app-surface-elevated);
  border: 1px solid var(--app-border);
  border-radius: 18px;
  box-shadow: 0 1px 2px rgba(11, 17, 32, 0.04), 0 12px 32px rgba(11, 17, 32, 0.06);

  h1 {
    margin: -6px 0 4px;
    font-size: 1.6rem;
  }
`;

const Brand = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-family: 'Bricolage Grotesque Variable', Georgia, serif;
  font-weight: 800;
  letter-spacing: -0.02em;

  b {
    color: var(--app-red);
  }
`;

const Dot = styled.span`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--app-red);
  box-shadow: 0 0 0 4px var(--app-red-muted);
`;

const Field = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;

  label {
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--app-text-secondary);
  }

  input {
    width: 100%;
  }
`;
