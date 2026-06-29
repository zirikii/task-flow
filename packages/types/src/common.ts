import { z } from 'zod';

/** Entity identifier (Prisma cuid). Kept permissive: a non-empty string. */
export const idSchema = z.string().min(1, 'Required');

/** Hex colour string, e.g. "#ef4444". */
export const hexColorSchema = z
  .string()
  .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, 'Must be a hex colour like #ef4444');
