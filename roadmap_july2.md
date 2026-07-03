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

Goal:

- finish the remaining dev/prod separation and release-discipline decisions beyond the initial local safety work

Deliverables:

- explicit decision on whether to stay `main`-only or introduce a real dev/staging branch later
- documented promotion path across local development, Neon dev branch usage, and production deploys
- cleanup of any remaining docs or env assumptions that still blur development and production responsibilities
- confirmation of how future development data, smoke tests, and deploy validation should work without touching production

### 2.2 Replace Destructive Migration Flow

Goal:

- move beyond `db:setup` as the main schema management path

Deliverables:

- real forward-only migration process
- separate bootstrap flow for a brand-new environment
- documented production-safe migration procedure

Dependencies:

- completed local/dev database separation

### 2.3 First-User Seed Cleanup

Goal:

- isolate one-time bootstrap logic from normal runtime operations

Deliverables:

- clear bootstrap-only seed script
- no legacy variable fallbacks
- docs for when the seed script should and should not be used

### 2.4 Operations And Observability

Goal:

- make production behavior easier to operate, debug, and review

Deliverables:

- alerting approach recommendation
- runbook for prepare and deliver failures
- clearer failure metadata
- repeatable daily or weekly production admin check
- digest success check
- delivery run check
- source health spot check

### 2.5 Security And Access Review Follow-Through

Goal:

- tighten production defaults and finish the follow-through from the initial security/access review

Deliverables:

- review `ALLOWED_USER_EMAILS` removal plan
- review secret placement by service
- review production-only env usage
- resolve env contract drift between code, docs, and Render where needed

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
