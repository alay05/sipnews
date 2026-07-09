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
- local delivery tests can use SendGrid from `apps/worker/.env` and can send real email
- local `apps/api/.env` and `apps/worker/.env` must set `DATABASE_ENV=development`
- root `.env` is bootstrap/reset-only and should point at the same dev-only database

### Production

- web on `https://www.sipnewstoday.com`
- api on `https://api.sipnewstoday.com`
- Render cron for prepare and deliver
- production Postgres database
- Clerk production instance
- SendGrid is used by the production deliver worker only

## Release Workflow

Branching and merge policy are documented in [docs/deployment/release-workflow.md](/Users/andrewlay/sipnews/docs/deployment/release-workflow.md).

Current recommendation:

- use `development` as the default integration branch
- keep `main` as the production branch
- use short-lived branches off `development`
- revisit a real staging branch or environment only after the team needs shared pre-production testing that local verification cannot cover

## Promotion Path

The current promotion path is:

1. branch from `development` into a short-lived `feat/*`, `fix/*`, or `chore/*` branch
2. develop and verify locally against the dev-only database, Clerk dev instance, and optional local source overrides
3. merge finished work back into `development` after local verification and review
4. use [docs/operations/runbook.md](/Users/andrewlay/sipnews/docs/operations/runbook.md) for a deeper local smoke test when the release candidate in `development` spans web, API, worker, or delivery behavior
5. merge `development` into `main` when you want a production release
6. let Render deploy production directly from `main`
7. perform production-safe validation using health checks, UI checks, and deploy logs without reseeding data or pointing local processes at production

This repo does not currently have a separate staging branch or staging Render stack. The dev Neon
branch and local runtimes are the only safe place for destructive resets, first-user seeding, and
test delivery exercises.

## Database Recommendation

Current state:

- local/dev database for experimentation and destructive resets
- production database for live users only
- local app and worker runs reject DB configs that are not explicitly marked `DATABASE_ENV=development`
- `db:migrate` is the forward-only schema path
- `db:reset` is the destructive development-only reset path and requires `DATABASE_RESET_ALLOWED=true`
- `db:bootstrap` is the development-only first-user bootstrap path and requires `DATABASE_BOOTSTRAP_ALLOWED=true`

Never run `db:reset`, `db:bootstrap`, or `db:setup` against production.

## Development Data And Smoke Tests

- keep all resets, bootstrap seeding, and worker test deliveries on the dev-only database
- keep local sign-in and onboarding checks on the Clerk development instance
- use `config/sources.local.json` only for local experimentation; Render production workers should stay on committed `config/sources.json`
- do not create throwaway test users or synthetic digests in production just to validate a branch
- treat production verification as read-only whenever possible: page loads, API health, deploy logs, and checking the behavior of existing live data

## Verification And Promotion

Use the local verification and merge checklist in [docs/deployment/release-workflow.md](/Users/andrewlay/sipnews/docs/deployment/release-workflow.md).
Use [docs/deployment/database-migrations.md](/Users/andrewlay/sipnews/docs/deployment/database-migrations.md) for the migration and bootstrap procedure.

If a real staging environment is added later, the release workflow can expand to include a staging promotion step. That is intentionally out of scope for the current repo state.
