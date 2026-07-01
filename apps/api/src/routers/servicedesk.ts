import { TRPCError } from '@trpc/server';
import {
  AssignRequestInput,
  CommentRequestInput,
  CreateRequestInput,
  CreateRequestTypeInput,
  CreateServiceDeskInput,
  QueueInput,
  RequestComment,
  RequestIdInput,
  RequestType,
  ServiceDesk,
  ServiceDeskIdInput,
  ServiceRequest,
  ServiceRequestDetail,
  SetRequestStatusInput,
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
  serviceRequestInclude,
  toRequestComment,
  toRequestType,
  toServiceDesk,
  toServiceRequest,
  toServiceRequestDetail,
} from '../lib/serializers';

async function requireDesk(ctx: AuthedContext, serviceDeskId: string) {
  const desk = await ctx.db.serviceDesk.findUnique({ where: { id: serviceDeskId } });
  if (!desk) throw new TRPCError({ code: 'NOT_FOUND', message: 'Service desk not found.' });
  const membership = await requireWorkspaceMembership(ctx, desk.workspaceId);
  return { desk, membership };
}

async function requireRequest(ctx: AuthedContext, requestId: string) {
  const request = await ctx.db.serviceRequest.findUnique({
    where: { id: requestId },
    include: { serviceDesk: true },
  });
  if (!request) throw new TRPCError({ code: 'NOT_FOUND', message: 'Request not found.' });
  await requireWorkspaceMembership(ctx, request.serviceDesk.workspaceId);
  return request;
}

export const servicedeskRouter = router({
  desks: router({
    list: workspaceProcedure.input(WorkspaceIdInput).query(async ({ ctx }) => {
      const desks = await ctx.db.serviceDesk.findMany({
        where: { workspaceId: ctx.workspaceId },
        orderBy: { createdAt: 'asc' },
      });
      return desks.map(toServiceDesk);
    }),

    create: workspaceProcedure.input(CreateServiceDeskInput).mutation(async ({ ctx, input }) => {
      const desk = await ctx.db.serviceDesk.create({
        data: { workspaceId: ctx.workspaceId, name: input.name },
      });
      return ServiceDesk.parse(toServiceDesk(desk));
    }),
  }),

  requestTypes: router({
    list: protectedProcedure.input(ServiceDeskIdInput).query(async ({ ctx, input }) => {
      await requireDesk(ctx, input.serviceDeskId);
      const types = await ctx.db.requestType.findMany({
        where: { serviceDeskId: input.serviceDeskId },
        orderBy: { createdAt: 'asc' },
      });
      return types.map(toRequestType);
    }),

    create: protectedProcedure.input(CreateRequestTypeInput).mutation(async ({ ctx, input }) => {
      await requireDesk(ctx, input.serviceDeskId);
      const type = await ctx.db.requestType.create({
        data: {
          serviceDeskId: input.serviceDeskId,
          name: input.name,
          description: input.description,
        },
      });
      return RequestType.parse(toRequestType(type));
    }),
  }),

  requests: router({
    create: protectedProcedure.input(CreateRequestInput).mutation(async ({ ctx, input }) => {
      const type = await ctx.db.requestType.findUnique({ where: { id: input.requestTypeId } });
      if (!type) throw new TRPCError({ code: 'NOT_FOUND', message: 'Request type not found.' });
      await requireDesk(ctx, type.serviceDeskId);

      const request = await ctx.db.serviceRequest.create({
        data: {
          serviceDeskId: type.serviceDeskId,
          requestTypeId: type.id,
          summary: input.summary,
          description: input.description,
          priority: input.priority,
          reporterId: ctx.user.id,
        },
        include: serviceRequestInclude,
      });
      return ServiceRequest.parse(toServiceRequest(request));
    }),

    queue: protectedProcedure.input(QueueInput).query(async ({ ctx, input }) => {
      await requireDesk(ctx, input.serviceDeskId);
      const requests = await ctx.db.serviceRequest.findMany({
        where: { serviceDeskId: input.serviceDeskId, status: input.status },
        include: serviceRequestInclude,
        orderBy: { createdAt: 'desc' },
      });
      return requests.map(toServiceRequest);
    }),

    get: protectedProcedure.input(RequestIdInput).query(async ({ ctx, input }) => {
      await requireRequest(ctx, input.requestId);
      const request = await ctx.db.serviceRequest.findUniqueOrThrow({
        where: { id: input.requestId },
        include: { ...serviceRequestInclude, comments: { include: { author: true } } },
      });
      return ServiceRequestDetail.parse(toServiceRequestDetail(request));
    }),

    setStatus: protectedProcedure.input(SetRequestStatusInput).mutation(async ({ ctx, input }) => {
      await requireRequest(ctx, input.requestId);
      const request = await ctx.db.serviceRequest.update({
        where: { id: input.requestId },
        data: { status: input.status },
        include: serviceRequestInclude,
      });
      return ServiceRequest.parse(toServiceRequest(request));
    }),

    assign: protectedProcedure.input(AssignRequestInput).mutation(async ({ ctx, input }) => {
      const existing = await requireRequest(ctx, input.requestId);
      if (input.assigneeId) {
        const membership = await ctx.db.membership.findUnique({
          where: {
            userId_workspaceId: {
              userId: input.assigneeId,
              workspaceId: existing.serviceDesk.workspaceId,
            },
          },
        });
        if (!membership) {
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: 'Assignee must be a member of this workspace.',
          });
        }
      }
      const request = await ctx.db.serviceRequest.update({
        where: { id: input.requestId },
        data: { assigneeId: input.assigneeId },
        include: serviceRequestInclude,
      });
      return ServiceRequest.parse(toServiceRequest(request));
    }),

    comment: protectedProcedure.input(CommentRequestInput).mutation(async ({ ctx, input }) => {
      await requireRequest(ctx, input.requestId);
      const comment = await ctx.db.requestComment.create({
        data: { requestId: input.requestId, authorId: ctx.user.id, body: input.body },
        include: { author: true },
      });
      return RequestComment.parse(toRequestComment(comment));
    }),
  }),
});
