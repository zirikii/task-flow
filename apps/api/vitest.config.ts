import { defineConfig } from 'vitest/config';

const testDatabaseUrl =
  process.env.DATABASE_URL_TEST ??
  'postgresql://taskflow:taskflow@localhost:5432/taskflow_test?schema=public';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Point the Prisma client at the dedicated test database.
    env: { DATABASE_URL: testDatabaseUrl, NODE_ENV: 'test' },
    globalSetup: ['./test/globalSetup.ts'],
    setupFiles: ['./test/setup.ts'],
    // DB integration tests share one database; run serially to avoid races.
    fileParallelism: false,
    hookTimeout: 30_000,
  },
});
