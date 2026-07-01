import { TRPCError } from '@trpc/server';
import {
  AddShiftInput,
  Alert,
  AlertIdInput,
  AlertsListInput,
  CreateAlertInput,
  CreateScheduleInput,
  OnCallSchedule,
  WorkspaceIdInput,
} from '@taskflow/types';
import {
  protectedProcedure,
  requireWorkspaceMembership,
  router,
  workspaceProcedure,
} from '../trpc';
import type { AuthedContext } from '../trpc';
import { toAlert, toOnCallSchedule } from '../lib/serializers';

async function requireAlert(ctx: AuthedContext, alertId: string) {
  const alert = await ctx.db.alert.findUnique({ where: { id: alertId } });
  if (!alert) throw new TRPCError({ code: 'NOT_FOUND', message: 'Alert not found.' });
  await requireWorkspaceMembership(ctx, alert.workspaceId);
  return alert;
}

async function requireSchedule(ctx: AuthedContext, scheduleId: string) {
  const schedule = await ctx.db.onCallSchedule.findUnique({ where: { id: scheduleId } });
  if (!schedule) throw new TRPCError({ code: 'NOT_FOUND', message: 'Schedule not found.' });
  await requireWorkspaceMembership(ctx, schedule.workspaceId);
  return schedule;
}

export const opsgenieRouter = router({
  alerts: router({
    list: workspaceProcedure.input(AlertsListInput).query(async ({ ctx, input }) => {
      const alerts = await ctx.db.alert.findMany({
        where: { workspaceId: ctx.workspaceId, status: input.status },
        include: { ackedBy: true },
        orderBy: [{ status: 'asc' }, { priority: 'asc' }, { createdAt: 'desc' }],
      });
      return alerts.map(toAlert);
    }),

    create: workspaceProcedure.input(CreateAlertInput).mutation(async ({ ctx, input }) => {
      const alert = await ctx.db.alert.create({
        data: {
          workspaceId: ctx.workspaceId,
          message: input.message,
          priority: input.priority,
          source: input.source ?? 'manual',
        },
        include: { ackedBy: true },
      });
      return Alert.parse(toAlert(alert));
    }),

    ack: protectedProcedure.input(AlertIdInput).mutation(async ({ ctx, input }) => {
      await requireAlert(ctx, input.alertId);
      const alert = await ctx.db.alert.update({
        where: { id: input.alertId },
        data: { status: 'ACKED', ackedById: ctx.user.id },
        include: { ackedBy: true },
      });
      return Alert.parse(toAlert(alert));
    }),

    close: protectedProcedure.input(AlertIdInput).mutation(async ({ ctx, input }) => {
      await requireAlert(ctx, input.alertId);
      const alert = await ctx.db.alert.update({
        where: { id: input.alertId },
        data: { status: 'CLOSED' },
        include: { ackedBy: true },
      });
      return Alert.parse(toAlert(alert));
    }),
  }),

  schedules: router({
    list: workspaceProcedure.input(WorkspaceIdInput).query(async ({ ctx }) => {
      const schedules = await ctx.db.onCallSchedule.findMany({
        where: { workspaceId: ctx.workspaceId },
        include: { shifts: { include: { user: true } } },
        orderBy: { createdAt: 'asc' },
      });
      return schedules.map((schedule) => toOnCallSchedule(schedule));
    }),

    create: workspaceProcedure.input(CreateScheduleInput).mutation(async ({ ctx, input }) => {
      const schedule = await ctx.db.onCallSchedule.create({
        data: { workspaceId: ctx.workspaceId, name: input.name },
        include: { shifts: { include: { user: true } } },
      });
      return OnCallSchedule.parse(toOnCallSchedule(schedule));
    }),

    addShift: protectedProcedure.input(AddShiftInput).mutation(async ({ ctx, input }) => {
      const schedule = await requireSchedule(ctx, input.scheduleId);
      const membership = await ctx.db.membership.findUnique({
        where: { userId_workspaceId: { userId: input.userId, workspaceId: schedule.workspaceId } },
      });
      if (!membership) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'On-call user must be a workspace member.',
        });
      }
      if (input.endsAt <= input.startsAt) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: 'Shift must end after it starts.' });
      }
      await ctx.db.onCallShift.create({
        data: {
          scheduleId: input.scheduleId,
          userId: input.userId,
          startsAt: input.startsAt,
          endsAt: input.endsAt,
        },
      });
      const updated = await ctx.db.onCallSchedule.findUniqueOrThrow({
        where: { id: input.scheduleId },
        include: { shifts: { include: { user: true } } },
      });
      return OnCallSchedule.parse(toOnCallSchedule(updated));
    }),
  }),
});
