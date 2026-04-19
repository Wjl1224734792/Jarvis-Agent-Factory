import { serve } from '@hono/node-server';
import { APP_NAME, APP_PORTS } from '@feijia/shared';
import { createServer } from 'node:net';
import { app } from './app';
import { logger } from './lib/logger';
import { API_DOCS_PATH } from './openapi/document';
import { ensureRedisConnected } from './modules/auth/redis-client';

/** 本地优先读取 SERVER_PORT，仅当平台只提供 PORT 时作为后备。 */
const preferredPort = Number(
  process.env.SERVER_PORT ?? process.env.PORT ?? APP_PORTS.server
);

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = createServer();

    server.once('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        resolve(false);
        return;
      }

      resolve(false);
    });

    server.once('listening', () => {
      server.close(() => {
        resolve(true);
      });
    });

    server.listen(port, '0.0.0.0');
  });
}

async function resolveListenPort(preferred: number): Promise<number> {
  if (await isPortAvailable(preferred)) {
    return preferred;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(`Failed to start server. Is port ${preferred} in use?`);
  }

  const maxOffset = 20;
  for (let offset = 1; offset <= maxOffset; offset += 1) {
    const candidate = preferred + offset;
    if (await isPortAvailable(candidate)) {
      logger.warn(`Port ${preferred} is in use, switched to ${candidate} for local development.`);
      return candidate;
    }
  }

  throw new Error(`Failed to start server. Is port ${preferred} in use?`);
}

await ensureRedisConnected();
const port = await resolveListenPort(preferredPort);

serve(
  {
    fetch: app.fetch,
    port
  },
  info => {
    const listenPort = info.port;
    logger.info(`${APP_NAME} server running at http://localhost:${listenPort}`);
    logger.info(
      `${APP_NAME} api docs available at http://localhost:${listenPort}${API_DOCS_PATH}`
    );
  }
);
