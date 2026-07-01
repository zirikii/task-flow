import { z } from 'zod';
import { idSchema } from './common';

// ---------------------------------------------------------------------------
// Compass — software component catalog
// ---------------------------------------------------------------------------

export const ComponentTypeSchema = z.enum([
  'SERVICE',
  'LIBRARY',
  'APPLICATION',
  'WEBSITE',
  'DATA_PIPELINE',
]);
export type ComponentType = z.infer<typeof ComponentTypeSchema>;

export const COMPONENT_TYPES: readonly ComponentType[] = [
  'SERVICE',
  'LIBRARY',
  'APPLICATION',
  'WEBSITE',
  'DATA_PIPELINE',
] as const;

export const Component = z.object({
  id: idSchema,
  workspaceId: idSchema,
  name: z.string(),
  type: ComponentTypeSchema,
  description: z.string().nullable(),
  ownerTeam: z.string().nullable(),
  tier: z.number().int().min(1).max(4),
  healthScore: z.number().int().min(0).max(100),
  createdAt: z.date(),
});
export type Component = z.infer<typeof Component>;

export const ComponentsListInput = z.object({
  workspaceId: idSchema,
  type: ComponentTypeSchema.optional(),
});
export type ComponentsListInput = z.infer<typeof ComponentsListInput>;

export const ComponentIdInput = z.object({ componentId: idSchema });
export type ComponentIdInput = z.infer<typeof ComponentIdInput>;

export const CreateComponentInput = z.object({
  workspaceId: idSchema,
  name: z.string().trim().min(1, 'Name is required').max(80),
  type: ComponentTypeSchema.default('SERVICE'),
  description: z.string().trim().max(2000).optional(),
  ownerTeam: z.string().trim().max(80).optional(),
  tier: z.number().int().min(1).max(4).default(3),
  healthScore: z.number().int().min(0).max(100).default(80),
});
export type CreateComponentInput = z.infer<typeof CreateComponentInput>;

export const UpdateComponentInput = z.object({
  componentId: idSchema,
  name: z.string().trim().min(1).max(80).optional(),
  type: ComponentTypeSchema.optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  ownerTeam: z.string().trim().max(80).nullable().optional(),
  tier: z.number().int().min(1).max(4).optional(),
  healthScore: z.number().int().min(0).max(100).optional(),
});
export type UpdateComponentInput = z.infer<typeof UpdateComponentInput>;
