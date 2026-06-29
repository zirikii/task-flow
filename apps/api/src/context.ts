import type { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';
import { db, type Session, type User } from '@taskflow/db';
import { boardEvents, type BoardEventBus } from './events';
import { SESSION_COOKIE_NAME, validateSessionToken } from './auth/session';

export interface Context {
  db: typeof db;
  user: User | null;
  session: Session | null;
  events: BoardEventBus;
  /** Set the session cookie (HTTP requests only; no-op over WebSocket). */
  setSessionCookie: (token: string, expiresAt: Date) => void;
  /** Clear the session cookie (HTTP requests only; no-op over WebSocket). */
  clearSessionCookie: () => void;
}

function readTokenFromCookies(req: CreateFastifyContextOptions['req']): string | null {
  const fromParsed = req.cookies?.[SESSION_COOKIE_NAME];
  if (fromParsed) return fromParsed;

  // Fallback for WebSocket upgrades where the cookie plugin may not have parsed.
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === SESSION_COOKIE_NAME) return decodeURIComponent(rest.join('='));
  }
  return null;
}

export async function createContext({ req, res }: CreateFastifyContextOptions): Promise<Context> {
  const token = readTokenFromCookies(req);
  const result = token ? await validateSessionToken(token) : null;

  const isHttp = typeof res?.setCookie === 'function';

  return {
    db,
    user: result?.user ?? null,
    session: result?.session ?? null,
    events: boardEvents,
    setSessionCookie: (value, expiresAt) => {
      if (!isHttp) return;
      res.setCookie(SESSION_COOKIE_NAME, value, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        expires: expiresAt,
      });
    },
    clearSessionCookie: () => {
      if (!isHttp) return;
      res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    },
  };
}

export type CreateContext = typeof createContext;
