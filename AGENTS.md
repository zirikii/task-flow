# AGENTS.md

See `README.md` for product/architecture details and `CLAUDE.md` for repo
conventions. Standard scripts live in the root `package.json` (`pnpm dev`,
`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, `pnpm db:*`).

## Cursor Cloud specific instructions

This is a pnpm + Turborepo monorepo modelled on the Atlassian product suite:
`apps/api` (Fastify + tRPC — one backend for the whole suite) and eleven
Next.js apps — `apps/web` (Jira, :3000), `apps/confluence` (:3001),
`apps/trello` (:3002), `apps/servicedesk` (:3003), `apps/discovery` (:3004),
`apps/statuspage` (:3005), `apps/opsgenie` (:3006), `apps/compass` (:3007),
`apps/bitbucket` (:3008), `apps/atlas` (:3009) and `apps/home` (launcher,
:3010). Shared packages live in `packages/*` (`types`, `db`, `ui`, `config`,
and `app-kit` — the shared web runtime: tRPC client, providers, auth views and
the app switcher). Internal packages export TypeScript source, so there is no
separate build step during development.

All apps share one API and one session cookie (cookies ignore port), so signing
in once via any app signs you into the whole suite. New products follow a fixed
recipe: a Prisma model + migration, a `@taskflow/types` zod schema, a router in
`apps/api/src/routers/*` (+ Vitest coverage), then a thin Next.js app that uses
`@taskflow/app-kit`.

### Services & how to run them

- **PostgreSQL 16** is installed locally (Docker is not available in this VM,
  so `docker compose up` does not work here). It is **not** auto-started on a
  fresh VM — start it before doing anything that touches the database:
  `sudo pg_ctlcluster 16 main start` (check with `sudo pg_lsclusters`).
- The `taskflow` Postgres role (password `taskflow`) and the `taskflow` /
  `taskflow_test` databases already exist in the snapshot, matching the
  defaults in `.env.example`.
- **`.env`** is required (gitignored). If missing, `cp .env.example .env`; the
  defaults work as-is against the local Postgres.
- Run the whole suite with `pnpm dev` (API on `:4000`, each app on its own
 port as listed above). That is a lot of dev servers; to run a subset use
 `turbo run dev --filter=@taskflow/api --filter=@taskflow/home` (add
 whichever product apps you need). Seeded logins: `ada@taskflow.dev` /
 `password123` and `grace@taskflow.dev` / `password123`.

### Database

- The Prisma client is generated into `node_modules` (gitignored) and is
  refreshed by the update script (`pnpm db:generate`). After changing
  `packages/db/prisma/schema.prisma`, re-run `pnpm db:generate`.
- Apply schema and seed data with `pnpm db:migrate:deploy` then `pnpm db:seed`
  (use `db:migrate:deploy`, not `db:migrate`, in non-interactive sessions —
  `prisma migrate dev` prompts). `pnpm db:reset` drops, re-migrates and re-seeds.

### Tests

- `pnpm test` (Vitest unit + integration) runs against the `taskflow_test`
  database and applies migrations to it automatically via the Vitest
  `globalSetup`; Postgres just needs to be running.
- `pnpm test:e2e` (Playwright) reuses already-running dev servers if present,
  otherwise boots them itself. The Chromium browser and its system libraries
  are installed in the snapshot; if Playwright reports a missing browser, run
  `pnpm --filter @taskflow/web exec playwright install chromium`.
