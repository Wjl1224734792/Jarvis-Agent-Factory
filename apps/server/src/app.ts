import { Hono } from "hono";
import { cors } from "hono/cors";
import { API_ROUTES, APP_PORTS, APP_ROUTES } from "@feijia/shared";

import { aircraftModelsRoute } from "./modules/aircraft-models/aircraft-models.route";
import { authRoute } from "./modules/auth/auth.route";
import { brandsRoute } from "./modules/brands/brands.route";
import { categoriesRoute } from "./modules/categories/categories.route";
import { postsRoute } from "./modules/posts/posts.route";
import { reviewsRoute } from "./modules/reviews/reviews.route";
import { healthRoute } from "./routes/health";

export const app = new Hono();

const allowedCorsOrigins = [
  `http://localhost:${APP_PORTS.web}`,
  `http://localhost:${APP_PORTS.admin}`
] as const;

app.use(
  "*",
  cors({
    origin: [...allowedCorsOrigins],
    credentials: true
  }),
);

app.get("/", (c) =>
  c.json({
    message: "feijia server is running",
  }),
);

app.route(APP_ROUTES.health, healthRoute);
app.route("/", authRoute);
app.route("/", postsRoute);
app.route("/", aircraftModelsRoute);
app.route("/", reviewsRoute);
app.route(API_ROUTES.models.categories, categoriesRoute);
app.route(API_ROUTES.models.brands, brandsRoute);

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
