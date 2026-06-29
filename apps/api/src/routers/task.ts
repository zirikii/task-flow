import type { Prisma, PrismaClient } from '@taskflow/db';
import {
  Board,
  BoardInput,
  BoardSubscriptionInput,
  CreateTaskInput,
  MoveTaskInput,
  Task,
  TaskDetail,
  TaskIdInput,
  TASK_STATUS_ORDER,
  UpdateTaskInput,
  type TaskFiltersInput,
} from '@taskflow/types';
import { projectProcedure, router, taskProcedure } from '../trpc';
import { taskDetailInclude, taskInclude, toTask, toTaskDetail } from '../lib/serializers';
import { needsRenormalization, POSITION_GAP, positionBetween } from '../lib/position';
import { validateAssignee, validateLabels } from '../lib/taskGuards';

function buildWhere(projectId: string, filters: TaskFiltersInput | undefined): Prisma.TaskWhereInput {
  const where: Prisma.TaskWhereInput = { projectId };
  if (!filters) return where;

  if (filters.assigneeId !== undefined) where.assigneeId = filters.assigneeId;
  if (filters.priority) where.priority = filters.priority;
  if (filters.labelIds && filters.labelIds.length > 0) {
    where.labels = { some: { labelId: { in: filters.labelIds } } };
  }
  if (filters.query) {
    where.OR = [
      { title: { contains: filters.query, mode: 'insensitive' } },
      { description: { contains: filters.query, mode: 'insensitive' } },
    ];
  }
  return where;
}

async function loadTask(db: PrismaClient, id: string) {
  const row = await db.task.findUniqueOrThrow({ where: { id }, include: taskInclude });
  return toTask(row);
}

