import { afterAll, beforeEach } from 'vitest';
import { db } from '@taskflow/db';

/** Wipe all tables before each test for isolation. */
export async function resetDatabase(): Promise<void> {
  await db.activity.deleteMany();
  await db.comment.deleteMany();
  await db.taskLabel.deleteMany();
  await db.task.deleteMany();
  await db.label.deleteMany();
  await db.project.deleteMany();
  await db.membership.deleteMany();
  await db.session.deleteMany();
  await db.workspace.deleteMany();
  await db.user.deleteMany();
}

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await db.$disconnect();
});
