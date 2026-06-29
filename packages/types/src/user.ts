import { z } from 'zod';
import { idSchema } from './common';

/** Public user shape (never includes the password hash). */
export const User = z.object({
  id: idSchema,
  email: z.string(),
  name: z.string(),
  createdAt: z.date(),
});
export type User = z.infer<typeof User>;

/** Minimal user reference embedded in tasks, comments and activities. */
export const UserRef = z.object({
  id: idSchema,
  name: z.string(),
  email: z.string(),
});
export type UserRef = z.infer<typeof UserRef>;
