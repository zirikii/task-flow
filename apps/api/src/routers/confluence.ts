import { TRPCError } from '@trpc/server';
import { Prisma } from '@taskflow/db';
import {
  CreatePageInput,
  CreateSpaceInput,
  Page,
  PageIdInput,
  PageNode,
  Space,
  SpaceIdInput,
  UpdatePageInput,
  WorkspaceIdInput,
} from '@taskflow/types';
import {
  protectedProcedure,
  requireWorkspaceMembership,
  router,
  workspaceProcedure,
} from '../trpc';
import { toPage, toPageNode, toSpace } from '../lib/serializers';
import type { AuthedContext } from '../trpc';

/** Resolve a space and assert the caller belongs to its workspace. */
async function requireSpace(ctx: AuthedContext, spaceId: string) {
  const space = await ctx.db.space.findUnique({ where: { id: spaceId } });
  if (!space) throw new TRPCError({ code: 'NOT_FOUND', message: 'Space not found.' });
  await requireWorkspaceMembership(ctx, space.workspaceId);
  return space;
}

/** Resolve a page (with its space) and assert workspace membership. */
async function requirePage(ctx: AuthedContext, pageId: string) {
  const page = await ctx.db.page.findUnique({
    where: { id: pageId },
    include: { author: true, space: true },
  });
  if (!page) throw new TRPCError({ code: 'NOT_FOUND', message: 'Page not found.' });
  await requireWorkspaceMembership(ctx, page.space.workspaceId);
  return page;
}

export const confluenceRouter = router({
  spaces: router({
    list: workspaceProcedure.input(WorkspaceIdInput).query(async ({ ctx }) => {
      const spaces = await ctx.db.space.findMany({
        where: { workspaceId: ctx.workspaceId },
        orderBy: { createdAt: 'asc' },
      });
      return spaces.map(toSpace);
    }),

    create: workspaceProcedure.input(CreateSpaceInput).mutation(async ({ ctx, input }) => {
      try {
        const space = await ctx.db.space.create({
          data: {
            workspaceId: ctx.workspaceId,
            key: input.key,
            name: input.name,
            description: input.description,
          },
        });
        return Space.parse(toSpace(space));
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          throw new TRPCError({
            code: 'CONFLICT',
            message: `A space with key "${input.key}" already exists in this workspace.`,
          });
        }
        throw error;
      }
    }),
  }),

  pages: router({
    tree: protectedProcedure.input(SpaceIdInput).query(async ({ ctx, input }) => {
      await requireSpace(ctx, input.spaceId);
      const pages = await ctx.db.page.findMany({
        where: { spaceId: input.spaceId },
        select: { id: true, spaceId: true, parentId: true, title: true, position: true },
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      });
      return pages.map((page) => PageNode.parse(toPageNode(page)));
    }),

    get: protectedProcedure.input(PageIdInput).query(async ({ ctx, input }) => {
      const page = await requirePage(ctx, input.pageId);
      return Page.parse(toPage(page));
    }),

    create: protectedProcedure.input(CreatePageInput).mutation(async ({ ctx, input }) => {
      await requireSpace(ctx, input.spaceId);
      if (input.parentId) {
        const parent = await ctx.db.page.findUnique({ where: { id: input.parentId } });
        if (!parent || parent.spaceId !== input.spaceId) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Parent page is invalid.' });
        }
      }

      const last = await ctx.db.page.findFirst({
        where: { spaceId: input.spaceId, parentId: input.parentId ?? null },
        orderBy: { position: 'desc' },
      });
      const position = (last?.position ?? 0) + 1000;

      const page = await ctx.db.page.create({
        data: {
          spaceId: input.spaceId,
          parentId: input.parentId ?? null,
          title: input.title,
          body: input.body ?? '',
          authorId: ctx.user.id,
          position,
        },
        include: { author: true },
      });
      return Page.parse(toPage(page));
    }),

    update: protectedProcedure.input(UpdatePageInput).mutation(async ({ ctx, input }) => {
      await requirePage(ctx, input.pageId);
      const page = await ctx.db.page.update({
        where: { id: input.pageId },
        data: { title: input.title, body: input.body },
        include: { author: true },
      });
      return Page.parse(toPage(page));
    }),

    delete: protectedProcedure.input(PageIdInput).mutation(async ({ ctx, input }) => {
      await requirePage(ctx, input.pageId);
      await ctx.db.page.delete({ where: { id: input.pageId } });
      return { success: true };
    }),
  }),
});
