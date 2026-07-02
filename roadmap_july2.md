# Roadmap July 2

This roadmap is the current work breakdown after production launch. Use the IDs directly when assigning work to agents.

## 0. Current State

- production web, api, and worker are live
- Clerk production auth works
- shared-cluster digest backend works
- email delivery works
- current biggest gaps are environment separation, user flows, source hardening, and product polish

## 1. Environment Separation And Release Discipline

### 1.1 Separate Development Database

Goal:

- stop sharing one database between local/dev and production

Deliverables:

- separate Neon project or separate database for development
- updated local env templates and setup docs
- no local process points at production DB by default

Agent output:

- env var changes
- docs update
- validation steps

### 1.2 Separate Development And Production Source Config

Goal:

- make source configuration explicit per environment

Deliverables:

- committed production-safe default source config
- optional local override path for development
- Render blueprint and local docs aligned

Dependencies:

- none

### 1.3 Release Workflow

Goal:

- establish a clear test-before-push workflow

Recommendation:

- keep `main` as the only long-lived branch for now
- use short-lived feature branches off `main`
- do not add a long-lived `develop` branch yet

Deliverables:

- documented branch naming
- documented local verification checklist
- documented merge requirements

## 2. Database And Migration Hardening

### 2.1 Replace Destructive Migration Flow

Goal:

- move beyond `db:setup` as the main schema management path

Deliverables:

- real forward-only migration process
- separate bootstrap flow for a brand-new environment
- documented production-safe migration procedure

Dependencies:

- 1.1

### 2.2 First-User Seed Cleanup

Goal:

- isolate one-time bootstrap logic from normal runtime operations

Deliverables:

- clear bootstrap-only seed script
- no legacy variable fallbacks
- docs for when the seed script should and should not be used

## 3. Onboarding And Settings Product Work

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

- 1.1 recommended

### 3.2 Complete Settings Flow

Goal:

- make settings editing robust after onboarding

Deliverables:

- prevent invalid category totals
- cleaner category count controls
- safer active/inactive controls

### 3.3 Digest Detail UX

Goal:

- improve digest history usefulness

Deliverables:

- digest detail page
- clearer delivered vs pending state
- links and source visibility improvements

## 4. Shared-Bucket Backend Hardening

### 4.1 Bucket Assignment Review

Goal:

- validate that current bucket assignment rules match expected categories

Deliverables:

- rule audit for `world`, `tech`, `ai`, `startups`
- edge-case list
- proposed adjustments if category leakage is found

### 4.2 New User Mapping Policy

Goal:

- define how future users interact with the shared asset model

Deliverables:

- clear policy for category selection
- clear policy for summary length selection
- no “special first user” logic
- documentation of how user settings map into shared prepared content

### 4.3 Delivery Selection Diagnostics

Goal:

- make it easier to explain why a user received a given digest

Deliverables:

- structured selection logs
- optional admin/debug view later

## 5. Summary Quality And Prompt Work

### 5.1 Summary Length Tuning

Goal:

- improve the actual quality of `small`, `medium`, and `large`

Current issue:

- current digest output is too short

Deliverables:

- prompt revisions
- variant-specific length targets
- before/after examples

### 5.2 Digest Assembly Quality

Goal:

- improve final digest pacing and mix

Deliverables:

- category balance review
- duplicate-topic avoidance review
- better title and body formatting

## 6. Source Reliability

### 6.1 GDELT Review

Goal:

- decide whether GDELT stays in the default production mix

Current issue:

- frequent `429` and timeout behavior

Deliverables:

- keep / reduce / replace recommendation
- production-safe default source set

### 6.2 Source Tiering

Goal:

- classify sources by reliability and importance

Deliverables:

- required vs optional source list
- fallback policy
- source health notes

### 6.3 Additional Stable Sources

Goal:

- improve coverage without making runs fragile

Deliverables:

- shortlist of stable sources per category
- implementation plan

## 7. Frontend Product Polish

### 7.1 Dashboard Upgrade

Goal:

- move beyond the current shell UI

Deliverables:

- clearer readiness state
- clearer next delivery state
- digest stats that matter

### 7.2 Better Form Controls

Goal:

- replace raw number-entry UX where helpful

Deliverables:

- category sliders or stepped controls
- cleaner summary length chooser
- better validation feedback

### 7.3 Public Landing Decisions

Goal:

- decide what the public homepage should do now that production is live

Deliverables:

- clear signed-out landing behavior
- sign-in/sign-up routing review

## 8. Operations And Observability

### 8.1 Worker Monitoring

Goal:

- make failures easier to notice and debug

Deliverables:

- alerting approach recommendation
- runbook for prepare and deliver failures
- clearer failure metadata

### 8.2 Production Admin Checks

Goal:

- create a repeatable daily or weekly operational check

Deliverables:

- digest success check
- delivery run check
- source health spot check

### 8.3 Security And Access Review

Goal:

- tighten production defaults

Deliverables:

- review `ALLOWED_USER_EMAILS` removal plan
- review secret placement by service
- review production-only env usage

## 9. Recommended Execution Order

### Phase A: Safety And Separation

- `1.1` separate development database
- `1.3` release workflow
- `2.1` migration hardening

### Phase B: Core Product Flow

- `3.1` complete onboarding
- `3.2` complete settings
- `7.2` better form controls

### Phase C: Content Quality

- `5.1` summary length tuning
- `5.2` digest assembly quality
- `6.1` GDELT review

### Phase D: Scale And Operations

- `4.2` new user mapping policy
- `8.1` worker monitoring
- `8.2` production admin checks

## 10. Suggested Agent Splits

- Agent A: `1.1`, `1.3`, `2.1`
- Agent B: `3.1`, `3.2`, `7.2`
- Agent C: `5.1`, `5.2`
- Agent D: `6.1`, `6.2`, `6.3`
- Agent E: `4.1`, `4.2`, `4.3`
- Agent F: `8.1`, `8.2`, `8.3`

## 11. Immediate Next Recommendation

If choosing one thing next, do this:

- `1.1` separate the development database from production

That is the highest-leverage infrastructure improvement now that production is live.
