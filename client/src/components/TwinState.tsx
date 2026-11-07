import type { ReactNode } from 'react';
import { ApiError } from '../api/client';
import { Alert, Skeleton } from './ui';

// The twin is reached through the platform proxy; a 502/503 from it means
// "Ask Ruud is unavailable" and must never take the rest of the page down.
export function isTwinUnavailable(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 502 || err.status === 503);
}

export function twinErrorMessage(err: unknown): string {
  if (isTwinUnavailable(err)) return 'Ask Ruud unavailable — the twin did not answer. Site data is unaffected.';
  return err instanceof Error ? err.message : 'Could not load Ask Ruud data.';
}

export function TwinUnavailable({ error }: { error: unknown }) {
  return <Alert $variant={isTwinUnavailable(error) ? 'info' : 'error'}>{twinErrorMessage(error)}</Alert>;
}

// Render helper: skeleton while pending, the unavailable notice on error,
// otherwise the content.
export function TwinData<T>({
  query,
  height = 160,
  children,
}: {
  query: { isPending: boolean; error: unknown; data: T | undefined };
  height?: number;
  children: (data: T) => ReactNode;
}) {
  if (query.isPending) return <Skeleton $h={height} />;
  if (query.error || query.data === undefined) return <TwinUnavailable error={query.error} />;
  return <>{children(query.data)}</>;
}
