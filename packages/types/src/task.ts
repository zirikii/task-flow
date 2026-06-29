import { z } from 'zod';
import { idSchema } from './common';
import { PrioritySchema, TaskStatusSchema } from './enums';
import { Label } from './label';
import { UserRef } from './user';

/** A task as rendered on the board (with relations resolved). */
export const Task = z.object({
  id: idSchema,
  projectId: idSchema,
  title: z.string(),
  description: z.string().nullable(),
  status: TaskStatusSchema,
  priority: PrioritySchema,
  position: z.number(),
  assignee: UserRef.nullable(),
  creator: UserRef,
  labels: z.array(Label),
  dueDate: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Task = z.infer<typeof Task>;

export const CreateTaskInput = z.object({
  projectId: idSchema,
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().max(20_000).optional(),
  status: TaskStatusSchema.default('BACKLOG'),
  priority: PrioritySchema.default('NONE'),
  assigneeId: idSchema.nullable().optional(),
  labelIds: z.array(idSchema).default([]),
  dueDate: z.coerce.date().nullable().optional(),
});
export type CreateTaskInput = z.infer<typeof CreateTaskInput>;

export const UpdateTaskInput = z.object({
  taskId: idSchema,
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().max(20_000).nullable().optional(),
  status: TaskStatusSchema.optional(),
  priority: PrioritySchema.optional(),
  assigneeId: idSchema.nullable().optional(),
  labelIds: z.array(idSchema).optional(),
  dueDate: z.coerce.date().nullable().optional(),
});
export type UpdateTaskInput = z.infer<typeof UpdateTaskInput>;

/**
 * Move a task to a status column, positioned between two neighbours. The server
 * computes the fractional `position` from the neighbours (authoritative).
 * Pass `null` for `beforeId`/`afterId` when dropping at a column edge.
 */
export const MoveTaskInput = z.object({
  taskId: idSchema,
  status: TaskStatusSchema,
  beforeId: idSchema.nullable().default(null),
  afterId: idSchema.nullable().default(null),
});
export type MoveTaskInput = z.infer<typeof MoveTaskInput>;

export const TaskFiltersInput = z.object({
  assigneeId: idSchema.nullable().optional(),
  labelIds: z.array(idSchema).optional(),
  priority: PrioritySchema.optional(),
  query: z.string().trim().max(200).optional(),
});
export type TaskFiltersInput = z.infer<typeof TaskFiltersInput>;

export const BoardInput = z.object({
  projectId: idSchema,
  filters: TaskFiltersInput.optional(),
});
export type BoardInput = z.infer<typeof BoardInput>;

export const TaskIdInput = z.object({ taskId: idSchema });
export type TaskIdInput = z.infer<typeof TaskIdInput>;

/** Board grouped by status column, each ordered by ascending position. */
export const Board = z.object({
  projectId: idSchema,
  columns: z.array(
    z.object({
      status: TaskStatusSchema,
      tasks: z.array(Task),
    }),
  ),
});
export type Board = z.infer<typeof Board>;
