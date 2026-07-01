# TaskFlow — an Atlassian-style product suite

A production-grade TypeScript monorepo modelled on the **Atlassian product
suite**. One backend, one database and one sign-in power **eleven separate
Next.js apps** — Jira, Confluence, Trello, Service Management, Product
Discovery, Statuspage, Opsgenie, Compass, Bitbucket, Atlas, and a Home
launcher — that you switch between with an Atlassian-style 9-dot app switcher.

> Built with pnpm workspaces + Turborepo, Next.js (App Router), Fastify + tRPC,
> Prisma + PostgreSQL, and a shared Zod schema package as the single source of
> truth for all types.

---

## The product suite

Every product is its own app under `apps/`, served on its own port. They all
talk to the shared API (`apps/api`, port 4000) and share one session cookie, so
signing in once signs you into the whole suite. The shared `@taskflow/app-kit`
package provides the tRPC client, providers, auth views and the top bar + app
switcher; `@taskflow/ui` provides the design system.

| Port | App               | Atlassian analog          | What it does |
| ---- | ----------------- | ------------------------- | ------------ |
| 3000 | `apps/web`        | **Jira**                  | Kanban issue board with drag-and-drop, comments, realtime |
| 3001 | `apps/confluence` | **Confluence**            | Spaces + a nested wiki page tree with markdown editing |
| 3002 | `apps/trello`     | **Trello**                | Boards → lists → cards with drag-and-drop |
| 3003 | `apps/servicedesk`| **Jira Service Management** | Request portal + agent queue with statuses & replies |
| 3004 | `apps/discovery`  | **Jira Product Discovery**| Ideas, upvotes and an impact/effort matrix |
| 3005 | `apps/statuspage` | **Statuspage**            | Component health + incident timeline |
| 3006 | `apps/opsgenie`   | **Opsgenie**              | Alerts (ack/close) + on-call schedule |
| 3007 | `apps/compass`    | **Compass**               | Software component catalog + health scores |
| 3008 | `apps/bitbucket`  | **Bitbucket**             | Repositories + pull requests + reviews |
| 3009 | `apps/atlas`      | **Atlas**                 | Teams + project status updates |
| 3010 | `apps/home`       | **Home / Start**          | Landing launcher with the full product grid |

`pnpm dev` runs every app + the API together via Turborepo. To run a subset,
use `turbo run dev --filter=@taskflow/home --filter=@taskflow/api` (etc.).

---

## Features

- 🔐 **Session auth** — email + password (argon2id hashing), httpOnly cookie sessions.
- 🏢 **Workspaces & membership** — users belong to one or more workspaces; role-based access (Owner/Admin/Member).
- 📋 **Projects & kanban tasks** — title, markdown description, status, priority, assignee, labels, due date.
- 🖱️ **Drag-and-drop board** — reorder within and across status columns; order persists via fractional ranking.
- ⚡ **Optimistic UI** — task moves apply instantly and reconcile with the server.
- 📡 **Realtime** — WebSocket subscriptions push task/comment events to every connected client.
- 🔎 **Filtering & search** — by assignee, label, priority and free text.
- 💬 **Task detail modal** — edit fields, render markdown, add comments, view a per-task activity log.

---

## Architecture

```
taskflow/
├── apps/
│   ├── api/         Fastify + tRPC server — one backend for the whole suite
│   ├── web/         Jira (kanban issue board)
│   ├── confluence/  Confluence (spaces + wiki pages)
│   ├── trello/      Trello (boards, lists, cards)
│   ├── servicedesk/ Jira Service Management (portal + queue)
│   ├── discovery/   Jira Product Discovery (ideas + voting)
│   ├── statuspage/  Statuspage (components + incidents)
│   ├── opsgenie/    Opsgenie (alerts + on-call)
│   ├── compass/     Compass (component catalog)
│   ├── bitbucket/   Bitbucket (repos + pull requests)
│   ├── atlas/       Atlas (teams + project updates)
│   └── home/        Home launcher
├── packages/
│   ├── types/    Zod schemas + inferred TS types — THE SINGLE SOURCE OF TRUTH
│   ├── db/       Prisma schema, client singleton, migrations, seed
│   ├── ui/       Presentation-only component library + design tokens
│   ├── app-kit/  Shared web runtime: tRPC client, providers, auth, app switcher
│   └── config/   Shared eslint / tsconfig / tailwind presets
└── docker-compose.yml   PostgreSQL 16
```

