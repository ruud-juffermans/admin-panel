// Response shapes of the panel server (../server/src). Keep in sync with
// website/routes/admin.ts, website/routes/funds.ts and auth/routes.ts there.

export interface AuthUser {
  name: string;
}

// ── LLM provider funds ───────────────────────────────────────────────────────

export type LlmProviderId = 'deepseek' | 'kimi' | 'openai' | 'gemini';

export interface LlmTopup {
  id: string;
  amountUsd: number;
  toppedUpAt: string;
  note: string | null;
}

export interface FundsProvider {
  id: LlmProviderId;
  label: string;
  configured: boolean; // the twin has an API key for it
  active: boolean; // the provider the twin answers with right now
  model: string;
  balance_supported: boolean; // the provider has a balance API
  balance: { available: number; currency: string; fetched_at: string; source: string } | null;
  balance_error: string | null;
  // Metered by the twin; billed_mtd_usd only for OpenAI with an admin key (Costs API).
  spend: { today_usd: number; last_30d_usd: number; total_usd: number; billed_mtd_usd?: number | null };
  topups: LlmTopup[];
  topup_total_usd: number;
  spent_since_topups_usd: number | null;
  estimated_remaining_usd: number | null;
  remaining_usd: number | null;
  remaining_source: 'api' | 'estimate' | null;
  low: boolean;
}

export interface Funds {
  alert_threshold_usd: number;
  twin_available: boolean;
  twin_error: string | null;
  fetched_at: string | null;
  providers: FundsProvider[];
}

// ── site analytics ───────────────────────────────────────────────────────────

export interface LocaleCount {
  locale: string;
  count: number;
}

export interface AnalyticsOverview {
  days: number;
  since: string;
  until: string;
  totalViews: number;
  byLocale: LocaleCount[];
  previous: { totalViews: number; byLocale: LocaleCount[] };
}

export interface TimeseriesPoint {
  day: string; // YYYY-MM-DD (UTC)
  count: number;
  locales: Record<string, number>;
}

export type Section = 'home' | 'projects' | 'blog' | 'expertise' | 'about' | 'contact' | 'other';

export interface TopPage {
  path: string;
  section: Section;
  count: number;
}

export interface PageSection {
  section: Section;
  count: number;
  pages: TopPage[];
}

export type ReferrerKind = 'linkedin' | 'github' | 'google' | 'udemy' | 'internal' | 'direct' | 'other';

export interface ReferrerHost {
  host: string; // 'direct' when there was no referrer
  kind: ReferrerKind;
  count: number;
}

// ── inbox ────────────────────────────────────────────────────────────────────

export type ContactStatus = 'new' | 'responded' | 'archived';

export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  company: string | null;
  message: string;
  status: ContactStatus;
  createdAt: string;
}

export interface ContactStats {
  counts: Record<ContactStatus, number>;
  total: number;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  source: string;
  active: boolean;
  createdAt: string;
  unsubscribedAt: string | null;
}

export interface NewsletterStats {
  total: number;
  active: number;
  unsubscribed: number;
  bySource: Array<{ source: string; count: number }>;
}

// ── Ask Ruud (digital twin), via the panel's proxy /api/website/admin/twin ───

export type TwinOutcome = 'answered' | 'refused' | 'pending_approval' | 'error';

export interface TwinWindowStats {
  since: string;
  until: string;
  turns: number;
  threads: number;
  outcomes: Record<TwinOutcome, number>;
  cost_usd: number;
  cost_per_turn_usd: number;
  input_tokens: number;
  output_tokens: number;
  cached_tokens: number; // part of input_tokens served from the provider cache
  cache_read_ratio: number;
  latency_p50_ms: number | null;
  latency_p95_ms: number | null;
  tool_use_rate: number;
  feedback: { up: number; down: number };
}

export interface TwinOverview {
  days: number;
  provider: string;
  model: string;
  budget: { daily_limit_usd: number; spent_today_usd: number | null };
  pending_approvals: number;
  window: TwinWindowStats;
  previous: TwinWindowStats;
}

export interface TwinDayPoint {
  day: string;
  turns: number;
  threads: number;
  cost_usd: number;
  refusals: number;
}

export interface TwinBudget {
  days: number;
  daily_limit_usd: number;
  spent_today_usd: number | null;
  ledger: Array<{ day: string; spent_usd: number; updated_at: string }>;
}

