# Cut-over from the platform server

The panel replaces `ruudjuffermans-server` (api.ruudjuffermans.nl) as the
portfolio's backend. The three website tables keep their schema (`website`),
names and columns, so the data moves with one data-only dump. Rows written to
the old server after the dump are lost, so dump during the switch, not before.

## 0. Prepare (no downtime)

1. Deploy the panel on Dokploy from this repo (Compose service,
   `docker-compose.yml`, `.env` from `.env.example`). Add the domain
   `admin.ruudjuffermans.nl` → service `app`, port 3000. Do **not** add
   `api.ruudjuffermans.nl` yet.
2. Set `TWIN_ADMIN_TOKEN` to the twin's `ADMIN_TOKEN` and `TWIN_API_URL` to
   the twin's compose service on `dokploy-network`
   (`docker ps` on the host shows the name, e.g. `digital-twin-app-1`).
3. Open https://admin.ruudjuffermans.nl, sign in, check the Overview loads
   (empty site data, live twin data).

## 1. Copy the data

On the Dokploy host, with the old platform DB container and the new panel DB
container names from `docker ps`:

```sh
OLD=ruudjuffermans-server-db-1   # platform Postgres
NEW=admin-panel-db-1             # panel Postgres

# Data only: the panel's migration already created the schema, enum and tables.
docker exec $OLD pg_dump -U <platform-user> <platform-db> \
  --schema=website --data-only --no-owner --no-privileges \
  --table='website.contact_submissions' \
  --table='website.newsletter_subscribers' \
  --table='website.page_views' > website-data.sql

docker exec -i $NEW psql -U admin -d admin -v ON_ERROR_STOP=1 < website-data.sql
```

Compare counts on both sides:

```sql
SELECT 'contact' t, count(*) FROM website.contact_submissions
UNION ALL SELECT 'newsletter', count(*) FROM website.newsletter_subscribers
UNION ALL SELECT 'page_views', count(*) FROM website.page_views;
```

## 2. Switch the portfolio

1. In Dokploy, move the domain `api.ruudjuffermans.nl` from the platform
   server's service to the panel's `app` service (port 3000). The portfolio
   build already has `NEXT_PUBLIC_API_URL=https://api.ruudjuffermans.nl`, so
   no rebuild is needed for the switch itself.
2. Redeploy the portfolio from the commit that removes the account-session
   probe (`session.ts`, the footer login link, the contact prefill). Until
   then the site makes one failing `GET /api/account/auth/me` per page load,
   which is harmless (the panel answers 404).
3. Send a test contact message and check it arrives in the panel's Inbox and
   by email; load a page and watch the view count grow.

## 3. Re-run the data copy for the gap (optional)

Rows written to the old server between the dump and the domain switch can be
copied with the same `pg_dump` plus `--rows-per-insert`/`ON CONFLICT DO
NOTHING`, or ignored if the gap was a minute.

## 4. Retire

Stop the platform server's service in Dokploy once the panel has run for a
week. The twin, the account/journal/fitness/habit apps are not affected
(they were already offline).

## Rollback

Move `api.ruudjuffermans.nl` back to the platform server. Nothing in the
portfolio changed; rows written to the panel in between stay in the panel DB.
