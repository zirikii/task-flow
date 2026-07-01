import { TRPCError } from '@trpc/server';
import {
  AddTeamMemberInput,
  AtlasProject,
  AtlasProjectDetail,
  AtlasProjectIdInput,
  CreateAtlasProjectInput,
  CreateTeamInput,
  PostProjectUpdateInput,
  Team,
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
  atlasProjectInclude,
  toAtlasProject,
  toAtlasProjectDetail,
  toTeam,
} from '../lib/serializers';

async function requireTeam(ctx: AuthedContext, teamId: string) {
  const team = await ctx.db.team.findUnique({ where: { id: teamId } });
  if (!team) throw new TRPCError({ code: 'NOT_FOUND', message: 'Team not found.' });
  await requireWorkspaceMembership(ctx, team.workspaceId);
  return team;
}

async function requireAtlasProject(ctx: AuthedContext, atlasProjectId: string) {
  const project = await ctx.db.atlasProject.findUnique({ where: { id: atlasProjectId } });
  if (!project) throw new TRPCError({ code: 'NOT_FOUND', message: 'Project not found.' });
  await requireWorkspaceMembership(ctx, project.workspaceId);
  return project;
}

const teamInclude = { members: { include: { user: true } } } as const;

export const atlasRouter = router({
  teams: router({
    list: workspaceProcedure.input(WorkspaceIdInput).query(async ({ ctx }) => {
      const teams = await ctx.db.team.findMany({
        where: { workspaceId: ctx.workspaceId },
        include: teamInclude,
        orderBy: { createdAt: 'asc' },
      });
      return teams.map(toTeam);
    }),

    create: workspaceProcedure.input(CreateTeamInput).mutation(async ({ ctx, input }) => {
      const team = await ctx.db.team.create({
        data: {
          workspaceId: ctx.workspaceId,
          name: input.name,
          mission: input.mission,
          // The creator joins the team automatically.
          members: { create: { userId: ctx.user.id } },
        },
        include: teamInclude,
      });
      return Team.parse(toTeam(team));
    }),

    addMember: protectedProcedure.input(AddTeamMemberInput).mutation(async ({ ctx, input }) => {
      const team = await requireTeam(ctx, input.teamId);
      const membership = await ctx.db.membership.findUnique({
        where: { userId_workspaceId: { userId: input.userId, workspaceId: team.workspaceId } },
      });
      if (!membership) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'User must be a workspace member.' });
      }
      await ctx.db.teamMember.upsert({
        where: { teamId_userId: { teamId: input.teamId, userId: input.userId } },
        create: { teamId: input.teamId, userId: input.userId },
        update: {},
      });
      const updated = await ctx.db.team.findUniqueOrThrow({
        where: { id: input.teamId },
        include: teamInclude,
      });
      return Team.parse(toTeam(updated));
    }),
  }),

  projects: router({
    list: workspaceProcedure.input(WorkspaceIdInput).query(async ({ ctx }) => {
      const projects = await ctx.db.atlasProject.findMany({
        where: { workspaceId: ctx.workspaceId },
        include: atlasProjectInclude,
        orderBy: { createdAt: 'asc' },
      });
      return projects.map(toAtlasProject);
    }),

    create: workspaceProcedure.input(CreateAtlasProjectInput).mutation(async ({ ctx, input }) => {
      if (input.teamId) {
        const team = await ctx.db.team.findUnique({ where: { id: input.teamId } });
        if (!team || team.workspaceId !== ctx.workspaceId) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid team.' });
        }
      }
      const project = await ctx.db.atlasProject.create({
        data: {
          workspaceId: ctx.workspaceId,
          name: input.name,
          teamId: input.teamId ?? null,
          status: input.status,
          ownerId: ctx.user.id,
        },
        include: atlasProjectInclude,
      });
      return AtlasProject.parse(toAtlasProject(project));
    }),

    get: protectedProcedure.input(AtlasProjectIdInput).query(async ({ ctx, input }) => {
      await requireAtlasProject(ctx, input.atlasProjectId);
      const project = await ctx.db.atlasProject.findUniqueOrThrow({
        where: { id: input.atlasProjectId },
        include: { ...atlasProjectInclude, updates: { include: { author: true } } },
      });
      return AtlasProjectDetail.parse(toAtlasProjectDetail(project));
    }),

    postUpdate: protectedProcedure.input(PostProjectUpdateInput).mutation(async ({ ctx, input }) => {
      await requireAtlasProject(ctx, input.atlasProjectId);
      await ctx.db.$transaction([
        ctx.db.projectUpdate.create({
          data: {
            atlasProjectId: input.atlasProjectId,
            body: input.body,
            status: input.status,
            authorId: ctx.user.id,
          },
        }),
        ctx.db.atlasProject.update({
          where: { id: input.atlasProjectId },
          data: { status: input.status },
        }),
      ]);
      const project = await ctx.db.atlasProject.findUniqueOrThrow({
        where: { id: input.atlasProjectId },
        include: { ...atlasProjectInclude, updates: { include: { author: true } } },
      });
      return AtlasProjectDetail.parse(toAtlasProjectDetail(project));
    }),
  }),
});
