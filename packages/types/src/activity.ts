import { z } from 'zod';
import { idSchema } from './common';
import { ActivityTypeSchema } from './enums';
import { UserRef } from './user';

/** Structured detail payload describing what changed in an activity entry. */
export const ActivityData = z.record(z.string(), z.unknown());
export type ActivityData = z.infer<typeof ActivityData>;

export const Activity = z.object({
  id: idSchema,
  taskId: idSchema,
  type: ActivityTypeSchema,
  data: ActivityData,
  actor: UserRef,
  createdAt: z.date(),
});
export type Activity = z.infer<typeof Activity>;
