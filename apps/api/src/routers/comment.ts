import { Comment, CreateCommentInput, TaskIdInput } from '@taskflow/types';
import { router, taskProcedure } from '../trpc';
import { commentInclude, toComment } from '../lib/serializers';

export const commentRouter = router({
  list: taskProcedure.input(TaskIdInput).query(async ({ ctx }) => {
    const comments = await ctx.db.comment.findMany({
      where: { taskId: ctx.task.id },
      include: commentInclude,
      orderBy: { createdAt: 'asc' },
    });
    return comments.map(toComment);
  }),

  create: taskProcedure.input(CreateCommentInput).mutation(async ({ ctx, input }) => {
    const created = await ctx.db.comment.create({
      data: { taskId: ctx.task.id, authorId: ctx.user.id, body: input.body },
      include: commentInclude,
    });

    await ctx.db.activity.create({
      data: { taskId: ctx.task.id, actorId: ctx.user.id, type: 'COMMENT_ADDED', data: {} },
    });

    const comment = toComment(created);
    ctx.events.emit(ctx.task.projectId, { type: 'comment.created', taskId: ctx.task.id, comment });
    return Comment.parse(comment);
  }),
});
