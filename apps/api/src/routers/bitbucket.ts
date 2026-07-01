import { TRPCError } from '@trpc/server';
import { Prisma } from '@taskflow/db';
import {
  CommentPullRequestInput,
  CreatePullRequestInput,
  CreateRepositoryInput,
  PullRequest,
  PullRequestComment,
  PullRequestDetail,
  PullRequestIdInput,
  PullRequestsListInput,
  Repository,
  RepositoryIdInput,
  WorkspaceIdInput,
} from '@taskflow/types';
import {
  protectedProcedure,
  requireWorkspaceMembership,
  router,
  workspaceProcedure,
} from '../trpc';
import type { AuthedContext } from '../trpc';
import {
  toPullRequest,
  toPullRequestComment,
  toPullRequestDetail,
  toRepository,
} from '../lib/serializers';

async function requireRepo(ctx: AuthedContext, repositoryId: string) {
  const repo = await ctx.db.repository.findUnique({ where: { id: repositoryId } });
  if (!repo) throw new TRPCError({ code: 'NOT_FOUND', message: 'Repository not found.' });
  await requireWorkspaceMembership(ctx, repo.workspaceId);
  return repo;
}

async function requirePr(ctx: AuthedContext, pullRequestId: string) {
  const pr = await ctx.db.pullRequest.findUnique({
    where: { id: pullRequestId },
    include: { repository: true },
  });
  if (!pr) throw new TRPCError({ code: 'NOT_FOUND', message: 'Pull request not found.' });
  await requireWorkspaceMembership(ctx, pr.repository.workspaceId);
  return pr;
}

const prListInclude = {
  author: true,
  _count: { select: { approvals: true } },
} as const;

const prDetailInclude = {
  author: true,
  comments: { include: { author: true } },
  approvals: { include: { user: true } },
} as const;

export const bitbucketRouter = router({
  repos: router({
    list: workspaceProcedure.input(WorkspaceIdInput).query(async ({ ctx }) => {
      const repos = await ctx.db.repository.findMany({
        where: { workspaceId: ctx.workspaceId },
        include: { _count: { select: { pullRequests: true } } },
        orderBy: { createdAt: 'asc' },
      });
      // Count open PRs per repo.
      const openCounts = await ctx.db.pullRequest.groupBy({
        by: ['repositoryId'],
        where: { repository: { workspaceId: ctx.workspaceId }, status: 'OPEN' },
        _count: { _all: true },
      });
      const openByRepo = new Map(openCounts.map((c) => [c.repositoryId, c._count._all]));
      return repos.map((repo) => toRepository(repo, openByRepo.get(repo.id) ?? 0));
    }),

    create: workspaceProcedure.input(CreateRepositoryInput).mutation(async ({ ctx, input }) => {
      try {
        const repo = await ctx.db.repository.create({
          data: {
            workspaceId: ctx.workspaceId,
            name: input.name,
            description: input.description,
            language: input.language,
          },
          include: { _count: { select: { pullRequests: true } } },
        });
        return Repository.parse(toRepository(repo, 0));
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          throw new TRPCError({
            code: 'CONFLICT',
            message: `A repository named "${input.name}" already exists.`,
          });
        }
        throw error;
      }
    }),

    get: protectedProcedure.input(RepositoryIdInput).query(async ({ ctx, input }) => {
      const repo = await requireRepo(ctx, input.repositoryId);
      const openPullRequests = await ctx.db.pullRequest.count({
        where: { repositoryId: repo.id, status: 'OPEN' },
      });
      const withCount = await ctx.db.repository.findUniqueOrThrow({
        where: { id: repo.id },
        include: { _count: { select: { pullRequests: true } } },
      });
      return Repository.parse(toRepository(withCount, openPullRequests));
    }),
  }),

  pullRequests: router({
    list: protectedProcedure.input(PullRequestsListInput).query(async ({ ctx, input }) => {
      await requireRepo(ctx, input.repositoryId);
      const prs = await ctx.db.pullRequest.findMany({
        where: { repositoryId: input.repositoryId, status: input.status },
        include: prListInclude,
        orderBy: { number: 'desc' },
      });
      return prs.map(toPullRequest);
    }),

    create: protectedProcedure.input(CreatePullRequestInput).mutation(async ({ ctx, input }) => {
      await requireRepo(ctx, input.repositoryId);
      const last = await ctx.db.pullRequest.findFirst({
        where: { repositoryId: input.repositoryId },
        orderBy: { number: 'desc' },
        select: { number: true },
      });
      const pr = await ctx.db.pullRequest.create({
        data: {
          repositoryId: input.repositoryId,
          number: (last?.number ?? 0) + 1,
          title: input.title,
          description: input.description,
          sourceBranch: input.sourceBranch,
          targetBranch: input.targetBranch,
          authorId: ctx.user.id,
        },
        include: prListInclude,
      });
      return PullRequest.parse(toPullRequest(pr));
    }),

    get: protectedProcedure.input(PullRequestIdInput).query(async ({ ctx, input }) => {
      await requirePr(ctx, input.pullRequestId);
      const pr = await ctx.db.pullRequest.findUniqueOrThrow({
        where: { id: input.pullRequestId },
        include: prDetailInclude,
      });
      return PullRequestDetail.parse(toPullRequestDetail(pr, ctx.user.id));
    }),

    approve: protectedProcedure.input(PullRequestIdInput).mutation(async ({ ctx, input }) => {
      await requirePr(ctx, input.pullRequestId);
      await ctx.db.pullRequestApproval.upsert({
        where: {
          pullRequestId_userId: { pullRequestId: input.pullRequestId, userId: ctx.user.id },
        },
        create: { pullRequestId: input.pullRequestId, userId: ctx.user.id },
        update: {},
      });
      const pr = await ctx.db.pullRequest.findUniqueOrThrow({
        where: { id: input.pullRequestId },
        include: prDetailInclude,
      });
      return PullRequestDetail.parse(toPullRequestDetail(pr, ctx.user.id));
    }),

    merge: protectedProcedure.input(PullRequestIdInput).mutation(async ({ ctx, input }) => {
      const existing = await requirePr(ctx, input.pullRequestId);
      if (existing.status !== 'OPEN') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only open pull requests can be merged.' });
      }
      const pr = await ctx.db.pullRequest.update({
        where: { id: input.pullRequestId },
        data: { status: 'MERGED' },
        include: prDetailInclude,
      });
      return PullRequestDetail.parse(toPullRequestDetail(pr, ctx.user.id));
    }),

    decline: protectedProcedure.input(PullRequestIdInput).mutation(async ({ ctx, input }) => {
      const existing = await requirePr(ctx, input.pullRequestId);
      if (existing.status !== 'OPEN') {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Only open pull requests can be declined.' });
      }
      const pr = await ctx.db.pullRequest.update({
        where: { id: input.pullRequestId },
        data: { status: 'DECLINED' },
        include: prDetailInclude,
      });
      return PullRequestDetail.parse(toPullRequestDetail(pr, ctx.user.id));
    }),

    comment: protectedProcedure.input(CommentPullRequestInput).mutation(async ({ ctx, input }) => {
      await requirePr(ctx, input.pullRequestId);
      const comment = await ctx.db.pullRequestComment.create({
        data: { pullRequestId: input.pullRequestId, authorId: ctx.user.id, body: input.body },
        include: { author: true },
      });
      return PullRequestComment.parse(toPullRequestComment(comment));
    }),
  }),
});
