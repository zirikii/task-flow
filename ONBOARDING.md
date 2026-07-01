# TaskFlow — New Developer Onboarding

Welcome to **TaskFlow**, a Linear-style team task tracker built as a TypeScript
monorepo. This guide is the fastest way to understand what the project is, how
the pieces fit together, and where to start coding.

For deeper reference, see:

- [`README.md`](./README.md) — full feature list, architecture, and design decisions
- [`CLAUDE.md`](./CLAUDE.md) — repo conventions and how to add API routes
- [`AGENTS.md`](./AGENTS.md) — environment setup notes for Cursor Cloud / CI

---

## What is TaskFlow?

TaskFlow lets teams organise work in a familiar hierarchy:

```
User → Workspace → Project → Task (on a kanban board)
```

A **workspace** is a team container (like a company or org). Users join via
**membership** with a role: `OWNER`, `ADMIN`, or `MEMBER`.

A **project** belongs to one workspace and has a short key (e.g. `WEB`).

**Tasks** live on a drag-and-drop kanban board with four columns:
`BACKLOG`, `TODO`, `IN_PROGRESS`, `DONE`. Each task has a title, markdown
description, priority, assignee, labels, due date, comments, and an activity
log.

The app also supports:

- Session-based email/password auth
- Optimistic UI for drag-and-drop moves
- Realtime updates over WebSocket (open two tabs to see it)
- Filtering and search on the board

---

## Repo layout (the 30-second map)

```
taskflow/
├── apps/
│   ├── api/          # Fastify + tRPC backend (auth, CRUD, authorization, WS)
│   └── web/          # Next.js 15 frontend (kanban UI)
├── packages/
│   ├── types/        # Zod schemas — single source of truth for all types
│   ├── db/           # Prisma schema, migrations, seed data
│   ├── ui/           # Shared React components (presentation only)
│   └── config/       # Shared ESLint, TypeScript, and Tailwind presets
├── package.json      # Root scripts (dev, test, db:*)
└── turbo.json        # Turborepo task orchestration
```

| Package / app   | Name              | What it does                                      |
| --------------- | ----------------- | ------------------------------------------------- |
| `apps/api`      | `@taskflow/api`   | All business logic, database access, auth, realtime |
| `apps/web`      | `@taskflow/web`   | Browser UI — calls tRPC, no direct DB access    |
| `packages/types`| `@taskflow/types` | Zod schemas shared by API and web                 |
| `packages/db`   | `@taskflow/db`    | Prisma client + PostgreSQL schema                 |
| `packages/ui`   | `@taskflow/ui`    | Buttons, modals, inputs, etc.                     |
| `packages/config`| `@taskflow/config`| Linting and styling presets                      |

---

## How a request flows

```
Browser (React)
  → tRPC React hook (apps/web)
  → HTTP batch or WebSocket (apps/api)
  → Zod validation (@taskflow/types)
  → Authorization middleware (membership / role check)
  → Prisma query (packages/db)
  → PostgreSQL
  → Board event emitted → WebSocket subscription → other clients update
```

The web app never talks to the database directly. Every read and write goes
through tRPC procedures in `apps/api`.

---

## Data model (mental model)

```
User ──membership──► Workspace ──has──► Project ──has──► Task
                              └──has──► Label ◄──many-to-many──► Task
Task ──has──► Comment, Activity
User ──has──► Session (cookie-based auth)
```

Key files:

- **Prisma schema:** `packages/db/prisma/schema.prisma`
- **Zod entity schemas:** `packages/types/src/*.ts`
- **API serializers (Prisma → DTO):** `apps/api/src/lib/serializers.ts`

---

## API structure

The tRPC router is assembled in `apps/api/src/router.ts`:

| Router       | File                          | Handles                          |
| ------------ | ----------------------------- | -------------------------------- |
| `auth`       | `routers/auth.ts`             | Signup, login, logout, session   |
| `workspace`  | `routers/workspace.ts`        | Workspaces, members              |
| `project`    | `routers/project.ts`          | Projects within a workspace      |
| `task`       | `routers/task.ts`             | Board, CRUD, move, subscriptions |
| `label`      | `routers/label.ts`            | Workspace labels                 |
| `comment`    | `routers/comment.ts`          | Task comments                    |

### Authorization procedures (`apps/api/src/trpc.ts`)

Procedures build on each other — pick the narrowest one that fits:

| Procedure             | Requires                         | Attaches to context      |
| --------------------- | -------------------------------- | ------------------------ |
| `publicProcedure`     | Nothing                          | —                        |
| `protectedProcedure`  | Signed-in user                   | `user`, `session`        |
| `workspaceProcedure`| `workspaceId` in input + membership | `membership`          |
| `projectProcedure`  | `projectId` in input + membership   | `project`, `membership` |
| `taskProcedure`     | `taskId` in input + membership    | `task`, `project`       |

Role checks use `assertRole(ctx.membership.role, ['OWNER', 'ADMIN'])` for
admin-only actions.

---

## Web app structure

Next.js App Router pages:

| Route                                      | Purpose                    |
| ------------------------------------------ | -------------------------- |
| `/`                                        | Landing / redirect         |
| `/login`, `/signup`                        | Auth pages                 |
| `/w/[workspaceId]`                         | Workspace home (projects)  |
| `/w/[workspaceId]/p/[projectId]`           | Kanban board               |