**How the suite fits together**

- **One API, many frontends.** Every product app calls the same `apps/api`
  tRPC server; each product is a router (`apps/api/src/routers/*`) mounted on a
  single `appRouter`.
- **Single sign-on for free.** The API sets an httpOnly session cookie on
  `localhost:4000`; because cookies ignore port, every `localhost:<port>` app
  sends it, so one login works everywhere. CORS reflects any localhost origin in
  development.
- **Shared runtime.** `@taskflow/app-kit` gives each app the tRPC client,
  React Query providers, `LoginView`/`SignupView`, a `ProductChrome` top bar and
  the 9-dot `AppSwitcher` — so each product app is mostly product-specific UI.

**Core principles**

1. **`packages/types` is the single source of truth.** Every tRPC input/output
   and every web form derives from the same Zod schemas — no duplicated type
   definitions. Entity types are always `z.infer<typeof Schema>`.
2. **No business logic in the web app.** The browser only calls tRPC. The API
   owns all writes, validates every input with Zod, and enforces workspace
   authorization on every mutation.
3. **`packages/ui` is presentation-only** — no data fetching, no tRPC.

**Data flow**

```
React component → tRPC React hook → (HTTP batch | WebSocket) → Fastify + tRPC
   → Zod validate → authorize (membership/role) → Prisma → PostgreSQL
   → emit board event → WebSocket subscription → other clients update live
```

---

## Tech stack

| Area        | Choice                                             |
| ----------- | -------------------------------------------------- |
| Monorepo    | pnpm workspaces + Turborepo                        |
| Language    | TypeScript (strict) everywhere                     |
| Web         | Next.js 15 (App Router), React 19, Tailwind CSS 3  |
| API         | Fastify 5 + tRPC 11                                 |
| Database    | Prisma 6 + PostgreSQL 16                            |
| Shared types| Zod 4                                              |
| Auth        | Hand-rolled cookie sessions + argon2 (`@node-rs/argon2`) |
| Realtime    | tRPC subscriptions over WebSocket (`@fastify/websocket`) |
| DnD         | `@dnd-kit`                                          |
| Tests       | Vitest (unit + integration), Playwright (e2e)      |

---

## Prerequisites

- **Node.js ≥ 20** (tested on 22)
- **pnpm 10** (`corepack enable` or `npm i -g pnpm`)
- **Docker** (for PostgreSQL) — or a local PostgreSQL 16 (see _Known limitations_)

---

## Quick start

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp .env.example .env

# 3. Start PostgreSQL
docker compose up -d

# 4. Apply migrations and seed demo data
pnpm db:migrate
pnpm db:seed

# 5. Run everything (API on :4000, web on :3000)
pnpm dev
```

Open **http://localhost:3000** and sign in with a seeded account:

| Email                 | Password      |
| --------------------- | ------------- |
| `ada@taskflow.dev`    | `password123` |
| `grace@taskflow.dev`  | `password123` |

…or sign up a brand-new account and create your own workspace.

To see realtime in action, open the same board in two browser tabs and create
or move a task in one — the other updates instantly.

---

## Environment variables

Copy `.env.example` to `.env`. All variables have sensible local defaults.

| Variable               | Description                                  | Default (local)                                                  |
| ---------------------- | -------------------------------------------- | ---------------------------------------------------------------- |
| `DATABASE_URL`         | Prisma/API PostgreSQL connection             | `postgresql://taskflow:taskflow@localhost:5432/taskflow`         |
| `DATABASE_URL_TEST`    | Database used by the integration test suite  | `postgresql://taskflow:taskflow@localhost:5432/taskflow_test`    |
| `API_PORT`             | Fastify API port                             | `4000`                                                           |
| `CORS_ORIGIN`          | Allowed browser origin (credentialed)        | `http://localhost:3000`                                          |
| `SESSION_COOKIE_NAME`  | Session cookie name                          | `taskflow_session`                                               |
| `WEB_PORT`             | Next.js port                                 | `3000`                                                           |
| `NEXT_PUBLIC_API_URL`  | API base URL used by the browser             | `http://localhost:4000`                                          |
| `NEXT_PUBLIC_WS_URL`   | WebSocket base URL used by the browser       | `ws://localhost:4000`                                            |

