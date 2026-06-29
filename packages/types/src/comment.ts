import { z } from 'zod';
import { idSchema } from './common';
import { UserRef } from './user';

export const Comment = z.object({
  id: idSchema,
  taskId: idSchema,
  body: z.string(),
  author: UserRef,
  createdAt: z.date(),
});
export type Comment = z.infer<typeof Comment>;

export const CreateCommentInput = z.object({
  taskId: idSchema,
  body: z.string().trim().min(1, 'Comment cannot be empty').max(10_000),
});
export type CreateCommentInput = z.infer<typeof CreateCommentInput>;
