import Fastify, { type FastifyInstance } from 'fastify';

/** Build the Fastify application. Routers and plugins are registered in milestone 4. */
export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      transport:
        process.env.NODE_ENV === 'production'
          ? undefined
          : { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' } },
    },
  });

  app.get('/health', async () => ({ status: 'ok' }));

  return app;
}
