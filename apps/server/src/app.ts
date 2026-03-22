import { Hono } from "hono";
import { cors } from "hono/cors";
import { APP_ROUTES } from "@feijia/shared";

import { authRoute } from "./modules/auth/auth.route";
import { healthRoute } from "./routes/health";

export const app = new Hono();

app.use(
  "*",
  cors({
    origin: "*",
  }),
);

app.get("/", (c) =>
  c.json({
    message: "feijia server is running",
  }),
);

app.route(APP_ROUTES.health, healthRoute);
app.route("/", authRoute);

app.notFound((context) =>
  context.json(
    {
      code: "NOT_FOUND",
      message: "Route not found."
    },
    404
  )
);

app.onError((error, context) => {
  console.error(error);

  return context.json(
    {
      code: "INTERNAL_ERROR",
      message: "Unexpected server error."
    },
    500
  );
});
