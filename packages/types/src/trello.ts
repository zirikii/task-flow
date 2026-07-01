import { z } from 'zod';
import { idSchema } from './common';

// ---------------------------------------------------------------------------
// Trello — boards, lists & cards
// ---------------------------------------------------------------------------

export const TrelloBoard = z.object({
  id: idSchema,
  workspaceId: idSchema,
  name: z.string(),
  createdAt: z.date(),
});
export type TrelloBoard = z.infer<typeof TrelloBoard>;

export const TrelloCard = z.object({
  id: idSchema,
  listId: idSchema,
  title: z.string(),
  description: z.string().nullable(),
  position: z.number(),
  createdAt: z.date(),
});
export type TrelloCard = z.infer<typeof TrelloCard>;

export const TrelloList = z.object({
  id: idSchema,
  boardId: idSchema,
  name: z.string(),
  position: z.number(),
  cards: z.array(TrelloCard),
});
export type TrelloList = z.infer<typeof TrelloList>;

/** A board plus its ordered lists and cards (the full board view). */
export const TrelloBoardDetail = z.object({
  id: idSchema,
  workspaceId: idSchema,
  name: z.string(),
  lists: z.array(TrelloList),
});
export type TrelloBoardDetail = z.infer<typeof TrelloBoardDetail>;

export const CreateTrelloBoardInput = z.object({
  workspaceId: idSchema,
  name: z.string().trim().min(1, 'Board name is required').max(80),
});
export type CreateTrelloBoardInput = z.infer<typeof CreateTrelloBoardInput>;

export const TrelloBoardIdInput = z.object({ boardId: idSchema });
export type TrelloBoardIdInput = z.infer<typeof TrelloBoardIdInput>;

export const CreateTrelloListInput = z.object({
  boardId: idSchema,
  name: z.string().trim().min(1, 'List name is required').max(80),
});
export type CreateTrelloListInput = z.infer<typeof CreateTrelloListInput>;

export const CreateTrelloCardInput = z.object({
  listId: idSchema,
  title: z.string().trim().min(1, 'Card title is required').max(280),
  description: z.string().trim().max(5000).optional(),
});
export type CreateTrelloCardInput = z.infer<typeof CreateTrelloCardInput>;

export const TrelloCardIdInput = z.object({ cardId: idSchema });
export type TrelloCardIdInput = z.infer<typeof TrelloCardIdInput>;

export const MoveTrelloCardInput = z.object({
  cardId: idSchema,
  toListId: idSchema,
  beforeId: idSchema.nullable().optional(),
  afterId: idSchema.nullable().optional(),
});
export type MoveTrelloCardInput = z.infer<typeof MoveTrelloCardInput>;

export const UpdateTrelloCardInput = z.object({
  cardId: idSchema,
  title: z.string().trim().min(1).max(280).optional(),
  description: z.string().trim().max(5000).nullable().optional(),
});
export type UpdateTrelloCardInput = z.infer<typeof UpdateTrelloCardInput>;
