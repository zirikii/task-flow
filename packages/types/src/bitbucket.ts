import { z } from 'zod';
import { idSchema } from './common';
import { UserRef } from './user';

// ---------------------------------------------------------------------------
// Bitbucket — repositories & pull requests
// ---------------------------------------------------------------------------

export const PullRequestStatusSchema = z.enum(['OPEN', 'MERGED', 'DECLINED']);
export type PullRequestStatus = z.infer<typeof PullRequestStatusSchema>;

export const Repository = z.object({
  id: idSchema,
  workspaceId: idSchema,
  name: z.string(),
  description: z.string().nullable(),
  defaultBranch: z.string(),
  language: z.string().nullable(),
  openPullRequests: z.number().int(),
  createdAt: z.date(),
});
export type Repository = z.infer<typeof Repository>;

export const PullRequest = z.object({
  id: idSchema,
  repositoryId: idSchema,
  number: z.number().int(),
  title: z.string(),
  description: z.string().nullable(),
  status: PullRequestStatusSchema,
  sourceBranch: z.string(),
  targetBranch: z.string(),
  author: UserRef,
  approvals: z.number().int(),
  createdAt: z.date(),
});
export type PullRequest = z.infer<typeof PullRequest>;

export const PullRequestComment = z.object({
  id: idSchema,
  pullRequestId: idSchema,
  body: z.string(),
  author: UserRef,
  createdAt: z.date(),
});
export type PullRequestComment = z.infer<typeof PullRequestComment>;

export const PullRequestDetail = PullRequest.extend({
  comments: z.array(PullRequestComment),
  approvedBy: z.array(UserRef),
  hasApproved: z.boolean(),
});
export type PullRequestDetail = z.infer<typeof PullRequestDetail>;

export const CreateRepositoryInput = z.object({
  workspaceId: idSchema,
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(80)
    .regex(/^[a-z0-9][a-z0-9-_.]*$/i, 'Use letters, numbers, dashes or dots'),
  description: z.string().trim().max(500).optional(),
  language: z.string().trim().max(40).optional(),
});
export type CreateRepositoryInput = z.infer<typeof CreateRepositoryInput>;

export const RepositoryIdInput = z.object({ repositoryId: idSchema });
export type RepositoryIdInput = z.infer<typeof RepositoryIdInput>;

export const PullRequestsListInput = z.object({
  repositoryId: idSchema,
  status: PullRequestStatusSchema.optional(),
});
export type PullRequestsListInput = z.infer<typeof PullRequestsListInput>;

export const CreatePullRequestInput = z.object({
  repositoryId: idSchema,
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().trim().max(5000).optional(),
  sourceBranch: z.string().trim().min(1, 'Source branch is required').max(120),
  targetBranch: z.string().trim().min(1).max(120).default('main'),
});
export type CreatePullRequestInput = z.infer<typeof CreatePullRequestInput>;

export const PullRequestIdInput = z.object({ pullRequestId: idSchema });
export type PullRequestIdInput = z.infer<typeof PullRequestIdInput>;

export const CommentPullRequestInput = z.object({
  pullRequestId: idSchema,
  body: z.string().trim().min(1, 'Comment is required').max(5000),
});
export type CommentPullRequestInput = z.infer<typeof CommentPullRequestInput>;
