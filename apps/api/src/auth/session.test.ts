import { describe, expect, it } from 'vitest';
import { createUser } from '../../test/helpers';
import { createSession, invalidateSessionToken, validateSessionToken } from './session';

describe('session lifecycle', () => {
  it('creates a session and validates its token', async () => {
    const user = await createUser();
    const { token, session } = await createSession(user.id);

    expect(token).toHaveLength(43); // 32 random bytes, base64url
    expect(session.userId).toBe(user.id);

    const result = await validateSessionToken(token);
    expect(result).not.toBeNull();
    expect(result?.user.id).toBe(user.id);
  });

  it('returns null for an unknown token', async () => {
    await expect(validateSessionToken('does-not-exist')).resolves.toBeNull();
  });

  it('invalidates a session so the token no longer validates', async () => {
    const user = await createUser();
    const { token } = await createSession(user.id);

    await invalidateSessionToken(token);
    await expect(validateSessionToken(token)).resolves.toBeNull();
  });
});