Important frontend files:

- **tRPC client setup:** `apps/web/src/lib/trpc.ts`, `apps/web/src/app/providers.tsx`
- **Board UI:** `apps/web/src/components/board/`
- **Task detail modal:** `apps/web/src/components/task/TaskModal.tsx`

The web app imports `AppRouter` type from `@taskflow/api` for end-to-end type
safety — if you change an API procedure, TypeScript will flag broken callers.

---

## Golden rules (read these before your first PR)

1. **`packages/types` is the single source of truth.** Define Zod schemas there;
   derive TypeScript types with `z.infer`. Never duplicate entity types by hand.
2. **No business logic in `apps/web`.** The browser calls tRPC only.
3. **Every API mutation must** validate input with a Zod schema, authorize via
   the right procedure, and (for board changes) emit a `BoardEvent`.
4. **`packages/ui` is presentation-only.** Props in, UI out — no tRPC, no
   data fetching.
5. **Never commit a red build.** Run `pnpm lint && pnpm typecheck && pnpm test`
   before pushing.

---

## Local setup

### Prerequisites

- Node.js ≥ 20
- pnpm 10 (`corepack enable`)
- PostgreSQL 16 (Docker via `docker compose up -d`, or a local install)

### First run

```bash
pnpm install
cp .env.example .env          # defaults work for local Postgres
docker compose up -d            # or start your own Postgres 16
pnpm db:migrate
pnpm db:seed
pnpm dev                        # API on :4000, web on :3000
```

Open the web app (default port **3000**) and sign in:

| Email                | Password      |
| -------------------- | ------------- |
| `ada@taskflow.dev`   | `password123` |
| `grace@taskflow.dev` | `password123` |

### Useful commands

```bash
pnpm dev              # Run API + web together
pnpm test             # Vitest unit + integration tests
pnpm test:e2e         # Playwright end-to-end tests
pnpm lint             # ESLint across the monorepo
pnpm typecheck        # TypeScript check
pnpm db:studio        # Open Prisma Studio
pnpm db:reset         # Drop, re-migrate, and re-seed
```

---

## Common tasks

### Add a new API endpoint

1. Add input/output Zod schemas in `packages/types/src/`.
2. Add the procedure in the relevant `apps/api/src/routers/*.ts` file.
3. Map Prisma rows to DTOs in `apps/api/src/lib/serializers.ts` if needed.
4. Emit a `BoardEvent` if the change affects the kanban board.
5. Add Vitest coverage in `apps/api/src/routers/*.test.ts`.
6. Consume it in the web app via `trpc.*` hooks.

See [`CLAUDE.md`](./CLAUDE.md) for the full checklist.

### Change the database schema

1. Edit `packages/db/prisma/schema.prisma`.
2. Run `pnpm db:generate` to refresh the Prisma client.
3. Create a migration: `pnpm db:migrate` (interactive) or
   `pnpm db:migrate:deploy` (CI / non-interactive).
4. Update Zod schemas in `packages/types` to match.

### Add a UI component

- Shared primitives (buttons, inputs, modals) → `packages/ui/src/components/`
- App-specific components (board, filters) → `apps/web/src/components/`

---

## Testing overview

| Layer            | Tool       | Location                    | What it covers                |
| ---------------- | ---------- | --------------------------- | ----------------------------- |
| Unit             | Vitest     | `apps/api/src/**/*.test.ts` | Password hashing, position math |
| Integration      | Vitest     | `apps/api/src/routers/*.test.ts` | Auth, authorization, task CRUD |
| End-to-end       | Playwright | `apps/web/e2e/`             | Full signup → board → drag flow |

Integration tests run against a real `taskflow_test` database. Make sure
Postgres is running before `pnpm test`.

---

## Design choices worth knowing

- **Cookie sessions** — random token in an httpOnly cookie; SHA-256 hash stored
  in the `Session` table. Passwords hashed with argon2id.
- **Fractional ordering** — tasks have a float `position`; dropping between two
  cards assigns the midpoint. See `apps/api/src/lib/position.ts`.
- **Realtime** — tRPC subscriptions over WebSocket, backed by an in-memory
  `BoardEventBus` (`apps/api/src/events.ts`). Single-process only today.
- **Source exports** — internal packages export TypeScript source directly (no
  separate `dist` build during development).

---

## Where to look when you're stuck

| Question                          | Start here                                      |
| --------------------------------- | ----------------------------------------------- |
| What does this entity look like?  | `packages/types/src/`                           |
| How is auth handled?              | `apps/api/src/auth/`, `apps/api/src/routers/auth.ts` |
| How does drag-and-drop work?      | `apps/web/src/components/board/`, `apps/api/src/routers/task.ts` (`move`) |
| How does realtime work?           | `apps/api/src/events.ts`, `task.onBoardChange` subscription |
| What seed data exists?            | `packages/db/prisma/seed.ts`                    |
| What env vars are available?      | `.env.example`                                  |

---

## Next steps

1. Run the app locally and click around the seeded board.
2. Open the same board in two browser tabs and move a task — watch realtime sync.
3. Read one router end-to-end (start with `apps/api/src/routers/task.ts`).
4. Skim `CLAUDE.md` before making your first change.

Welcome aboard!
