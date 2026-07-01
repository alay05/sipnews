# Merge Guidance For Sub-Agents

Use this guidance when multiple agents are working on the restructure in parallel.

## Stay In Your Slice

- Edit only files your task owns.
- Do not modify `package-lock.json` unless your task explicitly owns dependency sync.
- Do not run `npm install` unless your task explicitly owns dependency sync.
- Preserve current behavior while moving files.
- Prefer npm workspaces and workspace package names over relative cross-app imports.

## Before Editing

1. Check `git status --short`.
2. Read the files in your ownership scope.
3. Identify whether changes in adjacent files are user or agent work.
4. Avoid reverting unrelated changes.

## While Extracting

- Move shared types to `packages/contracts`.
- Move deterministic business logic to `packages/core`.
- Move persistence interfaces and database implementations to `packages/data`.
- Keep app entrypoints in `apps/*`.
- Add tests near the behavior being moved and keep the narrowest relevant verification command.

## Environment Variables

- Add browser-visible variables only to `apps/web/.env.example`, using `NEXT_PUBLIC_*`.
- Add API secrets only to `apps/api/.env.example`.
- Add worker-only operational settings only to `apps/worker/.env.example`.
- Keep source config paths API-owned until a task moves source fetching to the worker.
- Keep examples email-first. Do not add new SMS-era runtime settings.

## Conflict Resolution

- If two tasks edit the same implementation file, preserve the newer behavior and re-run the narrowest test covering it.
- If docs disagree with code, code is the source of truth and docs should state whether behavior is implemented or intended.
- If a follow-up is needed, write it in the final report rather than making unowned implementation changes.
