import { del, get, patch, post, qs } from './client';
import { request } from './client';
import type {
  AnalyticsOverview,
  AuthUser,
  ContactStats,
  ContactStatus,
  ContactSubmission,
  Funds,
  LlmProviderId,
  LlmTopup,
  NewsletterStats,
  NewsletterSubscriber,
  PageSection,
  ReferrerHost,
  TimeseriesPoint,
} from './types';

const ADMIN = '/api/website/admin';

// The panel's own login (server/src/auth). /me is "silent": a 401 there just
// means "show the login page", not "the session expired".
export const auth = {
  me: () => request<{ user: AuthUser }>('/auth/me', { silent401: true }),
  login: (username: string, password: string) =>
    request<{ user: AuthUser }>('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }), silent401: true }),
  logout: () => post<{ ok: true }>('/auth/logout'),
};

export const funds = {
  get: () => get<Funds>(`${ADMIN}/funds`),
  addTopup: (body: { provider: LlmProviderId; amountUsd: number; toppedUpAt?: string; note?: string }) =>
    post<{ topup: LlmTopup }>(`${ADMIN}/funds/topups`, body),
  removeTopup: (id: string) => del<{ ok: true }>(`${ADMIN}/funds/topups/${encodeURIComponent(id)}`),
};

export const analytics = {
  overview: (days: number) => get<AnalyticsOverview>(`${ADMIN}/analytics/overview${qs({ days })}`),
  timeseries: (days: number) => get<{ series: TimeseriesPoint[] }>(`${ADMIN}/analytics/timeseries${qs({ days })}`),
  topPages: (days: number, limit = 200) =>
    get<{ sections: PageSection[] }>(`${ADMIN}/analytics/top-pages${qs({ days, limit, group: 'section' })}`),
  topReferrers: (days: number, limit = 100) =>
    get<{ referrers: ReferrerHost[] }>(`${ADMIN}/analytics/top-referrers${qs({ days, limit, group: 'host' })}`),
};

export const contact = {
  list: (status?: ContactStatus, limit = 200) =>
    get<{ submissions: ContactSubmission[] }>(`${ADMIN}/contact${qs({ status, limit })}`),
  stats: () => get<ContactStats>(`${ADMIN}/contact/stats`),
  setStatus: (id: string, status: ContactStatus) =>
    patch<{ submission: ContactSubmission }>(`${ADMIN}/contact/${encodeURIComponent(id)}/status`, { status }),
  remove: (id: string) => del<{ ok: true }>(`${ADMIN}/contact/${encodeURIComponent(id)}`),
};

export const newsletter = {
  list: (limit = 500) => get<{ subscribers: NewsletterSubscriber[] }>(`${ADMIN}/newsletter${qs({ limit })}`),
  stats: () => get<NewsletterStats>(`${ADMIN}/newsletter/stats`),
  unsubscribe: (id: string) =>
    post<{ subscriber: NewsletterSubscriber }>(`${ADMIN}/newsletter/${encodeURIComponent(id)}/unsubscribe`),
  remove: (id: string) => del<{ ok: true }>(`${ADMIN}/newsletter/${encodeURIComponent(id)}`),
};
