import { APP_NAME, APP_PORTS } from '@feijia/shared';
import { app } from './app';
import { logger } from './lib/logger';
import { API_DOCS_PATH } from './openapi/document';
import { ensureRedisConnected } from './modules/auth/redis-client';

/** 本地优先读取 SERVER_PORT，仅当平台只提供 PORT 时作为后备。 */
const preferredPort = Number(
  process.env.SERVER_PORT ?? process.env.PORT ?? APP_PORTS.server
);

function isPortAvailable(port: number): boolean {
  try {
    const testServer = Bun.listen({
      socket: { data() {} },
      port,
      hostname: '0.0.0.0',
    });
    testServer.stop();
    return true;
  } catch {
    return false;
  }
}

function resolveListenPort(preferred: number): number {
  if (isPortAvailable(preferred)) {
    return preferred;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(`Failed to start server. Is port ${preferred} in use?`);
  }

  const maxOffset = 20;
  for (let offset = 1; offset <= maxOffset; offset += 1) {
    const candidate = preferred + offset;
    if (isPortAvailable(candidate)) {
      logger.warn(`Port ${preferred} is in use, switched to ${candidate} for local development.`);
      return candidate;
    }
  }

  throw new Error(`Failed to start server. Is port ${preferred} in use?`);
}

await ensureRedisConnected();
const port = resolveListenPort(preferredPort);

Bun.serve({
  fetch: app.fetch,
  port,
  hostname: '0.0.0.0',
});

logger.info(`${APP_NAME} server running at http://localhost:${port}`);
logger.info(
  `${APP_NAME} api docs available at http://localhost:${port}${API_DOCS_PATH}`
);
