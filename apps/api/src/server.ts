import Fastify, { type FastifyInstance } from 'fastify';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import {
  fastifyTRPCPlugin,
  type FastifyTRPCPluginOptions,
} from '@trpc/server/adapters/fastify';
import { appRouter, type AppRouter } from './router';
import { createContext } from './context';

// The suite runs one API and many web apps, each on its own localhost port. Allow
// every configured origin (comma-separated CORS_ORIGIN) plus any localhost port in
// development. Credentialed CORS cannot use "*", so we reflect specific origins.
const CORS_ALLOWLIST = new Set(
  (process.env.CORS_ORIGIN ?? 'http://localhost:3000') // pragma: allowlist secret
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
);
const LOCALHOST_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/;

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true; // same-origin / non-browser clients (curl, SSR)
  return CORS_ALLOWLIST.has(origin) || LOCALHOST_ORIGIN.test(origin);
}

/** Build and configure the Fastify application (plugins + tRPC HTTP/WS). */
export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({
    // tRPC batches queries into the URL; allow long paths.
    routerOptions: { maxParamLength: 5000 },
    logger: {
      transport:
        process.env.NODE_ENV === 'production'
          ? undefined
          : {
              target: 'pino-pretty',
              options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
            },
    },
  });

  await app.register(cors, {
    origin: (origin, cb) => cb(null, isAllowedOrigin(origin ?? undefined)),
    credentials: true,
  });
  await app.register(cookie);
  await app.register(websocket);

  await app.register(fastifyTRPCPlugin, {
    prefix: '/trpc',
    useWSS: true,
    trpcOptions: {
      router: appRouter,
      createContext,
      onError({ path, error }) {
        app.log.error({ path, error: error.message }, 'tRPC error');
      },
    } satisfies FastifyTRPCPluginOptions<AppRouter>['trpcOptions'],
  });

  app.get('/health', async () => ({ status: 'ok' }));

  return app;
}
