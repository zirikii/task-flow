import { PrismaClient } from '@prisma/client';

/**
 * Singleton PrismaClient. In development we attach it to the global object so
 * hot-reloads do not exhaust the connection pool by creating new clients.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}
