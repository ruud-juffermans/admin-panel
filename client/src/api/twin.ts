import { get, patch, post, qs } from './client';
import type {
  TwinApproval,
  TwinApprovalResult,
  TwinBudget,
  TwinContactMessage,
  TwinDayPoint,
  TwinEvalCase,
  TwinEvalRun,
  TwinFeedback,
  TwinGuardIncident,
  TwinKnowledge,
  TwinOverview,
  TwinPerformance,
  TwinPrompt,
  TwinThread,
  TwinThreadFilters,
  TwinThreadSummary,
  TwinTurn,
  TwinTurnTrace,
  TwinUnanswered,
} from './types';

// Everything goes through the panel server's proxy; the browser never sees
// the twin's origin or token.
const TWIN = '/api/website/admin/twin';

export const twin = {
  overview: (days: number) => get<TwinOverview>(`${TWIN}/stats/overview${qs({ days })}`),
  timeseries: (days: number) => get<{ days: number; series: TwinDayPoint[] }>(`${TWIN}/stats/timeseries${qs({ days })}`),
  performance: (days: number) => get<TwinPerformance>(`${TWIN}/stats/performance${qs({ days })}`),
  turnTrace: (turnId: number) => get<TwinTurnTrace>(`${TWIN}/turns/${turnId}/trace`),
  budget: (days: number) => get<TwinBudget>(`${TWIN}/budget${qs({ days })}`),
  approvals: () => get<{ pending: TwinApproval[] }>(`${TWIN}/approvals`),
  decide: (threadId: string, approved: boolean, note?: string) =>
    post<TwinApprovalResult>(`${TWIN}/approvals/${encodeURIComponent(threadId)}`, { approved, note: note || null }),
  unanswered: (days: number, status?: 'open' | 'handled', limit = 200) =>
    get<{ items: TwinUnanswered[] }>(`${TWIN}/unanswered${qs({ days, status, limit })}`),
  setUnansweredStatus: (id: number, status: 'open' | 'handled') =>
    patch<{ item: TwinUnanswered }>(`${TWIN}/unanswered/${id}`, { status }),
  guardIncidents: (days: number, limit = 200) =>
    get<{ items: TwinGuardIncident[] }>(`${TWIN}/guard-incidents${qs({ days, limit })}`),
  feedback: (days: number, limit = 200) => get<{ items: TwinFeedback[] }>(`${TWIN}/feedback${qs({ days, limit })}`),
  contactMessages: (days: number, limit = 200) =>
    get<{ items: TwinContactMessage[] }>(`${TWIN}/contact-messages${qs({ days, limit })}`),
  evals: (limit = 50) => get<{ runs: TwinEvalRun[] }>(`${TWIN}/evals${qs({ limit })}`),
  evalRun: (id: number) => get<{ run: TwinEvalRun; cases: TwinEvalCase[] }>(`${TWIN}/evals/${id}`),
  knowledge: () => get<TwinKnowledge>(`${TWIN}/knowledge`),
  // Prompt log (M3)
  turns: (days: number, filters: TwinThreadFilters = {}, limit = 500, offset = 0) =>
    get<{ total: number; offset: number; limit: number; items: TwinTurn[] }>(
      `${TWIN}/turns${qs({ days, limit, offset, ...filterParams(filters) })}`,
    ),
  threads: (days: number, filters: TwinThreadFilters = {}, limit = 200) =>
    get<{ items: TwinThreadSummary[] }>(`${TWIN}/threads${qs({ days, limit, ...filterParams(filters) })}`),
  thread: (threadId: string) => get<TwinThread>(`${TWIN}/threads/${encodeURIComponent(threadId)}`),
  prompt: () => get<TwinPrompt>(`${TWIN}/prompt`),
};

function filterParams(f: TwinThreadFilters): Record<string, string | undefined> {
  return {
    q: f.q?.trim() || undefined,
    outcome: f.outcome,
    flag: f.flag,
    tool: f.tool,
    has_citations: f.has_citations === undefined ? undefined : String(f.has_citations),
    feedback: f.feedback,
    prompt_version: f.prompt_version,
  };
}
