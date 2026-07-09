# Roadmap July 2

This roadmap is the current work breakdown after production launch. Use the IDs directly when assigning work to agents.

## 0. Current State

- production web, api, and worker are live
- Clerk production auth works
- shared-cluster digest backend works
- email delivery works
- local development now uses a separate Neon development branch and no local process points at production DB by default
- committed worker source config defaults and release workflow docs are in place
- current biggest gaps are migration hardening, user flows, source hardening, product polish, and operations

## 1. Completed Since Launch

### 1.1 Separate Development Database

Completed:

- created a separate Neon development branch from production for local/dev use
- updated local env conventions and validation to require explicit development DB usage
- local bootstrap/reset flow now requires explicit development-only acknowledgement
- verified local checks against the new dev DB setup

### 1.2 Separate Development And Production Source Config

Completed:

- committed `config/sources.json` as the production-safe default source config
- added `config/sources.local.json` as the optional local-only override path
- aligned worker defaults, env validation, Render blueprint, and docs around the new config contract

### 1.3 Release Workflow

Completed:

- documented the release workflow in `docs/deployment/release-workflow.md`
- standardized branch naming around short-lived `feat/*`, `fix/*`, and `chore/*` branches
- documented verification expectations and merge requirements

## 2. Immediate Foundations

These items should happen before the deeper product and polish work.

### 2.1 Development Pipeline And Environment Separation Follow-Through

Completed:

- confirmed `development` is the integration branch and `main` remains the production branch
- documented the current promotion path across short-lived branches, local development, the dev-only Neon database, `development`, and Render production deploys
- cleaned up stale docs that still implied the separate dev database was future work or that local/prod boundaries were still blurred
- documented that destructive resets, seed flows, worker test deliveries, and deep smoke tests stay on development-only infrastructure rather than production

### 2.2 Replace Destructive Migration Flow

Completed:

- replaced the destructive `db:migrate` reset logic with a forward-only migration runner over ordered `migrations/*.sql`
- split destructive reset, schema migration, and first-user bootstrap into distinct commands: `db:reset`, `db:migrate`, and `db:bootstrap`
- documented the production-safe migration procedure in `docs/deployment/database-migrations.md`

### 2.3 First-User Seed Cleanup

Completed:

- converted first-user seeding into a bootstrap-only upsert flow instead of a table-wiping reset helper
- removed implicit `FIRST_USER_*` fallback values from the seed script and required explicit bootstrap inputs
- cleaned up legacy seed naming in shared dev seed helpers
- documented when to use `db:bootstrap` versus `db:migrate` or `db:reset`

### 2.4 Operations And Observability

Completed:

- added clearer worker failure metadata, including `failureStage`, structured source summaries, and persisted per-source ingestion results
- documented an alerting recommendation and expanded the ops runbook for prepare failures, deliver failures, and source degradation
- added `npm run ops:report` as a repeatable read-only production admin check for latest prepare, latest deliver, digest success, delivery failures, and source health
- documented digest success, delivery run, and source health checks in the runbook

### 2.5 Security And Access Review Follow-Through

Completed:

- removed `ALLOWED_USER_EMAILS` from the API env contract, code path, and Render blueprint
- split worker secret requirements by service so prepare no longer requires SendGrid secrets and deliver no longer requires OpenAI secrets
- removed dead or drifting env contracts such as the unused API `PUBLIC_BASE_URL` and undocumented web `SIPNEWS_API_URL` override
- aligned code, env examples, docs, and `render.yaml` around the current production contract

## 3. Onboarding And Shared-Bucket Product Logic

### 3.1 Complete Onboarding Flow

Goal:

- turn current placeholder onboarding into the real production onboarding flow

Required inputs:

- email
- timezone
- send hour
- digest size
- summary length
- category counts that sum to digest size

Deliverables:

- onboarding validation and UX improvements
- clear incomplete/complete states
- clean post-signup path into onboarding

Dependencies:

- completed local/dev database separation

### 3.2 Complete Settings Flow

Goal:

- make settings editing robust after onboarding

Deliverables:

- prevent invalid category totals
- cleaner category count controls
- safer active/inactive controls

### 3.3 Bucket Assignment Review

Goal:

- validate that current bucket assignment rules match expected categories

Deliverables:

- rule audit for `world`, `tech`, `ai`, `startups`
- edge-case list
- proposed adjustments if category leakage is found

### 3.4 New User Mapping Policy

Goal:

- define how future users interact with the shared asset model

Deliverables:

- clear policy for category selection
- clear policy for summary length selection
- no “special first user” logic
- documentation of how user settings map into shared prepared content

### 3.5 Delivery Selection Diagnostics

Goal:

- make it easier to explain why a user received a given digest

Deliverables:

- structured selection logs
- optional admin/debug view later

## 4. Summary Quality And Prompt Work

### 4.1 Summary Length Tuning

Goal:

- improve the actual quality of `small`, `medium`, and `large`

Current issue:

- current digest output is too short

Deliverables:

- prompt revisions
- variant-specific length targets
- before/after examples

### 4.2 Digest Assembly Quality

Goal:

- improve final digest pacing and mix

Deliverables:

- category balance review
- duplicate-topic avoidance review
- better title and body formatting

## 5. Source Reliability

### 5.1 GDELT Review

Goal:

- decide whether GDELT stays in the default production mix

Current issue:

- frequent `429` and timeout behavior

Deliverables:

- keep / reduce / replace recommendation
- production-safe default source set

### 5.2 Source Tiering

Goal:

- classify sources by reliability and importance

Deliverables:

- required vs optional source list
- fallback policy
- source health notes

### 5.3 Additional Stable Sources

Goal:

- improve coverage without making runs fragile

Deliverables:

- shortlist of stable sources per category
- implementation plan

## 6. Frontend Product Polish

### 6.1 Dashboard Upgrade

Goal:

- move beyond the current shell UI

Deliverables:

- clearer readiness state
- clearer next delivery state
- digest stats that matter

### 6.2 Better Form Controls

Goal:

- replace raw number-entry UX where helpful

Deliverables:

- category sliders or stepped controls
- cleaner summary length chooser
- better validation feedback

### 6.3 Digest Detail UX

Goal:

- improve digest history usefulness

Deliverables:

- digest detail page
- clearer delivered vs pending state
- links and source visibility improvements

### 6.4 Public Landing Decisions

Goal:

- decide what the public homepage should do now that production is live

Deliverables:

- clear signed-out landing behavior
- sign-in/sign-up routing review
