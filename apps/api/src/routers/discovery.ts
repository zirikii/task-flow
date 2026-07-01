import { TRPCError } from '@trpc/server';
import {
  CreateIdeaBoardInput,
  CreateIdeaInput,
  Idea,
  IdeaBoard,
  IdeaBoardIdInput,
  IdeaIdInput,
  UpdateIdeaInput,
  WorkspaceIdInput,
} from '@taskflow/types';
import {
  protectedProcedure,
  requireWorkspaceMembership,
  router,
  workspaceProcedure,
} from '../trpc';
import type { AuthedContext } from '../trpc';
import { ideaInclude, toIdea, toIdeaBoard } from '../lib/serializers';

async function requireBoard(ctx: AuthedContext, boardId: string) {
  const board = await ctx.db.ideaBoard.findUnique({ where: { id: boardId } });
  if (!board) throw new TRPCError({ code: 'NOT_FOUND', message: 'Idea board not found.' });
  await requireWorkspaceMembership(ctx, board.workspaceId);
  return board;
}

async function requireIdea(ctx: AuthedContext, ideaId: string) {
  const idea = await ctx.db.idea.findUnique({
    where: { id: ideaId },
    include: { board: true },
  });
  if (!idea) throw new TRPCError({ code: 'NOT_FOUND', message: 'Idea not found.' });
  await requireWorkspaceMembership(ctx, idea.board.workspaceId);
  return idea;
}

export const discoveryRouter = router({
  boards: router({
    list: workspaceProcedure.input(WorkspaceIdInput).query(async ({ ctx }) => {
      const boards = await ctx.db.ideaBoard.findMany({
        where: { workspaceId: ctx.workspaceId },
        orderBy: { createdAt: 'asc' },
      });
      return boards.map(toIdeaBoard);
    }),

    create: workspaceProcedure.input(CreateIdeaBoardInput).mutation(async ({ ctx, input }) => {
      const board = await ctx.db.ideaBoard.create({
        data: { workspaceId: ctx.workspaceId, name: input.name },
      });
      return IdeaBoard.parse(toIdeaBoard(board));
    }),
  }),

  ideas: router({
    list: protectedProcedure.input(IdeaBoardIdInput).query(async ({ ctx, input }) => {
      await requireBoard(ctx, input.boardId);
      const ideas = await ctx.db.idea.findMany({
        where: { boardId: input.boardId },
        include: ideaInclude,
        orderBy: { createdAt: 'desc' },
      });
      return ideas.map((idea) => toIdea(idea, ctx.user.id));
    }),

    create: protectedProcedure.input(CreateIdeaInput).mutation(async ({ ctx, input }) => {
      await requireBoard(ctx, input.boardId);
      const idea = await ctx.db.idea.create({
        data: {
          boardId: input.boardId,
          title: input.title,
          description: input.description,
          impact: input.impact,
          effort: input.effort,
          creatorId: ctx.user.id,
        },
        include: ideaInclude,
      });
      return Idea.parse(toIdea(idea, ctx.user.id));
    }),

    update: protectedProcedure.input(UpdateIdeaInput).mutation(async ({ ctx, input }) => {
      await requireIdea(ctx, input.ideaId);
      const idea = await ctx.db.idea.update({
        where: { id: input.ideaId },
        data: {
          title: input.title,
          description: input.description,
          impact: input.impact,
          effort: input.effort,
          status: input.status,
        },
        include: ideaInclude,
      });
      return Idea.parse(toIdea(idea, ctx.user.id));
    }),

    vote: protectedProcedure.input(IdeaIdInput).mutation(async ({ ctx, input }) => {
      await requireIdea(ctx, input.ideaId);
      await ctx.db.ideaVote.upsert({
        where: { ideaId_userId: { ideaId: input.ideaId, userId: ctx.user.id } },
        create: { ideaId: input.ideaId, userId: ctx.user.id },
        update: {},
      });
      const idea = await ctx.db.idea.findUniqueOrThrow({
        where: { id: input.ideaId },
        include: ideaInclude,
      });
      return Idea.parse(toIdea(idea, ctx.user.id));
    }),

    unvote: protectedProcedure.input(IdeaIdInput).mutation(async ({ ctx, input }) => {
      await requireIdea(ctx, input.ideaId);
      await ctx.db.ideaVote
        .delete({ where: { ideaId_userId: { ideaId: input.ideaId, userId: ctx.user.id } } })
        .catch(() => undefined);
      const idea = await ctx.db.idea.findUniqueOrThrow({
        where: { id: input.ideaId },
        include: ideaInclude,
      });
      return Idea.parse(toIdea(idea, ctx.user.id));
    }),
  }),
});
