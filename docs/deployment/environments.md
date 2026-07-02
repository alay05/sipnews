# Environments

## Current Recommendation

Keep development and production fully separate.

Separate:

- database
- Clerk instance
- Render services
- env vars
- SendGrid sender/testing behavior where practical

## Environment Layout

### Development

- local web on `localhost`
- local api on `localhost`
- local worker runs manually
- local or dev-only Postgres database
- Clerk development instance

### Production

- web on `https://www.sipnewstoday.com`
- api on `https://api.sipnewstoday.com`
- Render cron for prepare and deliver
- production Postgres database
- Clerk production instance

## Branching Recommendation

Use:

- `main` for production-ready code
- short-lived feature branches off `main`

Recommended branch naming:

- `feat/r2-1-onboarding-flow`
- `fix/r1-2-render-env-defaults`
- `chore/r4-1-doc-cleanup`

Do not add a long-lived `develop` branch yet. It adds overhead without solving the main current problem. First separate the environments and databases. If you later add a real staging environment, then consider a dedicated `staging` branch.

## Database Recommendation

Create a separate development database as the next infrastructure step.

Target state:

- local/dev database for experimentation and destructive resets
- production database for live users only

Never run `db:setup` against production after the initial clean bootstrap unless you intentionally want a wipe.

## Testing and Push Flow

Recommended flow:

1. branch from `main`
2. work locally against dev/local database
3. run:
   - `npm run typecheck`
   - `npm test`
4. manually validate affected runtime paths
5. merge to `main`
6. deploy to production

If staging is added later:

1. branch from `main`
2. merge into `staging`
3. deploy to staging services and staging database
4. promote to `main`
