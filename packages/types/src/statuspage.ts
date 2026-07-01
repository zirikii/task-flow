import { z } from 'zod';
import { idSchema } from './common';
import { UserRef } from './user';

// ---------------------------------------------------------------------------
// Statuspage — components & incidents
// ---------------------------------------------------------------------------

export const ComponentStatusSchema = z.enum([
  'OPERATIONAL',
  'DEGRADED',
  'PARTIAL_OUTAGE',
  'MAJOR_OUTAGE',
]);
export type ComponentStatus = z.infer<typeof ComponentStatusSchema>;

export const IncidentStatusSchema = z.enum([
  'INVESTIGATING',
  'IDENTIFIED',
  'MONITORING',
  'RESOLVED',
]);
export type IncidentStatus = z.infer<typeof IncidentStatusSchema>;

export const IncidentImpactSchema = z.enum(['MINOR', 'MAJOR', 'CRITICAL']);
export type IncidentImpact = z.infer<typeof IncidentImpactSchema>;

export const StatusComponent = z.object({
  id: idSchema,
  pageId: idSchema,
  name: z.string(),
  status: ComponentStatusSchema,
  position: z.number(),
});
export type StatusComponent = z.infer<typeof StatusComponent>;

export const IncidentUpdate = z.object({
  id: idSchema,
  incidentId: idSchema,
  body: z.string(),
  status: IncidentStatusSchema,
  author: UserRef,
  createdAt: z.date(),
});
export type IncidentUpdate = z.infer<typeof IncidentUpdate>;

export const StatusIncident = z.object({
  id: idSchema,
  pageId: idSchema,
  title: z.string(),
  status: IncidentStatusSchema,
  impact: IncidentImpactSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  updates: z.array(IncidentUpdate),
});
export type StatusIncident = z.infer<typeof StatusIncident>;

export const StatusPage = z.object({
  id: idSchema,
  workspaceId: idSchema,
  name: z.string(),
  createdAt: z.date(),
});
export type StatusPage = z.infer<typeof StatusPage>;

/** A status page with its components and incident history. */
export const StatusPageDetail = StatusPage.extend({
  components: z.array(StatusComponent),
  incidents: z.array(StatusIncident),
});
export type StatusPageDetail = z.infer<typeof StatusPageDetail>;

export const CreateStatusPageInput = z.object({
  workspaceId: idSchema,
  name: z.string().trim().min(1, 'Name is required').max(80),
});
export type CreateStatusPageInput = z.infer<typeof CreateStatusPageInput>;

export const StatusPageIdInput = z.object({ pageId: idSchema });
export type StatusPageIdInput = z.infer<typeof StatusPageIdInput>;

export const CreateStatusComponentInput = z.object({
  pageId: idSchema,
  name: z.string().trim().min(1, 'Name is required').max(80),
});
export type CreateStatusComponentInput = z.infer<typeof CreateStatusComponentInput>;

export const SetComponentStatusInput = z.object({
  componentId: idSchema,
  status: ComponentStatusSchema,
});
export type SetComponentStatusInput = z.infer<typeof SetComponentStatusInput>;

export const CreateIncidentInput = z.object({
  pageId: idSchema,
  title: z.string().trim().min(1, 'Title is required').max(160),
  impact: IncidentImpactSchema,
  status: IncidentStatusSchema.default('INVESTIGATING'),
  body: z.string().trim().min(1, 'An initial update is required').max(5000),
});
export type CreateIncidentInput = z.infer<typeof CreateIncidentInput>;

export const AddIncidentUpdateInput = z.object({
  incidentId: idSchema,
  status: IncidentStatusSchema,
  body: z.string().trim().min(1, 'Update text is required').max(5000),
});
export type AddIncidentUpdateInput = z.infer<typeof AddIncidentUpdateInput>;
