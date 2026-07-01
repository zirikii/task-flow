import { z } from 'zod';
import { idSchema } from './common';
import { UserRef } from './user';

// ---------------------------------------------------------------------------
// Jira Product Discovery — idea boards, ideas & votes
// ---------------------------------------------------------------------------

export const IdeaStatusSchema = z.enum(['NEW', 'UNDER_REVIEW', 'PLANNED', 'SHIPPED']);
export type IdeaStatus = z.infer<typeof IdeaStatusSchema>;

export const IDEA_STATUS_ORDER: readonly IdeaStatus[] = [
  'NEW',
  'UNDER_REVIEW',
  'PLANNED',
  'SHIPPED',
] as const;

export const IdeaBoard = z.object({
  id: idSchema,
  workspaceId: idSchema,
  name: z.string(),
  createdAt: z.date(),
});
export type IdeaBoard = z.infer<typeof IdeaBoard>;

const scoreSchema = z.number().int().min(1).max(5);

export const Idea = z.object({
  id: idSchema,
  boardId: idSchema,
  title: z.string(),
  description: z.string().nullable(),
  impact: scoreSchema,
  effort: scoreSchema,
  status: IdeaStatusSchema,
  creator: UserRef,
  votes: z.number().int(),
  hasVoted: z.boolean(),
  createdAt: z.date(),
});
export type Idea = z.infer<typeof Idea>;

export const CreateIdeaBoardInput = z.object({
  workspaceId: idSchema,
  name: z.string().trim().min(1, 'Name is required').max(80),
});
export type CreateIdeaBoardInput = z.infer<typeof CreateIdeaBoardInput>;

export const IdeaBoardIdInput = z.object({ boardId: idSchema });
export type IdeaBoardIdInput = z.infer<typeof IdeaBoardIdInput>;

export const CreateIdeaInput = z.object({
  boardId: idSchema,
  title: z.string().trim().min(1, 'Title is required').max(160),
  description: z.string().trim().max(5000).optional(),
  impact: scoreSchema.default(3),
  effort: scoreSchema.default(3),
});
export type CreateIdeaInput = z.infer<typeof CreateIdeaInput>;

export const IdeaIdInput = z.object({ ideaId: idSchema });
export type IdeaIdInput = z.infer<typeof IdeaIdInput>;

export const UpdateIdeaInput = z.object({
  ideaId: idSchema,
  title: z.string().trim().min(1).max(160).optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  impact: scoreSchema.optional(),
  effort: scoreSchema.optional(),
  status: IdeaStatusSchema.optional(),
});
export type UpdateIdeaInput = z.infer<typeof UpdateIdeaInput>;
