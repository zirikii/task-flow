import { TRPCError } from '@trpc/server';
import { Prisma } from '@taskflow/db';
import {
  CreateProjectInput,
  Project,
  ProjectIdInput,
  UpdateProjectInput,
  WorkspaceIdInput,
} from '@taskflow/types';
import { assertRole, projectProcedure, router, workspaceProcedure } from '../trpc';
import { toProject } from '../lib/serializers';

export const projectRouter = router({
  list: workspaceProcedure.input(WorkspaceIdInput).query(async ({ ctx }) => {
    const projects = await ctx.db.project.findMany({
      where: { workspaceId: ctx.workspaceId },
      orderBy: { createdAt: 'asc' },
    });
    return projects.map(toProject);
  }),

  create: workspaceProcedure.input(CreateProjectInput).mutation(async ({ ctx, input }) => {
    try {
      const project = await ctx.db.project.create({
        data: {
          workspaceId: ctx.workspaceId,
          name: input.name,
          key: input.key,
          description: input.description,
        },
      });
      return Project.parse(toProject(project));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `A project with key "${input.key}" already exists in this workspace.`,
        });
      }
      throw error;
    }
  }),

  get: projectProcedure.input(ProjectIdInput).query(({ ctx }) => {
    return Project.parse(toProject(ctx.project));
  }),

  update: projectProcedure.input(UpdateProjectInput).mutation(async ({ ctx, input }) => {
    const project = await ctx.db.project.update({
      where: { id: ctx.project.id },
      data: {
        name: input.name,
        description: input.description,
      },
    });
    return Project.parse(toProject(project));
  }),

  delete: projectProcedure.input(ProjectIdInput).mutation(async ({ ctx }) => {
    assertRole(ctx.membership.role, ['OWNER', 'ADMIN']);
    await ctx.db.project.delete({ where: { id: ctx.project.id } });
    return { success: true };
  }),
});
