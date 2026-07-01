import { TRPCError } from '@trpc/server';
import {
  Component,
  ComponentIdInput,
  ComponentsListInput,
  CreateComponentInput,
  UpdateComponentInput,
} from '@taskflow/types';
import {
  protectedProcedure,
  requireWorkspaceMembership,
  router,
  workspaceProcedure,
} from '../trpc';
import type { AuthedContext } from '../trpc';
import { toComponent } from '../lib/serializers';

async function requireComponent(ctx: AuthedContext, componentId: string) {
  const component = await ctx.db.component.findUnique({ where: { id: componentId } });
  if (!component) throw new TRPCError({ code: 'NOT_FOUND', message: 'Component not found.' });
  await requireWorkspaceMembership(ctx, component.workspaceId);
  return component;
}

export const compassRouter = router({
  components: router({
    list: workspaceProcedure.input(ComponentsListInput).query(async ({ ctx, input }) => {
      const components = await ctx.db.component.findMany({
        where: { workspaceId: ctx.workspaceId, type: input.type },
        orderBy: { name: 'asc' },
      });
      return components.map(toComponent);
    }),

    get: protectedProcedure.input(ComponentIdInput).query(async ({ ctx, input }) => {
      const component = await requireComponent(ctx, input.componentId);
      return Component.parse(toComponent(component));
    }),

    create: workspaceProcedure.input(CreateComponentInput).mutation(async ({ ctx, input }) => {
      const component = await ctx.db.component.create({
        data: {
          workspaceId: ctx.workspaceId,
          name: input.name,
          type: input.type,
          description: input.description,
          ownerTeam: input.ownerTeam,
          tier: input.tier,
          healthScore: input.healthScore,
        },
      });
      return Component.parse(toComponent(component));
    }),

    update: protectedProcedure.input(UpdateComponentInput).mutation(async ({ ctx, input }) => {
      await requireComponent(ctx, input.componentId);
      const component = await ctx.db.component.update({
        where: { id: input.componentId },
        data: {
          name: input.name,
          type: input.type,
          description: input.description,
          ownerTeam: input.ownerTeam,
          tier: input.tier,
          healthScore: input.healthScore,
        },
      });
      return Component.parse(toComponent(component));
    }),
  }),
});
