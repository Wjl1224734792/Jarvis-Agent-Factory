import { Hono } from "hono";
import { healthResponseSchema } from "@feijia/schemas";

export const healthRoute = new Hono().get("/", (context) => {
  const payload = healthResponseSchema.parse({
    status: "ok",
    service: "server",
    timestamp: new Date().toISOString(),
    version: "0.1.0"
  });

  return context.json(payload);
});
