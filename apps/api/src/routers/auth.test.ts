import { describe, expect, it } from 'vitest';
import { TRPCError } from '@trpc/server';
import { db } from '@taskflow/db';
import { caller } from '../../test/helpers';

describe('auth router', () => {
  it('signs up a new user and persists them', async () => {
    const result = await caller(null).auth.signup({
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'password123',
    });

    expect(result.email).toBe('ada@example.com');
    const stored = await db.user.findUnique({ where: { email: 'ada@example.com' } });
    expect(stored).not.toBeNull();
    expect(stored?.passwordHash).not.toBe('password123');
  });

  it('rejects duplicate signups with CONFLICT', async () => {
    const input = { name: 'Dup', email: 'dup@example.com', password: 'password123' };
    await caller(null).auth.signup(input);
    await expect(caller(null).auth.signup(input)).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('logs in with correct credentials and rejects wrong ones', async () => {
    await caller(null).auth.signup({
      name: 'Grace',
      email: 'grace@example.com',
      password: 'password123',
    });

    const ok = await caller(null).auth.login({
      email: 'grace@example.com',
      password: 'password123',
    });
    expect(ok.email).toBe('grace@example.com');

    await expect(
      caller(null).auth.login({ email: 'grace@example.com', password: 'wrong' }),
    ).rejects.toBeInstanceOf(TRPCError);
  });

  it('requires authentication for me to return a user', async () => {
    await expect(caller(null).auth.me()).resolves.toBeNull();
  });
});
