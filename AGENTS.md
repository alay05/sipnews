# Agent Guide

## Repo Map

- `apps/api`: Express API for auth-backed product routes and user settings.
- `apps/web`: Next.js app for sign-in, onboarding, settings, and digest history.
- `apps/worker`: Scheduled digest preparation and delivery runtime.
- `packages/contracts`: Shared DTOs and validation shapes.
- `packages/core`: Pure digest, ranking, normalization, and bucketing logic.
- `packages/data`: Postgres access, repositories, and in-memory test doubles.
- `config`: Shared source configuration files.
- `migrations`: Database schema changes.
- `scripts`: Operational scripts for env checks, DB tasks, and bootstrap helpers.
- `tests`: Root unit tests for shared logic. Worker tests live under `apps/worker/src`.
- `.codex/config.toml`: Repo-local Codex settings for this trusted project.
- `.codex/skills/*`: Repo-local Codex skills for Sipnews-specific workflows.

## Codex Surfaces

- Keep durable repo instructions in `AGENTS.md`.
- Keep repo-specific Codex settings in `.codex/config.toml`.
- Keep specialized repeatable Sipnews workflows in `.codex/skills/*` when they are narrower than general repo guidance.
- Prefer adding a repo-local skill only when the workflow is specialized or repetitive enough that `AGENTS.md` would become noisy.
- Project `.codex/*` config and skills are expected to load only when Codex trusts this repository.

## Canonical Commands

- `npm run setup`: Install dependencies and confirm local env files are present.
- `npm run env:check`: Validate the local workspace env files and source config.
- `npm run verify:fast`: Run the default local verification path for most edits.
- `npm run verify`: Run the full repo verification path.
- `npm run test:unit`: Run root unit tests and worker unit tests.
- `npm run typecheck`: Typecheck all workspaces.
- `npm run build`: Build all workspaces.
- `npm run dev:api`: Start the API after validating `apps/api/.env`.
- `npm run dev:web`: Start the web app after validating `apps/web/.env`.
- `npm run dev:worker`: Start the worker after validating `apps/worker/.env`.
- `npm run worker:prepare`: Build and run the prepare job after validating worker env.
- `npm run worker:deliver`: Build and run the deliver job after validating worker env.
- `npm run db:setup`: Run migrations and seed the first local user after validating a root seed env that targets development and explicitly allows reset.

## Architecture Rules

- Keep business logic in `packages/core` whenever it does not need I/O.
- Keep persistence and repository concerns in `packages/data`.
- Keep `apps/api` thin. Reuse shared contracts and data access instead of redefining shapes.
- Keep `apps/worker` orchestration thin. Reuse `packages/core` and `packages/data` rather than embedding digest rules in app code.
- Update `.env.example` in the owning workspace whenever runtime configuration changes.
- Update `README.md` and `docs/agents/*` when local setup, verification flow, or change impact changes.

## Verification Rules

- For most code changes, run `npm run verify:fast`.
- For cross-workspace changes or anything touching contracts, build surfaces, or runtime wiring, run `npm run verify`.
- If you change worker behavior, include `npm run test:unit` because worker tests are not covered by the root `npm test` script alone.
- If you change env ownership or config files, run `npm run env:check`.

## Documentation Update Rule

- Update any affected documentation whenever behavior, setup, commands, configuration, deployment, or operational expectations change.
- At minimum, check whether the change requires updates to `README.md`, `AGENTS.md`, `docs/agents/*`, `docs/deployment/*`, `docs/operations/runbook.md`, or roadmap/decision docs.
- Do not treat docs as optional follow-up work. If the code change alters how engineers or agents should work with the repo, update the docs in the same change.

## Safety Notes

- Do not commit real secrets or filled `.env` files.
- `npm run db:setup` mutates the configured database and requires `DATABASE_ENV=development` plus `DATABASE_RESET_ALLOWED=true` in the root `.env`.
- `npm run worker:prepare` and `npm run worker:deliver` can hit external providers and deliver email if real credentials are present.
- Current production URLs:
  - web: `https://www.sipnewstoday.com`
  - api: `https://api.sipnewstoday.com`
- Current operational constraints:
  - Render cron runs in UTC.
  - Render auto deploy for `sipnews-web` and `sipnews-api` is currently configured in the dashboard to wait for CI to pass.
  - Source reliability varies, especially for GDELT-backed discovery.
