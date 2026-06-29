import { buildServer } from './server';

const port = Number(process.env.API_PORT ?? 4000);

async function main(): Promise<void> {
  const app = await buildServer();
  await app.listen({ port, host: '0.0.0.0' });
  app.log.info(`TaskFlow API listening on http://localhost:${port}`);
}

main().catch((error: unknown) => {
  console.error('Failed to start API server', error);
  process.exit(1);
});
