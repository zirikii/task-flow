import { db, type Role, type Session, type User } from '@taskflow/db';
import { boardEvents } from '../src/events';
import type { Context } from '../src/context';
import { createCallerFactory } from '../src/trpc';
import { appRouter } from '../src/router';
import { hashPassword } from '../src/auth/password';

export const createCaller = createCallerFactory(appRouter);

/** Build a tRPC context for a given (optional) authenticated user. */
export function testContext(user: User | null): Context {
  const session: Session | null = user
    ? {
        id: `test-session-${user.id}`,
        userId: user.id,
        expiresAt: new Date(Date.now() + 60_000),
        createdAt: new Date(),
      }
    : null;

  return {
    db,
    user,
    session,
    events: boardEvents,
    setSessionCookie: () => undefined,
    clearSessionCookie: () => undefined,
  };
}

export function caller(user: User | null): ReturnType<typeof createCaller> {
  return createCaller(testContext(user));
}

let userCounter = 0;

export async function createUser(name = 'Test User'): Promise<User> {
  userCounter += 1;
  return db.user.create({
    data: {
      name,
      email: `user${userCounter}-${Date.now()}@example.com`,
      passwordHash: await hashPassword('password123'),
    },
  });
}

export async function createWorkspaceWithMember(user: User, role: Role = 'OWNER') {
  const workspace = await db.workspace.create({
    data: {
      name: 'Test Workspace',
      slug: `ws-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      memberships: { create: { userId: user.id, role } },
    },
  });
  return workspace;
}

export async function createProject(workspaceId: string) {
  return db.project.create({
    data: { workspaceId, name: 'Test Project', key: 'TST' },
  });
}
