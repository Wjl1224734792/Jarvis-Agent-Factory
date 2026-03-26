import { Hono } from "hono";
import { cors } from "hono/cors";
import { API_ROUTES, APP_PORTS, APP_ROUTES } from "@feijia/shared";

import { aircraftModelsRoute } from "./modules/aircraft-models/aircraft-models.route";
import { aircraftSubmissionsRoute } from "./modules/aircraft-submissions/aircraft-submissions.route";
import { authRoute } from "./modules/auth/auth.route";
import { brandsRoute } from "./modules/brands/brands.route";
import { categoriesRoute } from "./modules/categories/categories.route";
import { contentCategoriesRoute } from "./modules/content-categories/content-categories.route";
import { postsRoute } from "./modules/posts/posts.route";
import { rankingsRoute } from "./modules/rankings/rankings.route";
import { reviewsRoute } from "./modules/reviews/reviews.route";
import { socialRoute } from "./modules/social/social.route";
import { ensureServerEnvLoaded } from "./lib/load-env";
import { logger } from "./lib/logger";
import { healthRoute } from "./routes/health";

ensureServerEnvLoaded();

export const app = new Hono();

const defaultCorsOrigins = [
  `http://localhost:${APP_PORTS.web}`,
  `http://localhost:${APP_PORTS.admin}`
] as const;

/**
 * 解析 CORS 允许的源。
 *
 * - 未设置 `CORS_ORIGIN` / `CORS_ORIGINS`：仅允许本地 web / admin（`APP_PORTS`）。
 * - 值为 `*` 或 `all`：允许任意浏览器来源；因启用了 `credentials: true`，不能使用
 *   `Access-Control-Allow-Origin: *`，改为**回显请求中的 `Origin`**（与「全部允许」等价）。
 * - 其它：按逗号分隔的绝对源列表，例如 `https://a.com,https://b.com`。
 *
 * @returns `cors()` 的 `origin` 选项
 */
function resolveCorsOrigin():
  | string[]
  | ((origin: string) => string | undefined | null) {
  const raw = process.env.CORS_ORIGIN?.trim() ?? process.env.CORS_ORIGINS?.trim();
  if (raw === "*" || raw?.toLowerCase() === "all") {
    return (origin: string) => origin;
  }
  if (raw) {
    const list = raw
      .split(",")
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
    if (list.length > 0) {
      return list;
    }
  }
  return [...defaultCorsOrigins];
}

app.use(
  "*",
  cors({
    origin: resolveCorsOrigin(),
    credentials: true
  })
);

const shouldLogHttp =
  process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test";

if (shouldLogHttp) {
  app.use("*", async (c, next) => {
    const started = performance.now();
    await next();
    const ms = Math.round(performance.now() - started);
    logger.info(`${c.req.method} ${c.req.path}`, {
      status: c.res.status,
      ms
    });
  });
}

app.get("/", (c) =>
  c.json({
    message: "feijia server is running",
  }),
);

app.route(APP_ROUTES.health, healthRoute);
app.route("/", authRoute);
app.route("/", postsRoute);
app.route("/", socialRoute);
app.route("/", rankingsRoute);
app.route("/", aircraftModelsRoute);
app.route("/", aircraftSubmissionsRoute);
app.route("/", reviewsRoute);
app.route(API_ROUTES.models.categories, categoriesRoute);
app.route(API_ROUTES.models.brands, brandsRoute);
app.route("/", contentCategoriesRoute);

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
  const err = error instanceof Error ? error : new Error(String(error));
  logger.error(err.message, {
    stack: err.stack,
    path: context.req.path,
    method: context.req.method
  });

  return context.json(
    {
      code: "INTERNAL_ERROR",
      message: "Unexpected server error."
    },
    500
  );
});
