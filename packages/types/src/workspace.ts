import { z } from 'zod';
import { idSchema } from './common';
import { RoleSchema } from './enums';
import { UserRef } from './user';

export const Workspace = z.object({
  id: idSchema,
  name: z.string(),
  slug: z.string(),
  role: RoleSchema, // the current user's role in this workspace
  createdAt: z.date(),
});
export type Workspace = z.infer<typeof Workspace>;

export const WorkspaceMember = z.object({
  id: idSchema,
  role: RoleSchema,
  user: UserRef,
});
export type WorkspaceMember = z.infer<typeof WorkspaceMember>;

export const CreateWorkspaceInput = z.object({
  name: z.string().trim().min(1, 'Workspace name is required').max(60),
});
export type CreateWorkspaceInput = z.infer<typeof CreateWorkspaceInput>;

export const WorkspaceIdInput = z.object({ workspaceId: idSchema });
export type WorkspaceIdInput = z.infer<typeof WorkspaceIdInput>;
