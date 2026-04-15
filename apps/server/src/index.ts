import { serve } from '@hono/node-server';
import { APP_NAME, APP_PORTS } from '@feijia/shared';
import { app } from './app';
import { logger } from './lib/logger';
import { API_DOCS_PATH } from './openapi/document';
import { ensureRedisConnected } from './modules/auth/redis-client';

/** 本地与 .env 用 SERVER_PORT；仅当云平台只提供 PORT 时作为后备。 */
const port = Number(
  process.env.SERVER_PORT ?? process.env.PORT ?? APP_PORTS.server
);

await ensureRedisConnected();

serve(
  {
    fetch: app.fetch,
    port
  },
  (info) => {
    const listenPort = info.port;
    logger.info(`${APP_NAME} server running at http://localhost:${listenPort}`);
    logger.info(
      `${APP_NAME} api docs available at http://localhost:${listenPort}${API_DOCS_PATH}`
    );
  }
);
