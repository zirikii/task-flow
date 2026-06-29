import { z } from 'zod';
import { idSchema } from './common';

export const Project = z.object({
  id: idSchema,
  workspaceId: idSchema,
  name: z.string(),
  key: z.string(),
  description: z.string().nullable(),
  createdAt: z.date(),
});
export type Project = z.infer<typeof Project>;

export const CreateProjectInput = z.object({
  workspaceId: idSchema,
  name: z.string().trim().min(1, 'Project name is required').max(80),
  key: z
    .string()
    .trim()
    .min(2, 'Key must be 2-6 characters')
    .max(6, 'Key must be 2-6 characters')
    .regex(/^[A-Za-z][A-Za-z0-9]*$/, 'Key must start with a letter and be alphanumeric')
    .transform((value) => value.toUpperCase()),
  description: z.string().trim().max(2000).optional(),
});
export type CreateProjectInput = z.infer<typeof CreateProjectInput>;

export const UpdateProjectInput = z.object({
  projectId: idSchema,
  name: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
});
export type UpdateProjectInput = z.infer<typeof UpdateProjectInput>;

export const ProjectIdInput = z.object({ projectId: idSchema });
export type ProjectIdInput = z.infer<typeof ProjectIdInput>;
