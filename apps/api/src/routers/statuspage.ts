import { TRPCError } from '@trpc/server';
import {
  AddIncidentUpdateInput,
  CreateIncidentInput,
  CreateStatusComponentInput,
  CreateStatusPageInput,
  SetComponentStatusInput,
  StatusComponent,
  StatusIncident,
  StatusPage,
  StatusPageDetail,
  StatusPageIdInput,
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
  toStatusComponent,
  toStatusIncident,
  toStatusPage,
  toStatusPageDetail,
} from '../lib/serializers';

async function requirePage(ctx: AuthedContext, pageId: string) {
  const page = await ctx.db.statusPage.findUnique({ where: { id: pageId } });
  if (!page) throw new TRPCError({ code: 'NOT_FOUND', message: 'Status page not found.' });
  await requireWorkspaceMembership(ctx, page.workspaceId);
  return page;
}

async function requireComponent(ctx: AuthedContext, componentId: string) {
  const component = await ctx.db.statusComponent.findUnique({
    where: { id: componentId },
    include: { page: true },
  });
  if (!component) throw new TRPCError({ code: 'NOT_FOUND', message: 'Component not found.' });
  await requireWorkspaceMembership(ctx, component.page.workspaceId);
  return component;
}

async function requireIncident(ctx: AuthedContext, incidentId: string) {
  const incident = await ctx.db.statusIncident.findUnique({
    where: { id: incidentId },
    include: { page: true },
  });
  if (!incident) throw new TRPCError({ code: 'NOT_FOUND', message: 'Incident not found.' });
  await requireWorkspaceMembership(ctx, incident.page.workspaceId);
  return incident;
}

const detailInclude = {
  components: true,
  incidents: { include: { updates: { include: { author: true } } } },
} as const;

export const statuspageRouter = router({
  pages: router({
    list: workspaceProcedure.input(WorkspaceIdInput).query(async ({ ctx }) => {
      const pages = await ctx.db.statusPage.findMany({
        where: { workspaceId: ctx.workspaceId },
        orderBy: { createdAt: 'asc' },
      });
      return pages.map(toStatusPage);
    }),

    create: workspaceProcedure.input(CreateStatusPageInput).mutation(async ({ ctx, input }) => {
      const page = await ctx.db.statusPage.create({
        data: { workspaceId: ctx.workspaceId, name: input.name },
      });
      return StatusPage.parse(toStatusPage(page));
    }),

    get: protectedProcedure.input(StatusPageIdInput).query(async ({ ctx, input }) => {
      await requirePage(ctx, input.pageId);
      const page = await ctx.db.statusPage.findUniqueOrThrow({
        where: { id: input.pageId },
        include: detailInclude,
      });
      return StatusPageDetail.parse(toStatusPageDetail(page));
    }),
  }),

  components: router({
    create: protectedProcedure
      .input(CreateStatusComponentInput)
      .mutation(async ({ ctx, input }) => {
        await requirePage(ctx, input.pageId);
        const last = await ctx.db.statusComponent.findFirst({
          where: { pageId: input.pageId },
          orderBy: { position: 'desc' },
          select: { position: true },
        });
        const component = await ctx.db.statusComponent.create({
          data: { pageId: input.pageId, name: input.name, position: (last?.position ?? 0) + 1000 },
        });
        return StatusComponent.parse(toStatusComponent(component));
      }),

    setStatus: protectedProcedure.input(SetComponentStatusInput).mutation(async ({ ctx, input }) => {
      await requireComponent(ctx, input.componentId);
      const component = await ctx.db.statusComponent.update({
        where: { id: input.componentId },
        data: { status: input.status },
      });
      return StatusComponent.parse(toStatusComponent(component));
    }),
  }),

  incidents: router({
    create: protectedProcedure.input(CreateIncidentInput).mutation(async ({ ctx, input }) => {
      await requirePage(ctx, input.pageId);
      const incident = await ctx.db.statusIncident.create({
        data: {
          pageId: input.pageId,
          title: input.title,
          impact: input.impact,
          status: input.status,
          updates: {
            create: { body: input.body, status: input.status, authorId: ctx.user.id },
          },
        },
        include: { updates: { include: { author: true } } },
      });
      return StatusIncident.parse(toStatusIncident(incident));
    }),

    addUpdate: protectedProcedure.input(AddIncidentUpdateInput).mutation(async ({ ctx, input }) => {
      await requireIncident(ctx, input.incidentId);
      await ctx.db.$transaction([
        ctx.db.incidentUpdate.create({
          data: {
            incidentId: input.incidentId,
            body: input.body,
            status: input.status,
            authorId: ctx.user.id,
          },
        }),
        ctx.db.statusIncident.update({
          where: { id: input.incidentId },
          data: { status: input.status },
        }),
      ]);
      const incident = await ctx.db.statusIncident.findUniqueOrThrow({
        where: { id: input.incidentId },
        include: { updates: { include: { author: true } } },
      });
      return StatusIncident.parse(toStatusIncident(incident));
    }),
  }),
});
