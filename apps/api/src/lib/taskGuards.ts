import { TRPCError } from '@trpc/server';
import type { db as Db } from '@taskflow/db';

/** Ensure the assignee (if any) is a member of the workspace. */
export async function validateAssignee(
  db: typeof Db,
  workspaceId: string,
  assigneeId: string | null | undefined,
): Promise<void> {
  if (!assigneeId) return;
  const membership = await db.membership.findUnique({
    where: { userId_workspaceId: { userId: assigneeId, workspaceId } },
  });
  if (!membership) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'Assignee must be a workspace member.' });
  }
}

/** Ensure every label belongs to the workspace. */
export async function validateLabels(
  db: typeof Db,
  workspaceId: string,
  labelIds: string[] | undefined,
): Promise<void> {
  if (!labelIds || labelIds.length === 0) return;
  const count = await db.label.count({ where: { workspaceId, id: { in: labelIds } } });
  if (count !== new Set(labelIds).size) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'One or more labels are invalid.' });
  }
}
