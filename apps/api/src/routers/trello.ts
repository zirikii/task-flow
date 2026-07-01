import { TRPCError } from '@trpc/server';
import {
  CreateTrelloBoardInput,
  CreateTrelloCardInput,
  CreateTrelloListInput,
  MoveTrelloCardInput,
  TrelloBoard,
  TrelloBoardDetail,
  TrelloBoardIdInput,
  TrelloCard,
  TrelloCardIdInput,
  TrelloList,
  UpdateTrelloCardInput,
  WorkspaceIdInput,
} from '@taskflow/types';
import {
  protectedProcedure,
  requireWorkspaceMembership,
  router,
  workspaceProcedure,
} from '../trpc';
import type { AuthedContext } from '../trpc';
import {
  toTrelloBoard,
  toTrelloBoardDetail,
  toTrelloCard,
  toTrelloList,
} from '../lib/serializers';
import { needsRenormalization, POSITION_GAP, positionBetween } from '../lib/position';

async function requireBoard(ctx: AuthedContext, boardId: string) {
  const board = await ctx.db.trelloBoard.findUnique({ where: { id: boardId } });
  if (!board) throw new TRPCError({ code: 'NOT_FOUND', message: 'Board not found.' });
  await requireWorkspaceMembership(ctx, board.workspaceId);
  return board;
}

async function requireList(ctx: AuthedContext, listId: string) {
  const list = await ctx.db.trelloList.findUnique({
    where: { id: listId },
    include: { board: true },
  });
  if (!list) throw new TRPCError({ code: 'NOT_FOUND', message: 'List not found.' });
  await requireWorkspaceMembership(ctx, list.board.workspaceId);
  return list;
}

async function requireCard(ctx: AuthedContext, cardId: string) {
  const card = await ctx.db.trelloCard.findUnique({
    where: { id: cardId },
    include: { list: { include: { board: true } } },
  });
  if (!card) throw new TRPCError({ code: 'NOT_FOUND', message: 'Card not found.' });
  await requireWorkspaceMembership(ctx, card.list.board.workspaceId);
  return card;
}

export const trelloRouter = router({
  boards: router({
    list: workspaceProcedure.input(WorkspaceIdInput).query(async ({ ctx }) => {
      const boards = await ctx.db.trelloBoard.findMany({
        where: { workspaceId: ctx.workspaceId },
        orderBy: { createdAt: 'asc' },
      });
      return boards.map(toTrelloBoard);
    }),

    create: workspaceProcedure.input(CreateTrelloBoardInput).mutation(async ({ ctx, input }) => {
      const board = await ctx.db.trelloBoard.create({
        data: { workspaceId: ctx.workspaceId, name: input.name },
      });
      return TrelloBoard.parse(toTrelloBoard(board));
    }),

    get: protectedProcedure.input(TrelloBoardIdInput).query(async ({ ctx, input }) => {
      await requireBoard(ctx, input.boardId);
      const board = await ctx.db.trelloBoard.findUniqueOrThrow({
        where: { id: input.boardId },
        include: { lists: { include: { cards: true } } },
      });
      return TrelloBoardDetail.parse(toTrelloBoardDetail(board));
    }),
  }),

  lists: router({
    create: protectedProcedure.input(CreateTrelloListInput).mutation(async ({ ctx, input }) => {
      await requireBoard(ctx, input.boardId);
      const last = await ctx.db.trelloList.findFirst({
        where: { boardId: input.boardId },
        orderBy: { position: 'desc' },
        select: { position: true },
      });
      const list = await ctx.db.trelloList.create({
        data: {
          boardId: input.boardId,
          name: input.name,
          position: (last?.position ?? 0) + POSITION_GAP,
        },
        include: { cards: true },
      });
      return TrelloList.parse(toTrelloList(list));
    }),
  }),

  cards: router({
    create: protectedProcedure.input(CreateTrelloCardInput).mutation(async ({ ctx, input }) => {
      await requireList(ctx, input.listId);
      const last = await ctx.db.trelloCard.findFirst({
        where: { listId: input.listId },
        orderBy: { position: 'desc' },
        select: { position: true },
      });
      const card = await ctx.db.trelloCard.create({
        data: {
          listId: input.listId,
          title: input.title,
          description: input.description,
          position: (last?.position ?? 0) + POSITION_GAP,
        },
      });
      return TrelloCard.parse(toTrelloCard(card));
    }),

    update: protectedProcedure.input(UpdateTrelloCardInput).mutation(async ({ ctx, input }) => {
      await requireCard(ctx, input.cardId);
      const card = await ctx.db.trelloCard.update({
        where: { id: input.cardId },
        data: { title: input.title, description: input.description },
      });
      return TrelloCard.parse(toTrelloCard(card));
    }),

    move: protectedProcedure.input(MoveTrelloCardInput).mutation(async ({ ctx, input }) => {
      const card = await requireCard(ctx, input.cardId);
      const targetList = await requireList(ctx, input.toListId);
      if (targetList.board.workspaceId !== card.list.board.workspaceId) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Cannot move across workspaces.' });
      }

      const siblings = await ctx.db.trelloCard.findMany({
        where: { listId: input.toListId, id: { not: input.cardId } },
        orderBy: { position: 'asc' },
        select: { id: true, position: true },
      });

      let index = siblings.length;
      if (input.afterId) {
        const afterIndex = siblings.findIndex((c) => c.id === input.afterId);
        if (afterIndex !== -1) index = afterIndex;
      } else if (input.beforeId) {
        const beforeIndex = siblings.findIndex((c) => c.id === input.beforeId);
        if (beforeIndex !== -1) index = beforeIndex + 1;
      }

      const before = index > 0 ? siblings[index - 1]!.position : null;
      const after = index < siblings.length ? siblings[index]!.position : null;

      if (needsRenormalization(before, after)) {
        const order = [...siblings];
        order.splice(index, 0, { id: input.cardId, position: 0 });
        await ctx.db.$transaction(
          order.map((c, i) =>
            ctx.db.trelloCard.update({
              where: { id: c.id },
              data:
                c.id === input.cardId
                  ? { position: (i + 1) * POSITION_GAP, listId: input.toListId }
                  : { position: (i + 1) * POSITION_GAP },
            }),
          ),
        );
      } else {
        await ctx.db.trelloCard.update({
          where: { id: input.cardId },
          data: { listId: input.toListId, position: positionBetween(before, after) },
        });
      }

      const updated = await ctx.db.trelloCard.findUniqueOrThrow({ where: { id: input.cardId } });
      return TrelloCard.parse(toTrelloCard(updated));
    }),

    delete: protectedProcedure.input(TrelloCardIdInput).mutation(async ({ ctx, input }) => {
      await requireCard(ctx, input.cardId);
      await ctx.db.trelloCard.delete({ where: { id: input.cardId } });
      return { success: true };
    }),
  }),
});
