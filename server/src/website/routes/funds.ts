import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../db.js';
import { asyncRoute } from '../../http.js';
import { config } from '../../config.js';
import { twinGet, TwinUnavailable, type TwinProxyOptions } from '../twinProxy.js';

// LLM provider funds (PRD F1–F3). The twin reports what it can: a live
// balance for providers with a balance API (DeepSeek, Moonshot) and its own
// spend per provider from turn_log. For the others the panel keeps a manual
// top-up ledger and estimates what is left as top-ups minus spend since the
// first top-up. Everything is read-only except the ledger.
export const fundsRouter = Router();

export interface TwinProviderBalance {
  available: number;
  currency: string; // 'USD' for every provider we know; DeepSeek may report a CNY wallet
  fetched_at: string;
  source: string;
}

export interface TwinProvider {
  id: string;
  label: string;
  configured: boolean;
  active: boolean;
  model: string;
  balance_supported: boolean;
  balance: TwinProviderBalance | null;
  balance_error: string | null;
  spend: { today_usd: number; last_30d_usd: number; total_usd: number; billed_mtd_usd?: number | null };
}

export interface TwinProviders {
  fetched_at: string;
  providers: TwinProvider[];
}

export interface FundsProvider extends TwinProvider {
  topups: Array<{ id: string; amountUsd: number; toppedUpAt: string; note: string | null }>;
  topup_total_usd: number;
  // Spend since the first top-up (null without top-ups or when the twin is down).
  spent_since_topups_usd: number | null;
  estimated_remaining_usd: number | null;
  // What the panel treats as "remaining": the live balance when there is one,
  // otherwise the estimate. Null when neither is available.
  remaining_usd: number | null;
  remaining_source: 'api' | 'estimate' | null;
  low: boolean;
}

const PROVIDER_IDS = ['deepseek', 'kimi', 'openai', 'gemini'] as const;
const PROVIDER_LABELS: Record<(typeof PROVIDER_IDS)[number], string> = {
  deepseek: 'DeepSeek',
  kimi: 'Moonshot (Kimi)',
  openai: 'OpenAI',
  gemini: 'Gemini',
};
const providerId = z.enum(PROVIDER_IDS);

function twinOptions(): TwinProxyOptions {
  return { baseUrl: config.twinApiUrl, token: config.twinAdminToken, timeoutMs: 10_000 };
}

// GET / — every provider with balance, spend, top-ups and remaining funds.
fundsRouter.get(
  '/',
  asyncRoute(async (_req, res) => {
    const rows = await prisma.llmTopup.findMany({ orderBy: { toppedUpAt: 'asc' } });
    const topupsFor = (id: string) =>
      rows
        .filter((r) => r.provider === id)
        .map((r) => ({ id: r.id, amountUsd: r.amountUsd, toppedUpAt: r.toppedUpAt.toISOString(), note: r.note }));

    let twin: TwinProviders | null = null;
    let twinError: string | null = null;
    try {
      twin = await twinGet<TwinProviders>(twinOptions(), '/providers');
    } catch (err) {
      twinError = err instanceof TwinUnavailable ? err.message : 'Ask Ruud is unavailable.';
    }

    const base: TwinProvider[] =
      twin?.providers ??
      PROVIDER_IDS.map((id) => ({
        id,
        label: PROVIDER_LABELS[id],
        configured: false,
        active: false,
        model: '',
        balance_supported: false,
        balance: null,
        balance_error: null,
        spend: { today_usd: 0, last_30d_usd: 0, total_usd: 0, billed_mtd_usd: null },
      }));

    const providers: FundsProvider[] = await Promise.all(
      base.map(async (p) => {
        const topups = topupsFor(p.id);
        const topupTotal = topups.reduce((n, t) => n + t.amountUsd, 0);
        let spentSince: number | null = null;
        if (twin && topups.length > 0) {
          try {
            const spend = await twinGet<{ spent_usd: number }>(twinOptions(), '/providers/spend', {
              provider: p.id,
              since: topups[0]!.toppedUpAt,
            });
            spentSince = spend.spent_usd;
          } catch {
            spentSince = null;
          }
        }
        const estimate = spentSince === null ? null : Math.max(0, topupTotal - spentSince);
        // A live balance counts as "remaining" only in USD; a CNY wallet is
        // shown as-is by the UI and the estimate (if any) is used instead.
        const liveUsd = p.balance && p.balance.currency === 'USD' ? p.balance.available : null;
        const remaining = liveUsd ?? estimate;
        const source: FundsProvider['remaining_source'] = liveUsd !== null ? 'api' : estimate === null ? null : 'estimate';
        return {
          ...p,
          topups,
          topup_total_usd: topupTotal,
          spent_since_topups_usd: spentSince,
          estimated_remaining_usd: estimate,
          remaining_usd: remaining,
          remaining_source: source,
          low: remaining !== null && (p.configured || topups.length > 0) && remaining < config.fundsAlertUsd,
        };
      }),
    );

    res.json({
      alert_threshold_usd: config.fundsAlertUsd,
      twin_available: twin !== null,
      twin_error: twinError,
      fetched_at: twin?.fetched_at ?? null,
      providers,
    });
  }),
);

// POST /topups — record a manual top-up: {provider, amountUsd, toppedUpAt?, note?}.
fundsRouter.post(
  '/topups',
  asyncRoute(async (req, res) => {
    const body = z
      .object({
        provider: providerId,
        amountUsd: z.coerce.number().positive().max(100_000),
        toppedUpAt: z.coerce.date().optional(),
        note: z.string().max(200).optional(),
      })
      .parse(req.body);
    const topup = await prisma.llmTopup.create({
      data: {
        provider: body.provider,
        amountUsd: body.amountUsd,
        toppedUpAt: body.toppedUpAt ?? new Date(),
        note: body.note?.trim() || null,
      },
    });
    res.status(201).json({ topup });
  }),
);

// DELETE /topups/:id — remove a mistaken entry.
fundsRouter.delete(
  '/topups/:id',
  asyncRoute(async (req, res) => {
    const deleted = await prisma.llmTopup.delete({ where: { id: req.params.id } }).catch(() => null);
    if (!deleted) {
      res.status(404).json({ error: 'Top-up not found.' });
      return;
    }
    res.json({ ok: true });
  }),
);
