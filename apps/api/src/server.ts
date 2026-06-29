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

const CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:3000';

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

  await app.register(cors, { origin: CORS_ORIGIN, credentials: true });
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
