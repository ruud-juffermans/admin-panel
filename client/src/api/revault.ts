import { del, get, patch, post, qs } from './client';
import type {
  AnalyticsOverview,
  RevaultIntake,
  RevaultIntakeStats,
  RevaultIntakeStatus,
  RevaultList,
  PageSection,
  ReferrerHost,
  RevaultNewsletterStats,
  RevaultSubscriber,
  TimeseriesPoint,
} from './types';

// revault.nl's data, reached through the panel's server-side proxy
// (server/src/website/revaultProxy.ts) so the service token stays there.
const BASE = '/api/website/admin/revault';

export const revault = {
  intakes: (status?: RevaultIntakeStatus, limit = 200) =>
    get<RevaultList<RevaultIntake>>(`${BASE}/intakes${qs({ status, limit })}`),
  intakeStats: () => get<RevaultIntakeStats>(`${BASE}/intakes/stats`),
  updateIntake: (reference: string, body: { status?: RevaultIntakeStatus; notes?: string | null }) =>
    patch<RevaultIntake>(`${BASE}/intakes/${encodeURIComponent(reference)}`, body),
  removeIntake: (reference: string) => del<{ ok: true }>(`${BASE}/intakes/${encodeURIComponent(reference)}`),

  subscribers: (limit = 500) => get<RevaultList<RevaultSubscriber>>(`${BASE}/newsletter${qs({ limit })}`),
  newsletterStats: () => get<RevaultNewsletterStats>(`${BASE}/newsletter/stats`),
  unsubscribe: (id: string) => post<RevaultSubscriber>(`${BASE}/newsletter/${encodeURIComponent(id)}/unsubscribe`),
  removeSubscriber: (id: string) => del<{ ok: true }>(`${BASE}/newsletter/${encodeURIComponent(id)}`),

  // Same shapes as the panel's own analytics, so the whole traffic view is reused.
  overview: (days: number) => get<AnalyticsOverview>(`${BASE}/analytics/overview${qs({ days })}`),
  timeseries: (days: number) => get<{ series: TimeseriesPoint[] }>(`${BASE}/analytics/timeseries${qs({ days })}`),
  topPages: (days: number) => get<{ sections: PageSection[] }>(`${BASE}/analytics/top-pages${qs({ days })}`),
  topReferrers: (days: number) => get<{ referrers: ReferrerHost[] }>(`${BASE}/analytics/top-referrers${qs({ days })}`),
};
