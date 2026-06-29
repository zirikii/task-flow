import { createHash, randomBytes } from 'node:crypto';
import { db, type Session, type User } from '@taskflow/db';

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
const SESSION_REFRESH_THRESHOLD_MS = 1000 * 60 * 60 * 24 * 15; // refresh when < 15 days left

export const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME ?? 'taskflow_session';
export const SESSION_TTL_SECONDS = Math.floor(SESSION_TTL_MS / 1000);

/** Generate a high-entropy, URL-safe session token (the cookie value). */
export function generateSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Hash a token before persisting it, so the DB never stores the raw cookie value. */
function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export interface SessionValidationResult {
  user: User;
  session: Session;
}

/** Create a session for a user and return the raw token to set in the cookie. */
export async function createSession(
  userId: string,
): Promise<{ token: string; session: Session }> {
  const token = generateSessionToken();
  const session = await db.session.create({
    data: {
      id: hashToken(token),
      userId,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });
  return { token, session };
}

/**
 * Validate a raw session token. Returns the user + session if valid, or null.
 * Expired sessions are deleted; sessions nearing expiry are extended (sliding).
 */
export async function validateSessionToken(
  token: string,
): Promise<SessionValidationResult | null> {
  const sessionId = hashToken(token);
  const result = await db.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  });

  if (!result) return null;

  if (Date.now() >= result.expiresAt.getTime()) {
    await db.session.delete({ where: { id: sessionId } }).catch(() => undefined);
    return null;
  }

  let session: Session = {
    id: result.id,
    userId: result.userId,
    expiresAt: result.expiresAt,
    createdAt: result.createdAt,
  };

  if (result.expiresAt.getTime() - Date.now() < SESSION_REFRESH_THRESHOLD_MS) {
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    session = await db.session.update({ where: { id: sessionId }, data: { expiresAt } });
  }

  return { user: result.user, session };
}

/** Invalidate (log out) a session by its raw token. */
export async function invalidateSessionToken(token: string): Promise<void> {
  const sessionId = hashToken(token);
  await db.session.delete({ where: { id: sessionId } }).catch(() => undefined);
}
