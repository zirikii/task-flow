import { hash, verify } from '@node-rs/argon2';

// Argon2id parameters. Must match those used by the database seed
// (packages/db/prisma/seed.ts) so seeded users can log in.
const ARGON2_OPTIONS = {
  memoryCost: 19456,
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
} as const;

export function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(hashString: string, password: string): Promise<boolean> {
  try {
    return await verify(hashString, password, ARGON2_OPTIONS);
  } catch {
    // Malformed hash or verification error → treat as a failed login.
    return false;
  }
}