---

## Scripts (run from the repo root)

| Command              | Description                                             |
| -------------------- | ------------------------------------------------------- |
| `pnpm dev`           | Run the API and web app together (Turborepo)            |
| `pnpm build`         | Build every package/app                                 |
| `pnpm typecheck`     | Type-check the whole monorepo                           |
| `pnpm lint`          | Lint the whole monorepo                                 |
| `pnpm test`          | Run Vitest unit + integration tests                     |
| `pnpm test:e2e`      | Run the Playwright end-to-end suite                     |
| `pnpm format`        | Format with Prettier                                    |
| `pnpm db:migrate`    | Create/apply Prisma migrations (dev)                    |
| `pnpm db:migrate:deploy` | Apply migrations (non-interactive)                  |
| `pnpm db:seed`       | Seed demo data                                          |
| `pnpm db:studio`     | Open Prisma Studio                                      |
| `pnpm db:reset`      | Drop, re-migrate and re-seed the database               |

---

## Testing

- **Unit tests** (`apps/api`): password hashing, fractional position math.
- **Integration tests** (`apps/api`): run against a real `taskflow_test`
  database using tRPC `createCaller` — cover auth (signup/login/duplicate),
  session lifecycle, **task authorization** (non-members get `FORBIDDEN`), and
  the task router (create, board grouping, move + ordering, activity logging).
- **E2E** (`apps/web`): a Playwright run covering **signup → create project →
  create task → drag task to another column → reload and confirm persistence**,
  plus a **realtime two-tab** test.

```bash
pnpm test        # vitest (unit + integration); requires the test DB to exist
pnpm test:e2e    # playwright; boots the API + web dev servers automatically
```

> The Playwright browser is installed with `pnpm --filter @taskflow/web exec playwright install chromium`.

---

## Design decisions

- **Hand-rolled cookie sessions** instead of a third-party auth service or Lucia
  (which is deprecated): a random token is stored as an httpOnly cookie and its
  SHA-256 hash is persisted in the `Session` table. Passwords use argon2id.
- **Realtime via tRPC subscriptions over WebSocket** rather than a separate raw
  WS channel — this keeps the event contract type-safe and avoids duplicating
  types, honouring the "single source of truth" rule.
- **Fractional task ordering** — each task has a float `position`; dropping
  between two cards assigns the midpoint, with column renormalization when gaps
  get too small. Simple, fast, and avoids rewriting every row on each move.
- **Internal packages export TypeScript source** (consumed via `tsx`/Next
  `transpilePackages`), so there is no separate build step or stale `dist` to
  keep in sync during development.
- **Tailwind v3 preset model** so design tokens live in one shared preset
  (`packages/config`) consumed by both the web app and the UI library.

---

## Known limitations

- **Single-process realtime.** The WebSocket event bus is in-memory, so realtime
  works within one API instance. A multi-instance deployment would back it with
  Redis pub/sub or Postgres `LISTEN/NOTIFY` (the `BoardEventBus` is the seam).
- **Docker-less environments.** `docker compose up -d` is the documented way to
  run PostgreSQL. Where Docker is unavailable you can point `DATABASE_URL` at any
  local PostgreSQL 16 instance and the same `db:migrate` / `db:seed` commands
  apply. (CI in this repository was developed against a locally-installed
  PostgreSQL 16 for exactly this reason.)
- **No pagination** on boards/comments yet — fine for typical project sizes, but
  large datasets would want cursor pagination.

---

## License

MIT — see repository for details. Built as a reference implementation.