export interface TwinApproval {
  thread_id: string;
  action?: string;
  tool_calls: Array<{ name: string; input: Record<string, unknown> }>;
  visitor_message: string;
}

export interface TwinApprovalResult {
  status: 'approved' | 'rejected';
  thread_id: string;
  answer: string;
}

export interface TwinUnanswered {
  id: number;
  created_at: string;
  thread_id: string;
  question: string;
  answer: string;
  reason: 'guard' | 'model';
  status: 'open' | 'handled';
}

export interface TwinGuardIncident {
  id: number;
  created_at: string;
  thread_id: string;
  flags: string[];
  visitor_message: string;
}

export interface TwinFeedback {
  id: number;
  created_at: string;
  thread_id: string;
  verdict: 'up' | 'down';
  question: string | null;
  answer: string | null;
  comment: string | null;
}

export interface TwinContactMessage {
  id: number;
  created_at: string;
  thread_id: string;
  subject: string;
  message: string;
  sender_contact: string;
  note: string | null;
}

export interface TwinEvalSummary {
  dataset: string;
  passed: number;
  total: number;
  accuracy: number;
  threshold: number;
  met: boolean;
  costUsd?: number;
}

export interface TwinEvalRun {
  id: number;
  created_at: string;
  provider: string;
  model: string;
  met: boolean;
  cost_usd: number;
  summary: TwinEvalSummary[];
  failure_injection: { injected: number; recovered: number } | null;
}

export interface TwinEvalCase {
  id: number;
  dataset: string;
  case_id: string;
  passed: boolean;
  detail: unknown;
  tools: string[];
  errors: string[];
  cost_usd: number;
  latency_ms: number;
}

export interface TwinKnowledge {
  documents: Array<{ slug: string; title: string; chars: number }>;
  chunks: { total: number; by_doc: Array<{ doc_slug: string; count: number }>; embedding_model: string | null; last_sync: string | null };
  semantic_search: boolean;
  embedding_provider: string | null;
}

// ── Ask Ruud prompt log (M3) ─────────────────────────────────────────────────

export interface TwinTurn {
  id: number;
  created_at: string;
  thread_id: string;
  provider: string;
  model: string;
  outcome: TwinOutcome;
  input_tokens: number;
  output_tokens: number;
  cached_tokens: number;
  cost_usd: number;
  latency_ms: number;
  tools_used: string[];
  guard_flags: string[];
  // Null once the retention job has purged the text.
  visitor_message: string | null;
  answer: string | null;
  citations: Array<{ title: string; cited_text?: string }> | null;
  tool_calls: Array<{ name: string; input: Record<string, unknown>; result_chars: number }> | null;
  retrieved_chunks: Array<{ document: string; heading: string; score: number | null }> | null;
  prompt_version: string | null;
  kb_version: string | null;
  locale: string | null;
  embed: boolean | null;
  feedback?: TwinThreadFeedback | null;
}

export interface TwinThreadFeedback {
  up: number;
  down: number;
  comments: string[];
}

export interface TwinThreadSummary {
  thread_id: string;
  started_at: string;
  last_at: string;
  first_question: string | null;
  last_answer: string | null;
  turns: number;
  cost_usd: number;
  outcomes: TwinOutcome[];
  guard_flags: string[];
  tools_used: string[];
  has_citations: boolean;
  locale: string | null;
  embed: boolean | null;
  feedback: TwinThreadFeedback | null;
}

export interface TwinThread {
  thread_id: string;
  turns: TwinTurn[];
  feedback: Array<{ id: number; created_at: string; verdict: 'up' | 'down'; question: string | null; answer: string | null; comment: string | null }>;
  pending_approval: TwinApproval | null;
  total_cost_usd: number;
}

export interface TwinThreadFilters {
  q?: string;
  outcome?: TwinOutcome;
  flag?: string;
  tool?: string;
  has_citations?: boolean;
  feedback?: 'up' | 'down';
  prompt_version?: string;
}

export interface TwinPromptVersion {
  prompt_version: string | null;
  current: boolean;
  first_seen: string;
  last_seen: string;
  turns: number;
  threads: number;
  answered: number;
  refused: number;
  answer_rate: number;
  refusal_rate: number;
  cost_usd: number;
  provider: string;
  model: string;
  feedback: { up: number; down: number };
}

export interface TwinPrompt {
  current: { prompt_version: string | null; kb_version: string | null; provider: string; model: string; text: string };
  versions: TwinPromptVersion[];
}
