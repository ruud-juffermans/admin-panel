import { ApiError } from '../../api/client';
import type { RevaultIntakeStatus } from '../../api/types';
import type { Tone } from '../../components/ui';
import type { Glyph } from '../../components/icons';

// The Revault server is reached through the panel's proxy; a 502/503 from it
// means "Revault is unavailable" and must never take the rest of the page down.
export function isRevaultUnavailable(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 502 || err.status === 503);
}

export function revaultErrorMessage(err: unknown): string {
  if (isRevaultUnavailable(err)) return 'Revault unavailable — its server did not answer. The rest of the panel is unaffected.';
  return err instanceof Error ? err.message : 'Could not load Revault data.';
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

// Tone says who is waiting: warn = Ruud owes the client a step, info = in
// assessment, ok = progressing, neutral = finished. The glyph fills up as the
// case moves towards recovery (◐ viable → ◔ agreement → ◕ recovery → ● closed).
export const STATUS_TONE: Record<RevaultIntakeStatus, Tone> = {
  NEW: 'warn',
  ASSESSED: 'info',
  VIABLE: 'ok',
  NOT_VIABLE: 'neutral',
  AGREEMENT: 'ok',
  RECOVERY: 'ok',
  CLOSED: 'neutral',
};

export const STATUS_GLYPH: Record<RevaultIntakeStatus, Glyph> = {
  NEW: 'tri',
  ASSESSED: 'ring',
  VIABLE: 'half',
  NOT_VIABLE: 'slash',
  AGREEMENT: 'quarter',
  RECOVERY: 'threequarter',
  CLOSED: 'dot',
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
