---
name: sipnews-cross-runtime-change
description: Use when a change may span apps/web, apps/api, apps/worker, shared packages, env/config, or Render deployment wiring. This skill helps Codex map ownership, avoid duplicated logic, choose the right verification commands, and update the required docs for cross-runtime Sipnews changes.
---

# Sipnews Cross-Runtime Change

Use this skill for changes that can touch more than one runtime or package boundary.

## Read first

- `AGENTS.md`
- `docs/agents/architecture.md`
- `docs/agents/change-playbook.md`
- `docs/agents/verification.md`
- `docs/deployment/render.md` when env, deploy, or worker schedule behavior may change

## Ownership map

- `apps/web`: UI, Clerk browser flows, API calls
- `apps/api`: authenticated product routes, user settings, digest reads, Postgres-backed app behavior
- `apps/worker`: source fetch, clustering, summarization, digest assembly, delivery
- `packages/contracts`: shared DTOs and validation shapes
- `packages/core`: pure digest, ranking, normalization, and bucketing logic
- `packages/data`: repositories, DB access, and persistence concerns

## Working rules

- Move reusable logic into shared packages instead of duplicating it across apps.
- Treat contract changes as contracts-first work and verify all dependents.
- Keep API and worker app layers thin when business rules can live in shared packages.
- If config or env ownership changes, update the owning `.env.example`, deployment docs, and any affected bootstrap checks.

## Required checks

- Start with `npm run verify:fast`.
- Use `npm run verify` for shared package, contract, build, or runtime wiring changes.
- Include `npm run env:check` when env or source config changes.
- Include worker tests when digest assembly, summarization, or delivery behavior changes.

## Required doc updates

Check whether the change also requires updates to:

- `README.md`
- `AGENTS.md`
- `docs/agents/*`
- `docs/deployment/*`
- `docs/operations/runbook.md`
- `render.yaml`

Do not leave cross-runtime behavior changes undocumented.