export const taskRouter = router({
  board: projectProcedure.input(BoardInput).query(async ({ ctx, input }) => {
    const tasks = await ctx.db.task.findMany({
      where: buildWhere(ctx.project.id, input.filters),
      include: taskInclude,
      orderBy: { position: 'asc' },
    });

    const dtos = tasks.map(toTask);
    const columns = TASK_STATUS_ORDER.map((status) => ({
      status,
      tasks: dtos.filter((task) => task.status === status),
    }));

    return Board.parse({ projectId: ctx.project.id, columns });
  }),

  byId: taskProcedure.input(TaskIdInput).query(async ({ ctx }) => {
    const row = await ctx.db.task.findUniqueOrThrow({
      where: { id: ctx.task.id },
      include: taskDetailInclude,
    });
    return TaskDetail.parse(toTaskDetail(row));
  }),

  create: projectProcedure.input(CreateTaskInput).mutation(async ({ ctx, input }) => {
    await validateAssignee(ctx.db, ctx.workspaceId, input.assigneeId);
    await validateLabels(ctx.db, ctx.workspaceId, input.labelIds);

    const last = await ctx.db.task.findFirst({
      where: { projectId: ctx.project.id, status: input.status },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    const position = (last?.position ?? 0) + POSITION_GAP;

    const created = await ctx.db.task.create({
      data: {
        projectId: ctx.project.id,
        title: input.title,
        description: input.description,
        status: input.status,
        priority: input.priority,
        position,
        assigneeId: input.assigneeId ?? null,
        creatorId: ctx.user.id,
        dueDate: input.dueDate ?? null,
        labels: { create: input.labelIds.map((labelId) => ({ labelId })) },
        activities: { create: { actorId: ctx.user.id, type: 'TASK_CREATED', data: {} } },
      },
      include: taskInclude,
    });

    const task = toTask(created);
    ctx.events.emit(ctx.project.id, { type: 'task.created', task });
    return Task.parse(task);
  }),

  update: taskProcedure.input(UpdateTaskInput).mutation(async ({ ctx, input }) => {
    if (input.assigneeId !== undefined) {
      await validateAssignee(ctx.db, ctx.workspaceId, input.assigneeId);
    }
    if (input.labelIds !== undefined) {
      await validateLabels(ctx.db, ctx.workspaceId, input.labelIds);
    }

    const assigneeChanged =
      input.assigneeId !== undefined && input.assigneeId !== ctx.task.assigneeId;

    await ctx.db.$transaction(async (tx) => {
      await tx.task.update({
        where: { id: ctx.task.id },
        data: {
          title: input.title,
          description: input.description,
          status: input.status,
          priority: input.priority,
          assigneeId: input.assigneeId,
          dueDate: input.dueDate,
        },
      });

      if (input.labelIds !== undefined) {
        await tx.taskLabel.deleteMany({ where: { taskId: ctx.task.id } });
        if (input.labelIds.length > 0) {
          await tx.taskLabel.createMany({
            data: input.labelIds.map((labelId) => ({ taskId: ctx.task.id, labelId })),
          });
        }
      }

      await tx.activity.create({
        data: { taskId: ctx.task.id, actorId: ctx.user.id, type: 'TASK_UPDATED', data: {} },
      });
      if (assigneeChanged) {
        await tx.activity.create({
          data: {
            taskId: ctx.task.id,
            actorId: ctx.user.id,
            type: 'TASK_ASSIGNED',
            data: { assigneeId: input.assigneeId ?? null },
          },
        });
      }
    });

    const task = await loadTask(ctx.db, ctx.task.id);
    ctx.events.emit(task.projectId, { type: 'task.updated', task });
    return Task.parse(task);
  }),

  move: taskProcedure.input(MoveTaskInput).mutation(async ({ ctx, input }) => {
    const fromStatus = ctx.task.status;

    // Ordered tasks already in the target column, excluding the moved task.
    const columnTasks = await ctx.db.task.findMany({
      where: { projectId: ctx.task.projectId, status: input.status, id: { not: ctx.task.id } },
      orderBy: { position: 'asc' },
      select: { id: true, position: true },
    });

    // Determine the insertion index from the neighbour ids.
    let index = columnTasks.length;
    if (input.afterId) {
      const afterIndex = columnTasks.findIndex((task) => task.id === input.afterId);
      if (afterIndex !== -1) index = afterIndex;
    } else if (input.beforeId) {
      const beforeIndex = columnTasks.findIndex((task) => task.id === input.beforeId);
      if (beforeIndex !== -1) index = beforeIndex + 1;
    }

    const before = index > 0 ? columnTasks[index - 1]!.position : null;
    const after = index < columnTasks.length ? columnTasks[index]!.position : null;

    if (needsRenormalization(before, after)) {
      // Reindex the whole column with the moved task inserted at `index`.
      const order = [...columnTasks];
      order.splice(index, 0, { id: ctx.task.id, position: 0 });
      await ctx.db.$transaction([
        ...order.map((task, i) =>
          ctx.db.task.update({
            where: { id: task.id },
            data:
              task.id === ctx.task.id
                ? { position: (i + 1) * POSITION_GAP, status: input.status }
                : { position: (i + 1) * POSITION_GAP },
          }),
        ),
        ctx.db.activity.create({
          data: {
            taskId: ctx.task.id,
            actorId: ctx.user.id,
            type: 'TASK_MOVED',
            data: { from: fromStatus, to: input.status },
          },
        }),
      ]);
    } else {
      const position = positionBetween(before, after);
      await ctx.db.$transaction([
        ctx.db.task.update({
          where: { id: ctx.task.id },
          data: { status: input.status, position },
        }),
        ctx.db.activity.create({
          data: {
            taskId: ctx.task.id,
            actorId: ctx.user.id,
            type: 'TASK_MOVED',
            data: { from: fromStatus, to: input.status },
          },
        }),
      ]);
    }

    const task = await loadTask(ctx.db, ctx.task.id);
    ctx.events.emit(task.projectId, { type: 'task.moved', task });
    return Task.parse(task);
  }),

  delete: taskProcedure.input(TaskIdInput).mutation(async ({ ctx }) => {
    const { projectId, status } = ctx.task;
    await ctx.db.task.delete({ where: { id: ctx.task.id } });
    ctx.events.emit(projectId, { type: 'task.deleted', taskId: ctx.task.id, status });
    return { success: true };
  }),

  /** Realtime board updates for connected clients (delivered over WebSocket). */
  onBoardChange: projectProcedure
    .input(BoardSubscriptionInput)
    .subscription(async function* ({ ctx, signal }) {
      const abortSignal = signal ?? new AbortController().signal;
      for await (const event of ctx.events.subscribe(ctx.project.id, abortSignal)) {
        yield event;
      }
    }),
});
