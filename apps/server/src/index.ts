import { serve } from "@hono/node-server";
import { APP_NAME, APP_PORTS } from "@feijia/shared";
import { app } from "./app";

const port = Number(process.env.PORT ?? APP_PORTS.server);

serve({
  fetch: app.fetch,
  port
});

console.log(`${APP_NAME} server running at http://localhost:${port}`);
