# Database Migrations

Use the migration commands below instead of treating `db:setup` as the normal schema path.

## Command Roles

- `npm run db:migrate`: forward-only migration command for any environment
- `npm run db:reset`: destructive development-only reset of the `public` schema, followed by `db:migrate`
- `npm run db:bootstrap`: development-only first-user bootstrap after `db:migrate`
- `npm run db:setup`: compatibility wrapper that runs `db:reset` and then `db:bootstrap`

## Development Workflow

Normal schema changes:

```sh
npm run db:migrate
```

Clean local rebuild:

```sh
npm run db:reset
npm run db:bootstrap
```

`db:reset` requires a root `.env` with:

```env
DATABASE_URL=postgresql://.../sipnews_dev?sslmode=require
DATABASE_ENV=development
DATABASE_RESET_ALLOWED=true
```

`db:bootstrap` requires the same root `.env` plus:

```env
DATABASE_BOOTSTRAP_ALLOWED=true
FIRST_USER_EMAIL=
FIRST_USER_DISPLAY_NAME=
FIRST_USER_TIMEZONE=
FIRST_USER_SEND_HOUR=
FIRST_USER_DIGEST_MAX_ITEMS=
FIRST_USER_SUMMARY_LENGTH=
FIRST_USER_CATEGORY_COUNTS=
```

## Production Procedure

Production should use `npm run db:migrate` only.

Rules:

- do not run `db:reset`
- do not run `db:bootstrap`
- do not run `db:setup`
- do not point destructive root `.env` files at the production database

Recommended production sequence:

1. merge the release into `main`
2. run `npm run db:migrate` against the production `DATABASE_URL`
3. deploy the affected Render services
4. run the production verification steps from [docs/operations/runbook.md](/Users/andrewlay/sipnews/docs/operations/runbook.md)

## Writing New Migrations

- add a new ordered `.sql` file under `migrations/`
- keep migrations additive and forward-only
- never edit an already-applied migration in place
- if a change needs rollback handling, write a new corrective migration instead of rewriting history
