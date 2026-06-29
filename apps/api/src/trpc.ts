import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { z } from 'zod';
import { idSchema, type Role } from '@taskflow/types';
import type { Membership, Project, Session, Task, User } from '@taskflow/db';
import type { Context } from './context';

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zod: error.cause instanceof z.ZodError ? z.flattenError(error.cause) : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;

/** A context guaranteed to have an authenticated user + session. */
export interface AuthedContext extends Context {
  user: User;
  session: Session;
}

const enforceAuth = t.middleware(({ ctx, next }) => {
  if (!ctx.user || !ctx.session) {
    throw new TRPCError({ code: 'UNAUTHORIZED', message: 'You must be signed in.' });
  }
  return next({ ctx: { ...ctx, user: ctx.user, session: ctx.session } });
});

/** Requires an authenticated user. */
export const protectedProcedure = t.procedure.use(enforceAuth);

async function requireMembership(
  ctx: AuthedContext,
  workspaceId: string,
): Promise<Membership> {
  const membership = await ctx.db.membership.findUnique({
    where: { userId_workspaceId: { userId: ctx.user.id, workspaceId } },
  });
  if (!membership) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'You are not a member of this workspace.' });
  }
  return membership;
}

export function assertRole(role: Role, allowed: readonly Role[]): void {
  if (!allowed.includes(role)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You do not have permission to perform this action.',
    });
  }
}

/** Re-export for resolvers that authorize by an id not covered by a procedure. */
export const requireWorkspaceMembership = requireMembership;

const workspaceIdShape = z.object({ workspaceId: idSchema });
const projectIdShape = z.object({ projectId: idSchema });
const taskIdShape = z.object({ taskId: idSchema });

/** Requires membership of the workspace identified by `input.workspaceId`. */
export const workspaceProcedure = protectedProcedure.use(async ({ ctx, next, getRawInput }) => {
  const { workspaceId } = workspaceIdShape.parse(await getRawInput());
  const membership = await requireMembership(ctx, workspaceId);
  return next({ ctx: { ...ctx, membership, workspaceId } });
});

/** Requires membership of the workspace that owns `input.projectId`. */
export const projectProcedure = protectedProcedure.use(async ({ ctx, next, getRawInput }) => {
  const { projectId } = projectIdShape.parse(await getRawInput());
  const project: Project | null = await ctx.db.project.findUnique({ where: { id: projectId } });
  if (!project) throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found.' });
  const membership = await requireMembership(ctx, project.workspaceId);
  return next({ ctx: { ...ctx, project, membership, workspaceId: project.workspaceId } });
});

/** Requires membership of the workspace that owns `input.taskId`. */
export const taskProcedure = protectedProcedure.use(async ({ ctx, next, getRawInput }) => {
  const { taskId } = taskIdShape.parse(await getRawInput());
  const task: (Task & { project: Project }) | null = await ctx.db.task.findUnique({
    where: { id: taskId },
    include: { project: true },
  });
  if (!task) throw new TRPCError({ code: 'NOT_FOUND', message: 'Task not found.' });
  const membership = await requireMembership(ctx, task.project.workspaceId);
  return next({
    ctx: { ...ctx, task, project: task.project, membership, workspaceId: task.project.workspaceId },
  });
});
