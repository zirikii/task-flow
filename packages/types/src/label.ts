import { z } from 'zod';
import { hexColorSchema, idSchema } from './common';

export const Label = z.object({
  id: idSchema,
  workspaceId: idSchema,
  name: z.string(),
  color: z.string(),
});
export type Label = z.infer<typeof Label>;

export const CreateLabelInput = z.object({
  workspaceId: idSchema,
  name: z.string().trim().min(1, 'Label name is required').max(40),
  color: hexColorSchema,
});
export type CreateLabelInput = z.infer<typeof CreateLabelInput>;

export const DeleteLabelInput = z.object({ labelId: idSchema });
export type DeleteLabelInput = z.infer<typeof DeleteLabelInput>;
