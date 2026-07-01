import { z } from 'zod';
import { idSchema } from './common';
import { UserRef } from './user';

// ---------------------------------------------------------------------------
// Atlas — teams, projects & status updates
// ---------------------------------------------------------------------------

export const AtlasProjectStatusSchema = z.enum([
  'ON_TRACK',
  'AT_RISK',
  'OFF_TRACK',
  'PAUSED',
]);
export type AtlasProjectStatus = z.infer<typeof AtlasProjectStatusSchema>;

export const Team = z.object({
  id: idSchema,
  workspaceId: idSchema,
  name: z.string(),
  mission: z.string().nullable(),
  members: z.array(UserRef),
});
export type Team = z.infer<typeof Team>;

export const AtlasProject = z.object({
  id: idSchema,
  workspaceId: idSchema,
  name: z.string(),
  status: AtlasProjectStatusSchema,
  owner: UserRef,
  teamId: idSchema.nullable(),
  teamName: z.string().nullable(),
  createdAt: z.date(),
});
export type AtlasProject = z.infer<typeof AtlasProject>;

export const ProjectUpdate = z.object({
  id: idSchema,
  atlasProjectId: idSchema,
  body: z.string(),
  status: AtlasProjectStatusSchema,
  author: UserRef,
  createdAt: z.date(),
});
export type ProjectUpdate = z.infer<typeof ProjectUpdate>;

export const AtlasProjectDetail = AtlasProject.extend({
  updates: z.array(ProjectUpdate),
});
export type AtlasProjectDetail = z.infer<typeof AtlasProjectDetail>;

export const CreateTeamInput = z.object({
  workspaceId: idSchema,
  name: z.string().trim().min(1, 'Name is required').max(80),
  mission: z.string().trim().max(280).optional(),
});
export type CreateTeamInput = z.infer<typeof CreateTeamInput>;

export const AddTeamMemberInput = z.object({
  teamId: idSchema,
  userId: idSchema,
});
export type AddTeamMemberInput = z.infer<typeof AddTeamMemberInput>;

export const CreateAtlasProjectInput = z.object({
  workspaceId: idSchema,
  name: z.string().trim().min(1, 'Name is required').max(120),
  teamId: idSchema.nullable().optional(),
  status: AtlasProjectStatusSchema.default('ON_TRACK'),
});
export type CreateAtlasProjectInput = z.infer<typeof CreateAtlasProjectInput>;

export const AtlasProjectIdInput = z.object({ atlasProjectId: idSchema });
export type AtlasProjectIdInput = z.infer<typeof AtlasProjectIdInput>;

export const PostProjectUpdateInput = z.object({
  atlasProjectId: idSchema,
  status: AtlasProjectStatusSchema,
  body: z.string().trim().min(1, 'Update text is required').max(5000),
});
export type PostProjectUpdateInput = z.infer<typeof PostProjectUpdateInput>;
