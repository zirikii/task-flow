import {
  CreateWorkspaceInput,
  Workspace,
  WorkspaceIdInput,
  WorkspaceMember,
} from '@taskflow/types';
import { protectedProcedure, router, workspaceProcedure } from '../trpc';
import { uniqueSlug } from '../lib/slug';
import { toUserRef, toWorkspace } from '../lib/serializers';

export const workspaceRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const memberships = await ctx.db.membership.findMany({
      where: { userId: ctx.user.id },
      include: { workspace: true },
      orderBy: { createdAt: 'asc' },
    });
    return memberships.map((membership) => toWorkspace(membership.workspace, membership.role));
  }),

  create: protectedProcedure.input(CreateWorkspaceInput).mutation(async ({ ctx, input }) => {
    const existing = await ctx.db.workspace.findMany({ select: { slug: true } });
    const slug = uniqueSlug(input.name, new Set(existing.map((w) => w.slug)));

    const workspace = await ctx.db.workspace.create({
      data: {
        name: input.name,
        slug,
        memberships: { create: { userId: ctx.user.id, role: 'OWNER' } },
      },
    });

    return Workspace.parse(toWorkspace(workspace, 'OWNER'));
  }),

  get: workspaceProcedure.input(WorkspaceIdInput).query(async ({ ctx }) => {
    const workspace = await ctx.db.workspace.findUniqueOrThrow({ where: { id: ctx.workspaceId } });
    return Workspace.parse(toWorkspace(workspace, ctx.membership.role));
  }),

  members: workspaceProcedure.input(WorkspaceIdInput).query(async ({ ctx }) => {
    const memberships = await ctx.db.membership.findMany({
      where: { workspaceId: ctx.workspaceId },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    });
    return memberships.map((membership) =>
      WorkspaceMember.parse({
        id: membership.id,
        role: membership.role,
        user: toUserRef(membership.user),
      }),
    );
  }),
});
