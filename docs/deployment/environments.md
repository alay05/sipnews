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
- local `apps/api/.env` and `apps/worker/.env` must set `DATABASE_ENV=development`
- root `.env` is seed-only and should point at the same dev-only database with `DATABASE_RESET_ALLOWED=true`

### Production

- web on `https://www.sipnewstoday.com`
- api on `https://api.sipnewstoday.com`
- Render cron for prepare and deliver
- production Postgres database
- Clerk production instance

## Release Workflow

Branching and merge policy are documented in [docs/deployment/release-workflow.md](/Users/andrewlay/sipnews/docs/deployment/release-workflow.md).

Current recommendation:

- keep `main` as the only long-lived branch
- use short-lived branches off `main`
- do not add a long-lived `develop` branch yet

## Database Recommendation

Create a separate development database as the next infrastructure step.

Target state:

- local/dev database for experimentation and destructive resets
- production database for live users only
- local app and worker runs reject DB configs that are not explicitly marked `DATABASE_ENV=development`
- `db:setup` requires an explicit `DATABASE_RESET_ALLOWED=true` acknowledgement before it drops and reseeds anything

Never run `db:setup` against production after the initial clean bootstrap unless you intentionally want a wipe.

## Verification And Promotion

Use the local verification and merge checklist in [docs/deployment/release-workflow.md](/Users/andrewlay/sipnews/docs/deployment/release-workflow.md).

If a real staging environment is added later, the release workflow can expand to include a staging promotion step. That is intentionally out of scope for the current repo state.
