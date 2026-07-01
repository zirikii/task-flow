import { z } from 'zod';
import { idSchema } from './common';
import { PrioritySchema } from './enums';
import { UserRef } from './user';

// ---------------------------------------------------------------------------
// Jira Service Management — service desks, request types & requests
// ---------------------------------------------------------------------------

export const RequestStatusSchema = z.enum(['OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED']);
export type RequestStatus = z.infer<typeof RequestStatusSchema>;

export const REQUEST_STATUS_ORDER: readonly RequestStatus[] = [
  'OPEN',
  'IN_PROGRESS',
  'WAITING',
  'RESOLVED',
] as const;

export const ServiceDesk = z.object({
  id: idSchema,
  workspaceId: idSchema,
  name: z.string(),
  createdAt: z.date(),
});
export type ServiceDesk = z.infer<typeof ServiceDesk>;

export const RequestType = z.object({
  id: idSchema,
  serviceDeskId: idSchema,
  name: z.string(),
  description: z.string().nullable(),
});
export type RequestType = z.infer<typeof RequestType>;

export const RequestComment = z.object({
  id: idSchema,
  requestId: idSchema,
  body: z.string(),
  author: UserRef,
  createdAt: z.date(),
});
export type RequestComment = z.infer<typeof RequestComment>;

export const ServiceRequest = z.object({
  id: idSchema,
  serviceDeskId: idSchema,
  requestType: RequestType,
  summary: z.string(),
  description: z.string().nullable(),
  status: RequestStatusSchema,
  priority: PrioritySchema,
  reporter: UserRef,
  assignee: UserRef.nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
export type ServiceRequest = z.infer<typeof ServiceRequest>;

export const ServiceRequestDetail = ServiceRequest.extend({
  comments: z.array(RequestComment),
});
export type ServiceRequestDetail = z.infer<typeof ServiceRequestDetail>;

export const CreateServiceDeskInput = z.object({
  workspaceId: idSchema,
  name: z.string().trim().min(1, 'Name is required').max(80),
});
export type CreateServiceDeskInput = z.infer<typeof CreateServiceDeskInput>;

export const ServiceDeskIdInput = z.object({ serviceDeskId: idSchema });
export type ServiceDeskIdInput = z.infer<typeof ServiceDeskIdInput>;

export const CreateRequestTypeInput = z.object({
  serviceDeskId: idSchema,
  name: z.string().trim().min(1, 'Name is required').max(80),
  description: z.string().trim().max(500).optional(),
});
export type CreateRequestTypeInput = z.infer<typeof CreateRequestTypeInput>;

export const CreateRequestInput = z.object({
  requestTypeId: idSchema,
  summary: z.string().trim().min(1, 'Summary is required').max(200),
  description: z.string().trim().max(5000).optional(),
  priority: PrioritySchema.default('MEDIUM'),
});
export type CreateRequestInput = z.infer<typeof CreateRequestInput>;

export const QueueInput = z.object({
  serviceDeskId: idSchema,
  status: RequestStatusSchema.optional(),
});
export type QueueInput = z.infer<typeof QueueInput>;

export const RequestIdInput = z.object({ requestId: idSchema });
export type RequestIdInput = z.infer<typeof RequestIdInput>;

export const SetRequestStatusInput = z.object({
  requestId: idSchema,
  status: RequestStatusSchema,
});
export type SetRequestStatusInput = z.infer<typeof SetRequestStatusInput>;

export const AssignRequestInput = z.object({
  requestId: idSchema,
  assigneeId: idSchema.nullable(),
});
export type AssignRequestInput = z.infer<typeof AssignRequestInput>;

export const CommentRequestInput = z.object({
  requestId: idSchema,
  body: z.string().trim().min(1, 'Comment is required').max(5000),
});
export type CommentRequestInput = z.infer<typeof CommentRequestInput>;
