# Cut-over from the platform server

The panel replaces `ruudjuffermans-server` (api.ruudjuffermans.nl) as the
portfolio's backend. The three website tables keep their schema (`website`),
names and columns, but the panel starts with an **empty database**: the old
contact submissions, newsletter subscribers and page views are not copied.
Counts in the panel begin at zero on the day of the switch.

The schema itself needs no manual step: the container runs
`prisma migrate deploy` before starting the server, so the tables exist as
soon as the `app` service is healthy.

## 1. Deploy the panel

1. Deploy the panel on Dokploy from this repo (Compose service,
   `docker-compose.yml`, `.env` from `.env.example`). Add the domain
   `admin.ruudjuffermans.nl` → service `app`, port 3000.
2. Set `TWIN_ADMIN_TOKEN` to the twin's `ADMIN_TOKEN` and `TWIN_API_URL` to
   the twin's compose service on `dokploy-network`
   (`docker ps` on the host shows the name, e.g. `digital-twin-app-1`).
3. Open https://admin.ruudjuffermans.nl, sign in, check the Overview loads
   (empty site data, live twin data).

## 2. Switch the portfolio

1. In Dokploy, move the domain `api.ruudjuffermans.nl` from the platform
   server's service to the panel's `app` service (port 3000) and redeploy the
   panel (compose domains only become Traefik labels on a deploy). The
   portfolio build already has `NEXT_PUBLIC_API_URL=https://api.ruudjuffermans.nl`,
   so no rebuild is needed for the switch itself.
2. Redeploy the portfolio from the commit that removes the account-session
   probe (`session.ts`, the footer login link, the contact prefill). Until
   then the site makes one failing `GET /api/account/auth/me` per page load,
   which is harmless (the panel answers 404).
3. Send a test contact message and check it arrives in the panel's Inbox and
   by email; load a page and watch the view count grow.

## 3. Retire

Stop the platform server's service in Dokploy once the panel has run for a
week. The twin, the account/journal/fitness/habit apps are not affected
(they were already offline).

## Old data

The platform database keeps the historical rows until its service is removed.
If they are ever wanted after all, a data-only dump still fits, because the
table definitions are identical:

```sh
docker exec <old-db> pg_dump -U <platform-user> <platform-db> \
  --schema=website --data-only --no-owner --no-privileges --inserts \
  --table='website.contact_submissions' \
  --table='website.newsletter_subscribers' \
  --table='website.page_views' \
  | sed 's/^INSERT INTO \(.*\));$/INSERT INTO \1) ON CONFLICT DO NOTHING;/' \
  | docker exec -i <new-db> psql -U admin -d admin -v ON_ERROR_STOP=1
```

Primary keys and emails that already exist in the panel are skipped.

## Rollback

Move `api.ruudjuffermans.nl` back to the platform server. Nothing in the
portfolio changed; rows written to the panel in between stay in the panel DB.
