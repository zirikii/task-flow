import { z } from 'zod';
import { idSchema } from './common';
import { TaskStatusSchema } from './enums';
import { Comment } from './comment';
import { Task } from './task';

/**
 * Realtime board events broadcast over the tRPC WebSocket subscription. The web
 * client patches its board cache in response to these. This schema is the
 * shared contract between the API emitter and the web subscriber.
 */
export const BoardEvent = z.discriminatedUnion('type', [
  z.object({ type: z.literal('task.created'), task: Task }),
  z.object({ type: z.literal('task.updated'), task: Task }),
  z.object({ type: z.literal('task.moved'), task: Task }),
  z.object({ type: z.literal('task.deleted'), taskId: idSchema, status: TaskStatusSchema }),
  z.object({ type: z.literal('comment.created'), taskId: idSchema, comment: Comment }),
]);
export type BoardEvent = z.infer<typeof BoardEvent>;

export const BoardSubscriptionInput = z.object({ projectId: idSchema });
export type BoardSubscriptionInput = z.infer<typeof BoardSubscriptionInput>;
