import { z } from 'zod';
import { idSchema } from './common';
import { UserRef } from './user';

// ---------------------------------------------------------------------------
// Confluence — spaces & wiki pages
// ---------------------------------------------------------------------------

export const Space = z.object({
  id: idSchema,
  workspaceId: idSchema,
  key: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  createdAt: z.date(),
});
export type Space = z.infer<typeof Space>;

/** Lightweight page node used to render the space's page tree. */
export const PageNode = z.object({
  id: idSchema,
  spaceId: idSchema,
  parentId: idSchema.nullable(),
  title: z.string(),
  position: z.number(),
});
export type PageNode = z.infer<typeof PageNode>;

/** A full page including its markdown body and author. */
export const Page = z.object({
  id: idSchema,
  spaceId: idSchema,
  parentId: idSchema.nullable(),
  title: z.string(),
  body: z.string(),
  author: UserRef,
  position: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type Page = z.infer<typeof Page>;

export const CreateSpaceInput = z.object({
  workspaceId: idSchema,
  key: z
    .string()
    .trim()
    .min(2, 'Key must be 2-10 characters')
    .max(10, 'Key must be 2-10 characters')
    .regex(/^[A-Za-z][A-Za-z0-9]*$/, 'Key must start with a letter and be alphanumeric')
    .transform((value) => value.toUpperCase()),
  name: z.string().trim().min(1, 'Space name is required').max(80),
  description: z.string().trim().max(2000).optional(),
});
export type CreateSpaceInput = z.infer<typeof CreateSpaceInput>;

export const SpaceIdInput = z.object({ spaceId: idSchema });
export type SpaceIdInput = z.infer<typeof SpaceIdInput>;

export const PageIdInput = z.object({ pageId: idSchema });
export type PageIdInput = z.infer<typeof PageIdInput>;

export const CreatePageInput = z.object({
  spaceId: idSchema,
  parentId: idSchema.nullable().optional(),
  title: z.string().trim().min(1, 'Title is required').max(200),
  body: z.string().max(50_000).optional(),
});
export type CreatePageInput = z.infer<typeof CreatePageInput>;

export const UpdatePageInput = z.object({
  pageId: idSchema,
  title: z.string().trim().min(1).max(200).optional(),
  body: z.string().max(50_000).optional(),
});
export type UpdatePageInput = z.infer<typeof UpdatePageInput>;
