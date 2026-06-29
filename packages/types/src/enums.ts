import { z } from 'zod';

/**
 * Zod enums mirroring the Prisma enums in packages/db. These are the single
 * source of truth for enum values shared by the API and the web app.
 */

export const RoleSchema = z.enum(['OWNER', 'ADMIN', 'MEMBER']);
export type Role = z.infer<typeof RoleSchema>;

export const TaskStatusSchema = z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'DONE']);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const PrioritySchema = z.enum(['NONE', 'LOW', 'MEDIUM', 'HIGH', 'URGENT']);
export type Priority = z.infer<typeof PrioritySchema>;

export const ActivityTypeSchema = z.enum([
  'TASK_CREATED',
  'TASK_UPDATED',
  'TASK_MOVED',
  'TASK_ASSIGNED',
  'TASK_LABELED',
  'COMMENT_ADDED',
]);
export type ActivityType = z.infer<typeof ActivityTypeSchema>;

/** Ordered list of statuses as rendered on the kanban board (left → right). */
export const TASK_STATUS_ORDER: readonly TaskStatus[] = [
  'BACKLOG',
  'TODO',
  'IN_PROGRESS',
  'DONE',
] as const;

/** Ordered list of priorities from lowest to highest. */
export const PRIORITY_ORDER: readonly Priority[] = [
  'NONE',
  'LOW',
  'MEDIUM',
  'HIGH',
  'URGENT',
] as const;
