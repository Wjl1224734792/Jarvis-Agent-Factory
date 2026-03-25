import { serve } from "@hono/node-server";
import { APP_NAME, APP_PORTS } from "@feijia/shared";
import { app } from "./app";
import { logger } from "./lib/logger";

/** 本地与 .env 用 SERVER_PORT；仅当云平台只提供 PORT 时作为后备 */
const port = Number(
  process.env.SERVER_PORT ?? process.env.PORT ?? APP_PORTS.server
);

serve({
  fetch: app.fetch,
  port
});

logger.info(`${APP_NAME} server running at http://localhost:${port}`);
