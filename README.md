# admin-panel

The private dashboard for ruudjuffermans.nl and its digital twin ("Ask Ruud"),
and the portfolio site's backend in one deployment:

- **Public API** for the portfolio (same paths the platform server used to
  serve): `POST /api/website/contact`, `POST /api/website/newsletter`,
  `POST /api/website/analytics` (page-view beacon). The beacon is shared by
  every site in `server/src/website/sites.ts` (ruudjuffermans.nl and
  loodgieterjuffermans.nl); a view is attributed to a site by the request's
  `Origin`, and each site gets its own tab in the panel.
- **Login** for the one admin account configured in `.env`
  (`/auth/login`, `/auth/me`, `/auth/logout`; signed httpOnly cookie, 7 days).
- **Admin API** at `/api/website/admin/*`: contact inbox, newsletter
  subscribers, page-view analytics, LLM funds and the top-up ledger.
- **Twin proxy** at `/api/website/admin/twin/*`: forwards an allow-list of the
  twin's `/api/admin/*` endpoints with the bearer token added server side.
- **Revault proxy** at `/api/website/admin/revault/*`: the same for
  [revault.nl](https://revault.nl)'s server (`/api/revault/admin/*`): intake
  requests, newsletter signups and page views, shown under "Revault" in the
  panel.
- **The SPA** (Vite + React) served from the same origin.

Production: `https://admin.ruudjuffermans.nl` (panel) and
`https://api.ruudjuffermans.nl` (the portfolio's API origin) both point at the
`app` service. See `docs/MIGRATION.md` for the cut-over from the platform server.

## Layout

```
admin-panel/
├── server/            Express + TypeScript + Prisma (Postgres)
│   ├── prisma/        schema + migrations: contact_submissions, newsletter_subscribers,
│   │                  page_views (schema "website", identical to the platform DB), llm_topups
│   └── src/
│       ├── auth/      .env login, signed-cookie session, requireAdmin
│       ├── website/   public routes, admin routes, funds, twin proxy, revault proxy
│       └── scripts/   hash-password
├── client/            Vite + React + styled-components + TanStack Query + Recharts
├── Dockerfile         client build → node image serving dist/ and the API on :3000
├── docker-compose.yml app + db (Postgres 16) + one-shot db-backup, on dokploy-network
├── docker-compose.dev.yml  a local Postgres for development
└── .env.example
```

## Development

```sh
cp .env.example .env                          # fill ADMIN_USER, SESSION_SECRET, POSTGRES_PASSWORD
docker compose -f docker-compose.dev.yml up -d
cd server && npm install
npm run hash-password                         # → paste into .env as ADMIN_PASSWORD_HASH
export DATABASE_URL='postgresql://admin:admin@localhost:5433/admin?schema=website'
npx prisma migrate deploy && npm run dev      # API on :3000 (reads ../.env? no: export the vars or use direnv)
cd ../client && npm install && npm run dev    # SPA on :3005, proxies /api and /auth to :3000
```

The server reads plain environment variables. For local work either export
them from `.env` (`set -a; . ../.env; set +a`) or use a tool like direnv.

Checks: `npm run typecheck`, `npm test` (node:test), `npm run build` in
`server/`; `npm run build` in `client/`. CI runs all of them plus a Docker
build, and triggers the Dokploy deploy on a green `main`.

## Configuration

See `.env.example`. The server refuses to start without `ADMIN_USER`, a
bcrypt `ADMIN_PASSWORD_HASH` and a `SESSION_SECRET` of at least 32 characters.

| Variable | Purpose |
| --- | --- |
| `WEBSITE_URL`, `CORS_ORIGIN` | Extra origins allowed to call the public routes cross-origin (every site's origins in `server/src/website/sites.ts` are always allowed) |
| `CONTACT_EMAIL`, `MAIL_FROM`, `SMTP_*` | Contact-form delivery (console fallback without `SMTP_HOST`) |
| `NEWSLETTER_API_KEY` | Buttondown; `placeholder` keeps signups local only |
| `TWIN_API_URL`, `TWIN_ADMIN_TOKEN` | The twin's admin API; the token never reaches the browser |
| `REVAULT_API_URL`, `REVAULT_ADMIN_TOKEN` | The Revault server's admin API (`ADMIN_SERVICE_TOKEN` there); same rule |
| `FUNDS_ALERT_USD` | "Needs attention" threshold for remaining LLM credit |
| `TWIN_TTFT_P95_ALERT_MS`, `TWIN_ERROR_RATE_ALERT`, `TWIN_TRUNCATION_RATE_ALERT` | Twin performance thresholds for "Needs attention" (defaults 4000 ms, 0.05, 0.02) |

## Funds

`GET /api/website/admin/funds` asks the twin for `GET /api/admin/providers`
(live balance for DeepSeek and Moonshot, metered spend per provider from
`turn_log`) and joins the manual top-up ledger (`llm_topups`). For providers
without a balance API (OpenAI, Gemini) the remaining amount is estimated as
top-ups minus the twin's spend since the first top-up.

## Security notes

- One account, password hashed with bcrypt (cost 12); 5 sign-in attempts per
  15 minutes per IP.
- Session: HMAC-SHA256 signed cookie, `HttpOnly`, `SameSite=Strict`, `Secure`
  in production. Rotating `SESSION_SECRET` signs out everywhere.
- Admin responses are `Cache-Control: no-store`; the SPA is `noindex`.
- CORS only on `/api/website/*`, only for the portfolio's origin, no credentials.
- The twin and Revault proxies forward an explicit allow-list of paths and
  query parameters.
