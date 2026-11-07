import styled from 'styled-components';
import { Button, Eyebrow } from '../components/ui';

// The server did not answer the session probe at all (not a 401): the panel
// cannot work, say so and offer a retry.
export function ErrorPage({ message }: { message: string }) {
  return (
    <Center>
      <Eyebrow>Unavailable</Eyebrow>
      <h1>Could not reach the admin API</h1>
      <p>{message}</p>
      <Button $variant="primary" onClick={() => window.location.reload()}>
        Retry
      </Button>
    </Center>
  );
}

export const Center = styled.main`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 12px;
  padding: 24px;

  h1 {
    font-size: 1.8rem;
  }

  p {
    max-width: 440px;
    margin: 0;
    color: var(--app-text-secondary);
  }
`;
