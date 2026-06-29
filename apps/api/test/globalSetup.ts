import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dbDir = path.resolve(here, '../../../packages/db');

/** Apply migrations to the test database once before the suite runs. */
export default function setup(): void {
  const databaseUrl =
    process.env.DATABASE_URL_TEST ??
    'postgresql://taskflow:taskflow@localhost:5432/taskflow_test?schema=public';

  execSync('pnpm exec prisma migrate deploy', {
    cwd: dbDir,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'inherit',
  });
}
