import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { analytics, contact, funds, newsletter, settings } from './website';
import type { ContactStatus, LlmProviderId } from './types';

// Data is "fresh on reload" (PRD §3): no background polling, short stale window
// so page switches reuse what was just fetched.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
  },
});

export const useOverview = (days: number) =>
  useQuery({ queryKey: ['analytics', 'overview', days], queryFn: () => analytics.overview(days) });
export const useTimeseries = (days: number) =>
  useQuery({ queryKey: ['analytics', 'timeseries', days], queryFn: () => analytics.timeseries(days) });
export const useTopPages = (days: number) =>
  useQuery({ queryKey: ['analytics', 'top-pages', days], queryFn: () => analytics.topPages(days) });
export const useTopReferrers = (days: number) =>
  useQuery({ queryKey: ['analytics', 'top-referrers', days], queryFn: () => analytics.topReferrers(days) });

// Alert thresholds from the server's .env; they change on deploy only.
export const useSettings = () => useQuery({ queryKey: ['settings'], queryFn: settings.get, staleTime: Infinity });

export const useContactList = (status?: ContactStatus) =>
  useQuery({ queryKey: ['contact', 'list', status ?? 'all'], queryFn: () => contact.list(status) });
export const useContactStats = () => useQuery({ queryKey: ['contact', 'stats'], queryFn: contact.stats });

export function useContactMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['contact'] });
  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ContactStatus }) => contact.setStatus(id, status),
    onSuccess: invalidate,
  });
  const remove = useMutation({ mutationFn: (id: string) => contact.remove(id), onSuccess: invalidate });
  return { setStatus, remove };
}

export const useSubscribers = () => useQuery({ queryKey: ['newsletter', 'list'], queryFn: () => newsletter.list() });
export const useNewsletterStats = () => useQuery({ queryKey: ['newsletter', 'stats'], queryFn: newsletter.stats });

export function useNewsletterMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['newsletter'] });
  const unsubscribe = useMutation({ mutationFn: (id: string) => newsletter.unsubscribe(id), onSuccess: invalidate });
  const remove = useMutation({ mutationFn: (id: string) => newsletter.remove(id), onSuccess: invalidate });
  return { unsubscribe, remove };
}

// ── Ask Ruud (digital twin) ───────────────────────────────────────────────────
// One retry only: a 502 from the proxy means the twin is down, and the page
// shows that state instead of hammering it.

import { twin } from './twin';
import type { TwinThreadFilters } from './types';

const twinOpts = { retry: 0 as const };

export const useTwinOverview = (days: number) =>
  useQuery({ queryKey: ['twin', 'overview', days], queryFn: () => twin.overview(days), ...twinOpts });
export const useTwinTimeseries = (days: number) =>
  useQuery({ queryKey: ['twin', 'timeseries', days], queryFn: () => twin.timeseries(days), ...twinOpts });
export const useTwinPerformance = (days: number) =>
  useQuery({ queryKey: ['twin', 'performance', days], queryFn: () => twin.performance(days), ...twinOpts });
export const useTwinTurnTrace = (turnId: number | null) =>
  useQuery({ queryKey: ['twin', 'trace', turnId], queryFn: () => twin.turnTrace(turnId as number), enabled: turnId !== null, ...twinOpts });
export const useTwinBudget = (days: number) =>
  useQuery({ queryKey: ['twin', 'budget', days], queryFn: () => twin.budget(days), ...twinOpts });
// The inbox badge polls at most once a minute (PRD §3).
export const useTwinApprovals = () =>
  useQuery({ queryKey: ['twin', 'approvals'], queryFn: twin.approvals, refetchInterval: 60_000, ...twinOpts });
export const useTwinUnanswered = (days: number, status?: 'open' | 'handled') =>
  useQuery({ queryKey: ['twin', 'unanswered', days, status ?? 'all'], queryFn: () => twin.unanswered(days, status), ...twinOpts });
export const useTwinGuardIncidents = (days: number) =>
  useQuery({ queryKey: ['twin', 'incidents', days], queryFn: () => twin.guardIncidents(days), ...twinOpts });
export const useTwinFeedback = (days: number) =>
  useQuery({ queryKey: ['twin', 'feedback', days], queryFn: () => twin.feedback(days), ...twinOpts });
export const useTwinContactMessages = (days: number) =>
  useQuery({ queryKey: ['twin', 'contact-messages', days], queryFn: () => twin.contactMessages(days), ...twinOpts });
export const useTwinEvals = () => useQuery({ queryKey: ['twin', 'evals'], queryFn: () => twin.evals(), ...twinOpts });
export const useTwinEvalRun = (id: number | null) =>
  useQuery({ queryKey: ['twin', 'evals', id], queryFn: () => twin.evalRun(id as number), enabled: id !== null, ...twinOpts });
export const useTwinKnowledge = () => useQuery({ queryKey: ['twin', 'knowledge'], queryFn: twin.knowledge, ...twinOpts });

export const useTwinThreads = (days: number, filters: TwinThreadFilters) =>
  useQuery({ queryKey: ['twin', 'threads', days, filters], queryFn: () => twin.threads(days, filters), ...twinOpts });
export const useTwinThread = (threadId: string | null) =>
  useQuery({ queryKey: ['twin', 'thread', threadId], queryFn: () => twin.thread(threadId as string), enabled: threadId !== null, ...twinOpts });
export const useTwinTurns = (days: number, filters: TwinThreadFilters = {}) =>
  useQuery({ queryKey: ['twin', 'turns', days, filters], queryFn: () => twin.turns(days, filters), ...twinOpts });
export const useTwinPrompt = () => useQuery({ queryKey: ['twin', 'prompt'], queryFn: twin.prompt, ...twinOpts });

export function useTwinMutations() {
  const qc = useQueryClient();
  const decide = useMutation({
    mutationFn: ({ threadId, approved, note }: { threadId: string; approved: boolean; note?: string }) =>
      twin.decide(threadId, approved, note),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['twin', 'approvals'] });
      void qc.invalidateQueries({ queryKey: ['twin', 'contact-messages'] });
      void qc.invalidateQueries({ queryKey: ['twin', 'overview'] });
    },
  });
  const setUnansweredStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: 'open' | 'handled' }) => twin.setUnansweredStatus(id, status),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['twin', 'unanswered'] }),
  });
  return { decide, setUnansweredStatus };
}

// ── LLM provider funds ────────────────────────────────────────────────────────
// The server asks the twin for balances (cached there for 15 minutes) and
// joins the top-up ledger; one query serves the Funds page and the Overview tile.

export const useFunds = () => useQuery({ queryKey: ['funds'], queryFn: funds.get, retry: 0 });

export function useFundsMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ['funds'] });
  const addTopup = useMutation({
    mutationFn: (body: { provider: LlmProviderId; amountUsd: number; toppedUpAt?: string; note?: string }) => funds.addTopup(body),
    onSuccess: invalidate,
  });
  const removeTopup = useMutation({ mutationFn: (id: string) => funds.removeTopup(id), onSuccess: invalidate });
  return { addTopup, removeTopup };
}
