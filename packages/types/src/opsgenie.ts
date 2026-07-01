import { z } from 'zod';
import { idSchema } from './common';
import { UserRef } from './user';

// ---------------------------------------------------------------------------
// Opsgenie — alerts & on-call schedules
// ---------------------------------------------------------------------------

export const AlertPrioritySchema = z.enum(['P1', 'P2', 'P3', 'P4', 'P5']);
export type AlertPriority = z.infer<typeof AlertPrioritySchema>;

export const AlertStatusSchema = z.enum(['OPEN', 'ACKED', 'CLOSED']);
export type AlertStatus = z.infer<typeof AlertStatusSchema>;

export const Alert = z.object({
  id: idSchema,
  workspaceId: idSchema,
  message: z.string(),
  priority: AlertPrioritySchema,
  status: AlertStatusSchema,
  source: z.string(),
  ackedBy: UserRef.nullable(),
  createdAt: z.date(),
});
export type Alert = z.infer<typeof Alert>;

export const OnCallShift = z.object({
  id: idSchema,
  scheduleId: idSchema,
  user: UserRef,
  startsAt: z.date(),
  endsAt: z.date(),
});
export type OnCallShift = z.infer<typeof OnCallShift>;

export const OnCallSchedule = z.object({
  id: idSchema,
  workspaceId: idSchema,
  name: z.string(),
  shifts: z.array(OnCallShift),
  currentOnCall: UserRef.nullable(),
});
export type OnCallSchedule = z.infer<typeof OnCallSchedule>;

export const CreateAlertInput = z.object({
  workspaceId: idSchema,
  message: z.string().trim().min(1, 'Message is required').max(280),
  priority: AlertPrioritySchema.default('P3'),
  source: z.string().trim().max(80).optional(),
});
export type CreateAlertInput = z.infer<typeof CreateAlertInput>;

export const AlertsListInput = z.object({
  workspaceId: idSchema,
  status: AlertStatusSchema.optional(),
});
export type AlertsListInput = z.infer<typeof AlertsListInput>;

export const AlertIdInput = z.object({ alertId: idSchema });
export type AlertIdInput = z.infer<typeof AlertIdInput>;

export const CreateScheduleInput = z.object({
  workspaceId: idSchema,
  name: z.string().trim().min(1, 'Name is required').max(80),
});
export type CreateScheduleInput = z.infer<typeof CreateScheduleInput>;

export const AddShiftInput = z.object({
  scheduleId: idSchema,
  userId: idSchema,
  startsAt: z.date(),
  endsAt: z.date(),
});
export type AddShiftInput = z.infer<typeof AddShiftInput>;
