# Release Workflow

Sipnews currently uses `main` as the only long-lived branch. Keep the release process lightweight: short-lived branches, local verification before merge, and no extra staging branch until the team has a real need for one.

## Branch Strategy

- `main` is always the production branch.
- Create short-lived branches from the current `main`.
- Merge back into `main` after local verification and review.
- Do not introduce a long-lived `develop` or `staging` branch for the current team size.

## Branch Naming

Use a branch prefix that matches the kind of change:

- `feat/<short-description>` for new behavior
- `fix/<short-description>` for bug fixes
- `chore/<short-description>` for maintenance, tooling, or docs-only cleanup

Keep names short, lowercase, and hyphenated.

Examples:

- `feat/onboarding-validation`
- `fix/worker-timezone-selection`
- `chore/release-doc-alignment`

## Local Verification Before Merge

Run the smallest check that still covers the risk of the change.

### Most Code Changes

Run:

```sh
npm run verify:fast
```

This is the default pre-merge check for normal app or package edits.

### Cross-Workspace Or Release-Sensitive Changes

Run:

```sh
npm run verify
```

Use the full verification path when a change touches shared contracts, multiple runtimes, build wiring, or anything that could affect production deployment behavior.

### Worker Behavior Changes

Run:

```sh
npm run test:unit
npm run verify:fast
```

Worker tests are part of `test:unit`, and worker changes should keep that signal explicit even though `verify:fast` already includes it.

### Env Or Source Config Changes

Run:

```sh
npm run env:check
```

Then run the affected runtime command if the change impacts startup or runtime configuration:

- `npm run dev:api`
- `npm run dev:web`
- `npm run dev:worker`
- `npm run worker:prepare`
- `npm run worker:deliver`

### Docs-Only Changes

No code verification is required unless the docs change commands, setup steps, or operational instructions that should be re-checked.

## Manual Validation

After command-line verification, manually exercise the affected surface when practical.

Examples:

- web UI or onboarding/settings flow changes: confirm the changed pages in the local app
- API changes: hit the affected route or complete the user flow through the web app
- worker changes: run the relevant worker path and confirm expected logs or persisted output
- deployment or operational doc changes: confirm the documented command names and file paths still exist

Use the deeper end-to-end smoke test in [docs/operations/runbook.md](/Users/andrewlay/sipnews/docs/operations/runbook.md) when a change needs higher confidence across web, API, worker, and delivery behavior. It is not required for every merge.

## Merge Requirements For `main`

Before merging into `main`, confirm all of the following:

1. The branch is up to date enough with `main` to merge cleanly.
2. The required local verification for the change type has passed.
3. The affected runtime or user flow has been manually checked when practical.
4. Related documentation has been updated in the same change when behavior, setup, configuration, or operations changed.
5. Another engineer has reviewed the change when one is available.
6. The branch does not include unrelated work, debug code, or local-only config.

## Merge And Release

1. Branch from `main`.
2. Implement the change on a short-lived branch.
3. Run the required local verification for the change type.
4. Review and merge into `main`.
5. Let production deploy from `main`.
6. Perform production verification when the change warrants it using [docs/operations/runbook.md](/Users/andrewlay/sipnews/docs/operations/runbook.md).

This keeps the current workflow aligned with the repo's actual deployment model without adding branch overhead that the team does not yet need.
