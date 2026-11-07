import type { ReactNode } from 'react';
import { ApiError } from '../../api/client';
import type { RevaultIntakeStatus } from '../../api/types';
import { Alert, Skeleton } from '../../components/ui';

// The Revault server is reached through the panel's proxy; a 502/503 from it
// means "Revault is unavailable" and must never take the rest of the page down.
export function isRevaultUnavailable(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 502 || err.status === 503);
}

export function revaultErrorMessage(err: unknown): string {
  if (isRevaultUnavailable(err)) return 'Revault unavailable — its server did not answer. The rest of the panel is unaffected.';
  return err instanceof Error ? err.message : 'Could not load Revault data.';
}

export function RevaultData<T>({
  query,
  height = 160,
  children,
}: {
  query: { isPending: boolean; error: unknown; data: T | undefined };
  height?: number;
  children: (data: T) => ReactNode;
}) {
  if (query.isPending) return <Skeleton $h={height} />;
  if (query.error || query.data === undefined) {
    return <Alert $variant={isRevaultUnavailable(query.error) ? 'info' : 'error'}>{revaultErrorMessage(query.error)}</Alert>;
  }
  return <>{children(query.data)}</>;
}

// The intake workflow, in order: NEW → ASSESSED → VIABLE / NOT_VIABLE →
// AGREEMENT → RECOVERY → CLOSED (revault server, lib/intake.ts).
export const STATUS_LABEL: Record<RevaultIntakeStatus, string> = {
  NEW: 'New',
  ASSESSED: 'Assessed',
  VIABLE: 'Viable',
  NOT_VIABLE: 'Not viable',
  AGREEMENT: 'Agreement',
  RECOVERY: 'Recovery',
  CLOSED: 'Closed',
};

export const STATUS_TONE: Record<RevaultIntakeStatus, 'red' | 'amber' | 'blue' | 'green' | 'muted'> = {
  NEW: 'red',
  ASSESSED: 'amber',
  VIABLE: 'blue',
  NOT_VIABLE: 'muted',
  AGREEMENT: 'blue',
  RECOVERY: 'blue',
  CLOSED: 'green',
};

// Open cases: everything that still needs a step from Ruud.
export const OPEN_STATUSES: RevaultIntakeStatus[] = ['NEW', 'ASSESSED', 'VIABLE', 'AGREEMENT', 'RECOVERY'];

// The intake form's enum values, as the site labels them (messages/en.json).
export const WALLET_TYPE_LABEL: Record<string, string> = {
  software: 'Software wallet',
  hardware: 'Hardware wallet',
  exchange: 'Exchange account',
  paper: 'Paper / metal backup',
  unknown: 'Not sure',
};
export const ISSUE_TYPE_LABEL: Record<string, string> = {
  'forgotten-password': 'Forgotten password',
  'seed-phrase': 'Incomplete seed phrase',
  'damaged-file': 'Damaged wallet file',
  'legacy-wallet': 'Legacy wallet software',
  'hardware-defect': 'Broken hardware wallet',
  inheritance: 'Inherited wallet',
  other: 'Other',
};
