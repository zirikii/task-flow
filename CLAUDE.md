# Repository conventions

This document captures how the TaskFlow codebase is organised and the rules to
follow when extending it. (Also useful for AI coding agents.)

## Golden rules

1. **`packages/types` is the single source of truth.** Define a Zod schema for
   every entity and every tRPC input/output. Derive TypeScript types with
   `z.infer` — never hand-write a duplicate `interface`/`type` for data that a
   schema already describes.
2. **No business logic in `apps/web`.** The browser calls tRPC only. All writes,
   validation and authorization live in `apps/api`.
3. **Every API mutation must:** validate input with a `@taskflow/types` schema
   via `.input(...)`, authorize via the appropriate procedure, and (for board
   changes) emit a `BoardEvent`.
4. **`packages/ui` is presentation-only.** No data fetching, no tRPC, no app
   imports — props in, UI out.
5. **Never commit a red build.** Run `pnpm lint && pnpm typecheck && pnpm test`
   before committing.

## Package boundaries

| Package            | May depend on                          |
| ------------------ | -------------------------------------- |
| `@taskflow/types`  | (only `zod`)                           |
| `@taskflow/db`     | `@prisma/client`                       |
| `@taskflow/ui`     | react, cva, clsx, tailwind-merge       |
| `@taskflow/api`    | `db`, `types`                          |
| `@taskflow/web`    | `types`, `ui`, `api` (types only)      |
| `@taskflow/config` | (consumed by all for eslint/ts/tailwind)|

Internal packages export TypeScript **source** (`exports → ./src/index.ts`).
`apps/api` runs via `tsx` (dev) / `tsup` (build); `apps/web` compiles them via
Next `transpilePackages`.

## tRPC authorization procedures (`apps/api/src/trpc.ts`)

- `publicProcedure` — no auth.
- `protectedProcedure` — requires a signed-in user.
- `workspaceProcedure` — input must include `workspaceId`; requires membership.
- `projectProcedure` — input must include `projectId`; authorizes via the
  owning workspace and attaches `ctx.project`.
- `taskProcedure` — input must include `taskId`; authorizes via the task's
  project → workspace and attaches `ctx.task`/`ctx.project`.

Role checks use `assertRole(ctx.membership.role, ['OWNER', 'ADMIN'])`.

## Adding a new API route

1. Add/extend the Zod input + output schemas in `packages/types`.
2. Add the procedure to the relevant router in `apps/api/src/routers/*`,
   choosing the procedure that enforces the right authorization.
3. Map Prisma rows to DTOs with helpers in `apps/api/src/lib/serializers.ts`.
4. If it changes the board, `ctx.events.emit(projectId, …)` a `BoardEvent`.
5. **Update tests** — add/extend Vitest coverage for new endpoints
   (this repository's convention: new API endpoints get test coverage).
6. Consume it in the web app via the generated `trpc` hooks.

## Commits

Use Conventional Commits, scoped by package/app where useful:

```
feat(api): add task.archive mutation
fix(web): reconcile optimistic move on error
test(api): cover label authorization
chore(db): add index on tasks.assigneeId
```

Keep commits small and focused; commit after each logical change.

## Code style

- Prettier (`pnpm format`) + ESLint flat config from `@taskflow/config`.
- Prefer named exports. `forwardRef` for UI primitives.
- No `TODO`s left in shipped code; no dead code.
