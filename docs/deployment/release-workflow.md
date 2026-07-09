# Release Workflow

Sipnews uses:

- `development` as the working integration branch
- `main` as the production release branch

## Branch Protection

Keep branch protection simple.

### `development`

- require pull requests before merge
- require status checks to pass
- do not require approvals
- do not allow force pushes or deletion

This keeps `development` easy to use while still protecting it from accidental direct edits.

### `main`

- require pull requests before merge
- require status checks to pass
- require the branch to be up to date before merge
- require conversation resolution before merge
- do not allow force pushes or deletion

This keeps releases into `main` explicit and clean.

## Normal Flow

Use this branch flow:

```text
feature branch -> development -> main
```

Typical examples:

- `feat/new-onboarding-copy -> development`
- `fix/delivery-timezone-bug -> development`
- `development -> main` when you want a production release

## Feature To `development`

1. Update `development`.

```sh
git checkout development
git pull origin development
```

2. Create a feature branch if you are not working directly on `development`.

```sh
git checkout -b feat/short-name
```

3. Make your changes.

4. Run the normal verification for the change.

Most changes:

```sh
npm run verify:fast
```

If the change touches shared packages, env/config, migrations, deployment wiring, or multiple runtimes:

```sh
npm run verify
npm run env:check
```

If the change touches worker behavior:

```sh
npm run test:unit
npm run verify:fast
```

5. Commit and push.

```sh
git add .
git commit -m "feat: short description"
git push -u origin feat/short-name
```

6. Open a pull request into `development`.

- base: `development`
- compare: your feature branch

7. Merge the PR into `development`.

Recommended merge style:

- squash merge for feature branches into `development`

## `development` To `main`

Use this when `development` contains the exact release you want to ship.

1. Update both branches locally.

```sh
git checkout development
git pull origin development
git checkout main
git pull origin main
git checkout development
```

2. Run release verification from `development`.

```sh
npm run verify
npm run env:check
```

If the release changes worker behavior:

```sh
npm run test:unit
```

3. If needed, run a deeper local smoke test on development-only infrastructure.

```sh
npm run db:reset
npm run db:bootstrap
npm run dev:api
npm run dev:web
npm run worker:prepare
npm run worker:deliver
```

4. Open a pull request from `development` into `main`.

- base: `main`
- compare: `development`

5. If the release includes schema changes, run the production migration:

```sh
npm run db:migrate
```

Run that only against the production `DATABASE_URL`.

For the migration rules, use [docs/deployment/database-migrations.md](/Users/andrewlay/sipnews/docs/deployment/database-migrations.md).

6. Merge the PR into `main`.

Recommended merge style:

- merge commit for `development -> main`

7. Verify production after deploy.

- open `https://www.sipnewstoday.com`
- check `https://api.sipnewstoday.com/health`
- inspect Render logs for the affected services
- run the ops report if needed:

```sh
DATABASE_URL=postgresql://... npm run ops:report
```
