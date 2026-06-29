import { TRPCError } from '@trpc/server';
import { Prisma } from '@taskflow/db';
import { CreateLabelInput, DeleteLabelInput, Label, WorkspaceIdInput } from '@taskflow/types';
import {
  protectedProcedure,
  requireWorkspaceMembership,
  router,
  workspaceProcedure,
} from '../trpc';
import { toLabel } from '../lib/serializers';

export const labelRouter = router({
  list: workspaceProcedure.input(WorkspaceIdInput).query(async ({ ctx }) => {
    const labels = await ctx.db.label.findMany({
      where: { workspaceId: ctx.workspaceId },
      orderBy: { name: 'asc' },
    });
    return labels.map(toLabel);
  }),

  create: workspaceProcedure.input(CreateLabelInput).mutation(async ({ ctx, input }) => {
    try {
      const label = await ctx.db.label.create({
        data: { workspaceId: ctx.workspaceId, name: input.name, color: input.color },
      });
      return Label.parse(toLabel(label));
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new TRPCError({ code: 'CONFLICT', message: 'A label with that name already exists.' });
      }
      throw error;
    }
  }),

  delete: protectedProcedure.input(DeleteLabelInput).mutation(async ({ ctx, input }) => {
    const label = await ctx.db.label.findUnique({ where: { id: input.labelId } });
    if (!label) throw new TRPCError({ code: 'NOT_FOUND', message: 'Label not found.' });
    await requireWorkspaceMembership(ctx, label.workspaceId);
    await ctx.db.label.delete({ where: { id: label.id } });
    return { success: true };
  }),
});
