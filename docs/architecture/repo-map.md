# Repo Map

This repository is in the middle of a workspace restructure. The map below describes the current tree and the intended ownership boundaries agents should preserve while completing adjacent tasks.

## Root

- `package.json`: npm workspace declaration and root scripts.
- `package-lock.json`: dependency lockfile. Do not edit unless the task owns dependency sync.
- `tsconfig.json` and `tsconfig.build.json`: root TypeScript configuration during the transition.
- `vitest.config.ts`: current test runner configuration.
- `.env.example`: pointer to workspace env examples.

## Apps

- `apps/api/`: implemented Express product API for authenticated account endpoints.
- `apps/worker/`: implemented bucketed digest worker package.
- `apps/web/`: implemented Clerk-authenticated web app shell for onboarding, settings, and digest history.

## Packages

The packages exist as workspace scaffolds and should become the home for shared code as later tasks extract behavior from `apps/api`.

- `packages/config/`: shared typed config helpers.
- `packages/contracts/`: shared request, response, and event contracts.
- `packages/core/`: pure digest/domain logic.
- `packages/data/`: persistence interfaces and implementations.

## Runtime Assets

- `config/sources.example.json`: template for source definitions.
- `config/sources.json`: local source config, ignored by git.
- `migrations/001_init.sql`: current Postgres schema.
- `tests/`: existing Vitest coverage for the API-era implementation.

## Generated Output

- `dist/` and `apps/*/dist/` are build output.
- Do not treat generated files as source ownership unless a task explicitly owns build artifacts.
